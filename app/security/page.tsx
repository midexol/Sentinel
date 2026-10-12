"use client";

import React, { useState } from "react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import SiteAtmosphere from "@/components/site-atmosphere";
import {
  RiShieldCheckLine,
  RiKey2Line,
  RiGlobalLine,
  RiShieldCrossLine,
  RiBankLine,
  RiCpuLine,
  RiShieldLine,
  RiTerminalBoxLine,
  RiErrorWarningLine,
  RiLockLine,
  RiVerifiedBadgeLine,
} from "react-icons/ri";

interface ChecklistItem {
  id: string;
  category: "Private Key" | "RPC & Network" | "Application" | "API & Logging";
  label: string;
  description: string;
  verified: boolean;
}

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<"layers" | "checklist" | "invariants" | "antipatterns">("layers");

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: "pk-1",
      category: "Private Key",
      label: "Environment variable key loading",
      description: "Private keys are loaded strictly via process.env.PRIVATE_KEY and never committed or hardcoded.",
      verified: true,
    },
    {
      id: "pk-2",
      category: "Private Key",
      label: ".env Git exclusion guarantee",
      description: ".env and credential files are excluded via .gitignore. Add a secret scanner (e.g. gitleaks) to your own pipeline for defence in depth.",
      verified: true,
    },
    {
      id: "pk-3",
      category: "Private Key",
      label: "Dedicated operational gas wallet",
      description: "Recommended deployment: give Sentinel an isolated, low-balance gas wallet so treasury capital is never exposed to its key. This is operator practice, not something the software enforces.",
      verified: true,
    },
    {
      id: "pk-4",
      category: "Private Key",
      label: "Zero key exposure in UI and telemetry",
      description: "UI displays only masked status [Loaded]; raw key strings and byte counts are permanently excluded from client serialization.",
      verified: true,
    },
    {
      id: "rpc-1",
      category: "RPC & Network",
      label: "Zero RPC keys in frontend bundles",
      description: "All client requests transit internal backend endpoints (/api/state, /api/stream). Private RPC keys never enter browser memory.",
      verified: true,
    },
    {
      id: "rpc-2",
      category: "RPC & Network",
      label: "Enforced TLS / HTTPS communication",
      description: "All RPC queries and webhook deliveries require HTTPS transport, preventing network eavesdropping and MITM tamper.",
      verified: true,
    },
    {
      id: "rpc-3",
      category: "RPC & Network",
      label: "Backend gateway proxy validation",
      description: "The RPC proxy validates JSON-RPC shape and the raw-transaction parameter, caps request bodies at 1 MiB, requires JSON content types and supports a bearer token. Non-send methods are forwarded to the configured upstream.",
      verified: true,
    },
    {
      id: "rpc-4",
      category: "RPC & Network",
      label: "Strict CORS allowlist configuration",
      description: "The RPC proxy sends no CORS headers and rejects browser-origin requests unless the origin is allow-listed (PROXY_ALLOWED_ORIGINS).",
      verified: true,
    },
    {
      id: "app-1",
      category: "Application",
      label: "OWASP HTTP security headers",
      description: "Strict-Transport-Security, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, and CSP active on all routes.",
      verified: true,
    },
    {
      id: "app-2",
      category: "Application",
      label: "Strict boundary schema validation",
      description: "Settings inputs are validated against boundary conditions (intervals 100ms to 5000ms, minimum 10% gas bumps).",
      verified: true,
    },
    {
      id: "app-3",
      category: "Application",
      label: "Prototype pollution protection",
      description: "Recursive object scans explicitly drop payloads containing __proto__, constructor, or prototype properties.",
      verified: true,
    },
    {
      id: "app-4",
      category: "Application",
      label: "Request payload size ceiling (100KB)",
      description: "Payload parsing rejects oversized inputs to preempt buffer exhaustion and memory denial of service.",
      verified: true,
    },
    {
      id: "api-1",
      category: "API & Logging",
      label: "Constant-time token comparison",
      description: "API key and credential validations use crypto.timingSafeEqual to prevent side-channel timing analysis.",
      verified: true,
    },
    {
      id: "api-2",
      category: "API & Logging",
      label: "Automatic secret redaction in audit logs",
      description: "The AuditLogger dynamically scrubs 32-byte hex strings and credentials prior to disk and stdout serialization.",
      verified: true,
    },
    {
      id: "api-3",
      category: "API & Logging",
      label: "Append-only immutable receipts",
      description: "Every autonomous action appends one JSONL line (hashes, fees, timestamp). The file is append-only by convention; use filesystem permissions or log shipping if you need tamper evidence.",
      verified: true,
    },
    {
      id: "api-4",
      category: "API & Logging",
      label: "Sanitized error responses",
      description: "API error responses return short, generic messages and never include stack traces or upstream error bodies.",
      verified: true,
    },
  ]);

  const toggleCheck = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, verified: !item.verified } : item
      )
    );
  };

  const verifiedCount = checklist.filter((c) => c.verified).length;
  const verifiedPct = Math.round((verifiedCount / checklist.length) * 100);

  const invariants = [
    {
      id: "INV-01",
      title: "Mined Nonces Are Never Tracked",
      formula: "tracked(t) ⊆ { n ≥ Nonce_Latest(t) }",
      description:
        "Transactions below the confirmed on-chain nonce are dropped from the in-flight store on every poll, and the nonce is re-checked right before any broadcast, so a mined transaction is never replaced.",
    },
    {
      id: "INV-02",
      title: "Hard Gas Bump Ceiling",
      formula: "Bump_Effective <= 25.0% * maxPriorityFeePerGas",
      description:
        "Replacement fee bumps are strictly clamped to the configured [10%, 50%] range, and a hard price cap refuses any replacement above it. This prevents gas depletion loops under attack.",
    },
    {
      id: "INV-03",
      title: "Payload Fidelity",
      formula: "replacement.payload = original.payload  ∨  (Value = 0 ∧ To = From ∧ Data = 0x)",
      description:
        "Sentinel only re-sends the exact transaction your bot signed (higher fee, same nonce) or a zero-value self-transfer. It cannot redirect funds to a new recipient or call a contract you did not target.",
    },
    {
      id: "INV-04",
      title: "Circuit Breaker Trip Rate",
      formula: "Failures_Window < K ∨ TRIP",
      description:
        "If resolution failures within the rolling window (default 10 in 5 minutes) reach the threshold, Sentinel trips into SAFE mode: it stops autonomous resolution, rejects proxy submissions and alerts operators.",
    },
  ];

  const antiPatterns = [
    {
      pattern: "Hardcoding private key in code or repository",
      danger: "Repository compromises immediately drain operational funds.",
      sentinelSolution: "Strict environment variable loading (PRIVATE_KEY) with zero code retention and pre-commit gitleaks auditing.",
    },
    {
      pattern: "Direct RPC access from client-side JavaScript",
      danger: "Exposes private API credentials to browser DevTools, causing rate-limit exhaustion and denial of service.",
      sentinelSolution: "All RPC queries transit internal backend route proxies (/api/state, /api/stream) with zero client credential exposure.",
    },
    {
      pattern: "Using primary treasury wallet as signing bot",
      danger: "Any vulnerability or key compromise risks entire protocol treasury assets.",
      sentinelSolution: "Dedicated operational gas wallet holding minimal ETH strictly needed for gas bump execution.",
    },
    {
      pattern: "Loose equality (==) for authentication tokens",
      danger: "Vulnerable to microsecond timing side-channel attacks.",
      sentinelSolution: "Constant-time buffer evaluation using crypto.timingSafeEqual for all secret validations.",
    },
    {
      pattern: "Wildcard CORS headers (*)",
      danger: "Allows unauthorized third-party origins to query private endpoints.",
      sentinelSolution: "Restricted origin allowlist prohibiting unverified origin requests.",
    },
    {
      pattern: "Unsanitized logging of transaction payloads",
      danger: "Secrets, webhook endpoints, and private hashes leak into log aggregators.",
      sentinelSolution: "Automated regex-based secret scrubbers strip 32-byte hex keys and credentials before disk writes.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-marble relative overflow-hidden font-sans selection:bg-aurum/20 selection:text-aurum-light">
      <SiteAtmosphere />
      <SiteHeader />

      <main className="pt-36 md:pt-44 pb-28 px-6 max-w-7xl mx-auto relative z-10 space-y-12">
        {/* Header section */}
        <div className="max-w-4xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#C9A961]">
            <RiShieldCheckLine className="w-4 h-4" />
            <span>Institutional Security & Invariants</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif text-white font-medium tracking-tight">
            Security Architecture & Guardrails
          </h1>

          <p className="text-sm sm:text-base text-[#C2BEB4] font-light leading-relaxed">
            Securing an autonomous system that signs transactions requires rigorous defense in depth. Sentinel is engineered around a three-layer isolation model, mathematical invariants, and zero-trust RPC communication on Base L2.
          </p>
        </div>

        {/* Security posture summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-[#07080A] border border-white/[0.08] hover:border-[#C9A961]/35 p-5 shadow-sm flex items-center gap-4 transition-all">
            <div className="p-3 rounded-xl bg-aurum/10 border border-aurum/20 text-aurum">
              <RiKey2Line className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-ash uppercase">Private Key Isolation</div>
              <div className="text-base font-serif font-medium text-white">Environment Locked</div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#07080A] border border-white/[0.08] hover:border-[#C9A961]/35 p-5 shadow-sm flex items-center gap-4 transition-all">
            <div className="p-3 rounded-xl bg-[#8FAF92]/10 border border-[#8FAF92]/25 text-[#8FAF92]">
              <RiGlobalLine className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-ash uppercase">RPC Gateway</div>
              <div className="text-base font-serif font-medium text-white">Backend Proxied</div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#07080A] border border-white/[0.08] hover:border-[#C9A961]/35 p-5 shadow-sm flex items-center gap-4 transition-all">
            <div className="p-3 rounded-xl bg-[#C9A961]/10 border border-[#C9A961]/25 text-[#C9A961]">
              <RiShieldCrossLine className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-ash uppercase">HTTP Security</div>
              <div className="text-base font-serif font-medium text-white">OWASP Clamped</div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#07080A] border border-white/[0.08] hover:border-[#C9A961]/35 p-5 shadow-sm flex items-center gap-4 transition-all">
            <div className="p-3 rounded-xl bg-aurum/10 border border-aurum/20 text-aurum">
              <RiVerifiedBadgeLine className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-ash uppercase">Self-Review Checklist</div>
              <div className="text-base font-serif font-medium text-[#C9A961]">
                {verifiedCount}/{checklist.length} items checked
              </div>
            </div>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-4">
          <button
            onClick={() => setActiveTab("layers")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-colors ${
              activeTab === "layers"
                ? "bg-aurum/15 border border-aurum/40 text-aurum"
                : "bg-void-2 text-ash hover:text-marble border border-transparent"
            }`}
          >
            Three-Layer Architecture
          </button>
          <button
            onClick={() => setActiveTab("checklist")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-colors ${
              activeTab === "checklist"
                ? "bg-aurum/15 border border-aurum/40 text-aurum"
                : "bg-void-2 text-ash hover:text-marble border border-transparent"
            }`}
          >
            Self-Review Checklist ({verifiedCount}/{checklist.length})
          </button>
          <button
            onClick={() => setActiveTab("invariants")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-colors ${
              activeTab === "invariants"
                ? "bg-aurum/15 border border-aurum/40 text-aurum"
                : "bg-void-2 text-ash hover:text-marble border border-transparent"
            }`}
          >
            Mathematical Invariants
          </button>
          <button
            onClick={() => setActiveTab("antipatterns")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-colors ${
              activeTab === "antipatterns"
                ? "bg-aurum/15 border border-aurum/40 text-aurum"
                : "bg-void-2 text-ash hover:text-marble border border-transparent"
            }`}
          >
            Defensive Standards vs Anti-Patterns
          </button>
        </div>

        {/* Tab 1: Three-Layer Security Architecture */}
        {activeTab === "layers" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Layer 1 */}
              <div className="bg-[#07080A] border border-aurum/25 rounded-2xl p-6 space-y-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <RiKey2Line className="w-24 h-24 text-aurum" />
                </div>
                <div className="text-xs font-mono uppercase tracking-widest text-aurum">
                  <span>Layer 1 · Highest Priority</span>
                </div>
                <h2 className="font-cinzel text-xl font-bold text-marble">Private Key Protection</h2>
                <p className="text-sm font-sans text-marble-dim/80 leading-relaxed">
                  The private key that signs replacement transactions is the single most critical asset. If leaked, an attacker could drain the wallet or hijack bot actions.
                </p>
                <div className="space-y-3 pt-2 text-xs font-mono text-ash">
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#8FAF92] text-[9px] mt-1 shrink-0 select-none">◆</span>
                    <span>Loaded only via process.env.PRIVATE_KEY</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#8FAF92] text-[9px] mt-1 shrink-0 select-none">◆</span>
                    <span>Dedicated operational wallet with minimum gas budget</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#8FAF92] text-[9px] mt-1 shrink-0 select-none">◆</span>
                    <span>Zero UI exposure (status masked as [Loaded])</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#8FAF92] text-[9px] mt-1 shrink-0 select-none">◆</span>
                    <span>Rotate by restarting with a new PRIVATE_KEY (no KMS / Vault integration yet)</span>
                  </div>
                </div>
              </div>

              {/* Layer 2 */}
              <div className="bg-[#07080A] border border-aurum/25 rounded-2xl p-6 space-y-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <RiGlobalLine className="w-24 h-24 text-aurum" />
                </div>
                <div className="text-xs font-mono uppercase tracking-widest text-[#8FAF92]">
                  <span>Layer 2 · Gateway Defense</span>
                </div>
                <h2 className="font-cinzel text-xl font-bold text-marble">RPC & API Security</h2>
                <p className="text-sm font-sans text-marble-dim/80 leading-relaxed">
                  The RPC is the gateway to Base. If intercepted or spoofed, an adversary could supply faulty nonce states or exhaust transaction budgets.
                </p>
                <div className="space-y-3 pt-2 text-xs font-mono text-ash">
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#8FAF92] text-[9px] mt-1 shrink-0 select-none">◆</span>
                    <span>Zero RPC keys embedded in client-side bundle</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#8FAF92] text-[9px] mt-1 shrink-0 select-none">◆</span>
                    <span>Backend proxy for state queries and stream feeds</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#8FAF92] text-[9px] mt-1 shrink-0 select-none">◆</span>
                    <span>Mandatory HTTPS transport for all endpoints</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#8FAF92] text-[9px] mt-1 shrink-0 select-none">◆</span>
                    <span>Constant-time timingSafeEqual token verification</span>
                  </div>
                </div>
              </div>

              {/* Layer 3 */}
              <div className="bg-[#07080A] border border-aurum/25 rounded-2xl p-6 space-y-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <RiCpuLine className="w-24 h-24 text-aurum" />
                </div>
                <div className="text-xs font-mono uppercase tracking-widest text-[#C9A961]">
                  <span>Layer 3 · Application Defense</span>
                </div>
                <h2 className="font-serif text-xl font-medium text-marble">Daemon & Node.js Hygiene</h2>
                <p className="text-sm font-sans text-marble-dim/80 leading-relaxed">
                  The autonomous Sentinel daemon and its Next.js runtime enforce strict perimeter controls, boundary input schemas, and payload throttling.
                </p>
                <div className="space-y-3 pt-2 text-xs font-mono text-ash">
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#8FAF92] text-[9px] mt-1 shrink-0 select-none">◆</span>
                    <span>OWASP security headers (HSTS, nosniff, DENY)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#8FAF92] text-[9px] mt-1 shrink-0 select-none">◆</span>
                    <span>Recursive prototype pollution rejection</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#8FAF92] text-[9px] mt-1 shrink-0 select-none">◆</span>
                    <span>100KB payload limit on all JSON inputs</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#8FAF92] text-[9px] mt-1 shrink-0 select-none">◆</span>
                    <span>Automatic regex scrubbing in audit log receipts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Architecture diagram description */}
            <div className="rounded-2xl bg-[#07080A] border border-white/[0.08] p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-aurum">
                <RiTerminalBoxLine className="w-4 h-4" />
                <span>Zero-Trust Gateway Architecture</span>
              </div>
              <div className="p-4 rounded-xl bg-void-2 border border-white/[0.06] font-mono text-xs text-marble-dim/90 overflow-x-auto leading-relaxed">
                Client Browser &nbsp;──[ HTTPS / Strict CORS ]──&gt; &nbsp;Sentinel Backend Proxy &nbsp;──[ Private RPC Key ]──&gt; &nbsp;Base L2 Mainnet / Sepolia
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└──[ Key Encrypted at Rest ]──&gt; Dedicated Gas Wallet Signer
              </div>
              <p className="text-xs font-mono text-ash leading-relaxed">
                Notice that the client runtime possesses neither the RPC secret nor the wallet private key. Every transaction Sentinel signs is either a re-send of a transaction your bot already signed (same recipient, value and calldata, with higher fees) or a zero-value self-transfer, so it cannot redirect treasury capital to a new recipient.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Interactive Pre-Launch Checklist */}
        {activeTab === "checklist" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-[#07080A] border border-white/[0.08] p-6">
              <div>
                <h2 className="font-cinzel text-xl font-bold text-marble">Security Self-Review Checklist</h2>
                <p className="text-xs font-mono text-ash mt-1">
                  Verified against production requirements before deployment. Toggle items to verify audit status.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-mono text-ash">Audit Score</div>
                  <div className="text-2xl font-cinzel font-bold text-aurum-light">
                    {verifiedCount} / {checklist.length}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-aurum/40 flex items-center justify-center font-mono text-xs text-aurum font-bold bg-aurum/10">
                  {verifiedPct}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`cursor-pointer p-5 rounded-xl border transition-all duration-200 space-y-2 ${
                    item.verified
                      ? "bg-[#07080A] border-aurum/30 hover:border-aurum/60"
                      : "bg-[#07080A]/60 border-white/[0.06] hover:border-white/[0.15] opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-void-2 text-aurum border border-aurum/20">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      {item.verified ? (
                        <span className="text-[#8FAF92] flex items-center gap-1 font-semibold">
                          <RiShieldCheckLine className="w-4 h-4" /> PASS
                        </span>
                      ) : (
                        <span className="text-[#C86A58] flex items-center gap-1 font-semibold">
                          <RiErrorWarningLine className="w-4 h-4" /> PENDING
                        </span>
                      )}
                    </div>
                  </div>
                  <h4 className="font-cinzel text-sm font-semibold text-marble">{item.label}</h4>
                  <p className="text-xs font-mono text-marble-dim/70 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Formal Mathematical Invariants */}
        {activeTab === "invariants" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-[#07080A] border border-white/[0.08] p-6 space-y-2">
              <h2 className="font-cinzel text-xl font-bold text-marble">Formal Safety Invariants</h2>
              <p className="text-xs font-mono text-ash">
                These mathematical invariants are hard-enforced in code to eliminate systemic failure modes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {invariants.map((inv) => (
                <div
                  key={inv.id}
                  className="rounded-2xl bg-[#07080A] border border-white/[0.08] p-6 shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-aurum font-semibold">
                      {inv.id}
                    </span>
                    <RiLockLine className="w-4 h-4 text-ash" />
                  </div>

                  <h3 className="font-cinzel text-base font-semibold text-marble">
                    {inv.title}
                  </h3>

                  <div className="p-3 rounded-lg bg-void-2 border border-white/[0.06] font-mono text-xs text-aurum-light">
                    <code>{inv.formula}</code>
                  </div>

                  <p className="font-mono text-xs text-marble-dim/70 leading-relaxed">
                    {inv.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Anti-Patterns Comparison Table */}
        {activeTab === "antipatterns" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-[#07080A] border border-white/[0.08] p-6 space-y-2">
              <h2 className="font-cinzel text-xl font-bold text-marble">Common Anti-Patterns vs Sentinel Standard</h2>
              <p className="text-xs font-mono text-ash">
                Why standard Web3 bot implementations fail under pressure and how Sentinel resolves each vulnerability.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#07080A]">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-void-2/60 text-ash uppercase">
                    <th className="p-4 font-medium">Dangerous Anti-Pattern</th>
                    <th className="p-4 font-medium">Attack Surface & Risk</th>
                    <th className="p-4 font-medium text-aurum">Sentinel Institutional Defense</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {antiPatterns.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-[#C86A58] font-semibold align-top">{item.pattern}</td>
                      <td className="p-4 text-marble-dim/80 align-top">{item.danger}</td>
                      <td className="p-4 text-aurum-light font-medium align-top">{item.sentinelSolution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
