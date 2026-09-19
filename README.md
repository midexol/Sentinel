# Sentinel

<p align="center">
  <strong>Autonomous Nonce-Gap Watchdog & Self-Healing Mempool Pipeline for High-Frequency Trading on Base L2</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Network-Base_L2_(Sepolia_%26_Mainnet)-0052FF?style=for-the-badge&logo=coinbase" alt="Base Network" />
  <img src="https://img.shields.io/badge/Runtime-Node.js_20+_|_TypeScript_5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Security-OWASP_Clamped_|_Three--Layer_Model-D4AF37?style=for-the-badge&logo=auth0" alt="Security" />
  <img src="https://img.shields.io/badge/License-MIT-gray?style=for-the-badge" alt="License" />
</p>

---

## Overview

High-frequency algorithmic trading agents on Base submit tens of transactions per second. Under volatile gas conditions or rapid block production, a single transaction can stall or drop due to Base Flashblocks nonce-reporting desynchronization. 

Because EVM account nonces are strictly sequential, a single delayed transaction blocks all subsequent orders queued behind it. This creates a cascade of failed trades, stale inventory risk, and lost arbitrage opportunities.

**Sentinel** is an autonomous, non-custodial watchdog that intercepts outbound transactions, continuously monitors mempool queues, diagnoses stalled nonces with AI reasoning, and executes atomic, safely-clamped replacement transactions in milliseconds.

---

## System Architecture

```mermaid
flowchart TD
    subgraph BotLayer["Trading Infrastructure"]
        Bot["HFT Trading Agent"]
        SignedTx["Signed Raw Transaction"]
    end

    subgraph SentinelCore["Sentinel Engine"]
        Interceptor["Interceptor Gateway\n(interceptor.ts)"]
        Tracker["Mempool Nonce Tracker\n(nonceTracker.ts)"]
        Diagnosis["AI Diagnosis & Reasoning\n(agent.ts)"]
        SafetyClamp["Mathematical Gas Clamp\n(resolver.ts)"]
        Resolver["Atomic Replacement Dispatcher\n(resolver.ts)"]
        Breaker["Circuit Breaker & Alerts\n(circuitBreaker.ts)"]
        Audit["Append-Only Audit Logger\n(logger.ts)"]
    end

    subgraph NetworkLayer["Base L2 Protocol"]
        RPC["Base RPC Gateway\n(Proxy Layer)"]
        Mempool["L2 Mempool Queue"]
        Flashblocks["Flashblocks Sub-Second Engine"]
    end

    Bot --> SignedTx
    SignedTx --> Interceptor
    Interceptor --> Tracker
    Tracker -->|"Query pending vs latest"| RPC
    RPC --> Flashblocks
    Tracker -->|"Gap Detected"| Diagnosis
    Diagnosis -->|"Recommend Gas Bump"| SafetyClamp
    SafetyClamp -->|"Enforce [10%, 50%] Ceiling"| Resolver
    Resolver -->|"Broadcast Healing Tx"| RPC
    Resolver --> Audit
    Diagnosis --> Audit
    Resolver -->|"Track Consecutive Failures"| Breaker
    Interceptor -->|"Forward Original Tx"| RPC
    RPC --> Mempool
```

---

## Nonce Healing Lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant Bot as Trading Bot
    participant Sentinel as Sentinel Watchdog
    participant AI as Claude Reasoning Agent
    participant Base as Base RPC Gateway

    Bot->>Sentinel: Submit Raw Transaction (Nonce N)
    Sentinel->>Base: Check eth_getTransactionCount ("pending" & "latest")
    alt Nonce Gap Detected (Lowest Missing Nonce = N-1)
        Sentinel->>AI: Diagnose Cause (Cache Desync, Eviction, Underpriced)
        AI-->>Sentinel: Recommend Bump Pct & Strategy
        Sentinel->>Sentinel: Apply Hard Invariant Clamp [MIN_BUMP, MAX_BUMP]
        Sentinel->>Base: Verify Receipt (Ensure Nonce not mined in flight)
        Sentinel->>Base: Broadcast Zero-Value Null Replacement Tx
        Base-->>Sentinel: Tx Hash Confirmed
        Sentinel->>Sentinel: Append Audit Receipt to JSONL
    end
    Sentinel->>Base: Forward Bot Original Transaction (Nonce N)
    Base-->>Bot: Transaction Accepted into Mempool
