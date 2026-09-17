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

export class AuditLogger {
  constructor(private readonly filePath: string) {}

  async log<T extends AuditEntryBase>(entry: T): Promise<void> {
    const full = { ...entry, timestamp: new Date().toISOString() };
    const line = JSON.stringify(full) + "\n";
    await appendFile(this.filePath, line, "utf8");
    // Mirror to stdout too - useful for the live demo.
    console.log(`[${full.action}]`, JSON.stringify(entry));
  }
}
