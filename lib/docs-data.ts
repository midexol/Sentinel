export interface DocSection {
  id: string;
  title: string;
  level: 2 | 3;
}

export interface DocArticle {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  badge?: string;
  sections: DocSection[];
  content: string;
  prev?: { slug: string; title: string };
  next?: { slug: string; title: string };
}

export interface DocCategory {
  title: string;
  articles: {
    slug: string;
    title: string;
    badge?: string;
  }[];
}

export const DOCS_CATEGORIES: DocCategory[] = [
  {
    title: "GETTING STARTED",
    articles: [
      { slug: "introduction", title: "Introduction", badge: "Core" },
      { slug: "quickstart", title: "Quickstart (2 min)" },
      { slug: "architecture", title: "System Architecture" },
    ],
  },
  {
    title: "CORE CONCEPTS",
    articles: [
      { slug: "base-mempool", title: "Base L2 & Flashblocks" },
      { slug: "model-proposes-code-decides", title: "Model Proposes, Code Decides" },
      { slug: "invariants", title: "Mathematical Invariants", badge: "INV-01-04" },
      { slug: "eviction-detection", title: "Silent Eviction Detection" },
    ],
  },
  {
    title: "INTEGRATION & SDK",
    articles: [
      { slug: "interceptor-sdk", title: "Interceptor Gateway SDK" },
      { slug: "telemetry-stream", title: "Real-Time Telemetry & SSE" },
      { slug: "api-reference", title: "REST API Reference" },
    ],
  },
  {
    title: "SECURITY & AUTHORITY",
    articles: [
      { slug: "security-model", title: "Three-Layer Security Model" },
      { slug: "circuit-breaker", title: "Circuit Breaker & Alerts" },
      { slug: "audit-logging", title: "Append-Only Audit Trail" },
    ],
  },
  {
    title: "REFERENCE",
    articles: [
      { slug: "configuration", title: "Environment Variables" },
      { slug: "glossary", title: "Glossary of Terms" },
    ],
  },
];

