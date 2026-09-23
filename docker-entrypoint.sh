#!/bin/sh
set -e

case "$1" in
  watchdog)
    echo "[Sentinel] Starting Watchdog Daemon (node dist/cli.js watch)..."
    exec node dist/cli.js watch
    ;;
  proxy)
    echo "[Sentinel] Starting JSON-RPC Proxy on port 8545 (node dist/proxy.js)..."
    exec node dist/proxy.js
    ;;
  app)
    echo "[Sentinel] Starting Web Observatory on port 3000..."
    exec npm run start
    ;;
  all)
    echo "[Sentinel] Starting All Services (Web UI + Watchdog + RPC Proxy)..."
    node dist/proxy.js &
    node dist/cli.js watch &
    exec npm run start
    ;;
  *)
    exec "$@"
    ;;
esac
