import http from "node:http";
import { loadConfig } from "./config.js";
import { NonceTracker, PendingTxStore } from "./nonceTracker.js";
import { AuditLogger } from "./logger.js";
import { GapResolver } from "./resolver.js";
import { GapDiagnostician } from "./agent.js";
import { TransactionInterceptor } from "./interceptor.js";

const config = loadConfig();
const store = new PendingTxStore();
const tracker = new NonceTracker(config, store);
const logger = new AuditLogger(config.logFile);
const resolver = new GapResolver(config, tracker, store, logger);
const diagnostician = new GapDiagnostician(config, logger);
const interceptor = new TransactionInterceptor(
  config,
  tracker,
  store,
  resolver,
  diagnostician,
  logger
);

const PORT = Number(process.env.PROXY_PORT ?? 8545);

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed. Use POST for JSON-RPC." }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", async () => {
    try {
      const json = JSON.parse(body);

      const isBatch = Array.isArray(json);
      const requests = isBatch ? json : [json];

      const responses = await Promise.all(
        requests.map(async (rpcReq: { id?: number | string; method: string; params?: unknown[] }) => {
          if (rpcReq.method === "eth_sendRawTransaction") {
            const rawTx = rpcReq.params?.[0] as `0x${string}` | undefined;
            if (!rawTx) {
              return {
                jsonrpc: "2.0",
                id: rpcReq.id ?? null,
                error: { code: -32602, message: "Missing raw transaction parameter" },
              };
            }

            console.log(`[PROXY] Intercepting eth_sendRawTransaction for ${config.walletAddress}...`);
            try {
              const hash = await interceptor.submitTransaction(rawTx);
              console.log(`[PROXY] Transaction dispatched successfully: ${hash}`);
              return {
                jsonrpc: "2.0",
                id: rpcReq.id ?? null,
                result: hash,
              };
            } catch (err) {
              console.error("[PROXY] Interceptor error:", err);
              return {
                jsonrpc: "2.0",
                id: rpcReq.id ?? null,
                error: { code: -32000, message: err instanceof Error ? err.message : String(err) },
              };
            }
          }

          const forwardRes = await fetch(config.rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rpcReq),
          });
          return await forwardRes.json();
        })
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(isBatch ? responses : responses[0]));
    } catch {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" } }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`  SENTINEL RPC PROXY ACTIVE ON http://localhost:${PORT}`);
  console.log(`  Upstream Target: ${config.rpcUrl}`);
  console.log(`  Protected Wallet: ${config.walletAddress}`);
  console.log(`================================================================`);
});
