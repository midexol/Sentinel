import { appendFile } from "node:fs/promises";

/**
 * Every action the Sentinel takes gets one JSON line. This is the receipt
 * trail - the thing a judge (or a developer debugging a 3am incident) can
 * point to and verify against BaseScan.
 */
export type AuditAction =
  | "gap_detected"
  | "gap_resolved"
  | "gap_resolve_failed"
  | "eviction_detected"
  | "eviction_resolved"
  | "diagnosis" // the AI reasoning step - see agent.ts
  | "circuit_breaker_tripped"
  | "circuit_breaker_reset";

export interface AuditEntryBase {
  action: AuditAction;
  wallet: string;
}

export type AuditEntry = AuditEntryBase & { timestamp: string } & Record<string, unknown>;

function redactSensitiveData(obj: unknown): unknown {
  if (typeof obj === "string") {
    // Redact 32-byte hex keys (64 hex characters preceded by 0x)
    const withoutKey = obj.replace(/0x[a-fA-F0-9]{64}/g, "0x[REDACTED_KEY]");
    // Redact webhook secrets or tokens
    return withoutKey.replace(/(token|secret|key|password)=([^\s&]+)/gi, "$1=[REDACTED]");
  }
  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }
  if (obj !== null && typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("privatekey") ||
        lower.includes("secret") ||
        lower.includes("apikey") ||
        lower.includes("authorization") ||
        lower.includes("password")
      ) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = redactSensitiveData(val);
      }
    }
    return sanitized;
  }
  return obj;
}

export class AuditLogger {
  constructor(private readonly filePath: string) {}

  async log<T extends AuditEntryBase>(entry: T): Promise<void> {
    const sanitizedEntry = redactSensitiveData(entry) as T;
    const full = { ...sanitizedEntry, timestamp: new Date().toISOString() };
    const line = JSON.stringify(full) + "\n";
    await appendFile(this.filePath, line, "utf8");
    // Mirror to stdout too: useful for the live demo and terminal tracing
    console.log(`[${full.action}]`, JSON.stringify(sanitizedEntry));
  }
}
