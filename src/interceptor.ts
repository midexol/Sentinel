import { parseTransaction, recoverTransactionAddress, type TransactionSerialized } from "viem";
import { CHAIN_IDS, type SentinelConfig } from "./config.js";
import {
  recordEvent,
  type NonceTracker,
  type PendingTxStore,
  type TrackedTx,
  type GapInfo,
  type NonceState,
  type RecentEvent,
} from "./nonceTracker.js";
import { UntrackedNonceError, type GapResolver } from "./resolver.js";
import type { GapDiagnostician } from "./agent.js";
import type { CircuitBreaker } from "./circuitBreaker.js";
import type { AuditLogger } from "./logger.js";

export class CircuitBreakerOpenError extends Error {
  constructor() {
    super("Sentinel circuit breaker is tripped: transaction submission is halted until it recovers.");
  }
}

/**
 * This is the piece a trading bot actually integrates with. Instead of
 * calling `client.sendRawTransaction(...)` directly, it calls
 * `interceptor.submitTransaction(signedTx)`. Everything else - gap
 * checking, diagnosis, resolution - happens automatically and
 * transparently before the bot's own transaction goes out.
 *
 * The bot still builds and signs its own transactions with its own
 * nonces; the interceptor never assigns nonces on the bot's behalf. It
 * only steps in when the chain reports a gap *behind* the transaction
 * the bot is currently trying to send.
 */
export class TransactionInterceptor {
  private readonly recentEvents: RecentEvent[] = [];
  private chain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly config: SentinelConfig,
    private readonly tracker: NonceTracker,
    private readonly store: PendingTxStore,
    private readonly resolver: GapResolver,
    private readonly diagnostician: GapDiagnostician,
    private readonly breaker: CircuitBreaker,
    private readonly logger: AuditLogger
  ) {}

  async getNonceState(): Promise<NonceState> {
    return this.tracker.getNonceState();
  }

  async detectGap(): Promise<GapInfo | null> {
    return this.tracker.detectGap();
  }

  /**
   * Submits a signed transaction on the bot's behalf. Submissions are
   * serialized so concurrent requests (e.g. a JSON-RPC batch) can't race to
   * resolve the same gap. If a nonce gap exists ahead of this transaction,
   * resolves it first (diagnose, then resubmit the stuck one with a
   * safely-clamped gas bump), then forwards the bot's own transaction
   * unchanged. If there's no gap, forwards immediately.
   */
  submitTransaction(signedTx: `0x${string}`): Promise<`0x${string}`> {
    const run = this.chain.then(() => this.submitInner(signedTx));
    this.chain = run.catch(() => undefined);
    return run;
  }

  private async submitInner(signedTx: `0x${string}`): Promise<`0x${string}`> {
    if (this.breaker.isTripped()) throw new CircuitBreakerOpenError();

    const parsed = parseTransaction(signedTx);

    if (parsed.chainId !== undefined && parsed.chainId !== CHAIN_IDS[this.config.chain]) {
      throw new Error(
        `Transaction chainId ${parsed.chainId} does not match configured chain (${this.config.chain}, ${CHAIN_IDS[this.config.chain]}).`
      );
    }

    // Transactions from other senders are not ours to protect: pass through.
    const sender = await recoverTransactionAddress({ serializedTransaction: signedTx as TransactionSerialized });
    if (sender.toLowerCase() !== this.config.walletAddress.toLowerCase()) {
      return this.tracker.broadcastRaw(signedTx);
    }

    // Replacement fees are computed from EIP-1559 fields. A legacy or 2930
    // transaction would be tracked with zero fees and "bumped" into nonsense.
    if (
      parsed.type !== "eip1559" ||
      parsed.nonce === undefined ||
      !parsed.to ||
      parsed.gas === undefined ||
      parsed.maxFeePerGas === undefined ||
      parsed.maxPriorityFeePerGas === undefined
    ) {
      throw new Error(
        "Interceptor requires a fully-formed EIP-1559 transaction (type 2 with nonce, to, gas, maxFeePerGas and maxPriorityFeePerGas)."
      );
    }

    const gap = await this.tracker.detectGap();

    // Only act if the gap is strictly behind the transaction we're about
    // to send - if this transaction *is* the gap filler, or the gap is
    // ahead of it, there's nothing to resolve before forwarding.
    if (gap && gap.gapNonce < parsed.nonce) {
      recordEvent(this.recentEvents, "gap");
      await this.logger.log({
        action: "gap_detected",
        wallet: this.config.walletAddress,
        gapNonce: gap.gapNonce,
        blockingSubmissionOfNonce: parsed.nonce,
      });

      const state = await this.tracker.getNonceState();
      const diagnosis = await this.diagnostician.diagnose(gap, state, this.recentEvents);

      try {
        await this.resolver.resolveGap(gap.gapNonce, diagnosis.recommendedBumpPct);
        recordEvent(this.recentEvents, "resolved");
      } catch (err) {
        recordEvent(this.recentEvents, "failed");
        // An untracked nonce is a coverage gap, not an infrastructure failure.
        if (!(err instanceof UntrackedNonceError)) await this.breaker.recordFailure();
        // We still forward the bot's transaction below - it may queue
        // behind the gap rather than land immediately, but silently
        // dropping the bot's own submission because gap resolution failed
        // would be worse than letting it queue. (The resolver already
        // wrote the failure to the audit log.)
        console.error(
          `[interceptor] Gap resolution failed for nonce ${gap.gapNonce}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    const hash = await this.tracker.broadcastRaw(signedTx);

    const tracked: TrackedTx = {
      hash,
      nonce: parsed.nonce,
      to: parsed.to,
      value: parsed.value ?? 0n,
      data: parsed.data ?? "0x",
      gasLimit: parsed.gas,
      maxPriorityFeePerGas: parsed.maxPriorityFeePerGas,
      maxFeePerGas: parsed.maxFeePerGas,
      submittedAt: Date.now(),
    };
    this.store.add(tracked);

    return hash;
  }
}
