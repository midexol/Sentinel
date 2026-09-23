"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/site-header";
import {
  ShieldCheck,
  Zap,
  Activity,
  Radio,
  Lock,
  Cpu,
  Terminal,
  Play,
  CheckCircle2,
  Crown,
  Scroll,
  Scale,
  Landmark,
  Flame,
  KeyRound,
  Sparkles,
  Layers,
  ShieldAlert,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#000000] relative text-[#F5F3EF] selection:bg-[#C9A961] selection:text-black font-sans overflow-hidden">
      {/* Pure static premium black foundation with subtle golden aura */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#000000]" />
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(201,169,97,0.03),rgba(0,0,0,0))]" />

      {/* Top Ambient Vignette */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-[#C9A961]/8 via-transparent to-transparent blur-3xl pointer-events-none -z-20" />

      {/* Unified Site Header */}
      <SiteHeader />

      {/* 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 md:pt-40 pb-14 sm:pb-20 space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <div className="flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-widest text-[#C9A961]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Autonomous Nonce Watchdog · Base L2</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-normal tracking-tight leading-[1.12] text-white">
            Never Let a Stuck Nonce Freeze Your Trading Bots.
          </h1>

          <p className="text-sm sm:text-base text-[#C2BEB4] font-light max-w-xl mx-auto leading-relaxed">
            When sudden gas spikes strand one transaction on Base, every trade behind it halts. Sentinel detects the gap, diagnoses the root cause, and auto-heals the deadlock.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-1">
            <Link
              href="/dapp"
              className="px-6 py-3 rounded-full bg-[#C9A961] hover:bg-[#E5C989] text-black font-medium text-xs font-mono transition-all hover:-translate-y-0.5 shadow-lg shadow-black/60"
            >
              Launch Live Observatory
            </Link>
            <a
              href="#how-it-works"
              className="px-6 py-3 rounded-full bg-[#07080A] border border-white/[0.08] hover:border-[#C9A961]/35 transition-colors hover:bg-white/5 text-[#F5F3EF] text-xs font-mono transition-all"
            >
              How It Works
            </a>
          </div>
        </div>

        {/* IMAGE 1: Hero Artwork (David Cyborg) */}
        <div className="relative rounded-2xl sm:rounded-[28px] overflow-hidden border border-white/[0.08] hover:border-[#C9A961]/35 transition-colors bg-[#07080A] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)] max-w-5xl mx-auto">
          <div className="aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] relative">
            <Image
              src="/assets/david_cyborg.jpg"
              alt="Autonomous Sentinel Intelligence"
              fill
              className="object-cover object-center filter brightness-[0.88] contrast-[1.08]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#08090C]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#000000]/80 via-transparent to-[#000000]/80" />

            <div className="absolute bottom-3 left-3 right-3 sm:bottom-6 sm:left-6 sm:right-6 flex flex-col gap-2.5">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#C9A961]">
                  Sub-Second Guardian
                </span>
                <div className="font-serif text-lg sm:text-2xl text-white">
                  Continuous Mempool Protection
                </div>
                <div className="text-[11px] sm:text-xs text-[#C2BEB4] font-mono">
                  Base Sepolia RPC & 200ms Flashblocks
                </div>
              </div>
              
            </div>
          </div>
        </div>

        {/* The Golden Rule: Model Proposes, Code Decides */}
        <div className="max-w-5xl mx-auto rounded-2xl sm:rounded-[24px] bg-[#07080A]/95 border border-[#C9A961]/30 p-5 sm:p-7 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] space-y-4 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#C9A961]">
                CORE SAFETY RULE
              </span>
              <h2 className="font-serif text-lg sm:text-2xl text-white">
                &ldquo;Model Proposes, Code Decides&rdquo;
              </h2>
            </div>
            
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 font-mono text-xs">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <div className="text-ash uppercase text-[10px] flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#C9A961]" /><span>Step 1 · AI Reasoning</span></div>
              <div className="text-white font-serif text-base font-medium">The Agent Reasons</div>
              <p className="text-marble-dim/80 text-xs leading-relaxed">
                The LLM reasoning agent diagnoses why the transaction stalled and proposes an optimal recovery gas bump.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-[#C9A961]/30 space-y-1">
              <div className="text-[#C9A961] uppercase text-[10px] flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-[#C9A961]" /><span>Step 2 · Hard Mathematical Clamp</span></div>
              <div className="text-[#C9A961] font-serif text-base font-medium">Code Decides</div>
              <p className="text-marble-dim/80 text-xs leading-relaxed">
                The model never touches gas fees directly. Every proposal is clamped between 10% and 50% max. Zero runaway risk.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <div className="text-ash uppercase text-[10px] flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-[#8FAF92]" /><span>Step 3 · Deterministic Execution</span></div>
              <div className="text-white font-serif text-base font-medium">Atomic Healing</div>
              <p className="text-marble-dim/80 text-xs leading-relaxed">
                A replacement transaction is signed and broadcast. The queue unblocks and downstream trades resume immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE PROBLEM & ANATOMY OF A NONCE GAP */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 border-t border-white/5 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#C86A58] font-semibold">
              The Real Problem
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif text-white leading-tight">
              One Stuck Transaction Halts Your Entire Bot.
            </h2>
            <p className="text-xs sm:text-sm text-[#C2BEB4] leading-relaxed">
              Ethereum nonces are strictly sequential (0, 1, 2, 3...). On Base, partial blocks stream every 200 milliseconds. When an agent submits a fast burst of trades:
            </p>
            <p className="text-xs sm:text-sm text-[#C2BEB4] leading-relaxed">
              If Transaction #42 gets stranded by a sudden gas surge, Transactions #43 through #50 are blocked in queue deadlock. Arbitrage windows close, orders fail, and the bot freezes.
            </p>
          </div>

          {/* IMAGE 2: Creation of Adam (The Nonce Gap) */}
          <div className="lg:col-span-7">
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] hover:border-[#C9A961]/35 transition-colors bg-[#07080A] shadow-xl">
              <div className="relative aspect-[16/10] w-full">
                <Image
                  src="/assets/adam_creation_gap.jpg"
                  alt="The Nonce Gap"
                  fill
                  className="object-cover filter brightness-[0.92] contrast-[1.05]"
                />
              </div>
              <div className="p-4 bg-[#07080A] border-t border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="font-serif text-sm text-white">The Microsecond Nonce Gap</div>
                  <div className="text-[11px] font-mono text-ash">
                    Michelangelo&apos;s Creation of Adam · The Unconfirmed Sequence Gap
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Failure Modes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 font-mono text-xs">
          <div className="bg-[#07080A]/95 rounded-xl border border-white/[0.08] p-4 sm:p-5 space-y-1.5">
            <div className="text-[#C86A58] text-[11px] font-semibold flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" /><span>01 · UNDERPRICED GAS STALL</span></div>
            <p className="text-marble-dim/80 text-[11px] leading-relaxed">
              Gas spikes mid-flight. The transaction tip falls below sequencer minimum, stranding all downstream nonces.
            </p>
          </div>
          <div className="bg-[#07080A]/95 rounded-xl border border-white/[0.08] p-4 sm:p-5 space-y-1.5">
            <div className="text-[#C9A961] text-[11px] font-semibold flex items-center gap-1.5"><Radio className="w-3.5 h-3.5" /><span>02 · SILENT RPC EVICTION</span></div>
            <p className="text-marble-dim/80 text-[11px] leading-relaxed">
              Overloaded RPC nodes drop pending transactions without error callbacks, leaving bots waiting indefinitely.
            </p>
          </div>
          <div className="bg-[#07080A]/95 rounded-xl border border-white/[0.08] p-4 sm:p-5 space-y-1.5">
            <div className="text-[#C2BEB4] text-[11px] font-semibold flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /><span>03 · MICRO-REORG COLLISION</span></div>
            <p className="text-marble-dim/80 text-[11px] leading-relaxed">
              A 200ms sub-block reorganization invalidates assumed order, triggering repeated sequence submission errors.
            </p>
          </div>
        </div>
      </section>

      {/* 3. ARCHITECTURE: HOW SENTINEL HEALS THE STREAM */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 border-t border-white/5 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#C9A961]">
            Autonomous Engine
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif text-white">
            Neoclassical Precision: How Sentinel Heals.
          </h2>
          <p className="text-xs sm:text-sm text-[#C2BEB4] leading-relaxed">
            Sentinel runs as an out-of-band watchdog alongside any trading bot with two core subsystems:
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* IMAGE 3: Chronometer Card */}
          <div className="bg-[#07080A] rounded-[24px] border border-white/[0.08] hover:border-[#C9A961]/35 transition-colors overflow-hidden flex flex-col justify-between shadow-xl">
            <div className="aspect-[16/10] relative overflow-hidden">
              <Image
                src="/assets/chronometer.jpg"
                alt="Renaissance Celestial Astrolabe Chronometer"
                fill
                className="object-cover filter brightness-[0.9] contrast-[1.1]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07080A] via-transparent to-transparent" />
            </div>
            <div className="p-6 sm:p-8 space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#C9A961]">
                TRACKING SUBSYSTEM
              </span>
              <h3 className="font-serif text-xl sm:text-2xl text-white">Deterministic Sequence Tracking</h3>
              <p className="text-xs sm:text-sm text-[#C2BEB4] leading-relaxed">
                Monitors pending vs mined nonces at 200ms intervals matching Base Flashblocks. It maintains an eviction timer on every in-flight transaction to distinguish normal block latency from silent drops.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono text-[#C9A961]">
                <span>✓ 200ms Polling Tick</span>
                <span>✓ Eviction Timeout Window</span>
                <span>✓ Ghost Nonce Reaper</span>
              </div>
            </div>
          </div>

          {/* IMAGE 4: Celestial Dome Card */}
          <div className="bg-[#07080A] rounded-[24px] border border-white/[0.08] hover:border-[#C9A961]/35 transition-colors overflow-hidden flex flex-col justify-between shadow-xl">
            <div className="aspect-[16/10] relative overflow-hidden">
              <Image
                src="/assets/celestial_dome.jpg"
                alt="Celestial Dome Consensus Architecture"
                fill
                className="object-cover filter brightness-[0.88] contrast-[1.1]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07080A] via-transparent to-transparent" />
            </div>
            <div className="p-6 sm:p-8 space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#C2BEB4]">
                RESOLVER SUBSYSTEM
              </span>
              <h3 className="font-serif text-xl sm:text-2xl text-white">AI Diagnostics & Clamped Gas Bumping</h3>
              <p className="text-xs sm:text-sm text-[#C2BEB4] leading-relaxed">
                When a gap is confirmed, the LLM reasoning agent classifies the root cause. The resolver constructs a replacement or zero-value cancellation, strictly clamped within user-defined bounds.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono text-[#C2BEB4]">
                <span>✓ Bounded Clamp (10% to 50%)</span>
                <span>✓ Fallback Fast Heuristics</span>
                <span>✓ Atomic Nonce Unblocking</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. IMAGE 5: THE ARMORED CITADEL & 4 SECURITY AXIOMS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 border-t border-white/5 space-y-10">
        <div className="relative rounded-2xl sm:rounded-[28px] overflow-hidden border border-white/[0.08] hover:border-[#C9A961]/35 transition-colors bg-[#07080A] shadow-2xl">
          <div className="aspect-[4/3] sm:aspect-[21/9] relative">
            <Image
              src="/assets/cloud_citadel.jpg"
              alt="Neoclassical Sentinel Citadel"
              fill
              className="object-cover filter brightness-[0.72] contrast-[1.15]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#000000]/90 via-transparent to-[#000000]/90" />

            <div className="absolute inset-0 p-6 sm:p-10 flex flex-col justify-end max-w-3xl space-y-2.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#C9A961]">
                INSTITUTIONAL SAFETY MANDATE
              </span>
              <h2 className="text-2xl sm:text-4xl font-serif text-white">
                The Armored Citadel: Fail-Safe Guardrails.
              </h2>
              <p className="text-xs sm:text-sm text-[#C2BEB4] leading-relaxed font-light">
                Autonomous healing must never run amok. Sentinel is built with strict mathematical constraints that preserve agent capital even under severe network outages.
              </p>
            </div>
          </div>

          {/* 4 Axiom Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 p-6 sm:p-8 bg-[#07080A] border-t border-white/[0.08] font-mono text-xs">
            <div className="space-y-1.5">
              <div className="text-xs text-[#C9A961] font-semibold flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /><span>AXIOM I</span></div>
              <div className="font-serif text-sm sm:text-base text-white">Hard Clamped Bumping</div>
              <p className="text-ash text-[11px] leading-relaxed">
                Fee proposals are clamped between 10% and 50% max. Zero runaway gas expenditure.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs text-[#C9A961] font-semibold flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /><span>AXIOM II</span></div>
              <div className="font-serif text-sm sm:text-base text-white">Triple-Strike Breaker</div>
              <p className="text-ash text-[11px] leading-relaxed">
                Freezes automated writes if consecutive failures occur in a sliding window; sounds instant webhook alert.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs text-[#C9A961] font-semibold flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /><span>AXIOM III</span></div>
              <div className="font-serif text-sm sm:text-base text-white">Zero Key Exposure</div>
              <p className="text-ash text-[11px] leading-relaxed">
                Runs in proxy interceptor mode with zero private keys stored in Sentinel itself.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs text-[#C9A961] font-semibold flex items-center gap-1.5"><Scroll className="w-3.5 h-3.5" /><span>AXIOM IV</span></div>
              <div className="font-serif text-sm sm:text-base text-white">Audit Trail Provenance</div>
              <p className="text-ash text-[11px] leading-relaxed">
                Every gap detection, diagnosis reason, and broadcast hash is permanently recorded to structured JSONL logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. OPERATIONAL STATS BENTO GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 border-t border-white/5 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#C9A961]">
            Operational Benchmarks
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif text-white">
            Guaranteed Operational Invariants.
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 font-mono">
          <div className="bg-[#07080A]/95 rounded-2xl border border-white/[0.08] p-5 text-center space-y-1.5">
            <div className="font-serif text-2xl sm:text-3xl font-bold text-white">200ms</div>
            <div className="text-xs text-[#C9A961] uppercase tracking-wider">Polling Loop</div>
            <div className="text-[11px] text-ash">Base Flashblocks cadence</div>
          </div>

          <div className="bg-[#07080A]/95 rounded-2xl border border-white/[0.08] p-5 text-center space-y-1.5">
            <div className="font-serif text-2xl sm:text-3xl font-bold text-white">10%–50%</div>
            <div className="text-xs text-[#8FAF92] uppercase tracking-wider">Safety Clamp</div>
            <div className="text-[11px] text-ash">Hard mathematical cap</div>
          </div>

          <div className="bg-[#07080A]/95 rounded-2xl border border-white/[0.08] p-5 text-center space-y-1.5">
            <div className="font-serif text-2xl sm:text-3xl font-bold text-white">3 Strikes</div>
            <div className="text-xs text-[#C86A58] uppercase tracking-wider">Circuit Breaker</div>
            <div className="text-[11px] text-ash">Freezes writes on outage</div>
          </div>

          <div className="bg-[#07080A]/95 rounded-2xl border border-white/[0.08] p-5 text-center space-y-1.5">
            <div className="font-serif text-2xl sm:text-3xl font-bold text-white">0 Keys</div>
            <div className="text-xs text-[#C2BEB4] uppercase tracking-wider">Non-Custodial</div>
            <div className="text-[11px] text-ash">Zero keystore exposure</div>
          </div>
        </div>
      </section>

      {/* 6. DEDICATED MODULES NAVIGATION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 border-t border-white/5 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#C9A961]">
            Specialized Subsystems
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif text-white">
            Explore Dedicated Pages.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            href="/integrate"
            className="group bg-[#07080A]/95 rounded-2xl border border-white/[0.08] hover:border-[#C9A961]/50 p-6 sm:p-7 flex flex-col justify-between space-y-5 transition-all hover:-translate-y-1 shadow-xl"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#C9A961]/10 border border-[#C9A961]/25 flex items-center justify-center text-[#C9A961]">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl text-white group-hover:text-aurum-light transition-colors">
                Bot SDK & CLI Daemon
              </h3>
              <p className="text-xs sm:text-sm text-[#C2BEB4] leading-relaxed">
                In-line transaction interceptor, background watcher daemon, interactive 4-mode terminal simulator, and Docker deployment guide.
              </p>
            </div>
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-[#C9A961]">
              <span>Explore Developer Guide</span>
              <span>/integrate</span>
            </div>
          </Link>

          <Link
            href="/security"
            className="group bg-[#07080A]/95 rounded-2xl border border-white/[0.08] hover:border-[#C9A961]/50 p-6 sm:p-7 flex flex-col justify-between space-y-5 transition-all hover:-translate-y-1 shadow-xl"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#8FAF92]/10 border border-[#8FAF92]/25 flex items-center justify-center text-[#8FAF92]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl text-white group-hover:text-aurum-light transition-colors">
                Institutional Security & Axioms
              </h3>
              <p className="text-xs sm:text-sm text-[#C2BEB4] leading-relaxed">
                4 Citadel Axioms, 4-layer defense perimeter matrix, formal invariant verification suite, and automated incident runbooks.
              </p>
            </div>
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-[#8FAF92]">
              <span>View Security Specs</span>
              <span>/security</span>
            </div>
          </Link>

          <Link
            href="/simulate"
            className="group bg-[#07080A]/95 rounded-2xl border border-white/[0.08] hover:border-[#C9A961]/50 p-6 sm:p-7 flex flex-col justify-between space-y-5 transition-all hover:-translate-y-1 shadow-xl"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#C9A961]/10 border border-[#C9A961]/25 flex items-center justify-center text-[#C9A961]">
                <Play className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl text-white group-hover:text-aurum-light transition-colors">
                Conformance Simulation Suite
              </h3>
              <p className="text-xs sm:text-sm text-[#C2BEB4] leading-relaxed">
                Step-by-step mempool gap injection, live LLM agent diagnosis evaluation, gas clamp verification, and dry-run ledger receipts.
              </p>
            </div>
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-[#C9A961]">
              <span>Run Live Simulation</span>
              <span>/simulate</span>
            </div>
          </Link>
        </div>
      </section>

      {/* 7. OBSERVATORY CTA WITH IMAGE 6 (Oracle Waveform) */}
      <section id="dapp-preview" className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 border-t border-white/5">
        <div className="rounded-2xl sm:rounded-[28px] bg-[#07080A]/95 border border-[#C9A961]/20 p-8 sm:p-12 text-center space-y-6 relative overflow-hidden shadow-2xl">
          <div className="w-full max-w-xl mx-auto space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-widest text-[#C9A961]">
              <Crown className="w-3.5 h-3.5 text-[#C9A961]" />
              <span>Real-Time Observatory Interface</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif text-white">
              Enter the Live Observatory.
            </h2>
            <p className="text-xs sm:text-sm text-[#C2BEB4] font-light leading-relaxed">
              Step inside the telemetry console. Inspect the active mempool pipeline, simulate stuck transactions, and witness Sentinel execute bounded auto-healing in real-time.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <Link
              href="/dapp"
              className="px-8 py-4 rounded-full bg-[#C9A961] hover:bg-[#E5C989] text-black font-semibold text-xs sm:text-sm font-mono transition-all hover:-translate-y-0.5 shadow-lg shadow-black/60 flex items-center justify-center"
            >
              <span>Open Fullscreen Observatory Console</span>
            </Link>
          </div>

          {/* IMAGE 6: Oracle Waveform Accent */}
          <div className="max-w-md mx-auto pt-4 opacity-60">
            <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden border border-[#C9A961]/20">
              <Image
                src="/assets/oracle_waveform.jpg"
                alt="Oracle Waveform Telemetry"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-12 px-6 bg-[#000000] text-[#686660] text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative w-6 h-6 rounded-full overflow-hidden border border-[#C9A961]/40">
              <Image
                src="/assets/logo-transparent.png"
                alt="Sentinel Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="font-script text-white text-base tracking-wide">
              Sentinel
            </span>
            <span>•</span>
            <span>High-Frequency Nonce Watchdog for Base L2</span>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-[11.5px]">
            <Link href="/docs" className="hover:text-[#F5F3EF] transition-colors">
              Documentation
            </Link>
            <Link href="/privacy" className="hover:text-[#F5F3EF] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#F5F3EF] transition-colors">
              Terms of Service
            </Link>
            <Link href="/security" className="hover:text-[#F5F3EF] transition-colors">
              Security
            </Link>
            <Link href="/integrate" className="hover:text-[#F5F3EF] transition-colors">
              Integration
            </Link>
            <a
              href="https://sepolia.basescan.org"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#C9A961] transition-colors"
            >
              Base Sepolia
            </a>
            <Link href="/dapp" className="text-[#C9A961] hover:underline font-semibold">
              Observatory Console
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
