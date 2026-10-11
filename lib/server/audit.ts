import fs from "node:fs";
import path from "node:path";

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAX_READ_BYTES = 8 * 1024 * 1024; // only the tail of very large logs

export interface AuditRecord {
  action: string;
  timestamp: string;
  [key: string]: any;
}

/**
 * The web app only ever reads the log named by LOG_FILE (default
 * ./sentinel.log) - never a path taken from editable settings.
 */
export function auditLogPath(): string {
  return path.resolve(process.cwd(), process.env.LOG_FILE || "./sentinel.log");
}

export function readAuditEntries(): AuditRecord[] {
  const file = auditLogPath();
  let fd: number | null = null;
  try {
    const { size } = fs.statSync(file);
    const length = Math.min(size, MAX_READ_BYTES);
    const buf = Buffer.alloc(length);
    fd = fs.openSync(file, "r");
    fs.readSync(fd, buf, 0, length, size - length);
    const lines = buf.toString("utf-8").split("\n");
    if (size > length) lines.shift(); // first line is likely truncated
    const entries: AuditRecord[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed.action === "string") entries.push(parsed);
      } catch {
        // skip corrupt line
      }
    }
    return entries;
  } catch {
    return [];
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

export interface Metrics {
  totalGapsDetected: number;
  totalGapsResolved: number;
  totalGapsAlreadyConfirmed: number;
  totalGapsFailed: number;
  successRatePct: number | null;
  totalEvictionsDetected: number;
  totalCircuitBreakerTrips: number;
  circuitBreakerStatus: "ARMED" | "TRIPPED";
  avgResolutionTimeMs: number | null;
  gasBumpDistribution: Record<string, number>;
  resolutionsByCause: Record<string, number>;
  lastEventAt: string | null;
}

export function computeMetrics(entries: AuditRecord[]): Metrics {
  let detected = 0, resolved = 0, alreadyConfirmed = 0, failed = 0, evictions = 0, trips = 0;
  let tripped = false;
  const lastDetected = new Map<string, number>();
  const durations: number[] = [];
  const bumps = { "10_to_20_pct": 0, "20_to_30_pct": 0, "30_to_40_pct": 0, "40_to_50_pct": 0, "over_50_pct": 0 };
  const causes: Record<string, number> = {};

  for (const e of entries) {
    const ts = Date.parse(e.timestamp);
    switch (e.action) {
      case "gap_detected":
        detected++;
        if (e.gapNonce !== undefined && Number.isFinite(ts)) lastDetected.set(String(e.gapNonce), ts);
        break;
      case "gap_resolved":
        if (e.result === "already_confirmed") {
          alreadyConfirmed++;
          break;
        }
        resolved++;
        if (typeof e.bumpPct === "number") {
          const b = e.bumpPct;
          if (b < 20) bumps["10_to_20_pct"]++;
          else if (b < 30) bumps["20_to_30_pct"]++;
          else if (b < 40) bumps["30_to_40_pct"]++;
          else if (b <= 50) bumps["40_to_50_pct"]++;
          else bumps["over_50_pct"]++;
        }
        {
          const start = lastDetected.get(String(e.gapNonce));
          if (start !== undefined && Number.isFinite(ts) && ts >= start) durations.push(ts - start);
        }
        break;
      case "gap_resolve_failed":
        failed++;
        break;
      case "eviction_detected":
        evictions++;
        break;
      case "circuit_breaker_tripped":
        trips++;
        tripped = true;
        break;
      case "circuit_breaker_reset":
        tripped = false;
        break;
      case "diagnosis":
        if (!e.error && typeof e.category === "string") causes[e.category] = (causes[e.category] ?? 0) + 1;
        break;
    }
  }

  const attempts = resolved + failed;
  return {
    totalGapsDetected: detected,
    totalGapsResolved: resolved,
    totalGapsAlreadyConfirmed: alreadyConfirmed,
    totalGapsFailed: failed,
    successRatePct: attempts > 0 ? Math.round((resolved / attempts) * 10000) / 100 : null,
    totalEvictionsDetected: evictions,
    totalCircuitBreakerTrips: trips,
    circuitBreakerStatus: tripped ? "TRIPPED" : "ARMED",
    avgResolutionTimeMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    gasBumpDistribution: bumps,
    resolutionsByCause: causes,
    lastEventAt: entries.length ? entries[entries.length - 1].timestamp : null,
  };
}

/** Failures within the breaker window as a percentage of the trip threshold. */
export function breakerPressurePct(entries: AuditRecord[], windowMs: number, threshold: number): number {
  const cutoff = Date.now() - windowMs;
  const recent = entries.filter((e) => e.action === "gap_resolve_failed" && Date.parse(e.timestamp) >= cutoff).length;
  return threshold > 0 ? Math.min(100, Math.round((recent / threshold) * 100)) : 0;
}
