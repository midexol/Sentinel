import "dotenv/config";

/**
 * All Sentinel behavior is tunable via environment variables so it can be
 * dropped into any trading bot's deployment without code changes.
 */
export interface SentinelConfig {
  rpcUrl: string;
  walletAddress: `0x${string}`;
  privateKey: `0x${string}` | null;
  gapDetectionIntervalMs: number;
  evictionTimeoutMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerWindowMs: number;
  logFile: string;
  alertWebhookUrl: string | null;
  minGasBumpPct: number; // floor: never resubmit with less than this bump
  maxGasBumpPct: number; // ceiling: AI suggestions are clamped to this
  anthropicApiKey: string | null;
  agentModel: string;
  dryRun: boolean;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

export function loadConfig(): SentinelConfig {
  const walletAddress = requireEnv("WALLET_ADDRESS");
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new Error(`WALLET_ADDRESS is not a valid address: ${walletAddress}`);
  }

  const privateKeyRaw = process.env.PRIVATE_KEY ?? "";
  const privateKey =
    privateKeyRaw && /^0x[a-fA-F0-9]{64}$/.test(privateKeyRaw)
      ? (privateKeyRaw as `0x${string}`)
      : null;

  return {
    rpcUrl: process.env.RPC_URL ?? "https://sepolia.base.org",
    walletAddress: walletAddress as `0x${string}`,
    privateKey,
    gapDetectionIntervalMs: Number(process.env.GAP_DETECTION_INTERVAL_MS ?? 500),
    evictionTimeoutMs: Number(process.env.EVICTION_TIMEOUT_MS ?? 30_000),
    circuitBreakerThreshold: Number(process.env.CIRCUIT_BREAKER_THRESHOLD ?? 10),
    circuitBreakerWindowMs: Number(process.env.CIRCUIT_BREAKER_WINDOW_MS ?? 300_000),
    logFile: process.env.LOG_FILE ?? "./sentinel.log",
    alertWebhookUrl: process.env.ALERT_WEBHOOK_URL ?? null,
    minGasBumpPct: Number(process.env.MIN_GAS_BUMP_PCT ?? 10), // Base's documented minimum
    maxGasBumpPct: Number(process.env.MAX_GAS_BUMP_PCT ?? 50), // hard ceiling regardless of AI suggestion
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? null,
    agentModel: process.env.AGENT_MODEL ?? "llm-reasoning-agent",
    dryRun: (process.env.DRY_RUN ?? "false").toLowerCase() === "true",
  };
}
