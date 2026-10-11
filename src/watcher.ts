import { NonceTracker, recordEvent } from "./nonceTracker.js";
import { NoPrivateKeyError, UntrackedNonceError } from "./resolver.js";
import type { Sentinel } from "./runtime.js";

type Deps = Pick<Sentinel, "config" | "resolver" | "breaker" | "diagnostician" | "recentEvents">;

/**
 * Handles one detected gap: ask the diagnostician what it thinks is going
 * on and how big a bump makes sense, then hand that recommendation
 * (already safety-clamped) to the resolver. If there's no API key or the
 * model call fails, the diagnostician itself falls back to the safe
 * minimum bump - this function doesn't need to know the difference.
 */
export async function handleGap(
  gap: NonNullable<Awaited<ReturnType<NonceTracker["detectGap"]>>>,
  state: Awaited<ReturnType<NonceTracker["getNonceState"]>>,
  deps: Deps
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
    // An untracked nonce is a coverage gap, not an infrastructure failure.
    if (!(err instanceof UntrackedNonceError)) await breaker.recordFailure();
    console.error("  [ERROR] Failed to resolve gap:", err instanceof Error ? err.message : err);
  }
}

/** Single check: report nonce state, diagnose + resolve a gap if found. */
export async function reportOnce(sentinel: Sentinel): Promise<void> {
  const { tracker, logger, config } = sentinel;

  const state = await tracker.getNonceState();
  const gap = NonceTracker.findGap(state.latestNonce, state.pendingNonce, state.trackedTxs);

  console.log(
    `Latest nonce: ${state.latestNonce}, Pending nonce: ${state.pendingNonce}, Gap: ${gap ? gap.gapNonce : "none"}`
  );

  if (!gap) return;

  await logger.log({
    action: "gap_detected",
    wallet: config.walletAddress,
    gapNonce: gap.gapNonce,
    latestNonce: state.latestNonce,
    pendingNonce: state.pendingNonce,
    stuckTxHash: gap.stuckTx?.hash ?? null,
  });

  await handleGap(gap, state, sentinel);
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true }
    );
  });
}

/** Continuous loop: detect, diagnose, resolve, monitor evictions, on a timer. Stops when `signal` aborts. */
export async function watch(sentinel: Sentinel, signal: AbortSignal): Promise<void> {
  const { config, tracker, logger, breaker, eviction, isHalted } = sentinel;

  console.log(
    `Watching ${config.walletAddress} on ${config.rpcUrl} (${config.chain}) every ${config.gapDetectionIntervalMs}ms.` +
      (config.dryRun
        ? " (DRY RUN - detecting and diagnosing real gaps, never broadcasting)"
        : config.privateKey
          ? " (resolution enabled)"
          : " (read-only - no PRIVATE_KEY set)") +
      (config.anthropicApiKey ? " (AI diagnosis enabled)" : " (no ANTHROPIC_API_KEY - using safe-default bumps)") +
      " Ctrl+C to stop."
  );

  let lastHaltNotice = 0;
  while (!signal.aborted) {
    if (isHalted()) {
      if (Date.now() - lastHaltNotice > 30_000) {
        console.warn("Sentinel is halted by the operator. Resolution is paused until resumed.");
        lastHaltNotice = Date.now();
      }
      await sleep(config.gapDetectionIntervalMs, signal);
      continue;
    }

    if (breaker.isTripped()) {
      // Paused, not dead: with autoRecovery the breaker closes after the cooldown.
      if (Date.now() - lastHaltNotice > 30_000) {
        console.error("Circuit breaker is tripped. Sentinel resolution is paused until it recovers or is reset.");
        lastHaltNotice = Date.now();
      }
      await sleep(config.gapDetectionIntervalMs, signal);
      continue;
    }

    try {
      const state = await tracker.getNonceState();
      const gap = NonceTracker.findGap(state.latestNonce, state.pendingNonce, state.trackedTxs);

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
        await handleGap(gap, state, sentinel);
      }

      await eviction.checkOnce();
    } catch (err) {
      console.error("Watch loop iteration failed:", err instanceof Error ? err.message : err);
    }

    await sleep(config.gapDetectionIntervalMs, signal);
  }
}

/** Returns a signal that aborts on SIGINT / SIGTERM so loops and servers can shut down cleanly. */
export function shutdownSignal(onShutdown?: () => void): AbortSignal {
  const controller = new AbortController();
  const stop = () => {
    if (controller.signal.aborted) return;
    controller.abort();
    onShutdown?.();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  return controller.signal;
}
