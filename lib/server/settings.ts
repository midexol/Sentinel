import fs from "node:fs";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const SETTINGS_PATH = process.env.SETTINGS_FILE || path.join(process.cwd(), "settings.json");

export const WEBHOOK_MASK = "https://•••••• (stored)";

export function defaultSettings(): any {
  return {
    system: {
      walletAddress: process.env.WALLET_ADDRESS || "",
      rpcUrl: process.env.RPC_URL || "",
      chainId: (process.env.NEXT_PUBLIC_CHAIN ?? process.env.CHAIN) === "mainnet" ? 8453 : 84532,
      version: "1.0.0",
    },
    nonceTracking: {
      gapDetectionInterval: 500,
      pendingNonceTag: "pending",
      maxPendingTransactions: 50,
      gapResolutionStrategy: "replace",
    },
    gasStrategy: {
      minGasIncreasePct: 10,
      maxFeeMultiplier: 2.0,
      priorityFeeStrategy: "max",
      customPriorityFeeGwei: 0.001,
      maxGasPriceCapGwei: 100,
      gasPriceRefreshInterval: 2000,
    },
    evictionMonitoring: {
      evictionTimeout: 30000,
      evictionCheckInterval: 5000,
      maxEvictionResubmissions: 3,
      evictionBackoffMultiplier: 1.5,
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 10,
      failureWindow: 300000,
      cooldownPeriod: 60000,
      autoRecovery: true,
    },
    alerts: {
      telegramWebhookUrl: "",
      discordWebhookUrl: "",
      alertOnGapDetected: true,
      alertOnGapResolved: true,
      alertOnGapResolutionFailed: true,
      alertOnEviction: true,
      alertOnCircuitBreaker: true,
      alertCooldown: 30000,
    },
    audit: {
      logLevel: "info",
      logFormat: "jsonl",
      logFilePath: "./sentinel.log",
      maxLogSizeMb: 100,
      logRetentionDays: 7,
      logRotation: true,
    },
  };
}

/** True when PRIVATE_KEY is present and well-formed - computed, never stored. */
export function privateKeyLoaded(): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(process.env.PRIVATE_KEY ?? "");
}

/** Stored settings layered over defaults, section by section. */
export function readSettings(): any {
  const defaults = defaultSettings();
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const stored = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
      for (const section of Object.keys(defaults)) {
        defaults[section] = { ...defaults[section], ...(stored[section] ?? {}) };
      }
    }
  } catch (err) {
    console.error("Error reading settings.json:", err);
  }
  // Environment is the source of truth for the wallet when it is set.
  if (process.env.WALLET_ADDRESS) defaults.system.walletAddress = process.env.WALLET_ADDRESS;
  defaults.system.privateKeyLoaded = privateKeyLoaded();
  return defaults;
}

export class SettingsWriteError extends Error {}

export function writeSettings(settings: any): void {
  // privateKeyLoaded is derived from the environment; never persist it.
  const toStore = JSON.parse(JSON.stringify(settings));
  if (toStore.system) delete toStore.system.privateKeyLoaded;
  try {
    const tmp = `${SETTINGS_PATH}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(toStore, null, 2), "utf-8");
    fs.renameSync(tmp, SETTINGS_PATH);
  } catch (err: any) {
    if (err?.code === "EROFS" || err?.code === "EACCES" || err?.code === "EPERM") {
      throw new SettingsWriteError(
        "settings.json is not writable in this environment (read-only filesystem). Edit it in your deployment or mount it writable."
      );
    }
    throw err;
  }
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export type AuthResult = "ok" | "unauthorized" | "disabled";

/**
 * Gate for anything that mutates settings or triggers outbound requests.
 * - SETTINGS_ADMIN_TOKEN set: a matching Bearer token is required.
 * - Not set: only allowed outside production, and only same-origin
 *   (blocks cross-site requests against a developer's local dashboard).
 */
export function authorize(req: Request): AuthResult {
  const token = process.env.SETTINGS_ADMIN_TOKEN;
  if (token) {
    const header = req.headers.get("authorization") ?? "";
    const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
    return safeCompare(presented, token) ? "ok" : "unauthorized";
  }
  if (process.env.NODE_ENV === "production") return "disabled";

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return "unauthorized";
    } catch {
      return "unauthorized";
    }
  }
  return "ok";
}

/** Webhook URLs embed their secret in the path; only authorized callers may read them back. */
export function maskWebhooks(settings: any): any {
  const copy = JSON.parse(JSON.stringify(settings));
  if (copy.alerts) {
    for (const key of ["telegramWebhookUrl", "discordWebhookUrl"]) {
      if (copy.alerts[key]) copy.alerts[key] = WEBHOOK_MASK;
    }
  }
  return copy;
}

/** When the client echoes back the mask, keep the stored value instead of overwriting it. */
export function restoreMaskedWebhooks(incoming: any, stored: any): void {
  if (!incoming?.alerts) return;
  for (const key of ["telegramWebhookUrl", "discordWebhookUrl"]) {
    if (incoming.alerts[key] === WEBHOOK_MASK) incoming.alerts[key] = stored?.alerts?.[key] ?? "";
  }
}

/** Reject webhook targets that would let the server be pointed at internal services. */
export function isSafeWebhookUrl(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false;
  // IPv6 literals and private / link-local / loopback IPv4 literals
  if (host.startsWith("[")) return false;
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return false;
    }
  }
  return true;
}
