import { parseTransaction } from "viem";
import type { SentinelConfig } from "./config.js";
import type { NonceTracker, PendingTxStore, TrackedTx, GapInfo, NonceState } from "./nonceTracker.js";
import type { GapResolver } from "./resolver.js";
import type { GapDiagnostician } from "./agent.js";
import type { AuditLogger } from "./logger.js";

interface RecentEvent {
  timestamp: number;
  kind: "gap" | "eviction" | "resolved" | "failed";
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
  private recentEvents: RecentEvent[] = [];

  constructor(
    private readonly config: SentinelConfig,
    private readonly tracker: NonceTracker,
    private readonly store: PendingTxStore,
    private readonly resolver: GapResolver,
    private readonly diagnostician: GapDiagnostician,
    private readonly logger: AuditLogger
  ) {}

  private record(kind: RecentEvent["kind"]): void {
    this.recentEvents.push({ timestamp: Date.now(), kind });
    if (this.recentEvents.length > 50) this.recentEvents.shift();
  }

  async getNonceState(): Promise<NonceState> {
    return this.tracker.getNonceState();
  }

  async detectGap(): Promise<GapInfo | null> {
    return this.tracker.detectGap();
  }

  /**
   * Submits a signed transaction on the bot's behalf. If a nonce gap
   * exists ahead of this transaction, resolves it first (diagnose, then
   * resubmit the stuck one with a safely-clamped gas bump), then forwards
   * the bot's own transaction unchanged. If there's no gap, forwards
   * immediately.
   */
  async submitTransaction(signedTx: `0x${string}`): Promise<`0x${string}`> {
    const parsed = parseTransaction(signedTx);
    if (parsed.nonce === undefined || !parsed.to) {
      throw new Error("Interceptor requires a fully-formed signed transaction (nonce and to are required).");
    }

    const gap = await this.tracker.detectGap();

    // Only act if the gap is strictly behind the transaction we're about
    // to send - if this transaction *is* the gap filler, or the gap is
    // ahead of it, there's nothing to resolve before forwarding.
    if (gap && gap.gapNonce < parsed.nonce) {
      this.record("gap");
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
        this.record("resolved");
      } catch (err) {
        this.record("failed");
        // We still forward the bot's transaction below - it may queue
        // behind the gap rather than land immediately, but silently
        // dropping the bot's own submission because gap resolution failed
        // would be worse than letting it queue.
        await this.logger.log({
          action: "gap_resolve_failed",
          wallet: this.config.walletAddress,
          gapNonce: gap.gapNonce,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const hash = await this.tracker.broadcastRaw(signedTx);

    const tracked: TrackedTx = {
      hash,
      nonce: parsed.nonce,
      to: parsed.to,
      value: parsed.value ?? 0n,
      data: parsed.data ?? "0x",
      gasLimit: parsed.gas ?? 0n,
      maxPriorityFeePerGas: parsed.maxPriorityFeePerGas ?? 0n,
      maxFeePerGas: parsed.maxFeePerGas ?? 0n,
      submittedAt: Date.now(),
    };
    this.store.add(tracked);

    return hash;
  }
}
