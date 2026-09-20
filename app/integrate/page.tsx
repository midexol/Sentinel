"use client";

import React, { useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import SiteAtmosphere from "@/components/site-atmosphere";
import { Terminal, Copy, Check, Radio, Cpu, ShieldCheck, ExternalLink, Code2, Play } from "lucide-react";

export default function IntegratePage() {
  const [cliTab, setCliTab] = useState<"watch" | "scan" | "compile" | "demo">("watch");
  const [copiedCli, setCopiedCli] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#000000] text-marble selection:bg-aurum/20 selection:text-aurum-light font-sans overflow-x-hidden flex flex-col justify-between">
      <SiteAtmosphere />
      <SiteHeader />

      <main className="relative z-10 pt-28 sm:pt-36 md:pt-44 pb-20 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-12">
        {/* Page Header */}
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#C9A961]">
            <Terminal className="w-3.5 h-3.5 text-[#C9A961]" />
            <span>Developer Integration & Daemon Control</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-semibold tracking-tight text-marble">
            Bot Integration & CLI Daemon
          </h1>
          <p className="font-sans text-marble-dim/80 text-sm sm:text-base leading-relaxed">
            Deploy Sentinel into high-frequency algorithmic bot clusters. Choose between a drop-in in-line SDK wrapper or a standalone out-of-band daemon watching via 200ms Flashblocks polling.
          </p>
        </div>

        {/* Two Modes Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mode 1 */}
          <div className="bg-[#07080A]/95 border border-white/[0.08] hover:border-aurum/35 transition-colors rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#8FAF92] font-semibold">
                  Mode 01 · In-Line Interceptor
                </span>
                <span className="font-mono text-xs text-ash">src/interceptor.ts</span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl text-white">The Drop-In Bot Interceptor</h2>
              <p className="text-xs sm:text-sm text-marble-dim/80 font-mono leading-relaxed">
                Wrap client transaction submissions. If a nonce gap exists behind your transaction, Sentinel heals it atomically before forwarding your trade, eliminating head-of-line blocking.
              </p>

              <div className="p-4 rounded-xl bg-[#050608] border border-white/[0.08] font-mono text-xs space-y-2 text-marble-dim/90 overflow-x-auto">
                <p className="text-ash">// 1. Import from Sentinel core</p>
                <p className="text-[#C9A961]">import <span className="text-white">&#123; TransactionInterceptor &#125;</span> from <span className="text-[#C2BEB4]">&quot;sentinel&quot;</span>;</p>
                <p className="text-ash pt-1">// 2. Replace client.sendRawTransaction(signedTx)</p>
                <p className="text-[#C9A961] font-semibold">const hash = await interceptor.submitTransaction(signedTx);</p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-ash">
              <span>Zero nonce management burden</span>
              <span className="text-[#8FAF92]">Pre-flight gap resolution</span>
            </div>
          </div>

          {/* Mode 2 */}
          <div className="bg-[#07080A]/95 border border-white/[0.08] hover:border-aurum/35 transition-colors rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#C9A961] font-semibold">
                  Mode 02 · Out-of-Band Watchdog
                </span>
                <span className="font-mono text-xs text-ash">src/evictionMonitor.ts</span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl text-white">Silent Eviction Watchdog</h2>
              <p className="text-xs sm:text-sm text-marble-dim/80 font-mono leading-relaxed">
                Base L2 sequencers drop underpriced transactions during volatility without emitting error events. Sentinel audits in-flight hashes: when a tx vanishes past timeout, Sentinel autonomously resubmits.
              </p>

              <div className="p-4 rounded-xl bg-[#050608] border border-white/[0.08] font-mono text-xs space-y-2 text-marble-dim/90">
                <div className="flex items-center justify-between text-ash text-[11px] pb-1 border-b border-white/[0.06]">
                  <span>PROPAGATION STATE</span>
                  <span>AUTONOMOUS ACTION</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#D4A359]">everSeenPending: true</span>
                  <span className="text-ash">Mempool inclusion verified</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#C86A58]">status: not_found &gt; 30s</span>
                  <span className="text-[#C86A58] font-semibold">Silent eviction confirmed</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8FAF92] font-semibold">Autonomous Recovery</span>
                  <span className="text-[#8FAF92] font-semibold">Resubmit with clamped bump</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-ash">
              <span>Solves Base zero-event dropouts</span>
              <span className="text-[#C2BEB4]">Continuous 500ms loop</span>
            </div>
          </div>
        </div>

        {/* Interactive CLI Terminal Window */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#050608] overflow-hidden shadow-2xl space-y-0">
          {/* Terminal Titlebar */}
          <div className="px-5 py-3.5 bg-[#0B0D12] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#C86A58]/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#D4A359]/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#8FAF92]/70" />
              <span className="ml-3 font-mono text-xs text-ash">sentinel-daemon ~ node v20+</span>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1.5 bg-[#08090C] p-1 rounded-xl border border-white/[0.06] overflow-x-auto max-w-full pb-1 -mb-1">
              <button
                onClick={() => setCliTab("watch")}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors shrink-0 ${
                  cliTab === "watch"
                    ? "bg-[#C9A961]/20 text-[#C9A961] border border-[#C9A961]/30 font-semibold"
                    : "text-ash hover:text-white"
                }`}
              >
                watch
              </button>
              <button
                onClick={() => setCliTab("scan")}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors shrink-0 ${
                  cliTab === "scan"
                    ? "bg-[#C9A961]/20 text-[#C9A961] border border-[#C9A961]/30 font-semibold"
                    : "text-ash hover:text-white"
                }`}
              >
                single-scan
              </button>
              <button
                onClick={() => setCliTab("compile")}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors shrink-0 ${
                  cliTab === "compile"
                    ? "bg-[#C9A961]/20 text-[#C9A961] border border-[#C9A961]/30 font-semibold"
                    : "text-ash hover:text-white"
                }`}
              >
                build-binary
              </button>
              <button
                onClick={() => setCliTab("demo")}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors shrink-0 ${
                  cliTab === "demo"
                    ? "bg-[#C9A961]/20 text-[#C9A961] border border-[#C9A961]/30 font-semibold"
                    : "text-ash hover:text-white"
                }`}
              >
                simulate-demo
              </button>
            </div>
          </div>

          {/* Terminal Body */}
          <div className="p-6 font-mono text-xs space-y-4 overflow-x-auto bg-[#050608]">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 text-[#8FAF92] font-semibold">
                <span className="text-[#C9A961]">$</span>
                <span>
                  {cliTab === "watch" && "npm run cli:watch"}
                  {cliTab === "scan" && "npm run cli"}
                  {cliTab === "compile" && "npm run build:cli && node dist/cli.js"}
                  {cliTab === "demo" && "npm run demo -- --mode=simulate"}
                </span>
              </div>
              <button
                onClick={() => {
                  const cmd =
                    cliTab === "watch"
                      ? "npm run cli:watch"
                      : cliTab === "scan"
                      ? "npm run cli"
                      : cliTab === "compile"
                      ? "npm run build:cli && node dist/cli.js"
                      : "npm run demo -- --mode=simulate";
                  navigator.clipboard.writeText(cmd);
                  setCopiedCli(true);
                  setTimeout(() => setCopiedCli(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-ash hover:text-white transition-colors text-[11px]"
              >
                {copiedCli ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#8FAF92]" />
                    <span className="text-[#8FAF92]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {cliTab === "watch" && (
              <div className="space-y-2 text-marble-dim/90 leading-relaxed">
                <p className="text-ash">
                  Watching 0x742d35Cc6634C0532925a3b844Bc454e4438BaEa on https://sepolia.base.org every 500ms. (resolution enabled) (AI diagnosis enabled)
                </p>
                <p className="text-ash/70">[2026-09-19T14:00:01.120Z] Latest: 42, Pending: 42, Gap: none</p>
                <p className="text-ash/70">[2026-09-19T14:00:01.625Z] Latest: 42, Pending: 42, Gap: none</p>
                <p className="text-[#D4A359] font-medium">[2026-09-19T14:00:02.130Z] Latest: 42, Pending: 44, Gap: 43</p>
                <p className="text-[#C9A961]">
                  {"  "}[DIAGNOSIS] underpriced: "Gas tip below priority threshold" (recommended bump: 18%)
                </p>
                <p className="text-[#8FAF92] font-semibold">
                  {"  "}[RESOLVED] (resolved): new tx 0x3f7a1928bc4e8912d091a123ffaa6612bcde4451 (bump: 18%)
                </p>
                <p className="text-ash/70">[2026-09-19T14:00:02.635Z] Latest: 43, Pending: 44, Gap: none</p>
                <p className="text-ash/70">[2026-09-19T14:00:03.140Z] Latest: 44, Pending: 44, Gap: none</p>
                <p className="text-[#C9A961]/80 font-mono">_</p>
              </div>
            )}

            {cliTab === "scan" && (
              <div className="space-y-2 text-marble-dim/90 leading-relaxed">
                <p className="text-ash">&gt; sentinel@0.1.0 cli</p>
                <p className="text-ash">&gt; tsx src/cli.ts</p>
                <p className="text-[#8FAF92] font-semibold">
                  Latest nonce: 44, Pending nonce: 44, Gap: none
                </p>
                <p className="text-ash/70">Execution completed in 42ms. Zero gaps detected on Base Sepolia.</p>
              </div>
            )}

            {cliTab === "compile" && (
              <div className="space-y-2 text-marble-dim/90 leading-relaxed">
                <p className="text-ash">&gt; sentinel@0.1.0 build:cli</p>
                <p className="text-ash">&gt; tsc -p tsconfig.cli.json</p>
                <p className="text-[#8FAF92]">✓ Compiled TypeScript into dist/cli.js (Zero external dev dependencies)</p>
                <p className="text-ash pt-2">$ node dist/cli.js</p>
                <p className="text-marble font-semibold">Latest nonce: 44, Pending nonce: 44, Gap: none</p>
                <p className="text-ash/70">Standalone execution ready for Docker containerization or systemd service deployment.</p>
              </div>
            )}

            {cliTab === "demo" && (
              <div className="space-y-2 text-marble-dim/90 leading-relaxed">
                <p className="text-[#C9A961] font-semibold">================================================================================</p>
                <p className="text-white font-bold">  SENTINEL DEMO: In-Memory Dry-Run Simulation</p>
                <p className="text-[#C9A961] font-semibold">================================================================================</p>
                <p className="text-ash pt-1">1. Simulating trading bot submitting rapid transactions...</p>
                <p className="text-ash/80">   - Tx #1 (nonce 42): Confirmed</p>
                <p className="text-[#C86A58]">   - Tx #2 (nonce 43): Underpriced (1 wei tip) [STUCK]</p>
                <p className="text-[#D4A359]">   - Tx #3 (nonce 44): High fee [QUEUED behind stuck nonce 43]</p>
                <p className="text-[#93A7B8] pt-1">2. Sentinel detects gap at nonce 43</p>
                <p className="text-ash">3. Triggering AI Diagnosis (LLM agent reasoning layer)...</p>
                <p className="text-[#8FAF92]">   - Clamped recommendation: 10%</p>
                <p className="text-ash">4. Resolving stuck transaction via GapResolver (Dry Run)...</p>
                <p className="text-[#8FAF92] font-semibold">   Resolution outcome: resolved (0xdryrun002b1a0b9baeaf1)</p>
                <p className="text-ash">5. Audit log updated in ./sentinel.log. Verification complete!</p>
              </div>
            )}
          </div>
        </div>

        {/* Live SSE & Endpoints */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-5 rounded-2xl bg-[#07080A]/95 border border-white/[0.08] space-y-2">
            <div className="text-[#8FAF92] font-semibold flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#8FAF92]" />
              <span>Real-Time SSE Stream</span>
            </div>
            <p className="text-ash text-[11px] leading-relaxed">
              Open streaming endpoint at <code className="text-white">/api/stream</code>. Pipe live Base L2 sub-second telemetry directly into custom terminals.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#07080A]/95 border border-white/[0.08] space-y-2">
            <div className="text-[#C9A961] font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero-Key Dry-Run Mode</span>
            </div>
            <p className="text-ash text-[11px] leading-relaxed">
              Set <code className="text-white">DRY_RUN=true</code> to test full detection, AI reasoning, and clamping against live Base Sepolia RPC with zero financial risk.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#07080A]/95 border border-white/[0.08] space-y-2">
            <div className="text-[#C9A961] font-semibold flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              <span>Triple-Strike Breaker</span>
            </div>
            <p className="text-ash text-[11px] leading-relaxed">
              Protects against network outages. If consecutive resolution failures exceed threshold, Sentinel trips into SAFE mode and alerts webhooks.
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
