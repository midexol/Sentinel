import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type http from "node:http";
import { createProxyServer } from "../src/proxyServer.js";
import type { Sentinel } from "../src/runtime.js";
import { testConfig } from "./helpers.js";

function start(overrides = {}, submit = async (raw: string) => `0x${"cd".repeat(32)}` as string) {
  const config = testConfig(overrides);
  const server = createProxyServer({
    config,
    interceptor: { submitTransaction: submit } as unknown as Sentinel["interceptor"],
  });
  return new Promise<{ server: http.Server; url: string }>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }));
  });
}

const json = (body: unknown, headers: Record<string, string> = {}) => ({
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: typeof body === "string" ? body : JSON.stringify(body),
});

describe("RPC proxy hardening", () => {
  let s: Awaited<ReturnType<typeof start>>;
  before(async () => {
    s = await start();
  });
  after(() => s.server.close());

  it("sends no CORS headers", async () => {
    const res = await fetch(s.url, json({ jsonrpc: "2.0", id: 1, method: "eth_sendRawTransaction", params: ["0xabcd"] }));
    assert.equal(res.headers.get("access-control-allow-origin"), null);
  });

  it("rejects browser-origin requests", async () => {
    const res = await fetch(s.url, json({}, { Origin: "https://evil.example" }));
    assert.equal(res.status, 403);
  });

  it("rejects non-JSON content types (cross-site form posts)", async () => {
    const res = await fetch(s.url, { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" });
    assert.equal(res.status, 415);
  });

  it("rejects a non-loopback Host header (DNS rebinding)", async () => {
    // fetch forbids overriding Host, so use the raw client.
    const http = await import("node:http");
    const port = new URL(s.url).port;
    const status = await new Promise<number>((resolve, reject) => {
      const req = http.request({ host: "127.0.0.1", port, method: "POST", headers: { Host: "evil.example", "Content-Type": "application/json" } }, (r) => resolve(r.statusCode!));
      req.on("error", reject);
      req.end("{}");
    });
    assert.equal(status, 403);
  });

  it("rejects GET and oversized bodies", async () => {
    assert.equal((await fetch(s.url)).status, 405);
    const big = await fetch(s.url, json("x".repeat(1024 * 1024 + 10)));
    assert.equal(big.status, 413);
  });

  it("returns a JSON-RPC parse error for bad JSON", async () => {
    const res = await fetch(s.url, json("{not json"));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, -32700);
  });

  it("routes eth_sendRawTransaction through the interceptor and validates the param", async () => {
    const ok = await (await fetch(s.url, json({ jsonrpc: "2.0", id: 7, method: "eth_sendRawTransaction", params: ["0xabcd"] }))).json();
    assert.equal(ok.id, 7);
    assert.match(ok.result, /^0x[0-9a-f]{64}$/);
    const bad = await (await fetch(s.url, json({ jsonrpc: "2.0", id: 8, method: "eth_sendRawTransaction", params: ["nothex"] }))).json();
    assert.equal(bad.error.code, -32602);
  });

  it("handles batches and reports per-request errors", async () => {
    const res = await (await fetch(s.url, json([
      { jsonrpc: "2.0", id: 1, method: "eth_sendRawTransaction", params: ["0xabcd"] },
      { jsonrpc: "2.0", id: 2, method: "eth_sendRawTransaction", params: [] },
      42,
    ]))).json();
    assert.equal(res.length, 3);
    assert.ok(res[0].result);
    assert.equal(res[1].error.code, -32602);
    assert.equal(res[2].error.code, -32600);
    const empty = await fetch(s.url, json([]));
    assert.equal(empty.status, 400);
  });

  it("serves a health probe", async () => {
    assert.deepEqual(await (await fetch(`${s.url}/healthz`)).json(), { status: "ok" });
  });
});

describe("RPC proxy auth and failures", () => {
  it("requires the bearer token when configured", async () => {
    const s = await start({ proxyAuthToken: "s3cret" });
    try {
      const body = { jsonrpc: "2.0", id: 1, method: "eth_sendRawTransaction", params: ["0xabcd"] };
      assert.equal((await fetch(s.url, json(body))).status, 401);
      assert.equal((await fetch(s.url, json(body, { Authorization: "Bearer wrong" }))).status, 401);
      assert.equal((await fetch(s.url, json(body, { Authorization: "Bearer s3cret" }))).status, 200);
    } finally {
      s.server.close();
    }
  });

  it("allows an explicitly allow-listed origin", async () => {
    const s = await start({ proxyAllowedOrigins: ["https://app.example"] });
    try {
      const res = await fetch(s.url, json({ jsonrpc: "2.0", id: 1, method: "eth_sendRawTransaction", params: ["0xabcd"] }, { Origin: "https://app.example" }));
      assert.equal(res.status, 200);
    } finally {
      s.server.close();
    }
  });

  it("returns a JSON-RPC error (not a crash) when the interceptor throws or upstream is down", async () => {
    const s = await start({ rpcUrl: "http://127.0.0.1:1" }, async () => {
      throw new Error("breaker open");
    });
    const log = console.error;
    console.error = () => {};
    try {
      const send = await (await fetch(s.url, json({ jsonrpc: "2.0", id: 1, method: "eth_sendRawTransaction", params: ["0xabcd"] }))).json();
      assert.equal(send.error.message, "breaker open");
      const fwd = await (await fetch(s.url, json({ jsonrpc: "2.0", id: 2, method: "eth_blockNumber", params: [] }))).json();
      assert.equal(fwd.error.code, -32603);
    } finally {
      console.error = log;
      s.server.close();
    }
  });
});
