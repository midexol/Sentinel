import { appendFile, mkdir, readdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";

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
  | "eviction_resubmission_limit"
  | "diagnosis" // the AI reasoning step - see agent.ts
  | "circuit_breaker_tripped"
  | "circuit_breaker_reset"
  | "sentinel_halted"
  | "sentinel_resumed";

export interface AuditEntryBase {
  action: AuditAction;
  wallet: string;
}

export type AuditEntry = AuditEntryBase & { timestamp: string } & Record<string, unknown>;

export type AuditHook = (entry: AuditEntryBase & Record<string, unknown>) => void;

const SENSITIVE_KEY_PARTS = ["privatekey", "secret", "apikey", "authorization", "password", "token"];

function redactString(value: string, keyName?: string): string {
  let scrubbed = value
    // key=value style secrets in query strings / payloads
    .replace(/(token|secret|key|password)=([^\s&]+)/gi, "$1=[REDACTED]")
    // Authorization-style bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]")
    // Webhook URLs carry their secret in the path (Discord, Slack, Telegram bot tokens)
    .replace(/https?:\/\/[^\s"']*(?:webhook|hooks\.|\/bot)[^\s"']*/gi, (url) => {
      try {
        return `${new URL(url).origin}/[REDACTED]`;
      } catch {
        return "[REDACTED_URL]";
      }
    });
  // Scrub 64-character hex if keyName indicates a private key, but preserve transaction hashes
  if (keyName && keyName.toLowerCase().includes("key") && !keyName.toLowerCase().includes("hash")) {
    scrubbed = scrubbed.replace(/0x[a-fA-F0-9]{64}/g, "0x[REDACTED_KEY]");
  }
  return scrubbed;
}

export function redactSensitiveData(obj: unknown, keyName?: string): unknown {
  if (typeof obj === "string") return redactString(obj, keyName);
  if (Array.isArray(obj)) return obj.map((item) => redactSensitiveData(item, keyName));
  if (obj !== null && typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEY_PARTS.some((part) => lower.includes(part))) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = redactSensitiveData(val, key);
      }
    }
    return sanitized;
  }
  return obj;
}

export interface LoggerOptions {
  rotation?: boolean;
  maxSizeMb?: number;
  retentionDays?: number;
}

export class AuditLogger {
  private queue: Promise<void> = Promise.resolve();
  private hooks: AuditHook[] = [];
  private readonly rotation: boolean;
  private readonly maxBytes: number;
  private readonly retentionMs: number;

  constructor(private readonly filePath: string, options: LoggerOptions = {}) {
    this.rotation = options.rotation ?? false;
    this.maxBytes = (options.maxSizeMb ?? 100) * 1024 * 1024;
    this.retentionMs = (options.retentionDays ?? 7) * 24 * 3600 * 1000;
  }

  /** Register a listener (e.g. the alerter) invoked after each entry is recorded. */
  onEntry(hook: AuditHook): void {
    this.hooks.push(hook);
  }

  /**
   * Appends one JSON line. Writes are serialized so concurrent callers can't
   * interleave, and a logging failure (full disk, permissions) is reported on
   * stderr but never thrown - the audit trail must not take down the trading path.
   */
  async log<T extends AuditEntryBase>(entry: T): Promise<void> {
    const sanitizedEntry = redactSensitiveData(entry) as T;
    const full = { ...sanitizedEntry, timestamp: new Date().toISOString() };
    const line = JSON.stringify(full) + "\n";

    this.queue = this.queue.then(async () => {
      try {
        await this.rotateIfNeeded();
        await mkdir(path.dirname(path.resolve(this.filePath)), { recursive: true });
        await appendFile(this.filePath, line, "utf8");
      } catch (err) {
        console.error("[logger] Failed to write audit entry:", err instanceof Error ? err.message : err);
      }
    });
    await this.queue;

    // Mirror to stdout too: useful for the live demo and terminal tracing
    console.log(`[${full.action}]`, JSON.stringify(sanitizedEntry));

    for (const hook of this.hooks) {
      try {
        hook(sanitizedEntry as AuditEntryBase & Record<string, unknown>);
      } catch {
        // hooks are best-effort
      }
    }
  }

  private async rotateIfNeeded(): Promise<void> {
    if (!this.rotation) return;
    let size: number;
    try {
      size = (await stat(this.filePath)).size;
    } catch {
      return; // file doesn't exist yet
    }
    if (size < this.maxBytes) return;

    const rotated = `${this.filePath}.${new Date().toISOString().replace(/[:.]/g, "-")}`;
    await rename(this.filePath, rotated);
    await this.pruneRotated();
  }

  private async pruneRotated(): Promise<void> {
    const dir = path.dirname(path.resolve(this.filePath));
    const base = path.basename(this.filePath);
    const now = Date.now();
    for (const name of await readdir(dir)) {
      if (!name.startsWith(`${base}.`)) continue;
      const full = path.join(dir, name);
      try {
        if (now - (await stat(full)).mtimeMs > this.retentionMs) await unlink(full);
      } catch {
        // ignore races with other processes
      }
    }
  }
}
