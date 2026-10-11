import {
  createWalletClient,
  http,
  type WalletClient,
  type Account,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, base } from "viem/chains";
import type { SentinelConfig } from "./config.js";
import type { NonceTracker, PendingTxStore, TrackedTx } from "./nonceTracker.js";
import type { AuditLogger } from "./logger.js";

export class NoPrivateKeyError extends Error {
  constructor() {
    super(
      "Cannot resolve gaps: PRIVATE_KEY is not set in .env. Sentinel can watch and detect read-only, but resolving a stuck transaction requires a signing key."
    );
  }
}

/** The gap nonce was never submitted through Sentinel, so there is nothing to replace. Not an infrastructure failure. */
export class UntrackedNonceError extends Error {
  constructor(nonce: number) {
    super(
      `No tracked transaction for nonce ${nonce}. The Sentinel only knows about transactions it saw submitted - it cannot resolve a gap it never recorded.`
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
 * This is the hard boundary: whatever suggests the bump size (the fixed
 * default or the AI diagnosis layer), the actual transaction can never go
 * outside [minGasBumpPct, maxGasBumpPct]. Non-finite proposals (NaN,
 * Infinity) fall back to the floor rather than propagating.
 */
export function clampBumpPct(proposedPct: number, config: SentinelConfig): number {
  if (!Number.isFinite(proposedPct)) return config.minGasBumpPct;
  return Math.min(Math.max(proposedPct, config.minGasBumpPct), config.maxGasBumpPct);
}

/** Multiply a wei amount by (1 + pct/100), rounding up, using integer math (basis points). */
export function bumpWei(amount: bigint, pct: number): bigint {
  const bps = BigInt(Math.round(pct * 100));
  return (amount * (10_000n + bps) + 9_999n) / 10_000n;
}

export class GapResolver {
  private readonly account: Account | null;
  private readonly walletClient: WalletClient | null;
  private readonly inFlight = new Set<number>();

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
        chain: config.chain === "sepolia" ? baseSepolia : base,
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
   * Safety: always checks whether the nonce has already been mined first.
   * If the network confirmed the original (or any earlier replacement)
   * between detection and resolution, this does nothing.
   */
  async resolveGap(gapNonce: number, bumpPctOverride?: number): Promise<ResolveResult> {
    if (!this.config.dryRun && (!this.walletClient || !this.account)) {
      throw new NoPrivateKeyError();
    }

    // The proxy, the watch loop and the eviction monitor can all notice the
    // same gap; only one of them may replace a given nonce at a time.
    if (this.inFlight.has(gapNonce)) {
      throw new Error(`Resolution for nonce ${gapNonce} is already in progress.`);
    }
    this.inFlight.add(gapNonce);
    try {
      return await this.resolveInner(gapNonce, bumpPctOverride);
    } finally {
      this.inFlight.delete(gapNonce);
    }
  }

  private async resolveInner(gapNonce: number, bumpPctOverride?: number): Promise<ResolveResult> {
    const stuckTx = this.store.get(gapNonce);
    if (!stuckTx) {
      await this.logger.log({
        action: "gap_resolve_failed",
        wallet: this.config.walletAddress,
        gapNonce,
        reason: "no_tracked_tx_for_nonce",
      });
      throw new UntrackedNonceError(gapNonce);
    }

    // Race-condition guard: the network may have confirmed it already. Check
    // the nonce itself, not just the latest hash - an earlier replacement of
    // this nonce could be the one that landed.
    const alreadyConfirmed =
      (await this.tracker.isNonceMined(gapNonce)) || (await this.tracker.isConfirmed(stuckTx.hash));
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

    const baseFee = await this.tracker.getCurrentBaseFee();

    // Replacement must beat the original by the bump on both fee fields; make
    // sure a zero/tiny original fee still strictly increases.
    const bumpedPriority = bumpWei(stuckTx.maxPriorityFeePerGas, bumpPct);
    const newPriorityFee = bumpedPriority > stuckTx.maxPriorityFeePerGas ? bumpedPriority : stuckTx.maxPriorityFeePerGas + 1n;

    // Base's documented formula: headroom for the base fee to move.
    const headroomBps = BigInt(Math.round(this.config.baseFeeMultiplier * 10_000));
    const newMaxFee = (baseFee * headroomBps) / 10_000n + newPriorityFee;

    // Never go backwards even if the base-fee-derived value is lower than
    // a straight bump on the original maxFeePerGas.
    const bumpedOriginalMax = bumpWei(stuckTx.maxFeePerGas, bumpPct);
    let finalMaxFee = newMaxFee > bumpedOriginalMax ? newMaxFee : bumpedOriginalMax;
    if (finalMaxFee <= stuckTx.maxFeePerGas) finalMaxFee = stuckTx.maxFeePerGas + 1n;
    if (finalMaxFee < newPriorityFee) finalMaxFee = newPriorityFee;

    // Hard ceiling from settings: refuse rather than silently overpay.
    const capWei = BigInt(Math.floor(this.config.maxGasPriceCapGwei * 1e9));
    if (finalMaxFee > capWei) {
      const reason = `replacement maxFeePerGas ${finalMaxFee} wei exceeds cap of ${this.config.maxGasPriceCapGwei} gwei`;
      await this.logger.log({
        action: "gap_resolve_failed",
        wallet: this.config.walletAddress,
        gapNonce,
        originalTxHash: stuckTx.hash,
        reason,
      });
      throw new Error(`Refusing to resolve nonce ${gapNonce}: ${reason}.`);
    }

    let newHash: `0x${string}`;
    if (this.config.dryRun) {
      // Never touches the network or a signing key. A fake hash keeps repeated
      // dry runs traceable in the log without ever broadcasting anything.
      const body = `${gapNonce.toString(16).padStart(8, "0")}${Date.now().toString(16).padStart(12, "0")}`;
      newHash = `0xdd${body}`.padEnd(66, "0") as `0x${string}`;
    } else {
      try {
        newHash = await this.walletClient!.sendTransaction({
          account: this.account!,
          chain: this.config.chain === "sepolia" ? baseSepolia : base,
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

      // Only a real broadcast changes what we track; a dry run must leave the
      // (possibly shared) state untouched.
      const replacement: TrackedTx = {
        ...stuckTx,
        hash: newHash,
        submittedAt: Date.now(),
        maxPriorityFeePerGas: newPriorityFee,
        maxFeePerGas: finalMaxFee,
      };
      this.store.add(replacement);
    }

    await this.logger.log({
      action: "gap_resolved",
      wallet: this.config.walletAddress,
      gapNonce,
      originalTxHash: stuckTx.hash,
      newTxHash: newHash,
      oldMaxPriorityFeePerGas: stuckTx.maxPriorityFeePerGas.toString(),
      newMaxPriorityFeePerGas: newPriorityFee.toString(),
      oldMaxFeePerGas: stuckTx.maxFeePerGas.toString(),
      newMaxFeePerGas: finalMaxFee.toString(),
      bumpPct,
      result: this.config.dryRun ? "dry_run" : "success",
    });

    return new ResolveResult("resolved", newHash);
  }
}
