import { NextRequest } from "next/server";
import { ADDRESS_RE, fetchOnChainAccountState, probeRpc } from "@/lib/viem";
import { readSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";
// A held-open stream bills as function duration, so it ends on its own and the
// browser's EventSource reconnects (see the `retry:` hint). Keep this below the
// platform's function time limit.
export const maxDuration = 60;

const TICK_MS = 10_000;
const MAX_LIFETIME_MS = 55_000;
const RECONNECT_MS = 15_000;

/**
 * Server-sent events: one `telemetry` event every few seconds with the real
 * block height, the wallet's confirmed vs pending nonce, and the measured RPC
 * round-trip time. A nonce gap (pending > latest) is reported as such.
 */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const { searchParams } = new URL(req.url);
  const account = searchParams.get("address") || readSettings().system.walletAddress || "";

  if (account && !ADDRESS_RE.test(account)) {
    return new Response(JSON.stringify({ error: "Invalid address" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let interval: ReturnType<typeof setInterval> | undefined;
  let lifetime: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const tick = async () => {
        const started = Date.now();
        try {
          // Shared, short-lived caches: N open streams cost about one RPC read per window.
          const [probe, acct] = await Promise.all([
            probeRpc(),
            account ? fetchOnChainAccountState(account as `0x${string}`) : Promise.resolve(null),
          ]);
          const block = probe.block;
          const latest = acct?.latestNonce ?? 0;
          const pending = acct?.pendingNonce ?? 0;
          const gapSize = Math.max(0, pending - latest);
          send("telemetry", {
            id: `evt-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            block: Number(block),
            type: gapSize > 0 ? "GAP_DETECTED" : "TICK",
            account,
            nonceExpected: latest,
            nonceReceived: pending,
            gapSize,
            status: gapSize > 0 ? "pending" : "monitoring",
            latencyMs: probe.latencyMs,
            diagnosis:
              gapSize > 0
                ? `${gapSize} transaction(s) pending ahead of confirmed nonce ${latest}`
                : "Pipeline continuous: confirmed and pending nonces aligned",
          });
        } catch (err) {
          send("telemetry", {
            id: `evt-${Date.now()}`,
            type: "ERROR",
            account,
            status: "failed",
            diagnosis: `RPC unavailable: ${err instanceof Error ? err.message.slice(0, 120) : "unknown error"}`,
          });
        }
      };

      controller.enqueue(encoder.encode(`retry: ${RECONNECT_MS}\n\n`));
      send("message", {
        type: "CONNECTED",
        timestamp: new Date().toISOString(),
        message: "Sentinel SSE stream active",
        account,
      });
      void tick();
      interval = setInterval(tick, TICK_MS);
      lifetime = setTimeout(() => {
        closed = true;
        if (interval) clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      }, MAX_LIFETIME_MS);

      req.signal.addEventListener("abort", () => {
        closed = true;
        if (interval) clearInterval(interval);
        if (lifetime) clearTimeout(lifetime);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
      if (lifetime) clearTimeout(lifetime);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
