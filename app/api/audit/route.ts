import fs from "node:fs";
import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/settings";
import { auditLogPath } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

/** Download the tail of the real audit log (JSONL). Admin-only. */
export async function GET(req: Request) {
  if (authorize(req) !== "ok") {
    return NextResponse.json({ error: "Unauthorized: a valid admin token is required." }, { status: 401 });
  }

  const file = auditLogPath();
  let fd: number | null = null;
  try {
    const { size } = fs.statSync(file);
    const length = Math.min(size, MAX_BYTES);
    const buf = Buffer.alloc(length);
    fd = fs.openSync(file, "r");
    fs.readSync(fd, buf, 0, length, size - length);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Content-Disposition": 'attachment; filename="sentinel.log"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "No audit log found yet." }, { status: 404 });
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}