export const DOCS_ARTICLES: Record<string, DocArticle> = {
  introduction: {
    slug: "introduction",
    title: "Introduction",
    subtitle: "Autonomous Nonce-Gap Watchdog & Self-Healing Mempool Pipeline for High-Frequency Trading on Base L2",
    category: "GETTING STARTED",
    badge: "Core",
    sections: [
      { id: "overview", title: "Overview", level: 2 },
      { id: "the-problem", title: "The High-Frequency Nonce Problem", level: 2 },
      { id: "what-sentinel-does", title: "What Sentinel Does", level: 2 },
      { id: "what-sentinel-is-not", title: "What Sentinel Is Not", level: 2 },
      { id: "where-to-go-next", title: "Where to Go Next", level: 2 },
    ],
    content: `
### Overview

High-frequency algorithmic trading agents on Base L2 submit dozens of transactions per second. Under volatile gas conditions or rapid block production, a single transaction can stall, get underpriced, or silently drop due to Base Flashblocks sequencer desynchronization.

Because EVM account nonces are strictly sequential ($0, 1, 2, \\dots, N$), a single delayed transaction blocks **every subsequent trade queued behind it**. This triggers cascading execution stalls, inventory risk, and failed arbitrage executions.

**Sentinel** is an autonomous, non-custodial watchdog that intercepts outbound transactions, continuously monitors mempool queues, diagnoses stalled nonces with AI reasoning, and executes atomic, safely-clamped replacement transactions in milliseconds.

---

### The High-Frequency Nonce Problem

EVM accounts maintain an internal transaction counter called a \`nonce\`. The execution rules are strict:
1. Transaction with nonce $N$ can execute only after nonce $N-1$ is finalized in a block.
2. If nonce $N-1$ stalls in the mempool or gets evicted by the sequencer, transactions $N, N+1, N+2, \\dots$ sit inert in sequencer queues.
3. On Base L2, with sub-second **Flashblocks (~200ms)**, local bot state can fall out of sync with sequencer state within a single round-trip.

Trading desks traditionally handle this by tearing down order pipelines manually, incurring slippage and missed fills. Sentinel automates this recovery without requiring human intervention or exposing treasury funds.

---

### What Sentinel Does

- **Intercepts Raw Submissions**: Drop-in proxy gateway intercepts transactions before or during RPC dispatch to track pending queues.
- **Monitors Dual RPC Tags**: Queries both \`pending\` and \`latest\` tags on Base L2 every 500ms to detect sequencer desynchronizations and missing numbers.
- **Diagnoses via Reasoning**: LLM reasoning engine assesses whether the stall was caused by a sudden gas spike, sequencer cache lag, or silent eviction.
- **Enforces Mathematical Clamps**: Binds every gas bump between a strict 10% minimum floor and a 50% safety ceiling (\`INV-02\`). The AI recommends; mathematical code decides.
- **Atomic Zero-Value Dispatches**: Unjams queues by submitting zero-value self-replacements ($0\\text{ ETH}$, null calldata) or boosted parameter rewrites.
- **Circuit Breakers & Audit Trail**: Trips into safe standby if failure rates exceed safety limits, logging all actions to tamper-proof append-only receipts.

---

### What Sentinel Is Not

- **It is not custodial**: Sentinel never takes custody of wallet assets or private treasury keys. Signing is performed using dedicated, low-balance operational gas wallets or client signatures.
- **It does not allow the AI to set gas directly**: The LLM prompt output is strictly treated as an unverified proposal. The deterministic code engine applies hard boundary clamping before any RPC broadcast.
- **It is not an execution bot**: Sentinel does not generate trading alpha or execute trade orders. It is pure infrastructure reliability engineering for teams executing high-throughput on-chain operations.

---

### Where to Go Next

- [Quickstart (2 min)](/docs/quickstart): Install, configure, and launch the Sentinel daemon.
- [System Architecture](/docs/architecture): Trace the complete lifecycle of a transaction through the watchdog pipeline.
- [Mathematical Invariants](/docs/invariants): Review the 4 formal safety invariants governing autonomous dispatch.
`,
    next: { slug: "quickstart", title: "Quickstart (2 min)" },
  },

  quickstart: {
    slug: "quickstart",
    title: "Quickstart",
    subtitle: "Install, configure, and launch the Sentinel watchdog daemon in under 2 minutes",
    category: "GETTING STARTED",
    sections: [
      { id: "prerequisites", title: "Prerequisites", level: 2 },
      { id: "installation", title: "Installation", level: 2 },
      { id: "configuration", title: "Environment Setup", level: 2 },
      { id: "running-tests", title: "Verifying Invariant Tests", level: 2 },
      { id: "launching-daemon", title: "Launching the Daemon", level: 2 },
    ],
    content: `
### Prerequisites

Before running Sentinel, ensure your system has:
- **Node.js 20+** installed
- An active RPC endpoint for **Base Mainnet** or **Base Sepolia** (Alchemy, Infura, or public Base RPC)
- An operational private key with a small gas balance (e.g. 0.005 ETH on Base)
- An optional Gemini API Key for autonomous LLM diagnosis

---

### Installation

Clone the repository and install dependencies using your preferred package manager:

\`\`\`bash
git clone https://github.com/midexol/Sentinel.git
cd Sentinel
npm install
\`\`\`

---

### Environment Setup

Create a \`.env\` file in the project root:

\`\`\`bash
cp .env.example .env
\`\`\`

Configure your essential runtime parameters:

\`\`\`env
# Base L2 Network Configuration
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532

# Operational Gas Wallet (Dedicated recovery key)
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Autonomous Diagnosis Engine (Optional - falls back to deterministic rule engine)
GEMINI_API_KEY=your_gemini_api_key_here

# Safety Invariant Bounds
MAX_GAS_BUMP_PCT=50
MIN_GAS_BUMP_PCT=10
CIRCUIT_BREAKER_FAILURES=10
\`\`\`

---

### Verifying Invariant Tests

Run the full invariant and security test suite to confirm mathematical safety bounds:

\`\`\`bash
npm test
\`\`\`

You should see 100% passing tests:
- \`INV-01\`: Monotonic Nonce Tracking
- \`INV-02\`: Gas Bump Clamping between 10% and 50%
- \`INV-03\`: Zero-Value Null Calldata Verification
- \`INV-04\`: Circuit Breaker Trip Rate and Safe Standby
- Audit Logger Secret Redaction

---

### Launching the Daemon

Start the autonomous background watchdog daemon:

\`\`\`bash
# Build and run the TypeScript CLI daemon
npm run dev:daemon
\`\`\`

Or start the Next.js Command Deck and visual Observatory:

\`\`\`bash
npm run dev
# Open http://localhost:3000/dapp in your browser
\`\`\`
`,
    prev: { slug: "introduction", title: "Introduction" },
    next: { slug: "architecture", title: "System Architecture" },
  },

  architecture: {
    slug: "architecture",
    title: "System Architecture",
    subtitle: "Complete system topology, component boundaries, and life of a healed transaction",
    category: "GETTING STARTED",
    sections: [
      { id: "component-topology", title: "Component Topology", level: 2 },
      { id: "life-of-a-transaction", title: "Life of a Transaction", level: 2 },
      { id: "pipeline-subsystems", title: "Pipeline Subsystems", level: 2 },
    ],
    content: `
### Component Topology

Sentinel operates as a high-speed sentinel pipeline situated between algorithmic trading systems and the Base L2 sequencer:

\`\`\`
[ Trading Bot / HFT Agent ]
          │
          ▼ (Raw Transaction Payload)
┌─────────────────────────────────────────────────────────┐
│                      SENTINEL CORE                      │
│                                                         │
│  1. Interceptor Gateway (interceptor.ts)                │
│     Captures transaction submissions & tracks sequence  │
│                                                         │
│  2. Mempool Nonce Tracker (nonceTracker.ts)             │
│     Polls Base RPC: pending vs latest tags (500ms)      │
│                                                         │
│  3. AI Reasoning Engine (agent.ts)                      │
│     Diagnoses cause: eviction, gas spike, or cache lag  │
│                                                         │
│  4. Invariant Safety Clamp (resolver.ts)                │
│     Enforces INV-02: bounds proposal in [10%, 50%]      │
│                                                         │
│  5. Atomic Dispatcher & Pre-Flight Receipt Validator    │
│     Broadcasts zero-value null self-transfer to Base    │
│                                                         │
│  6. Circuit Breaker & Audit Logger (logger.ts)          │
│     Records SHA-256 JSONL receipts with redactions      │
└─────────────────────────────────────────────────────────┘
          │
          ▼ (Healed Pipeline)
[ Base L2 Flashblocks Sequencer (Block ~200ms) ]
\`\`\`

---

### Life of a Transaction

1. **Submission**: An algorithmic bot submits an order with nonce $N$.
2. **Detection**: Sentinel's \`nonceTracker.ts\` queries \`eth_getTransactionCount\` with \`pending\` and \`latest\`. If \`pending > latest\` and a gap $N-1$ is missing from the queue, a stall event is emitted.
3. **Diagnosis**: \`agent.ts\` inspects gas history, base fee trends, and sequencer latency. It drafts a recommended gas bump.
4. **Clamping**: \`resolver.ts\` clamps the recommendation:
   $$\\text{Bump}_{\\text{Final}} = \\max(10\\%, \\min(\\text{Bump}_{\\text{AI}}, 50\\%))$$
5. **Pre-flight Receipt Check**: Immediately prior to dispatch, Sentinel re-checks if nonce $N-1$ was mined in the last sub-second Flashblock to prevent duplicate spend.
6. **Broadcast**: A zero-value self-transaction ($0\\text{ ETH}$, null calldata) with the bumped gas parameters is dispatched.
7. **Resolution**: Sequencer processes the replacement, clearing the gap. Bot transaction $N$ executes immediately.
`,
    prev: { slug: "quickstart", title: "Quickstart (2 min)" },
    next: { slug: "base-mempool", title: "Base L2 & Flashblocks" },
  },

  "base-mempool": {
    slug: "base-mempool",
    title: "Base L2 & Flashblocks",
    subtitle: "Understanding 200ms sub-second block production, sequencer caching, and silent mempool evictions",
    category: "CORE CONCEPTS",
    sections: [
      { id: "sub-second-sequencing", title: "Sub-Second Sequencing", level: 2 },
      { id: "silent-evictions", title: "The Silent Eviction Quirk", level: 2 },
      { id: "how-sentinel-adapts", title: "How Sentinel Solves This", level: 2 },
    ],
    content: `
### Sub-Second Sequencing

Base utilizes **Flashblocks**, streaming partial block increments every ~200ms. While this delivers near-instant confirmation for standard consumer transactions, it introduces unique friction for high-throughput automated trading agents:

- **Local State Desynchronization**: A trading bot that increments its local nonce cache locally will fall out of sync if an upstream transaction takes longer than 200ms to propagate across global RPC nodes.
- **Node Propagation Delays**: Different Base RPC endpoints (e.g. public RPC vs private node providers) can report differing \`pending\` nonces for up to 1-2 seconds while blocks gossip.

---

### The Silent Eviction Quirk

In standard Ethereum L1 geth mempools, when a transaction is dropped due to gas underpricing, an eviction error is commonly broadcast to websocket subscribers.

On Base L2, under periods of extreme network load:
- The sequencer drops underpriced transactions from the mempool **silently**.
- No error callback or eviction event is broadcast to the sending client.
- The client assumes the transaction is still pending, causing all subsequent nonces to hang indefinitely in deadlocked queues.

---

### How Sentinel Solves This

Sentinel employs a **sliding consecutive-missing window** via \`src/evictionMonitor.ts\`:
- When a monitored transaction hash disappears from \`pending\` without appearing in any mined block for 3 consecutive poll cycles (1,500ms), Sentinel classifies it as a **Silent Eviction**.
- Sentinel triggers an autonomous replacement broadcast at the minimum required bump without waiting for manual intervention.
`,
    prev: { slug: "architecture", title: "System Architecture" },
    next: { slug: "model-proposes-code-decides", title: "Model Proposes, Code Decides" },
  },

  "model-proposes-code-decides": {
    slug: "model-proposes-code-decides",
    title: "Model Proposes, Code Decides",
    subtitle: "Why autonomous AI agents must never directly control execution parameters in high-frequency trading",
    category: "CORE CONCEPTS",
    sections: [
      { id: "the-catastrophic-anti-pattern", title: "The Catastrophic Anti-Pattern", level: 2 },
      { id: "sentinel-enforced-boundaries", title: "Sentinel Enforced Boundaries", level: 2 },
      { id: "fallback-guarantees", title: "Fallback Guarantees", level: 2 },
    ],
    content: `
### The Catastrophic Anti-Pattern

Most Web3 AI agent implementations blindly take whatever prompt output an LLM generates and submits it directly into smart contract transactions. 

In high-frequency on-chain trading, this design is dangerous:
- **Hallucinated Gas Values**: An LLM might recommend a 5,000% gas bump during a period of stress, rapidly draining operational wallets.
- **Malformed Outputs**: Network timeouts or non-JSON completions cause unhandled exceptions that crash daemon processes.
- **Prompt Injections**: Malicious transaction payload data could attempt to bias the model into recommending extreme gas values.

---

### Sentinel Enforced Boundaries

Sentinel enforces a strict separation of concerns:

\`\`\`
       ┌────────────────────────┐
       │   AI Reasoning Agent   │
       │  "Why did tx stall?"   │
       │  "Suggest bump: 35%"   │
       └───────────┬────────────┘
                   │ Raw Proposal (Untrusted)
                   ▼
       ┌────────────────────────┐
       │   Mathematical Clamp   │
       │        (INV-02)        │
       │ Math.min(Math.max(..)) │
       └───────────┬────────────┘
                   │ Clamped Value: 35% (Bounded [10%, 50%])
                   ▼
       ┌────────────────────────┐
       │  Deterministic Viem    │
       │  Transaction Broadcaster│
       └────────────────────────┘
\`\`\`

1. **AI Proposes**: The LLM analyzes mempool metrics, base fee drift, and queue depth, returning a diagnostic hypothesis and recommended bump.
2. **Code Decides**: Hard-coded mathematical limits clamp the bump between \`MIN_GAS_BUMP_PCT\` (10%) and \`MAX_GAS_BUMP_PCT\` (50%).
3. **Zero Asset Authority**: The agent is mathematically incapable of adjusting transaction value or destination addresses.

---

### Fallback Guarantees

If the LLM endpoint times out, throws a rate limit error, or returns unparseable text, Sentinel:
- Logs an \`AI_TIMEOUT_FALLBACK\` event in the audit trail.
- Automatically selects the deterministic safety floor bump (+10%).
- Continues unjamming the transaction pipeline without halting.
`,
    prev: { slug: "base-mempool", title: "Base L2 & Flashblocks" },
    next: { slug: "invariants", title: "Mathematical Invariants" },
  },

  invariants: {
    slug: "invariants",
    title: "Mathematical Invariants",
    subtitle: "Formal mathematical constraints and safety invariants bounding autonomous execution",
    category: "CORE CONCEPTS",
    badge: "INV-01-04",
    sections: [
      { id: "inv-01", title: "INV-01: Strict Monotonicity Guarantee", level: 2 },
      { id: "inv-02", title: "INV-02: Hard Gas Bump Ceiling", level: 2 },
      { id: "inv-03", title: "INV-03: Zero-Value Null Execution", level: 2 },
      { id: "inv-04", title: "INV-04: Circuit Breaker Trip Rate", level: 2 },
    ],
    content: `
Sentinel operates under four formally proven invariants verified in \`test/sentinel.test.ts\`:

---

### INV-01: Strict Monotonicity Guarantee

$$\\text{Nonce}_{\\text{Mined}}(t) \\le \\text{Nonce}_{\\text{Pending}}(t)$$

The monitored mined nonce for an account must never exceed its pending nonce. Any violation indicates an RPC node reorg or severe caching split. When detected, Sentinel:
- Pauses automated dispatch immediately.
- Flushes local nonce stores.
- Performs an atomic multi-node RPC state reconciliation before resuming.

---

### INV-02: Hard Gas Bump Ceiling

$$\\text{Bump}_{\\text{Effective}} = \\max(10\\%, \\min(\\text{Bump}_{\\text{AI}}, 50\\%))$$

Even if the AI reasoning model hallucinates or requests a 200% gas increase, the executable replacement bump is mathematically clamped to a maximum of 50%, with a safety floor of 10% (the minimum bump required by EVM client replacement rules).

This eliminates automated gas exhaustion exploits under all market conditions.

---

### INV-03: Zero-Value Null Execution

$$\\text{Value} = 0 \\text{ ETH} \\quad \\land \\quad \\text{To} = \\text{From} \\quad \\land \\quad \\text{Data} = \\text{0x}$$

Whenever Sentinel generates an autonomous queue-clearing replacement transaction to cancel out a stuck nonce, it enforces:
- \`value: 0n\`
- \`to: senderAddress\`
- \`data: "0x"\`

Sentinel cannot transfer funds to third parties or call arbitrary smart contracts.

---

### INV-04: Circuit Breaker Trip Rate

$$\\text{Failures}_{\\Delta t} > K_{\\text{Threshold}} \\implies \\text{HALT}$$

If consecutive resolution failures exceed $K_{\\text{Threshold}}$ (default: 10 failures within 5 minutes), Sentinel trips into **Safe Standby Mode**:
- Ceases all automated dispatch.
- Emits emergency webhooks to Discord and Telegram.
- Preserves the pending transaction queue for manual desk inspection.
`,
    prev: { slug: "model-proposes-code-decides", title: "Model Proposes, Code Decides" },
    next: { slug: "eviction-detection", title: "Silent Eviction Detection" },
  },

  "eviction-detection": {
    slug: "eviction-detection",
    title: "Silent Eviction Detection",
    subtitle: "Algorithmic inference of dropped mempool transactions using dual-tag sampling",
    category: "CORE CONCEPTS",
    sections: [
      { id: "detection-mechanism", title: "Detection Mechanism", level: 2 },
      { id: "sliding-window-algorithm", title: "Sliding Window Algorithm", level: 2 },
      { id: "state-transition-table", title: "State Transition Matrix", level: 2 },
    ],
    content: `
### Detection Mechanism

Because Base sequencers do not publish eviction events, Sentinel reconstructs transaction lifecycles using continuous RPC sampling:

1. **Active Tracking**: Every transaction submitted via \`interceptor.ts\` is registered in \`PendingTxStore\`.
2. **Dual-Tag Probing**: Every 500ms, Sentinel queries:
   - \`eth_getTransactionReceipt(hash)\`
   - \`eth_getTransactionByHash(hash)\`
3. **State Disappearance**: If a transaction returns null from both queries while \`eth_getTransactionCount("pending")\` remains higher than its nonce, the transaction has been silently evicted from the sequencer mempool.

---

### Sliding Window Algorithm

\`\`\`typescript
// src/evictionMonitor.ts
if (!inMempool && !receipt && elapsedMs > EVICTION_GRACE_PERIOD_MS) {
  consecutiveMissingCycles++;
  if (consecutiveMissingCycles >= 3) {
    emitEvictionEvent({
      nonce,
      hash,
      reason: "SILENT_SEQUENCER_DROP"
    });
  }
}
\`\`\`

---

### State Transition Matrix

| Initial State | Mempool Query | Receipt Query | Next Action |
| :--- | :--- | :--- | :--- |
| **Tracked** | Present | Null | Continue monitoring (Pending) |
| **Tracked** | Absent | Present | Mark Confirmed & Prune |
| **Tracked** | Absent | Null (Cycle 1-2) | Flag Warning (Propagation lag) |
| **Tracked** | Absent | Null (Cycle 3+) | **Trigger Autonomous Resubmission** |
`,
    prev: { slug: "invariants", title: "Mathematical Invariants" },
    next: { slug: "interceptor-sdk", title: "Interceptor Gateway SDK" },
  },

  "interceptor-sdk": {
    slug: "interceptor-sdk",
    title: "Interceptor Gateway SDK",
    subtitle: "Drop-in wrapper for Viem, Ethers.js, and raw JSON-RPC trading bot pipelines",
    category: "INTEGRATION & SDK",
    sections: [
      { id: "sdk-overview", title: "SDK Overview", level: 2 },
      { id: "viem-integration", title: "Viem Integration", level: 2 },
      { id: "ethers-integration", title: "Ethers.js Integration", level: 2 },
    ],
    content: `
### SDK Overview

Sentinel provides a zero-overhead SDK wrapper that intercepts outgoing transactions before they hit the public mempool:

\`\`\`bash
npm install @sentinel/sdk viem
\`\`\`

---

### Viem Integration

Wrap your existing Viem Wallet Client with \`withSentinelInterceptor\`:

\`\`\`typescript
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { withSentinelInterceptor } from "./src/interceptor";

const baseWallet = createWalletClient({
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});

// Wrap the client with Sentinel Watchdog protection
const wallet = withSentinelInterceptor(baseWallet, {
  sentinelRpcUrl: "http://localhost:3000/api",
  autoHealGaps: true,
  maxGasBumpPct: 40,
});

// Execute trades normally - Sentinel tracks all nonces automatically
const hash = await wallet.sendTransaction({
  to: "0x1234567890123456789012345678901234567890",
  value: 0n,
  data: "0x",
});
console.log("Transaction registered with Sentinel:", hash);
\`\`\`

---

### Ethers.js Integration

For teams using Ethers.js v6:

\`\`\`typescript
import { ethers } from "ethers";
import { SentinelEthersProvider } from "./src/interceptor";

const provider = new SentinelEthersProvider("https://sepolia.base.org", {
  sentinelEndpoint: "http://localhost:3000/api",
});

const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

// All signed transactions route through Sentinel's gap detector
const tx = await signer.sendTransaction({
  to: "0xRecipientAddress...",
  value: ethers.parseEther("0.01"),
});
\`\`\`
`,
    prev: { slug: "eviction-detection", title: "Silent Eviction Detection" },
    next: { slug: "telemetry-stream", title: "Real-Time Telemetry & SSE" },
  },

  "telemetry-stream": {
    slug: "telemetry-stream",
    title: "Real-Time Telemetry & SSE",
    subtitle: "Subscribe to live mempool events, AI reasoning logs, and healing receipts via Server-Sent Events",
    category: "INTEGRATION & SDK",
    sections: [
      { id: "sse-connection", title: "SSE Endpoint Overview", level: 2 },
      { id: "event-types", title: "Event Types & Schemas", level: 2 },
      { id: "client-example", title: "Browser & Node.js Client Example", level: 2 },
    ],
    content: `
### SSE Endpoint Overview

Sentinel provides a low-latency Server-Sent Events (SSE) feed at \`/api/stream\`:

- **Path**: \`/api/stream\`
- **Protocol**: HTTP/1.1 or HTTP/2 Server-Sent Events
- **Heartbeat**: 15 seconds
- **Authentication**: Bearer token or operational session cookie

---

### Event Types & Schemas

The stream broadcasts four distinct event types:

1. \`nonce_update\`: Real-time updates when pending or latest nonce increments.
2. \`gap_detected\`: Broadcast when a sequence hole is found.
3. \`ai_diagnosis\`: Diagnostic reasoning text and suggested gas bump from the reasoning engine.
4. \`replacement_broadcast\`: Hash, clamped gas parameters, and BaseScan receipt link.

\`\`\`json
{
  "type": "replacement_broadcast",
  "data": {
    "nonce": 42,
    "originalHash": "0xabc123...",
    "replacementHash": "0xdef456...",
    "clampedBumpPct": 25,
    "maxFeePerGas": "1850000000",
    "timestamp": 1727094000000
  }
}
\`\`\`

---

### Client Example

\`\`\`typescript
const eventSource = new EventSource("/api/stream");

eventSource.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  console.log("Telemetry Received:", payload.type, payload.data);
};

eventSource.addEventListener("gap_detected", (e) => {
  console.warn("Nonce Gap Detected in Mempool:", JSON.parse(e.data));
});
\`\`\`
`,
    prev: { slug: "interceptor-sdk", title: "Interceptor Gateway SDK" },
    next: { slug: "api-reference", title: "REST API Reference" },
  },

  "api-reference": {
    slug: "api-reference",
    title: "REST API Reference",
    subtitle: "Complete documentation for Sentinel's server-side endpoints and monitoring routes",
    category: "INTEGRATION & SDK",
    sections: [
      { id: "get-health", title: "GET /api/health", level: 2 },
      { id: "get-metrics", title: "GET /api/metrics", level: 2 },
      { id: "get-state", title: "GET /api/state", level: 2 },
      { id: "post-settings", title: "POST /api/settings", level: 2 },
    ],
    content: `
### GET /api/health

Returns current node health, Base L2 block sync height, and daemon uptime.

**Response**:
\`\`\`json
{
  "status": "healthy",
  "network": "Base Sepolia (84532)",
  "currentBlock": 18459203,
  "mempoolSyncLagMs": 142,
  "circuitBreaker": "ACTIVE"
}
\`\`\`

---

### GET /api/metrics

Returns historical performance metrics, total gaps resolved, average resolution latency, and gas saved.

**Response**:
\`\`\`json
{
  "totalGapsDetected": 148,
  "totalGapsResolved": 148,
  "averageResolutionTimeMs": 312,
  "circuitBreakerTrips": 0,
  "activeMonitoredWallets": 4
}
\`\`\`

---

### GET /api/state

Fetches current pending vs latest nonce counts and queued transaction objects for a specific wallet.

**Query Parameters**:
- \`wallet\`: Hex-encoded EVM address (\`0x...\`)

**Response**:
\`\`\`json
{
  "wallet": "0x742d35Cc6634C0532925a3b844Bc454e4438BaEa",
  "minedNonce": 105,
  "pendingNonce": 109,
  "hasGap": true,
  "lowestMissingNonce": 106
}
\`\`\`

---

### POST /api/settings

Updates daemon runtime bounds within mathematically verified constraints.

**Request Body**:
\`\`\`json
{
  "maxGasBumpPct": 45,
  "minGasBumpPct": 12,
  "pollingIntervalMs": 500
}
\`\`\`
`,
    prev: { slug: "telemetry-stream", title: "Real-Time Telemetry & SSE" },
    next: { slug: "security-model", title: "Three-Layer Security Model" },
  },

  "security-model": {
    slug: "security-model",
    title: "Three-Layer Security Model",
    subtitle: "Defense-in-depth architecture isolating private keys, RPC traffic, and application runtimes",
    category: "SECURITY & AUTHORITY",
    sections: [
      { id: "layer-1-keys", title: "Layer 1: Private Key Isolation", level: 2 },
      { id: "layer-2-rpc", title: "Layer 2: RPC Gateway Security", level: 2 },
      { id: "layer-3-runtime", title: "Layer 3: Application Hardening", level: 2 },
    ],
    content: `
### Layer 1: Private Key Isolation

Trading desks hold millions in primary treasury balances. Sentinel's golden rule is **complete treasury key isolation**:

- **Low-Balance Dedicated Gas Wallet**: Sentinel never holds main treasury keys. It uses an isolated operational wallet loaded with just enough ETH (e.g. 0.05 ETH) to broadcast null replacement transactions.
- **Environment Isolation**: Private keys are strictly loaded via \`process.env.PRIVATE_KEY\` at runtime. They are never written to disk, committed to git, or passed into client bundles.
- **Client Masking**: The Observatory UI masks operational addresses and provides zero access to raw private keys.

---

### Layer 2: RPC Gateway Security

- **Server-Side Proxy**: All RPC queries and transaction dispatches run on server-side route handlers. Frontend code never communicates directly with private RPC endpoints.
- **Constant-Time Verification**: Secret tokens and webhook signatures are compared using \`crypto.timingSafeEqual\` to prevent side-channel timing attacks.
- **Mandatory TLS**: Enforces TLS 1.3 across all communication channels.

---

### Layer 3: Application Hardening

- **OWASP HTTP Security Headers**: Hardened with strict Content Security Policy (CSP), \`X-Frame-Options: DENY\`, and \`X-Content-Type-Options: nosniff\`.
- **Prototype Pollution Defense**: JSON parsers strip dangerous \`__proto__\` and constructor properties.
- **100KB Payload Caps**: Incoming API requests are strictly bounded to prevent memory exhaustion attacks.
`,
    prev: { slug: "api-reference", title: "REST API Reference" },
    next: { slug: "circuit-breaker", title: "Circuit Breaker & Alerts" },
  },

  "circuit-breaker": {
    slug: "circuit-breaker",
    title: "Circuit Breaker & Alerts",
    subtitle: "Automatic safe standby halt and multi-channel alerting under anomalous network conditions",
    category: "SECURITY & AUTHORITY",
    sections: [
      { id: "circuit-breaker-logic", title: "Trip-Wire Trigger Logic", level: 2 },
      { id: "safe-standby-mode", title: "Safe Standby Execution Mode", level: 2 },
      { id: "webhook-integrations", title: "Discord & Telegram Webhooks", level: 2 },
    ],
    content: `
### Trip-Wire Trigger Logic

The Sentinel Circuit Breaker (\`src/circuitBreaker.ts\`) monitors rolling failure rates:

- **Window Size**: 5 minutes (300,000ms)
- **Failure Threshold**: 10 failed replacements or consecutive RPC dropouts
- **Trip Condition**: If failures in the rolling window exceed the threshold, the circuit flips to \`OPEN\`.

\`\`\`
[ Normal Operations ] ──( 10 Failures in 5m )──► [ CIRCUIT BREAKER TRIPPED ]
                                                        │
                                                        ├─► Halt All Autonomous Writes
                                                        ├─► Dispatch Emergency Webhook
                                                        └─► Require Manual Operator Reset
\`\`\`

---

### Safe Standby Execution Mode

When the circuit trips:
1. **Autonomous writes are halted**: Sentinel ceases broadcasting replacement transactions.
2. **Read-only telemetry remains active**: The Observatory UI continues monitoring mempool states and alerting trading desks.
3. **Receipt trail updated**: A high-priority incident receipt is written to \`audit.log\`.

---

### Discord & Telegram Webhooks

Configure external alert webhooks in your \`.env\`:

\`\`\`env
ALERT_WEBHOOK_URL=https://discord.com/api/webhooks/...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
\`\`\`

When a circuit trip or critical gap occurs, a formatted alert is dispatched within 50ms with direct BaseScan transaction receipts and queue metrics.
`,
    prev: { slug: "security-model", title: "Three-Layer Security Model" },
    next: { slug: "audit-logging", title: "Append-Only Audit Trail" },
  },

  "audit-logging": {
    slug: "audit-logging",
    title: "Append-Only Audit Trail",
    subtitle: "Cryptographic JSONL receipts with automated secret redaction for institutional compliance",
    category: "SECURITY & AUTHORITY",
    sections: [
      { id: "audit-receipt-format", title: "Receipt Structure", level: 2 },
      { id: "secret-redaction", title: "Automated Secret Scrubbing", level: 2 },
      { id: "basescan-verification", title: "On-Chain Verification", level: 2 },
    ],
    content: `
### Receipt Structure

Every autonomous diagnosis, gas clamp, and replacement broadcast is recorded to an append-only JSONL log (\`src/logger.ts\`):

\`\`\`json
{
  "timestamp": "2026-09-23T12:00:00.000Z",
  "action": "NONCE_REPLACEMENT_EXECUTED",
  "wallet": "0x742d35Cc6634C0532925a3b844Bc454e4438BaEa",
  "nonce": 48,
  "originalHash": "0x3a4b...",
  "replacementHash": "0x9f8e...",
  "aiRecommendedBumpPct": 35,
  "clampedBumpPct": 35,
  "gasPaidGwei": "1.8",
  "checksum": "sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
\`\`\`

---

### Automated Secret Scrubbing

Sentinel enforces OWASP redaction rules before writing any log entry:
- 64-character hex strings matching private key signatures are replaced with \`[REDACTED_SECRET]\`.
- API keys, seed phrases, and bearer tokens are automatically scrubbed.
- Public transaction hashes and Ethereum addresses are preserved for auditability.

---

### On-Chain Verification

Anyone can verify Sentinel receipts independently by querying BaseScan with the replacement transaction hash. The timestamp, sender, gas price, and zero-value null calldata match the audit trail entry byte-for-byte.
`,
    prev: { slug: "circuit-breaker", title: "Circuit Breaker & Alerts" },
    next: { slug: "configuration", title: "Environment Variables" },
  },

  configuration: {
    slug: "configuration",
    title: "Environment Variables",
    subtitle: "Complete reference of all configuration options, boundaries, and default values",
    category: "REFERENCE",
    sections: [
      { id: "network-config", title: "Network Configuration", level: 2 },
      { id: "security-config", title: "Safety & Invariant Bounds", level: 2 },
      { id: "operational-config", title: "Operational Parameters", level: 2 },
    ],
    content: `
### Network Configuration

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| \`RPC_URL\` | **Yes** | \`https://sepolia.base.org\` | Base L2 JSON-RPC endpoint. |
| \`CHAIN_ID\` | **Yes** | \`84532\` | Chain ID (\`8453\` for Mainnet, \`84532\` for Sepolia). |
| \`PORT\` | No | \`3000\` | HTTP server port for Command Center. |

---

### Safety & Invariant Bounds

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| \`MAX_GAS_BUMP_PCT\` | No | \`50\` | Maximum permissible gas bump percentage (\`INV-02\`). |
| \`MIN_GAS_BUMP_PCT\` | No | \`10\` | Minimum required replacement bump (EVM standard). |
| \`CIRCUIT_BREAKER_FAILURES\`| No | \`10\` | Consecutive failures before tripping safe standby. |
| \`CIRCUIT_BREAKER_WINDOW_MS\`| No | \`300000\` | Rolling window duration in milliseconds (5 min). |

---

### Operational Parameters

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| \`PRIVATE_KEY\` | **Yes** | None | Operational gas wallet private key (hex string). |
| \`GEMINI_API_KEY\` | No | None | Google Gemini API key for LLM mempool diagnosis. |
| \`POLL_INTERVAL_MS\` | No | \`500\` | Mempool dual-tag polling interval in milliseconds. |
| \`ALERT_WEBHOOK_URL\` | No | None | Discord or Telegram webhook for emergency alerts. |
`,
    prev: { slug: "audit-logging", title: "Append-Only Audit Trail" },
    next: { slug: "glossary", title: "Glossary of Terms" },
  },

  glossary: {
    slug: "glossary",
    title: "Glossary of Terms",
    subtitle: "Plain-language definitions of high-frequency trading and EVM mempool terminology",
    category: "REFERENCE",
    sections: [
      { id: "evm-terms", title: "EVM & Protocol Terms", level: 2 },
      { id: "sentinel-terms", title: "Sentinel Architecture Terms", level: 2 },
    ],
    content: `
### EVM & Protocol Terms

- **Account Nonce**: A strictly sequential integer assigned to each Ethereum account. Each transaction sent from an account increments its nonce by 1.
- **Nonce Gap**: A missing integer in the sequence (e.g. nonces 40 and 42 are submitted, but nonce 41 is missing). All nonces above the gap cannot execute until the gap is filled.
- **Flashblocks**: Base L2's sub-second block production mechanism that streams partial blocks every ~200ms.
- **Silent Eviction**: A situation where an L2 sequencer drops an underpriced transaction without returning an error or broadcasting a cancellation event.
- **Replacement Transaction**: A transaction submitted with the identical nonce as a pending transaction, but with a higher gas fee (at least 10% higher in EVM standard) to replace it.

---

### Sentinel Architecture Terms

- **Model Proposes, Code Decides**: The architectural doctrine ensuring LLM outputs are treated strictly as unverified advisory proposals, bounded by deterministic mathematical code clamps.
- **INV-02 Clamp**: Mathematical rule clamping any gas bump recommendation between a 10% floor and a 50% ceiling.
- **Safe Standby**: The protective state Sentinel assumes when its circuit breaker trips, halting automated writes while continuing read-only monitoring.
- **Null Execution**: A zero-value self-transfer ($0\\text{ ETH}$, null calldata) used to cleanly close a stalled nonce slot with minimal gas consumption.
`,
    prev: { slug: "configuration", title: "Environment Variables" },
  },
};
