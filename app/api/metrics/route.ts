import { NextRequest, NextResponse } from "next/server";
import { publicClient } from "@/lib/viem";
import { computeMetrics, readAuditEntries } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

/** Metrics computed from the real audit log (JSON, or Prometheus text with ?format=prometheus). */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");

  let currentBlock: number | null = null;
  try {
    currentBlock = Number(await publicClient.getBlockNumber());
  } catch {
    // leave null: report the outage rather than inventing a block
  }

  const m = computeMetrics(readAuditEntries());
  const uptimeSeconds = Math.floor(process.uptime());

  if (format === "prometheus") {
    const lines: string[] = [];
    const metric = (name: string, type: "counter" | "gauge", help: string, value: number | null) => {
      if (value === null) return; // omit unknown values rather than exporting a fake 0
      lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} ${type}`, `${name} ${value}`);
    };
    metric("sentinel_uptime_seconds", "gauge", "Seconds since the web process started", uptimeSeconds);
    metric("sentinel_gaps_detected_total", "counter", "Nonce gaps detected (from the audit log)", m.totalGapsDetected);
    metric("sentinel_gaps_resolved_total", "counter", "Nonce gaps resolved by replacement", m.totalGapsResolved);
    metric("sentinel_gaps_failed_total", "counter", "Nonce gap resolutions that failed", m.totalGapsFailed);
    metric("sentinel_evictions_detected_total", "counter", "Mempool evictions detected", m.totalEvictionsDetected);
    metric("sentinel_circuit_breaker_trips_total", "counter", "Circuit breaker trips", m.totalCircuitBreakerTrips);
    metric("sentinel_circuit_breaker_tripped", "gauge", "1 if the circuit breaker is currently tripped", m.circuitBreakerStatus === "TRIPPED" ? 1 : 0);
    metric("sentinel_resolution_duration_ms", "gauge", "Average detection-to-resolution time in ms", m.avgResolutionTimeMs);
    metric("sentinel_current_block", "gauge", "Latest block number seen by the RPC", currentBlock);
    return new NextResponse(lines.join("\n") + "\n", {
      headers: { "Content-Type": "text/plain; version=0.0.4" },
    });
  }

  return NextResponse.json({
    uptimeSeconds,
    currentBlock,
    ...m,
    timestamp: new Date().toISOString(),
  });
}
