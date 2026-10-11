import { NextRequest, NextResponse } from "next/server";
import { ADDRESS_RE } from "@/lib/viem";
import { readSettings } from "@/lib/server/settings";
import { readAuditEntries } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

const MAX_ENTRIES = 150;

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

  const wanted = address.toLowerCase();
  const entries = readAuditEntries()
    .filter((e) => !wanted || String(e.wallet ?? "").toLowerCase() === wanted)
    .slice(-MAX_ENTRIES);

  return NextResponse.json({ entries });
}
