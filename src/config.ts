import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

export type ChainName = "sepolia" | "mainnet";

/**
 * All Sentinel behavior is tunable via environment variables so it can be
 * dropped into any trading bot's deployment without code changes.
 *
 * Precedence: environment variable > settings.json > built-in default.
 * settings.json is what the web dashboard edits, so the values it exposes
 * for the daemon are honoured here.
 */
export interface SentinelConfig {
  chain: ChainName;
  rpcUrl: string;
  walletAddress: `0x${string}`;
  privateKey: `0x${string}` | null;
  gapDetectionIntervalMs: number;
  evictionTimeoutMs: number;
  maxEvictionResubmissions: number;
  evictionBackoffMultiplier: number;
  circuitBreakerEnabled: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerWindowMs: number;
  circuitBreakerCooldownMs: number;
  circuitBreakerAutoRecovery: boolean;
  logFile: string;
  logRotation: boolean;
  maxLogSizeMb: number;
  logRetentionDays: number;
  alertWebhookUrl: string | null;
  alertWebhookUrls: string[];
  alertOn: {
    gapDetected: boolean;
    gapResolved: boolean;
    gapResolutionFailed: boolean;
    eviction: boolean;
    circuitBreaker: boolean;
  };
  alertCooldownMs: number;
  minGasBumpPct: number; // floor: never resubmit with less than this bump
  maxGasBumpPct: number; // ceiling: AI suggestions are clamped to this
  baseFeeMultiplier: number; // headroom applied to the base fee for maxFeePerGas
  maxGasPriceCapGwei: number; // refuse to broadcast a replacement above this maxFeePerGas
  anthropicApiKey: string | null;
  agentModel: string;
  dryRun: boolean;
  stateFile: string | null;
  proxyHost: string;
  proxyPort: number;
  proxyAuthToken: string | null;
  proxyAllowedOrigins: string[];
}

export const CHAIN_IDS: Record<ChainName, number> = { sepolia: 84532, mainnet: 8453 };
export const DEFAULT_RPC: Record<ChainName, string> = {
  sepolia: "https://sepolia.base.org",
  mainnet: "https://mainnet.base.org",
};
export const DEFAULT_AGENT_MODEL = "claude-sonnet-5-5";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

function readSettingsFile(): Json {
  const file = process.env.SETTINGS_FILE ?? path.join(process.cwd(), "settings.json");
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (err) {
    console.error(`[config] Could not parse ${file}, ignoring it:`, err instanceof Error ? err.message : err);
  }
  return {};
}

interface NumOpts {
  min?: number;
  max?: number;
  int?: boolean;
}

