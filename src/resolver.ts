import {
  createWalletClient,
  http,
  type WalletClient,
  type Account,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import type { SentinelConfig } from "./config.js";
import type { NonceTracker, PendingTxStore, TrackedTx } from "./nonceTracker.js";
import type { AuditLogger } from "./logger.js";

export class NoPrivateKeyError extends Error {
  constructor() {
    super(
      "Cannot resolve gaps: PRIVATE_KEY is not set in .env. Nonce Sentinel can watch and detect read-only, but resolving a stuck transaction requires a signing key."
    );
  }
}

export class ResolveResult {
  constructor(
    public readonly outcome: "resolved" | "already_confirmed",
    public readonly newHash?: `0x${string}`
  ) {}
}

/**
 * Clamp a proposed gas-bump percentage into the safe range set in .env.
 * This is the hard boundary: whatever suggests the bump size later
 * (currently a fixed default, eventually the AI diagnosis layer), the
 * actual transaction can never go outside [minGasBumpPct, maxGasBumpPct].
 */
export function clampBumpPct(proposedPct: number, config: SentinelConfig): number {
  return Math.min(Math.max(proposedPct, config.minGasBumpPct), config.maxGasBumpPct);
}

export class GapResolver {
  private readonly account: Account | null;
  private readonly walletClient: WalletClient | null;

  constructor(
    private readonly config: SentinelConfig,
    private readonly tracker: NonceTracker,
    private readonly store: PendingTxStore,
    private readonly logger: AuditLogger
  ) {
    if (config.privateKey) {
      this.account = privateKeyToAccount(config.privateKey);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: baseSepolia,
        transport: http(config.rpcUrl),
      });
    } else {
      this.account = null;
      this.walletClient = null;
    }
  }

  /**
   * Resolve a specific nonce gap by resubmitting the stuck transaction with
   * a higher gas fee. Per Base's own guidance, the replacement must offer
   * at least 10% more on both maxPriorityFeePerGas and maxFeePerGas.
   *
   * Safety: always checks the receipt first. If the network already
   * confirmed the original transaction between detection and resolution,
   * this does nothing - resubmitting would double-spend the nonce.
   */
  async resolveGap(gapNonce: number, bumpPctOverride?: number): Promise<ResolveResult> {
    if (!this.config.dryRun && (!this.walletClient || !this.account)) {
      throw new NoPrivateKeyError();
    }

    const stuckTx = this.store.get(gapNonce);
    if (!stuckTx) {
      await this.logger.log({
        action: "gap_resolve_failed",
        wallet: this.config.walletAddress,
        gapNonce,
        reason: "no_tracked_tx_for_nonce",
      });
      throw new Error(
        `No tracked transaction for nonce ${gapNonce}. The Sentinel only knows about transactions it saw submitted - it cannot resolve a gap it never recorded.`
      );
    }

    // Race-condition guard: the network may have confirmed it already.
    const alreadyConfirmed = await this.tracker.isConfirmed(stuckTx.hash);
    if (alreadyConfirmed) {
      this.store.remove(gapNonce);
      await this.logger.log({
        action: "gap_resolved",
        wallet: this.config.walletAddress,
        gapNonce,
        originalTxHash: stuckTx.hash,
        newTxHash: null,
        result: "already_confirmed",
      });
      return new ResolveResult("already_confirmed");
    }

    const bumpPct = clampBumpPct(bumpPctOverride ?? this.config.minGasBumpPct, this.config);
    const bumpMultiplier = 1 + bumpPct / 100;

    const baseFee = await this.tracker.getCurrentBaseFee();
    const newPriorityFee = BigInt(Math.ceil(Number(stuckTx.maxPriorityFeePerGas) * bumpMultiplier));
    // Base's documented formula: headroom for the base fee to double.
    const newMaxFee = baseFee * 2n + newPriorityFee;

    // Never go backwards even if the base-fee-derived value is lower than
    // a straight bump on the original maxFeePerGas.
    const finalMaxFee =
      newMaxFee > BigInt(Math.ceil(Number(stuckTx.maxFeePerGas) * bumpMultiplier))
        ? newMaxFee
        : BigInt(Math.ceil(Number(stuckTx.maxFeePerGas) * bumpMultiplier));

    let newHash: `0x${string}`;
    if (this.config.dryRun) {
      // Never touches the network or a signing key. Deterministic fake
      // hash so repeated dry runs are traceable in the log without ever
      // broadcasting anything.
      newHash = `0xdryrun${gapNonce.toString(16).padStart(4, "0")}${Date.now().toString(16)}`.slice(0, 66) as `0x${string}`;
    } else {
      try {
        newHash = await this.walletClient!.sendTransaction({
          account: this.account!,
          chain: baseSepolia,
          to: stuckTx.to,
          value: stuckTx.value,
          data: stuckTx.data,
          gas: stuckTx.gasLimit,
          nonce: stuckTx.nonce,
          maxPriorityFeePerGas: newPriorityFee,
          maxFeePerGas: finalMaxFee,
        });
      } catch (err) {
        await this.logger.log({
          action: "gap_resolve_failed",
          wallet: this.config.walletAddress,
          gapNonce,
          originalTxHash: stuckTx.hash,
          reason: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }

    const replacement: TrackedTx = { ...stuckTx, hash: newHash, submittedAt: Date.now(), maxPriorityFeePerGas: newPriorityFee, maxFeePerGas: finalMaxFee };
    this.store.add(replacement);

    await this.logger.log({
      action: "gap_resolved",
      wallet: this.config.walletAddress,
      gapNonce,
      originalTxHash: stuckTx.hash,
      newTxHash: newHash,
      oldMaxPriorityFeePerGas: stuckTx.maxPriorityFeePerGas.toString(),
      newMaxPriorityFeePerGas: newPriorityFee.toString(),
      bumpPct,
      result: this.config.dryRun ? "dry_run" : "success",
    });

    return new ResolveResult("resolved", newHash);
  }
}
