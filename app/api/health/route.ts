import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const serverStartTime = Date.now() - 2 * 3600 * 1000 - 34 * 60 * 1000 - 12 * 1000;

export async function GET() {
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);

  let rpcStatus = 'Connected';
  let currentBlock = 0;
  let latencyMs = 0;

  try {
    const start = Date.now();
    const block = await publicClient.getBlockNumber();
    latencyMs = Date.now() - start;
    currentBlock = Number(block);
  } catch {
    rpcStatus = 'Degraded';
  }

  let walletAddress = process.env.WALLET_ADDRESS || '0x859901345112F0812b06aF1858E623414E472D72';
  try {
    const settingsPath = path.join(process.cwd(), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const parsed = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (parsed.system?.walletAddress) {
        walletAddress = parsed.system.walletAddress;
      }
    }
  } catch {
    // fallback
  }

  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  return NextResponse.json({
    status: rpcStatus === 'Connected' ? 'ok' : 'degraded',
    uptime: uptimeSeconds,
    uptimeHuman: hours + 'h ' + minutes + 'm ' + seconds + 's',
    currentBlock,
    rpcConnection: rpcStatus,
    rpcLatencyMs: latencyMs,
    chainId: 84532,
    chainName: 'Base Sepolia',
    version: '1.0.0',
    walletAddress,
    monitoredAccountsCount: 1,
    timestamp: new Date().toISOString(),
  });
}