```

---

## Three-Layer Institutional Security Model

```mermaid
graph LR
    subgraph Layer1["Layer 1: Private Key Isolation"]
        EnvKey["process.env.PRIVATE_KEY"]
        GasWallet["Dedicated Operational Gas Wallet"]
        ZeroMask["UI Masked: [Loaded]"]
    end

    subgraph Layer2["Layer 2: RPC Gateway & API Security"]
        BackendProxy["Server-Side Proxy (/api/*)"]
        Https["Mandatory TLS / HTTPS"]
        SafeCompare["crypto.timingSafeEqual"]
    end

    subgraph Layer3["Layer 3: Application Defense"]
        Headers["OWASP Security Headers"]
        ProtoDrop["Prototype Pollution Defense"]
        Cap["100KB Payload Cap"]
        Redact["Audit Secret Redaction"]
    end

    Layer1 --> Layer2
    Layer2 --> Layer3
```

1. **Private Key Isolation (Layer 1)**: Signing keys are loaded solely through runtime environment variables (`PRIVATE_KEY`) and are never written to disk or transmitted to the browser. Sentinel uses an isolated, low-balance operational gas wallet so main treasury funds remain untouchable.
2. **RPC Gateway Proxy (Layer 2)**: All RPC traffic passes through server-side route handlers (`/api/state`, `/api/stream`). Frontend client bundles never contain private RPC endpoints or API keys.
3. **Application Defenses (Layer 3)**: Hardened with OWASP security headers (`HSTS`, `nosniff`, `DENY`), prototype pollution prevention, 100KB payload ceilings, and automated regex secret redaction in audit logs.

---

## Core Capabilities

| Module | Priority | Description | Implementation |
| :--- | :--- | :--- | :--- |
| **Nonce Tracking** | P0 | Queries both `pending` and `latest` tags on Base L2 every 500ms to detect missing sequences. | [`src/nonceTracker.ts`](file:///c:/Users/olamide/Desktop/Sentinel/src/nonceTracker.ts) |
| **AI Diagnosis Engine** | P1 | Leverages Claude 3.5 Sonnet to categorize mempool anomalies and suggest optimal replacement gas fees. | [`src/agent.ts`](file:///c:/Users/olamide/Desktop/Sentinel/src/agent.ts) |
| **Atomic Resolution** | P0 | Resubmits stuck transactions with clamped gas bumps; validates receipts immediately before broadcast. | [`src/resolver.ts`](file:///c:/Users/olamide/Desktop/Sentinel/src/resolver.ts) |
| **Eviction Monitoring** | P1 | Detects silent mempool drops using sliding consecutive-missing windows and triggers autonomous re-dispatch. | [`src/evictionMonitor.ts`](file:///c:/Users/olamide/Desktop/Sentinel/src/evictionMonitor.ts) |
| **Circuit Breaker** | P0 | Halts autonomous dispatch and triggers emergency webhooks if resolution failures breach safety limits. | [`src/circuitBreaker.ts`](file:///c:/Users/olamide/Desktop/Sentinel/src/circuitBreaker.ts) |
| **Bot Interceptor** | P0 | Drop-in SDK gateway allowing trading algorithms to route transactions through Sentinel seamlessly. | [`src/interceptor.ts`](file:///c:/Users/olamide/Desktop/Sentinel/src/interceptor.ts) |
| **Audit Log Trail** | P0 | Append-only structured JSONL logging with automated secret and private key redaction. | [`src/logger.ts`](file:///c:/Users/olamide/Desktop/Sentinel/src/logger.ts) |

---

## Mathematical Safety Invariants

Sentinel enforces four hard-coded formal safety invariants:

### INV-01: Strict Monotonicity Guarantee
$$\text{Nonce}_{\text{Mined}}(t) \le \text{Nonce}_{\text{Pending}}(t)$$
The monitored mined nonce must never exceed the pending nonce. Any negative gap triggers an emergency RPC state reconciliation.

### INV-02: Hard Gas Bump Ceiling
$$\text{Bump}_{\text{Effective}} \le \min(\text{Bump}_{\text{AI}}, \text{MAX\_GAS\_BUMP\_PCT})$$
Replacement transactions are clamped between a 10% floor and a 50% ceiling. This mathematically eliminates gas depletion loops under adversarial network conditions.

### INV-03: Zero-Value Null Execution
$$\text{Value} = 0 \text{ ETH} \land \text{To} = \text{From} \land \text{Data} = \text{0x}$$
Autonomous gap-healing transactions are strictly zero-value self-transfers with null calldata. The agent cannot drain protocol assets.

### INV-04: Circuit Breaker Trip Rate
$$\text{Failures}_{\text{Window}} \le \text{Threshold} \lor \text{TRIP\_SAFE\_MODE}$$
If consecutive failures exceed the threshold (default: 10 within 5 minutes), Sentinel enters safe standby mode and dispatches alerts to Telegram / Discord webhooks.

---

## Project Structure

```
Sentinel/
├── app/                        # Next.js 14 App Router Command Center
│   ├── api/                    # Server-side proxy endpoints
│   │   ├── health/             # Uptime, block sync, and node health
│   │   ├── metrics/            # Resolution metrics and latency counters
│   │   ├── settings/           # Boundary-validated daemon settings
│   │   ├── state/              # Live wallet nonce and queue state
│   │   └── stream/             # Real-time mempool telemetry feed
│   ├── dapp/                   # Institutional trading command dashboard
│   ├── security/               # 3-layer security model, checklist, invariants
│   ├── simulate/               # Interactive adversarial mempool simulator
│   ├── layout.tsx              # Root layout with Pacifico & Cinzel typography
│   └── page.tsx                # Interactive landing experience with motion canvas
├── src/                        # Sentinel Autonomous Core Engine
│   ├── agent.ts                # AI diagnosis and prompt reasoning
│   ├── circuitBreaker.ts       # Trip-wire halt and webhook alerts
│   ├── cli.ts                  # Autonomous daemon entrypoint
│   ├── config.ts               # Environment validation and boundary clamps
│   ├── evictionMonitor.ts      # Sliding window mempool eviction detector
│   ├── interceptor.ts          # Drop-in SDK proxy for trading algorithms
│   ├── logger.ts               # Append-only JSONL receipts with secret redaction
│   ├── nonceTracker.ts         # Dual-tag (pending vs latest) gap detection
│   └── resolver.ts             # Atomic replacement dispatcher with receipt checks
├── lib/                        # Viem network and contract clients
├── next.config.mjs             # OWASP HTTP security header configuration
└── tailwind.config.ts          # Renaissance-inspired Void & Aurum design tokens
```

---

## Getting Started

### 1. Prerequisites
- Node.js 20+
- npm or pnpm

### 2. Installation
```bash
git clone https://github.com/midexol/Sentinel.git
cd Sentinel
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```

```env
# Required for telemetry and nonce tracking
WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc454e4438BaEa
RPC_URL=https://sepolia.base.org

