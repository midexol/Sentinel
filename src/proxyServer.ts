import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import type { Sentinel } from "./runtime.js";

const MAX_BODY_BYTES = 1024 * 1024; // 1 MiB
const UPSTREAM_TIMEOUT_MS = 15_000;

interface RpcRequest {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: unknown[];
}

function rpcError(id: RpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function isLoopback(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

/**
 * JSON-RPC proxy for trading bots. Everything except eth_sendRawTransaction
 * is forwarded upstream untouched; sends go through the interceptor.
 *
 * Because this endpoint can broadcast transactions on the bot's behalf it is
 * locked down by default: it binds to loopback, sends no CORS headers,
 * rejects browser-originated requests (anything carrying an Origin header
 * that isn't allow-listed), rejects non-JSON content types (which blocks
 * "simple" cross-site form posts), and optionally requires a bearer token.
 */
export function createProxyServer({ config, interceptor }: Pick<Sentinel, "config" | "interceptor">): http.Server {
  const loopbackOnly = isLoopback(config.proxyHost);

  return http.createServer((req, res) => {
    // DNS-rebinding guard: when bound to loopback only accept loopback Host headers.
    if (loopbackOnly) {
      const hostname = (req.headers.host ?? "").replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
      if (!isLoopback(hostname)) return sendJson(res, 403, { error: "Forbidden host." });
    }

    const origin = req.headers.origin;
    if (origin && !config.proxyAllowedOrigins.includes(origin)) {
      return sendJson(res, 403, { error: "Browser-origin requests are not allowed." });
    }

    if (req.method === "GET" && req.url === "/healthz") {
      return sendJson(res, 200, { status: "ok" });
    }

    if (config.proxyAuthToken) {
      const header = req.headers.authorization ?? "";
      const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (!safeEqual(presented, config.proxyAuthToken)) {
        res.setHeader("WWW-Authenticate", "Bearer");
        return sendJson(res, 401, { error: "Unauthorized." });
      }
    }

    if (req.method !== "POST") {
      return sendJson(res, 405, { error: "Method not allowed. Use POST for JSON-RPC." });
    }

    if (!(req.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
      return sendJson(res, 415, { error: "Content-Type must be application/json." });
    }

    const chunks: Buffer[] = [];
    let size = 0;
    let aborted = false;

    req.on("data", (chunk: Buffer) => {
      if (aborted) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        aborted = true;
        sendJson(res, 413, { error: "Request body too large." });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (aborted) return;
      handleBody(Buffer.concat(chunks).toString("utf8"))
        .then(({ status, body }) => sendJson(res, status, body))
        .catch((err) => {
          console.error("[PROXY] Unhandled error:", err);
          sendJson(res, 500, rpcError(null, -32603, "Internal error"));
        });
    });
  });

  async function handleBody(body: string): Promise<{ status: number; body: unknown }> {
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      return { status: 400, body: rpcError(null, -32700, "Parse error") };
    }

    const isBatch = Array.isArray(json);
    const requests = (isBatch ? json : [json]) as RpcRequest[];
    if (requests.length === 0) {
      return { status: 400, body: rpcError(null, -32600, "Invalid Request: empty batch") };
    }

    const responses = await Promise.all(requests.map(handleOne));
    return { status: 200, body: isBatch ? responses : responses[0] };
  }

  async function handleOne(rpcReq: RpcRequest): Promise<unknown> {
    if (!rpcReq || typeof rpcReq !== "object" || typeof rpcReq.method !== "string") {
      return rpcError(rpcReq?.id, -32600, "Invalid Request");
    }

    if (rpcReq.method === "eth_sendRawTransaction") {
      const rawTx = rpcReq.params?.[0];
      if (typeof rawTx !== "string" || !/^0x[0-9a-fA-F]+$/.test(rawTx)) {
        return rpcError(rpcReq.id, -32602, "Missing or malformed raw transaction parameter");
      }

      console.log(`[PROXY] Intercepting eth_sendRawTransaction for ${config.walletAddress}...`);
      try {
        const hash = await interceptor.submitTransaction(rawTx as `0x${string}`);
        console.log(`[PROXY] Transaction dispatched successfully: ${hash}`);
        return { jsonrpc: "2.0", id: rpcReq.id ?? null, result: hash };
      } catch (err) {
        console.error("[PROXY] Interceptor error:", err instanceof Error ? err.message : err);
        return rpcError(rpcReq.id, -32000, err instanceof Error ? err.message : String(err));
      }
    }

    try {
      const upstream = await fetch(config.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rpcReq),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      return await upstream.json();
    } catch (err) {
      return rpcError(rpcReq.id, -32603, `Upstream RPC error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
