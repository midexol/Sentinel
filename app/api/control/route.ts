import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/settings";
import { appendAudit, openState, readControlState } from "@/lib/server/control";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(readControlState());
}

/** Halt / resume the daemon or reset its circuit breaker. Requires admin authorization. */
export async function POST(req: Request) {
  const auth = authorize(req);
  if (auth === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized: a valid admin token is required.", code: "unauthorized" }, { status: 401 });
  }
  if (auth === "disabled") {
    return NextResponse.json(
      { error: "Controls are disabled: set SETTINGS_ADMIN_TOKEN on the server to enable them.", code: "disabled" },
      { status: 403 }
    );
  }

  let action: unknown;
  try {
    ({ action } = await req.json());
  } catch {
    return NextResponse.json({ error: "Request body is not valid JSON." }, { status: 400 });
  }

  const state = openState();
  if (!state) {
    return NextResponse.json({ error: "STATE_FILE is disabled, so the dashboard cannot control the daemon." }, { status: 503 });
  }

  try {
    if (action === "halt") {
      state.update((s) => { s.control.halted = true; });
      appendAudit("sentinel_halted");
    } else if (action === "resume") {
      state.update((s) => { s.control.halted = false; });
      appendAudit("sentinel_resumed");
    } else if (action === "reset_breaker") {
      state.update((s) => { s.breaker = { tripped: false, trippedAt: null, failures: [] }; });
      appendAudit("circuit_breaker_reset", { reason: "manual_reset_via_dashboard" });
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Could not update the shared state file: ${err instanceof Error ? err.message : String(err)}` },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true, ...readControlState() });
}
