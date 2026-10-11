import type { SentinelConfig } from "./config.js";
import type { AuditLogger } from "./logger.js";
import { StateFile } from "./state.js";

/**
 * Tracks *failed* resolutions/evictions in a rolling time window. A burst
 * of successful gap resolutions during a busy market isn't a problem -
 * only a burst of failures means something is structurally wrong (RPC
 * down, wallet out of funds, network degraded), which is when we want to
 * stop the trading bot rather than keep burning gas on doomed retries.
 *
 * State lives in the shared StateFile so the proxy and the watchdog see the
 * same breaker, and it survives restarts (a crash-looping container must
 * not silently reset a tripped breaker). When autoRecovery is on, a tripped
 * breaker closes again after the configured cooldown.
 */
export class CircuitBreaker {
  constructor(
    private readonly config: SentinelConfig,
    private readonly logger: AuditLogger,
    private readonly state: StateFile = new StateFile(null)
  ) {}

  isTripped(): boolean {
    if (!this.config.circuitBreakerEnabled) return false;
    const { tripped, trippedAt } = this.state.read().breaker;
    if (!tripped) return false;
    if (
      this.config.circuitBreakerAutoRecovery &&
      trippedAt !== null &&
      Date.now() - trippedAt >= this.config.circuitBreakerCooldownMs
    ) {
      this.clear();
      void this.logger.log({ action: "circuit_breaker_reset", wallet: this.config.walletAddress, reason: "cooldown_elapsed" });
      return false;
    }
    return true;
  }

  async recordFailure(): Promise<void> {
    if (!this.config.circuitBreakerEnabled) return;
    const now = Date.now();
    let justTripped = false;
    let failures = 0;

    this.state.update((s) => {
      s.breaker.failures = [...s.breaker.failures, now].filter(
        (t) => now - t <= this.config.circuitBreakerWindowMs
      );
      failures = s.breaker.failures.length;
      if (!s.breaker.tripped && failures >= this.config.circuitBreakerThreshold) {
        s.breaker.tripped = true;
        s.breaker.trippedAt = now;
        justTripped = true;
      }
    });

    if (justTripped) {
      // The alerter listens to this audit entry and delivers the webhook.
      await this.logger.log({
        action: "circuit_breaker_tripped",
        wallet: this.config.walletAddress,
        failuresInWindow: failures,
        windowMs: this.config.circuitBreakerWindowMs,
      });
    }
  }

  async reset(): Promise<void> {
    const wasTripped = this.state.read().breaker.tripped;
    this.clear();
    if (wasTripped) {
      await this.logger.log({ action: "circuit_breaker_reset", wallet: this.config.walletAddress });
    }
  }

  private clear(): void {
    this.state.update((s) => {
      s.breaker = { tripped: false, trippedAt: null, failures: [] };
    });
  }
}
