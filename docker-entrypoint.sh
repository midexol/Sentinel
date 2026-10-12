#!/bin/sh
set -e

# Seed editable settings on first start (the volume starts empty).
if [ ! -f "$SETTINGS_FILE" ] && [ -f ./settings.default.json ]; then
  cp ./settings.default.json "$SETTINGS_FILE"
fi

case "$1" in
  watchdog)
    echo "[Sentinel] Starting Watchdog Daemon (node dist/cli.js watch)..."
    exec node dist/cli.js watch
    ;;
  proxy)
    echo "[Sentinel] Starting JSON-RPC Proxy on port 8545 (node dist/proxy.js)..."
    exec node dist/proxy.js
    ;;
  daemon)
    echo "[Sentinel] Starting watchdog + RPC proxy in one process (node dist/daemon.js)..."
    exec node dist/daemon.js
    ;;
  app)
    echo "[Sentinel] Starting Web Dashboard on port 3000..."
    exec npm run start
    ;;
  all)
    echo "[Sentinel] Starting all services (dashboard + watchdog/proxy daemon)..."
    node dist/daemon.js &
    DAEMON_PID=$!
    npm run start &
    WEB_PID=$!

    stop() {
      kill "$DAEMON_PID" "$WEB_PID" 2>/dev/null || true
      wait 2>/dev/null || true
      exit 0
    }
    trap stop TERM INT

    # If either service dies, take the container down so the restart policy
    # (and any orchestrator) sees the failure instead of a half-working container.
    while kill -0 "$DAEMON_PID" 2>/dev/null && kill -0 "$WEB_PID" 2>/dev/null; do
      sleep 2
    done
    echo "[Sentinel] A service exited; shutting down." >&2
    kill "$DAEMON_PID" "$WEB_PID" 2>/dev/null || true
    exit 1
    ;;
  *)
    exec "$@"
    ;;
esac
