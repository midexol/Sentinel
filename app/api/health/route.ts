import { NextResponse } from "next/server";
import { activeChain, chainLabel, publicClient } from "@/lib/viem";
import { readSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const uptimeSeconds = Math.floor(process.uptime());

  let rpcConnected = true;
  let currentBlock = 0;
  let latencyMs = 0;

  try {
    const start = Date.now();
    const block = await Promise.race([
      publicClient.getBlockNumber(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]);
    latencyMs = Date.now() - start;
    currentBlock = Number(block);
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
    { status: rpcConnected ? 200 : 503 }
  );
}
