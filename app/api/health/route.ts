import { NextResponse } from "next/server";
import { activeChain, chainLabel, probeRpc } from "@/lib/viem";
import { PUBLIC_CACHE_HEADERS } from "@/lib/cache";
import { readSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const uptimeSeconds = Math.floor(process.uptime());

  let rpcConnected = true;
  let currentBlock = 0;
  let latencyMs = 0;

  try {
    const probe = await probeRpc();
    latencyMs = probe.latencyMs;
    currentBlock = probe.block;
  } catch {
    rpcConnected = false;
  }

  const settings = readSettings();
  const walletAddress = settings.system.walletAddress || null;

  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  return NextResponse.json(
    {
      status: rpcConnected ? "ok" : "degraded",
      uptime: uptimeSeconds,
      uptimeHuman: `${hours}h ${minutes}m ${seconds}s`,
      currentBlock,
      rpcConnection: rpcConnected ? "Connected" : "Unreachable",
      rpcLatencyMs: latencyMs,
      chainId: activeChain.id,
      chainName: chainLabel,
      version: settings.system.version,
      walletAddress,
      monitoredAccountsCount: walletAddress ? 1 : 0,
      timestamp: new Date().toISOString(),
    },
    // A degraded dependency should be visible to load balancers and uptime probes.
    // Only a healthy answer may be cached; an outage must be visible immediately.
    { status: rpcConnected ? 200 : 503, headers: rpcConnected ? PUBLIC_CACHE_HEADERS : { "Cache-Control": "no-store" } }
  );
}
