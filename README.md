# Sentinel

A nonce-gap watchdog for high-frequency trading agents on Base : built for
the Orion Builder Hackathon (orionagents.org/hackathon).

## What it does

A trading bot fires several transactions rapidly. One occasionally gets
stuck due to a documented Flashblocks nonce-reporting quirk on Base,
blocking everything queued behind it. Sentinel watches for this,
diagnoses what's likely going on, and fixes it : with every decision
logged as a receipt.

## Status: core pipeline complete

- **Detection** (`nonceTracker.ts`) — reads both `"latest"` and `"pending"`
  nonces, finds the first gap.
- **AI diagnosis** (`agent.ts`) — asks Claude to classify the likely cause
  (cache desync / eviction / underpriced tx) and recommend a bump
  percentage, using recent Sentinel history as context. The model can only
  *recommend* — every number it returns passes through the same safety
  clamp described below before anything acts on it.
- **Resolution** (`resolver.ts`) — resubmits the stuck transaction with the
  diagnosed (safely clamped) gas bump. Always re-checks the receipt
  immediately before broadcasting, so it can't double-spend a nonce that
  confirmed in the meantime.
- **Eviction monitoring** (`evictionMonitor.ts`) — catches transactions
  that vanish from the mempool entirely (Base has no "evicted" event, so
  this infers it from a sustained "not found" streak) and resubmits those
  too.
- **Circuit breaker** (`circuitBreaker.ts`) — halts the loop and can ping a
  webhook if *failures* (not successful resolutions — a busy market
  causing lots of those is fine) exceed a threshold in a rolling window.
- **Transaction interceptor** (`interceptor.ts`) — the drop-in piece a
  trading bot actually calls: `submitTransaction(signedTx)` instead of
  hitting Base RPC directly. Checks for a blocking gap, resolves it if
  found, then forwards the bot's own transaction. The bot still builds and
  signs its own transactions with its own nonces — the interceptor never
  assigns nonces on the bot's behalf.
- **Dry-run mode** — set `DRY_RUN=true` to detect and diagnose real gaps
  against a live RPC without ever broadcasting or needing `PRIVATE_KEY`.
  Useful for verifying the whole pipeline before it touches real funds.
- **Audit log** — every action above writes one JSONL line.

## Safety properties (tested, not just designed)

- Gas-bump recommendations are hard-clamped to `[MIN_GAS_BUMP_PCT,
  MAX_GAS_BUMP_PCT]` regardless of what the model suggests. Verified: a
  simulated 200% request gets capped to the configured ceiling, with the
  raw ask still preserved in the log for auditability.
- If there's no `ANTHROPIC_API_KEY`, the model call fails, or it returns
  unparseable output, the Sentinel falls back to the safety-floor bump
  automatically rather than crashing or guessing. Verified for both the
  missing-key and malformed-response cases.
- The Sentinel only ever resolves nonces for transactions it tracked
  itself — it will not act on a gap it has no record of.
- Dry-run mode requires no private key and never calls
  `sendTransaction` — verified end to end.

## Setup

```bash
npm install
cp .env.example .env
# WALLET_ADDRESS is required for read-only watching.
# PRIVATE_KEY is required to actually resolve gaps for real.
# ANTHROPIC_API_KEY is optional - without it, bumps use the safe floor.
# Set DRY_RUN=true to test detection + diagnosis without spending gas.
npm run dev          # single check
npm run watch        # continuous loop: detect, diagnose, resolve, monitor evictions
```

## Project layout

```
src/
  config.ts           - env var loading + validation
  nonceTracker.ts      - gap detection (FR-01, FR-02)
  resolver.ts           - gap resolution + the safety clamp + dry-run mode (FR-03)
  evictionMonitor.ts    - eviction detection + resubmission (FR-04)
  interceptor.ts         - drop-in wrapper for trading bots (FR-05)
  circuitBreaker.ts      - failure-threshold halt + alerting (FR-06)
  agent.ts               - AI diagnosis: cause + recommended bump, safely clamped
  logger.ts              - JSONL audit trail (FR-07)
  cli.ts                  - wires it all together
```

## Not built yet

- A live demo scenario script (fire 5 rapid Sepolia transactions, one
  underpriced, watch the pipeline catch and fix it) — the natural next
  step, and what becomes the demo video.
- Multi-wallet support — deliberately out of scope for the hackathon MVP.

## Sources this is built against

- Base's own "Flashblocks Deep Dive" engineering blog and the
  `eth_getTransactionCount` docs (docs.base.org) — confirm the
  `"pending"`-tag guidance this project relies on for gap-aware detection.
- QuickNode's nonce-troubleshooting guide, which recommends the opposite
  (client-side tracking via `"latest"`) — this project's answer to that
  disagreement is: use `"pending"` for fast detection, but never trust it
  blindly — verify against the Sentinel's own tracked transaction list
  before acting, which is what `PendingTxStore` and the receipt check in
  `resolver.ts` do.
