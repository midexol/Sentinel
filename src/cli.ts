import { loadConfig } from "./config.js";
import { NonceTracker, PendingTxStore } from "./nonceTracker.js";
import { AuditLogger } from "./logger.js";
import { GapResolver, NoPrivateKeyError } from "./resolver.js";
import { EvictionMonitor } from "./evictionMonitor.js";
import { CircuitBreaker } from "./circuitBreaker.js";
import { GapDiagnostician } from "./agent.js";

interface RecentEvent {
  timestamp: number;
  kind: "gap" | "eviction" | "resolved" | "failed";
}

function buildSentinel() {
  const config = loadConfig();
  const store = new PendingTxStore();
  const tracker = new NonceTracker(config, store);
  const logger = new AuditLogger(config.logFile);
  const resolver = new GapResolver(config, tracker, store, logger);
  const breaker = new CircuitBreaker(config, logger);
  const eviction = new EvictionMonitor(config, tracker, store, resolver, logger);
  const diagnostician = new GapDiagnostician(config, logger);
  const recentEvents: RecentEvent[] = [];
  return { config, store, tracker, logger, resolver, breaker, eviction, diagnostician, recentEvents };
}

function recordEvent(recentEvents: RecentEvent[], kind: RecentEvent["kind"]): void {
  recentEvents.push({ timestamp: Date.now(), kind });
  if (recentEvents.length > 50) recentEvents.shift();
}

/**
 * Handles one detected gap: ask the diagnostician what it thinks is going
 * on and how big a bump makes sense, then hand that recommendation
 * (already safety-clamped) to the resolver. If there's no API key or the
 * model call fails, the diagnostician itself falls back to the safe
 * minimum bump - this function doesn't need to know the difference.
 */
async function handleGap(
  gap: NonNullable<Awaited<ReturnType<NonceTracker["detectGap"]>>>,
  state: Awaited<ReturnType<NonceTracker["getNonceState"]>>,
  deps: ReturnType<typeof buildSentinel>
): Promise<void> {
  const { config, resolver, breaker, diagnostician, recentEvents } = deps;
  recordEvent(recentEvents, "gap");

  if (!config.privateKey && !config.dryRun) {
    console.log("  [INFO] Gap detected but no PRIVATE_KEY configured. Running read-only; not resolving.");
    return;
  }

  const diagnosis = await diagnostician.diagnose(gap, state, recentEvents);
  console.log(
    `  [DIAGNOSIS] ${diagnosis.category}: "${diagnosis.explanation}" (recommended bump: ${diagnosis.recommendedBumpPct}%${
      diagnosis.rawRequestedBumpPct !== diagnosis.recommendedBumpPct
        ? `, model asked for ${diagnosis.rawRequestedBumpPct}% but was clamped`
        : ""
    })`
  );

  try {
    const result = await resolver.resolveGap(gap.gapNonce, diagnosis.recommendedBumpPct);
    recordEvent(recentEvents, "resolved");
    console.log(`  [RESOLVED] (${result.outcome})${result.newHash ? `: new tx ${result.newHash}` : ""}`);
  } catch (err) {
    if (err instanceof NoPrivateKeyError) throw err;
    recordEvent(recentEvents, "failed");
    await breaker.recordFailure();
    console.error("  [ERROR] Failed to resolve gap:", err instanceof Error ? err.message : err);
  }
}

/** Single check: report nonce state, diagnose + resolve a gap if found. */
async function reportOnce(): Promise<void> {
  const deps = buildSentinel();
  const { tracker } = deps;

  const state = await tracker.getNonceState();
  const gap = await tracker.detectGap();

  console.log(
    `Latest nonce: ${state.latestNonce}, Pending nonce: ${state.pendingNonce}, Gap: ${gap ? gap.gapNonce : "none"}`
  );

  if (!gap) return;

  deps.logger.log({
    action: "gap_detected",
    wallet: deps.config.walletAddress,
    gapNonce: gap.gapNonce,
    latestNonce: state.latestNonce,
    pendingNonce: state.pendingNonce,
    stuckTxHash: gap.stuckTx?.hash ?? null,
  });

  await handleGap(gap, state, deps);
}

/** Continuous loop: detect, diagnose, resolve, monitor evictions, on a timer. */
async function watch(): Promise<void> {
  const deps = buildSentinel();
  const { config, tracker, logger, breaker, eviction } = deps;

  console.log(
    `Watching ${config.walletAddress} on ${config.rpcUrl} every ${config.gapDetectionIntervalMs}ms.` +
      (config.dryRun
        ? " (DRY RUN - detecting and diagnosing real gaps, never broadcasting)"
        : config.privateKey
          ? " (resolution enabled)"
          : " (read-only - no PRIVATE_KEY set)") +
      (config.anthropicApiKey ? " (AI diagnosis enabled)" : " (no ANTHROPIC_API_KEY - using safe-default bumps)") +
      " Ctrl+C to stop."
  );

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (breaker.isTripped()) {
      console.error("Circuit breaker is tripped. Halting Sentinel loop. Fix the underlying issue and restart.");
      process.exit(1);
    }

    try {
      const state = await tracker.getNonceState();
      const gap = await tracker.detectGap();

      console.log(
        `[${new Date().toISOString()}] Latest: ${state.latestNonce}, Pending: ${state.pendingNonce}, Gap: ${gap ? gap.gapNonce : "none"}`
      );

      if (gap) {
        await logger.log({
          action: "gap_detected",
          wallet: config.walletAddress,
          gapNonce: gap.gapNonce,
          latestNonce: state.latestNonce,
          pendingNonce: state.pendingNonce,
          stuckTxHash: gap.stuckTx?.hash ?? null,
        });
        await handleGap(gap, state, deps);
      }

      await eviction.checkOnce();
    } catch (err) {
      console.error("Watch loop iteration failed:", err instanceof Error ? err.message : err);
    }

    await new Promise((resolve) => setTimeout(resolve, config.gapDetectionIntervalMs));
  }
}

const mode = process.argv[2] ?? "once";

if (mode === "watch") {
  watch().catch((err) => {
    console.error("Sentinel watch loop crashed:", err);
    process.exit(1);
  });
} else {
  reportOnce()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Sentinel failed:", err);
      process.exit(1);
    });
}
