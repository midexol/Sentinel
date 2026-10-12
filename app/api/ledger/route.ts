import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_CACHE_HEADERS } from "@/lib/cache";
import { ADDRESS_RE } from "@/lib/viem";
import { readSettings } from "@/lib/server/settings";
import { ledgerFor } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

/**
 * Recent audit-log events for one wallet, newest last. This is the real
 * receipt trail written by the Sentinel daemon - the dashboard ledger renders it.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address") || readSettings().system.walletAddress || "";
  if (address && !ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  return NextResponse.json({ entries: ledgerFor(address) }, { headers: PUBLIC_CACHE_HEADERS });
}
