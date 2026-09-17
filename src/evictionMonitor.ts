import type { SentinelConfig } from "./config.js";
import type { NonceTracker, PendingTxStore } from "./nonceTracker.js";
import type { GapResolver } from "./resolver.js";
import type { AuditLogger } from "./logger.js";

/**
 * Base doesn't emit an "evicted" event - the only signal is a transaction
 * that was pending and then simply stops being findable by hash. This
 * tracks "not_found" streaks per transaction and calls it an eviction once
 * that streak outlasts EVICTION_TIMEOUT_MS *and* the tx was seen pending
 * at least once before (so a tx that's simply new and hasn't propagated
 * yet isn't misclassified as evicted).
 */
export class EvictionMonitor {
  private everSeenPending = new Set<`0x${string}`>();
  private notFoundSince = new Map<`0x${string}`, number>();

  constructor(
    private readonly config: SentinelConfig,
    private readonly tracker: NonceTracker,
    private readonly store: PendingTxStore,
    private readonly resolver: GapResolver,
    private readonly logger: AuditLogger
  ) {}

  /** Call this on a timer (e.g. every gapDetectionIntervalMs). */
  async checkOnce(): Promise<void> {
    const now = Date.now();

    for (const tx of this.store.all()) {
      const status = await this.tracker.getTransactionStatus(tx.hash);

      if (status === "confirmed") {
        this.store.remove(tx.nonce);
        this.everSeenPending.delete(tx.hash);
        this.notFoundSince.delete(tx.hash);
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

      if (now - since >= this.config.evictionTimeoutMs) {
        await this.logger.log({
          action: "eviction_detected",
          wallet: this.config.walletAddress,
          nonce: tx.nonce,
          txHash: tx.hash,
          notFoundForMs: now - since,
        });

        try {
          const result = await this.resolver.resolveGap(tx.nonce);
          await this.logger.log({
            action: "eviction_resolved",
            wallet: this.config.walletAddress,
            nonce: tx.nonce,
            outcome: result.outcome,
            newTxHash: result.newHash ?? null,
          });
        } catch (err) {
          // resolver already logs the failure; nothing more to do here.
        } finally {
          this.notFoundSince.delete(tx.hash);
        }
      }
    }
  }
}
