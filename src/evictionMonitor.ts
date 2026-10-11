import type { SentinelConfig } from "./config.js";
import type { NonceTracker, PendingTxStore } from "./nonceTracker.js";
import { UntrackedNonceError, type GapResolver } from "./resolver.js";
import type { CircuitBreaker } from "./circuitBreaker.js";
import type { AuditLogger } from "./logger.js";

/**
 * Base doesn't emit an "evicted" event - the only signal is a transaction
 * that was pending and then simply stops being findable by hash. This
 * tracks "not_found" streaks per transaction and calls it an eviction once
 * that streak outlasts EVICTION_TIMEOUT_MS *and* the tx was seen pending
 * at least once before (so a tx that's simply new and hasn't propagated
 * yet isn't misclassified as evicted).
 *
 * Each nonce is resubmitted at most `maxEvictionResubmissions` times, and
 * successive resubmissions wait `evictionBackoffMultiplier` times longer.
 */
export class EvictionMonitor {
  private everSeenPending = new Set<`0x${string}`>();
  private notFoundSince = new Map<`0x${string}`, number>();
  private resubmissions = new Map<number, { count: number; lastAt: number }>();

  constructor(
    private readonly config: SentinelConfig,
    private readonly tracker: NonceTracker,
    private readonly store: PendingTxStore,
    private readonly resolver: GapResolver,
    private readonly logger: AuditLogger,
    private readonly breaker?: CircuitBreaker
  ) {}

  /** Call this on a timer (e.g. every gapDetectionIntervalMs). */
  async checkOnce(): Promise<void> {
    const now = Date.now();

    for (const tx of this.store.all()) {
      const status = await this.tracker.getTransactionStatus(tx.hash);

      if (status === "unknown") continue; // RPC trouble is not evidence of eviction

      if (status === "confirmed") {
        this.store.remove(tx.nonce);
        this.everSeenPending.delete(tx.hash);
        this.notFoundSince.delete(tx.hash);
        this.resubmissions.delete(tx.nonce);
        continue;
      }

      if (status === "pending") {
        this.everSeenPending.add(tx.hash);
        this.notFoundSince.delete(tx.hash);
        continue;
      }

      // status === "not_found"
      if (!this.everSeenPending.has(tx.hash)) {
        continue; // hasn't propagated yet, give it time before suspecting eviction
      }

      const since = this.notFoundSince.get(tx.hash) ?? now;
      this.notFoundSince.set(tx.hash, since);

      const prior = this.resubmissions.get(tx.nonce);
      const backoffMs = prior
        ? this.config.evictionTimeoutMs * Math.pow(this.config.evictionBackoffMultiplier, prior.count)
        : this.config.evictionTimeoutMs;
      if (now - since < backoffMs) continue;

      if (prior && prior.count >= this.config.maxEvictionResubmissions) {
        await this.logger.log({
          action: "eviction_resubmission_limit",
          wallet: this.config.walletAddress,
          nonce: tx.nonce,
          txHash: tx.hash,
          resubmissions: prior.count,
        });
        // Stop tracking: further automatic attempts are pointless and would burn gas.
        this.store.remove(tx.nonce);
        this.notFoundSince.delete(tx.hash);
        this.resubmissions.delete(tx.nonce);
        continue;
      }

      await this.logger.log({
        action: "eviction_detected",
        wallet: this.config.walletAddress,
        nonce: tx.nonce,
        txHash: tx.hash,
        notFoundForMs: now - since,
      });

      try {
        const result = await this.resolver.resolveGap(tx.nonce);
        this.resubmissions.set(tx.nonce, { count: (prior?.count ?? 0) + 1, lastAt: now });
        await this.logger.log({
          action: "eviction_resolved",
          wallet: this.config.walletAddress,
          nonce: tx.nonce,
          outcome: result.outcome,
          newTxHash: result.newHash ?? null,
        });
      } catch (err) {
        // The resolver already logged the failure; count it toward the breaker.
        if (!(err instanceof UntrackedNonceError)) await this.breaker?.recordFailure();
      } finally {
        this.notFoundSince.delete(tx.hash);
      }
    }
  }
}
