import { NextRequest, NextResponse } from "next/server";
import { ADDRESS_RE, fetchOnChainAccountState, publicClient } from "@/lib/viem";
import { readSettings } from "@/lib/server/settings";
import { breakerPressurePct, computeMetrics, readAuditEntries } from "@/lib/server/audit";
import { readControlState } from "@/lib/server/control";

export const dynamic = "force-dynamic";

/**
 * Live account state from the chain plus aggregates computed from the real
 * audit log (sentinel.log). Nothing here is simulated: if the daemon has not
 * written any events yet the counters are simply zero / null.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const settings = readSettings();
  const address = searchParams.get("address") || settings.system.walletAddress || "";

  const entries = readAuditEntries();
  const metrics = computeMetrics(entries);
  // The shared state file is authoritative for the live breaker/halt flags;
  // fall back to what the audit log implies when it is unavailable.
  const control = readControlState();
  const breakerTripped = control.available ? control.breakerTripped : metrics.circuitBreakerStatus === "TRIPPED";
  const base = {
    totalGapsResolved: metrics.totalGapsResolved,
    avgResolutionMs: metrics.avgResolutionTimeMs,
    halted: control.halted,
    circuitBreakerStatus: !settings.circuitBreaker.enabled ? "DISABLED" : breakerTripped ? "TRIPPED" : "ARMED",
    breakerTripPct: breakerPressurePct(entries, settings.circuitBreaker.failureWindow, settings.circuitBreaker.failureThreshold),
  };

  // No wallet configured/connected: report network state only.
  if (!address) {
    try {
      return NextResponse.json({
        ...base,
        currentBlock: Number(await publicClient.getBlockNumber()),
        latestNonce: 0,
        pendingNonce: 0,
        systemStatus: "OPERATIONAL",
        monitoredAccounts: [],
      });
    } catch (error) {
      return NextResponse.json({ error: "Failed to fetch on-chain state", details: String(error) }, { status: 502 });
    }
  }

  if (!ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const onchain = await fetchOnChainAccountState(address as `0x${string}`);
    return NextResponse.json({
      ...base,
      currentBlock: onchain.currentBlock,
      latestNonce: onchain.latestNonce,
      pendingNonce: onchain.pendingNonce,
      gasPriceGwei: onchain.gasPriceGwei,
      systemStatus: onchain.gap > 0 ? "STALLED" : "OPERATIONAL",
      monitoredAccounts: [
        {
          address,
          label: "Monitored Pipeline",
          latestNonce: onchain.latestNonce,
          pendingNonce: onchain.pendingNonce,
          gap: onchain.gap,
          status: onchain.gap > 0 ? "STALLED" : "HEALTHY",
          balanceWei: onchain.balanceWei,
          balanceEth: onchain.balanceEth,
        },
      ],
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch on-chain state", details: String(error) }, { status: 502 });
  }
}
