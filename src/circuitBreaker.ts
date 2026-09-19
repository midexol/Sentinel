import type { SentinelConfig } from "./config.js";
import type { AuditLogger } from "./logger.js";

/**
 * Tracks *failed* resolutions/evictions in a rolling time window. A burst
 * of successful gap resolutions during a busy market isn't a problem -
 * only a burst of failures means something is structurally wrong (RPC
 * down, wallet out of funds, network degraded), which is when we want to
 * stop the trading bot rather than keep burning gas on doomed retries.
 */
export class CircuitBreaker {
  private failureTimestamps: number[] = [];
  private tripped = false;

  constructor(private readonly config: SentinelConfig, private readonly logger: AuditLogger) {}

  isTripped(): boolean {
    return this.tripped;
  }

  async recordFailure(): Promise<void> {
    const now = Date.now();
    this.failureTimestamps.push(now);
    this.failureTimestamps = this.failureTimestamps.filter(
      (t) => now - t <= this.config.circuitBreakerWindowMs
    );

    if (!this.tripped && this.failureTimestamps.length >= this.config.circuitBreakerThreshold) {
      this.tripped = true;
      await this.logger.log({
        action: "circuit_breaker_tripped",
        wallet: this.config.walletAddress,
        failuresInWindow: this.failureTimestamps.length,
        windowMs: this.config.circuitBreakerWindowMs,
      });
      if (this.config.alertWebhookUrl) {
        try {
          await fetch(this.config.alertWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: `🚨 Sentinel circuit breaker tripped for ${this.config.walletAddress}: ${this.failureTimestamps.length} failures in the last ${this.config.circuitBreakerWindowMs / 1000}s. Trading bot should halt.`,
            }),
          });
        } catch {
          // Alerting is best-effort - never let a webhook failure mask the trip itself.
        }
      }
    }
  }

  async reset(): Promise<void> {
    if (this.tripped) {
      this.tripped = false;
      this.failureTimestamps = [];
      await this.logger.log({ action: "circuit_breaker_reset", wallet: this.config.walletAddress });
    }
  }
}
