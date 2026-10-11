import type { SentinelConfig } from "./config.js";
import type { AuditAction, AuditEntryBase } from "./logger.js";

type AlertKind = keyof SentinelConfig["alertOn"];

const ACTION_TO_KIND: Partial<Record<AuditAction, AlertKind>> = {
  gap_detected: "gapDetected",
  gap_resolved: "gapResolved",
  gap_resolve_failed: "gapResolutionFailed",
  eviction_detected: "eviction",
  circuit_breaker_tripped: "circuitBreaker",
};

export async function postWebhook(url: string, text: string): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // `text` for Slack/generic receivers, `content` for Discord.
    body: JSON.stringify({ text, content: text }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
}

function describe(entry: AuditEntryBase & Record<string, unknown>): string {
  const nonce = entry.gapNonce ?? entry.nonce;
  const where = nonce !== undefined ? ` (nonce ${String(nonce)})` : "";
  switch (entry.action) {
    case "gap_detected":
      return `Sentinel: nonce gap detected${where} for ${entry.wallet}.`;
    case "gap_resolved":
      return `Sentinel: gap resolved${where} for ${entry.wallet} - ${String(entry.result ?? "ok")}.`;
    case "gap_resolve_failed":
      return `Sentinel: gap resolution FAILED${where} for ${entry.wallet}: ${String(entry.reason ?? "unknown")}.`;
    case "eviction_detected":
      return `Sentinel: mempool eviction detected${where} for ${entry.wallet}.`;
    case "circuit_breaker_tripped":
      return `Sentinel circuit breaker tripped for ${entry.wallet}: ${String(entry.failuresInWindow)} failures in ${Number(entry.windowMs) / 1000}s. Trading bot should halt.`;
    default:
      return `Sentinel: ${entry.action}`;
  }
}

/**
 * Sends best-effort webhook alerts for audit events, honouring the
 * per-event toggles and the cooldown from settings. Circuit-breaker alerts
 * bypass the cooldown: they are rare and must never be swallowed.
 */
export class Alerter {
  private lastSent = new Map<AlertKind, number>();

  constructor(private readonly config: SentinelConfig) {}

  handle = (entry: AuditEntryBase & Record<string, unknown>): void => {
    const kind = ACTION_TO_KIND[entry.action];
    if (!kind || !this.config.alertOn[kind] || this.config.alertWebhookUrls.length === 0) return;

    const now = Date.now();
    const last = this.lastSent.get(kind) ?? 0;
    if (kind !== "circuitBreaker" && now - last < this.config.alertCooldownMs) return;
    this.lastSent.set(kind, now);

    const text = describe(entry);
    for (const url of this.config.alertWebhookUrls) {
      postWebhook(url, text).catch((err) => {
        console.error("[alerts] Webhook delivery failed:", err instanceof Error ? err.message : err);
      });
    }
  };
}
