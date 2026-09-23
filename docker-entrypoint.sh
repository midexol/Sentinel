#!/bin/sh
set -e

case "$1" in
  watchdog)
    echo "[Sentinel] Starting Watchdog Daemon..."
    exec npm run cli:watch
    ;;
  proxy)
    echo "[Sentinel] Starting JSON-RPC Proxy on port 8545..."
    exec npm run proxy
    ;;
  app)
    echo "[Sentinel] Starting Web Observatory on port 3000..."
    exec npm run start
    ;;
  all)
    echo "[Sentinel] Starting All Services (Web UI + Watchdog + RPC Proxy)..."
    npm run proxy &
    npm run cli:watch &
    exec npm run start
    ;;
  *)
    exec "$@"
    ;;
esac
