import { buildSentinel } from "./runtime.js";
import { createProxyServer } from "./proxyServer.js";
import { shutdownSignal, watch } from "./watcher.js";

/**
 * Runs the watchdog loop and the RPC proxy in ONE process so they share the
 * same in-memory components (store, circuit breaker, resolver locks).
 */
const sentinel = buildSentinel();
const { config } = sentinel;

const server = createProxyServer(sentinel);
server.listen(config.proxyPort, config.proxyHost, () => {
  console.log(`[PROXY] listening on http://${config.proxyHost}:${config.proxyPort} -> ${config.rpcUrl}`);
});

const signal = shutdownSignal(() => server.close());

watch(sentinel, signal)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Sentinel daemon crashed:", err);
    process.exit(1);
  });