/** Parse a number from env (or settings fallback), throwing on garbage instead of producing NaN. */
function num(name: string, fromSettings: unknown, fallback: number, opts: NumOpts = {}): number {
  const envRaw = process.env[name];
  const raw: unknown = envRaw !== undefined && envRaw !== "" ? envRaw : fromSettings ?? fallback;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a number, got: ${String(raw)}`);
  }
  if (opts.int && !Number.isInteger(value)) throw new Error(`${name} must be an integer, got: ${value}`);
  if (opts.min !== undefined && value < opts.min) throw new Error(`${name} must be >= ${opts.min}, got: ${value}`);
  if (opts.max !== undefined && value > opts.max) throw new Error(`${name} must be <= ${opts.max}, got: ${value}`);
  return value;
}

function bool(name: string, fromSettings: unknown, fallback: boolean): boolean {
  const envRaw = process.env[name];
  if (envRaw !== undefined && envRaw !== "") return envRaw.toLowerCase() === "true";
  if (typeof fromSettings === "boolean") return fromSettings;
  return fallback;
}

function list(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function loadConfig(): SentinelConfig {
  const s = readSettingsFile();

  const walletAddress = requireEnv("WALLET_ADDRESS");
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new Error(`WALLET_ADDRESS is not a valid address: ${walletAddress}`);
  }

  const privateKeyRaw = process.env.PRIVATE_KEY ?? "";
  if (privateKeyRaw && !/^0x[a-fA-F0-9]{64}$/.test(privateKeyRaw)) {
    // A malformed key silently degrading to "read-only" hides a misconfiguration.
    throw new Error("PRIVATE_KEY is set but is not a 0x-prefixed 32-byte hex string.");
  }
  const privateKey = privateKeyRaw ? (privateKeyRaw as `0x${string}`) : null;

  const chainRaw = (process.env.CHAIN ?? "sepolia").toLowerCase();
  if (chainRaw !== "sepolia" && chainRaw !== "mainnet") {
    throw new Error(`CHAIN must be "sepolia" or "mainnet", got: ${chainRaw}`);
  }
  const chain: ChainName = chainRaw;

  const minGasBumpPct = num("MIN_GAS_BUMP_PCT", s.gasStrategy?.minGasIncreasePct, 10, { min: 10, max: 1000 });
  const maxGasBumpPct = num("MAX_GAS_BUMP_PCT", undefined, 50, { min: 10, max: 1000 });
  if (minGasBumpPct > maxGasBumpPct) {
    throw new Error(`MIN_GAS_BUMP_PCT (${minGasBumpPct}) must not exceed MAX_GAS_BUMP_PCT (${maxGasBumpPct}).`);
  }

  const alertWebhookUrl = process.env.ALERT_WEBHOOK_URL || null;
  const alertWebhookUrls = [
    alertWebhookUrl,
    s.alerts?.telegramWebhookUrl,
    s.alerts?.discordWebhookUrl,
  ].filter((u): u is string => typeof u === "string" && u.startsWith("https://"));

  const proxyHost = process.env.PROXY_HOST ?? "127.0.0.1";

  return {
    chain,
    rpcUrl: process.env.RPC_URL || DEFAULT_RPC[chain],
    walletAddress: walletAddress as `0x${string}`,
    privateKey,
    gapDetectionIntervalMs: num("GAP_DETECTION_INTERVAL_MS", s.nonceTracking?.gapDetectionInterval, 500, { min: 50 }),
    evictionTimeoutMs: num("EVICTION_TIMEOUT_MS", s.evictionMonitoring?.evictionTimeout, 30_000, { min: 1000 }),
    maxEvictionResubmissions: num("MAX_EVICTION_RESUBMISSIONS", s.evictionMonitoring?.maxEvictionResubmissions, 3, { min: 0, int: true }),
    evictionBackoffMultiplier: num("EVICTION_BACKOFF_MULTIPLIER", s.evictionMonitoring?.evictionBackoffMultiplier, 1.5, { min: 1 }),
    circuitBreakerEnabled: bool("CIRCUIT_BREAKER_ENABLED", s.circuitBreaker?.enabled, true),
    circuitBreakerThreshold: num("CIRCUIT_BREAKER_THRESHOLD", s.circuitBreaker?.failureThreshold, 10, { min: 1, int: true }),
    circuitBreakerWindowMs: num("CIRCUIT_BREAKER_WINDOW_MS", s.circuitBreaker?.failureWindow, 300_000, { min: 1000 }),
    circuitBreakerCooldownMs: num("CIRCUIT_BREAKER_COOLDOWN_MS", s.circuitBreaker?.cooldownPeriod, 60_000, { min: 0 }),
    circuitBreakerAutoRecovery: bool("CIRCUIT_BREAKER_AUTO_RECOVERY", s.circuitBreaker?.autoRecovery, true),
    logFile: process.env.LOG_FILE ?? s.audit?.logFilePath ?? "./sentinel.log",
    logRotation: bool("LOG_ROTATION", s.audit?.logRotation, true),
    maxLogSizeMb: num("MAX_LOG_SIZE_MB", s.audit?.maxLogSizeMb, 100, { min: 1 }),
    logRetentionDays: num("LOG_RETENTION_DAYS", s.audit?.logRetentionDays, 7, { min: 1 }),
    alertWebhookUrl,
    alertWebhookUrls,
    alertOn: {
      gapDetected: s.alerts?.alertOnGapDetected ?? true,
      gapResolved: s.alerts?.alertOnGapResolved ?? true,
      gapResolutionFailed: s.alerts?.alertOnGapResolutionFailed ?? true,
      eviction: s.alerts?.alertOnEviction ?? true,
      circuitBreaker: s.alerts?.alertOnCircuitBreaker ?? true,
    },
    alertCooldownMs: num("ALERT_COOLDOWN_MS", s.alerts?.alertCooldown, 30_000, { min: 0 }),
    minGasBumpPct,
    maxGasBumpPct,
    baseFeeMultiplier: num("BASE_FEE_MULTIPLIER", s.gasStrategy?.maxFeeMultiplier, 2, { min: 1, max: 10 }),
    maxGasPriceCapGwei: num("MAX_GAS_PRICE_CAP_GWEI", s.gasStrategy?.maxGasPriceCapGwei, 100, { min: 0.000001 }),
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
    agentModel: process.env.AGENT_MODEL || DEFAULT_AGENT_MODEL,
    dryRun: bool("DRY_RUN", undefined, false),
    stateFile: process.env.STATE_FILE === "" ? null : process.env.STATE_FILE ?? "./sentinel-state.json",
    proxyHost,
    proxyPort: num("PROXY_PORT", undefined, 8545, { min: 1, max: 65535, int: true }),
    proxyAuthToken: process.env.PROXY_AUTH_TOKEN || null,
    proxyAllowedOrigins: list(process.env.PROXY_ALLOWED_ORIGINS),
  };
}

/**
 * A complete, safe config for tests, demos and benchmarks that must not
 * touch the environment: dry-run, no keys, no state file, no alerts.
 */
export function makeConfig(overrides: Partial<SentinelConfig> = {}): SentinelConfig {
  return {
    chain: "sepolia",
    rpcUrl: DEFAULT_RPC.sepolia,
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438BaEa",
    privateKey: null,
    gapDetectionIntervalMs: 500,
    evictionTimeoutMs: 30_000,
    maxEvictionResubmissions: 3,
    evictionBackoffMultiplier: 1.5,
    circuitBreakerEnabled: true,
    circuitBreakerThreshold: 10,
    circuitBreakerWindowMs: 300_000,
    circuitBreakerCooldownMs: 60_000,
    circuitBreakerAutoRecovery: true,
    logFile: "./sentinel.log",
    logRotation: false,
    maxLogSizeMb: 100,
    logRetentionDays: 7,
    alertWebhookUrl: null,
    alertWebhookUrls: [],
    alertOn: { gapDetected: true, gapResolved: true, gapResolutionFailed: true, eviction: true, circuitBreaker: true },
    alertCooldownMs: 30_000,
    minGasBumpPct: 10,
    maxGasBumpPct: 50,
    baseFeeMultiplier: 2,
    maxGasPriceCapGwei: 100,
    anthropicApiKey: null,
    agentModel: DEFAULT_AGENT_MODEL,
    dryRun: true,
    stateFile: null,
    proxyHost: "127.0.0.1",
    proxyPort: 8545,
    proxyAuthToken: null,
    proxyAllowedOrigins: [],
    ...overrides,
  };
}