# Required for autonomous healing (optional for Dry-Run mode)
PRIVATE_KEY=0x...

# Optional AI diagnosis (falls back to deterministic floor if omitted)
ANTHROPIC_API_KEY=sk-ant-...

# Safety bounds
DRY_RUN=false
MIN_GAS_BUMP_PCT=10
MAX_GAS_BUMP_PCT=50
CIRCUIT_BREAKER_THRESHOLD=10
```

### 4. Running the Autonomous Daemon
```bash
# Single scan
npm run dev

# Continuous autonomous monitoring loop
npm run watch
```

### 5. Running the Web Command Center
```bash
# Development mode
npm run next:dev

# Optimized production build
npm run build
npm start
```
The interface will be live at `http://localhost:3000`.

---

## API Reference

| Endpoint | Method | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/health` | GET | Public | Node connectivity, block height, uptime, and latency checks. |
| `/api/metrics` | GET | Public | Aggregate resolution count, gas savings, and failure counts. |
| `/api/state` | GET | Internal | Current wallet mined vs pending nonce states. |
| `/api/stream` | GET | Internal | Server-sent event stream of live mempool activity. |
| `/api/settings` | GET/POST | Protected | Read and update runtime parameters with boundary schema validation. |

---

## Verification & Testing

Sentinel includes end-to-end simulation suites:

```bash
# Execute unit and invariant test suites
npm test

# Run dry-run verification against live Base Sepolia RPC
DRY_RUN=true npm run dev
```

---

## License

Distributed under the MIT License. Built for the Orion Builder Hackathon on Base L2.

