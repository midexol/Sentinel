import { buildSentinel } from "./runtime.js";
import { createProxyServer } from "./proxyServer.js";
import { shutdownSignal } from "./watcher.js";
import type { Sentinel } from "./runtime.js";

/** Starts the proxy listener and returns once it is bound. */
function startProxy(sentinel: Sentinel) {
  const { config } = sentinel;
  const server = createProxyServer(sentinel);

  if (!["127.0.0.1", "::1", "localhost"].includes(config.proxyHost) && !config.proxyAuthToken) {
    console.warn(
      `[PROXY] WARNING: listening on ${config.proxyHost} without PROXY_AUTH_TOKEN. Anyone who can reach this port can broadcast transactions as ${config.walletAddress}.`
    );
  }

  server.listen(config.proxyPort, config.proxyHost, () => {
    console.log(`================================================================`);
    console.log(`  SENTINEL RPC PROXY ACTIVE ON http://${config.proxyHost}:${config.proxyPort}`);
    console.log(`  Upstream Target: ${config.rpcUrl}`);
    console.log(`  Protected Wallet: ${config.walletAddress}`);
    console.log(`================================================================`);
  });
  return server;
}

const sentinel = buildSentinel();
const server = startProxy(sentinel);
shutdownSignal(() => server.close(() => process.exit(0)));
