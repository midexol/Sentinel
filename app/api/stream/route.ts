import { NextRequest } from "next/server";
import { ADDRESS_RE, publicClient } from "@/lib/viem";
import { readSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

const TICK_MS = 5000;

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
          const [block, latest, pending] = await Promise.all([
            publicClient.getBlockNumber(),
            account
              ? publicClient.getTransactionCount({ address: account as `0x${string}`, blockTag: "latest" })
              : Promise.resolve(0),
            account
              ? publicClient.getTransactionCount({ address: account as `0x${string}`, blockTag: "pending" })
              : Promise.resolve(0),
          ]);
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
            latencyMs: Date.now() - started,
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

      send("message", {
        type: "CONNECTED",
        timestamp: new Date().toISOString(),
        message: "Sentinel SSE stream active",
        account,
      });
      void tick();
      interval = setInterval(tick, TICK_MS);

      req.signal.addEventListener("abort", () => {
        closed = true;
        if (interval) clearInterval(interval);
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
