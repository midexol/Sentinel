import { loadConfig, type SentinelConfig } from "./config.js";
import { NonceTracker, PendingTxStore, type RecentEvent } from "./nonceTracker.js";
import { AuditLogger } from "./logger.js";
import { Alerter } from "./alerts.js";
import { GapResolver } from "./resolver.js";
import { EvictionMonitor } from "./evictionMonitor.js";
import { CircuitBreaker } from "./circuitBreaker.js";
import { GapDiagnostician, SentinelToolbox } from "./agent.js";
import { TransactionInterceptor } from "./interceptor.js";
import { StateFile } from "./state.js";

/** Wires every Sentinel component together from one config. Shared by all entry points. */
export function buildSentinel(config: SentinelConfig = loadConfig()) {
  const state = new StateFile(config.stateFile);
  const store = new PendingTxStore(state);
  const tracker = new NonceTracker(config, store);
  const logger = new AuditLogger(config.logFile, {
    rotation: config.logRotation,
    maxSizeMb: config.maxLogSizeMb,
    retentionDays: config.logRetentionDays,
  });
  logger.onEntry(new Alerter(config).handle);

  const resolver = new GapResolver(config, tracker, store, logger);
  const breaker = new CircuitBreaker(config, logger, state);
  const eviction = new EvictionMonitor(config, tracker, store, resolver, logger, breaker);
  const diagnostician = new GapDiagnostician(config, logger, new SentinelToolbox(config, tracker, store));
  const interceptor = new TransactionInterceptor(config, tracker, store, resolver, diagnostician, breaker, logger);
  const recentEvents: RecentEvent[] = [];

  return { config, store, tracker, logger, resolver, breaker, eviction, diagnostician, interceptor, recentEvents };
}

export type Sentinel = ReturnType<typeof buildSentinel>;
