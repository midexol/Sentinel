"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Terminal, Copy, Check, Play, Cpu, ShieldCheck, Radio, Activity } from "lucide-react";

export default function LandingPage() {
  const [condensed, setCondensed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [cliTab, setCliTab] = useState<"watch" | "scan" | "compile" | "demo">("watch");
  const [copiedCli, setCopiedCli] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Scroll handler for condensing header
  useEffect(() => {
    const handleScroll = () => {
      setCondensed(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Mouse position tracker for interactive aura & canvas repulsion
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Living interactive background canvas: flowing harmonic waves + mempool constellation nodes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let W = window.innerWidth;
    let H = window.innerHeight;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!canvas) return;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Particle nodes representing in-flight mempool transactions
    const nodeCount = Math.min(55, Math.floor(W / 24));
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 2 + 1,
      baseAlpha: Math.random() * 0.5 + 0.25,
      pulse: Math.random() * Math.PI * 2,
    }));

    // Multi-harmonic sine waves (gold & cyan-blue)
    const waves = [
      { yFrac: 0.28, amp: 26, freq: 0.0022, speed: 0.00015, color: [201, 169, 97], alpha: 0.08 },
      { yFrac: 0.52, amp: 38, freq: 0.0018, speed: 0.00012, color: [74, 122, 153], alpha: 0.07 },
      { yFrac: 0.78, amp: 32, freq: 0.0024, speed: 0.00018, color: [201, 169, 97], alpha: 0.09 },
    ];

    let t = 0;
    const render = () => {
      t += 1;
      ctx.clearRect(0, 0, W, H);

      // 1. Draw flowing undulating harmonic sine waves
      waves.forEach((w) => {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${w.color.join(",")}, ${w.alpha})`;
        ctx.lineWidth = 1.2;

        for (let x = 0; x <= W; x += 12) {
          const y =
            H * w.yFrac +
            Math.sin(x * w.freq + t * w.speed * 8) * w.amp +
            Math.cos(x * w.freq * 0.6 + t * w.speed * 5) * (w.amp * 0.4);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // 2. Update and draw interactive nodes
      nodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;

        // Wrap edges
        if (node.x < -10) node.x = W + 10;
        if (node.x > W + 10) node.x = -10;
        if (node.y < -10) node.y = H + 10;
        if (node.y > H + 10) node.y = -10;

        // Interactive mouse interaction: gentle repulsion / attraction
        const dx = node.x - mousePos.x;
        const dy = node.y - mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180 && dist > 0) {
          const force = (180 - dist) / 180;
          node.x += (dx / dist) * force * 1.5;
          node.y += (dy / dist) * force * 1.5;
        }

        // Draw particle dot with gentle pulse
        const pulseAlpha =
          node.baseAlpha + Math.sin(t * 0.03 + node.pulse) * 0.15;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 169, 97, ${Math.max(0.1, pulseAlpha)})`;
        ctx.fill();

        // Connect nearby nodes with delicate constellation lines
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const ndx = node.x - other.x;
          const ndy = node.y - other.y;
          const nDist = Math.sqrt(ndx * ndx + ndy * ndy);
          if (nDist < 125) {
            const lineAlpha = (1 - nDist / 125) * 0.16;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(201, 169, 97, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, [mousePos]);

  return (
    <div className="min-h-screen bg-[#08090C] relative text-[#F5F3EF] selection:bg-[#C9A961] selection:text-black font-sans overflow-hidden">
      {/* Interactive Living Background Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none -z-10"
        aria-hidden="true"
      />

      {/* Interactive Trailing Cursor Spotlight Aura */}
      <div
        className="fixed pointer-events-none -z-10 rounded-full blur-3xl transition-opacity duration-500"
        style={{
          left: mousePos.x - 260,
          top: mousePos.y - 260,
          width: 520,
          height: 520,
          background:
            "radial-gradient(circle, rgba(201,169,97,0.13) 0%, rgba(74,122,153,0.06) 45%, transparent 70%)",
          opacity: mousePos.x > 0 ? 1 : 0,
        }}
      />

      {/* Ambient Golden Spotlight Gradients */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-[#C9A961]/12 via-transparent to-transparent blur-3xl pointer-events-none -z-20" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-t from-[#4A7A99]/8 via-transparent to-transparent blur-3xl pointer-events-none -z-20" />

      {/* Usance Dynamic Condensing Header Island */}
      <header
        id="site-header"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 pointer-events-none ${
          condensed ? "py-2.5" : "py-4"
        }`}
      >
        <div
          className={`pointer-events-auto mx-auto flex items-center gap-4 py-2 pl-5 pr-2 rounded-full transition-all duration-300 ${
            condensed
              ? "max-w-[820px] w-[calc(100%-32px)] bg-[#0E1016]/95 backdrop-blur-xl border border-white/10 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.85)]"
              : "max-w-[1200px] w-[calc(100%-48px)] bg-transparent border border-transparent"
          }`}
        >
          {/* Clickable Brand Logo & Title */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative w-7 h-7 rounded-full overflow-hidden border border-[#C9A961]/40 shadow-[0_0_10px_rgba(201,169,97,0.3)] group-hover:scale-110 transition-transform duration-300">
              <Image
                src="/assets/logo-transparent.png"
                alt="Sentinel Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="font-script text-xl text-white tracking-wide">
              Sentinel
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 ml-auto" aria-label="Site">
            <Link
              href="/assets"
              className="px-3.5 py-1.5 rounded-full text-[13.5px] text-[#C2BEB4] hover:text-[#F5F3EF] hover:bg-white/[0.08] transition-all"
            >
              Pipelines
            </Link>
            <a
              href="#cli"
              className="px-3.5 py-1.5 rounded-full text-[13.5px] text-[#C2BEB4] hover:text-[#F5F3EF] hover:bg-white/[0.08] transition-all"
            >
              CLI Daemon
            </a>
            <a
              href="#integration"
              className="px-3.5 py-1.5 rounded-full text-[13.5px] text-[#C2BEB4] hover:text-[#F5F3EF] hover:bg-white/[0.08] transition-all"
            >
              Bot SDK
            </a>
            <Link
              href="/simulate"
              className="px-3.5 py-1.5 rounded-full text-[13.5px] text-[#C2BEB4] hover:text-[#F5F3EF] hover:bg-white/[0.08] transition-all"
            >
              Simulation
            </Link>
            <Link
              href="/security"
              className="px-3.5 py-1.5 rounded-full text-[13.5px] text-[#C2BEB4] hover:text-[#F5F3EF] hover:bg-white/[0.08] transition-all"
            >
              Security
            </Link>
            <Link
              href="/status"
              className="px-3.5 py-1.5 rounded-full text-[13.5px] text-[#C2BEB4] hover:text-[#F5F3EF] hover:bg-white/[0.08] transition-all"
            >
              Status
            </Link>
            <a
              href="https://docs.basescan.org"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-full text-[13.5px] text-[#C2BEB4] hover:text-[#F5F3EF] hover:bg-white/[0.08] transition-all"
            >
              Docs
            </a>
          </nav>

          {/* Launch Observatory CTA */}
          <Link
            href="/dapp"
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-medium transition-all shrink-0 ${
              condensed
                ? "bg-[#F5F3EF] text-[#08090C] font-semibold hover:bg-white hover:scale-105 shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
                : "bg-[#181A20] text-[#F5F3EF] border border-white/[0.14] hover:bg-[#20242D] hover:border-white/30"
            }`}
          >
            <span>Launch Observatory</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-32 pb-20 space-y-12">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-normal tracking-tight leading-[1.08] text-white">
            The Nonce Gap Watchdog for Autonomous Agents on Base.
          </h1>

          <p className="text-base sm:text-lg text-[#C2BEB4] font-light max-w-2xl mx-auto leading-relaxed">
            When sub-second sequencing and sudden gas surges strand in-flight transactions, high-frequency pipelines freeze. Sentinel observes, diagnoses, and heals nonce deadlocks autonomously.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/dapp"
              className="px-6 py-3 rounded-full bg-[#C9A961] hover:bg-[#E5C989] text-black font-medium text-xs font-mono transition-all transform hover:scale-[1.02] shadow-[0_0_25px_rgba(201,169,97,0.3)]"
            >
              Launch Live Observatory
            </Link>
            <a
              href="#problem"
              className="px-6 py-3 rounded-full bg-[#101216] border border-[#C9A961]/20 hover:bg-white/5 text-[#F5F3EF] text-xs font-mono transition-all"
            >
              Explore The Nonce Gap
            </a>
          </div>
        </div>

        {/* Grand Hero Visual Showcase */}
        <div className="relative rounded-[28px] overflow-hidden border border-[#C9A961]/20 bg-[#101216] shadow-[0_0_45px_-12px_rgba(201,169,97,0.3)] max-w-5xl mx-auto">
          <div className="aspect-[16/9] sm:aspect-[21/9] relative">
            <Image
              src="/assets/david_cyborg.jpg"
              alt="Autonomous Sentinel Intelligence"
              fill
              className="object-cover object-center filter brightness-[0.88] contrast-[1.08]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-[#08090C]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#08090C]/80 via-transparent to-[#08090C]/80" />

            {/* Floating Telemetry Badges */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#C9A961]">
                  Autonomous Guardian
                </span>
                <div className="font-serif text-xl sm:text-2xl text-white">
                  Continuous Sub-Second Mempool Protection
                </div>
                <div className="text-xs text-[#C2BEB4] font-mono">
                  Monitoring Base Sepolia RPC & Flashblock 200ms pre-confirmations
                </div>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <div className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-[#C9A961]/20 text-[#C9A961]">
                  Flashblocks: ~200ms
                </div>
                <div className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-[#C9A961]/20 text-[#4A7A99]">
                  Desync Delta: 0.00
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Core Thesis: Model Proposes, Code Decides */}
        <div className="max-w-5xl mx-auto rounded-[24px] bg-gradient-to-r from-[#101216] via-[#141820] to-[#101216] border border-[#C9A961]/30 p-6 sm:p-8 shadow-[0_10px_35px_-10px_rgba(201,169,97,0.25)] space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#C9A961]">
                CORE ARCHITECTURAL THESIS
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-white">
                &ldquo;Model Proposes, Code Decides&rdquo;
              </h2>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full self-start md:self-auto">
              <ShieldCheck className="w-4 h-4" />
              <span>Tested & Formally Clamped</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
            <div className="space-y-2 p-4 rounded-xl bg-void-2 border border-white/[0.06]">
              <div className="text-ash uppercase text-[10px]">1. AI Reasoning Layer</div>
              <div className="text-white font-serif text-base font-semibold">The AI Reasons</div>
              <p className="text-marble-dim/80 leading-relaxed font-mono text-xs">
                Claude 3.5 Sonnet diagnoses why a nonce stalled (eviction, gas spike, or Flashblocks desync) and proposes an optimal recovery strategy.
              </p>
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-void-2 border border-[#C9A961]/30">
              <div className="text-[#C9A961] uppercase text-[10px]">2. Hard Mathematical Bounds</div>
              <div className="text-[#C9A961] font-serif text-base font-semibold">Code Decides</div>
              <p className="text-marble-dim/80 leading-relaxed font-mono text-xs">
                The model never touches gas fees directly. Every proposal is clamped to [10%, 50%]. A simulated 200% ask is bounded to 50%, with zero runaway risk.
              </p>
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-void-2 border border-white/[0.06]">
              <div className="text-sky-300 uppercase text-[10px]">3. Base L2 Fact Citation</div>
              <div className="text-white font-serif text-base font-semibold">A Documented Problem</div>
              <p className="text-marble-dim/80 leading-relaxed font-mono text-xs">
                Not a theoretical issue: grounded directly in Base's official Flashblocks engineering documentation and sub-second pre-confirmation race conditions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Core Problem: Anatomy of a Nonce Gap */}
      <section
        id="problem"
        className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 space-y-16"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9532F]/10 text-[#D9532F] text-[11px] font-mono uppercase tracking-wider">
              The Fundamental Vulnerability
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif text-white leading-tight">
              The Nonce Gap: Why High-Frequency Bots Freeze.
            </h2>
            <p className="text-sm text-[#C2BEB4] leading-relaxed font-light">
              Ethereum nonces are strictly sequential. An agent cannot confirm Nonce #128 until Nonce #127 is included in a block. On Base with ~200ms Flashblocks, when an agent dispatches 10 transactions in a 1-second burst:
            </p>
            <p className="text-sm text-[#C2BEB4] leading-relaxed font-light">
              A sudden gas surge strands Nonce #127 below the base fee. The entire downstream pipeline (arbitrage fills, liquidation cancellations, and vault rebalances) halts indefinitely in queue deadlock.
            </p>
            <div className="pt-2">
              <div className="p-4 rounded-[18px] bg-[#101216] border border-[#C9A961]/20 space-y-2">
                <div className="text-xs font-mono text-[#C9A961]">
                  Flashblocks Latency Paradox:
                </div>
                <div className="text-xs text-[#C2BEB4] leading-relaxed">
                  Standard block intervals are 2 seconds, but Flashblocks stream partial blocks every 200ms. If your bot’s local nonce tracker falls out of sync with the sequencer by just one sub-block, every subsequent submission errors with <code className="text-[#D9532F]">NONCE_TOO_LOW</code> or stalls forever in <code className="text-[#D9532F]">QUEUED</code> status.
                </div>
              </div>
            </div>
          </div>

          {/* Framed Classical Artwork: Creation of Adam (The Nonce Gap) */}
          <div className="lg:col-span-7">
            <div className="relative rounded-[26px] overflow-hidden border border-[#C9A961]/20 bg-[#101216] shadow-[0_0_45px_-12px_rgba(201,169,97,0.3)] transition-transform duration-500 hover:-translate-y-1">
              <div className="relative aspect-[16/10] w-full">
                <Image
                  src="/assets/adam_creation_gap.jpg"
                  alt="The Nonce Gap Representation"
                  fill
                  className="object-cover filter brightness-[0.92] contrast-[1.05]"
                />
              </div>
              <div className="p-6 bg-[#101216] border-t border-[#C9A961]/20 flex items-center justify-between">
                <div>
                  <div className="font-serif text-base text-white">The Microsecond Disconnect</div>
                  <div className="text-xs font-mono text-[#686660]">
                    Michelangelo&apos;s Creation of Adam · Symbol of the Unconfirmed Nonce Gap
                  </div>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#D9532F]/15 text-[#D9532F] border border-[#D9532F]/30">
                  DEADLOCK STATE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Deadly Failure Modes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#101216] rounded-[22px] border border-[#C9A961]/20 p-6 space-y-4 hover:border-[#C9A961]/50 transition-all">
            <div className="w-10 h-10 rounded-full bg-[#D9532F]/10 border border-[#D9532F]/30 flex items-center justify-center text-xs font-mono text-[#D9532F]">
              01
            </div>
            <h3 className="font-serif text-lg text-white">Underpriced Gas Stall</h3>
            <p className="text-xs text-[#C2BEB4] leading-relaxed">
              Base fee surges during volatility. Nonce #N’s priority tip is insufficient for sequencer inclusion. Nonce #N+1 through #N+K sit permanently blocked in the node’s queued pool.
            </p>
          </div>

          <div className="bg-[#101216] rounded-[22px] border border-[#C9A961]/20 p-6 space-y-4 hover:border-[#C9A961]/50 transition-all">
            <div className="w-10 h-10 rounded-full bg-[#C9A961]/10 border border-[#C9A961]/30 flex items-center justify-center text-xs font-mono text-[#C9A961]">
              02
            </div>
            <h3 className="font-serif text-lg text-white">Silent Mempool Eviction</h3>
            <p className="text-xs text-[#C2BEB4] leading-relaxed">
              RPC nodes evict low-fee transactions under load without firing error callbacks. The agent assumes the transaction is in flight, but the chain has forgotten it entirely.
            </p>
          </div>

          <div className="bg-[#101216] rounded-[22px] border border-[#C9A961]/20 p-6 space-y-4 hover:border-[#C9A961]/50 transition-all">
            <div className="w-10 h-10 rounded-full bg-[#4A7A99]/10 border border-[#4A7A99]/30 flex items-center justify-center text-xs font-mono text-[#4A7A99]">
              03
            </div>
            <h3 className="font-serif text-lg text-white">Micro-Fork Reorg Collision</h3>
            <p className="text-xs text-[#C2BEB4] leading-relaxed">
              Sub-second Flashblock reorgs invalidate an assumed pre-confirmation. The agent increments its internal counter, triggering immediate <code className="text-[#4A7A99]">REPLACEMENT_UNDERPRICED</code> errors.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture & Neoclassical Precision */}
      <section
        id="architecture"
        className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 space-y-16"
      >
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A961]/10 text-[#C9A961] text-[11px] font-mono uppercase tracking-wider">
            Autonomous Engine
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif text-white">
            Neoclassical Precision: How Sentinel Heals the Stream.
          </h2>
          <p className="text-sm text-[#C2BEB4] leading-relaxed">
            Sentinel runs as an autonomous, out-of-band watchdog alongside any trading daemon. It operates via three non-intrusive phases:
          </p>
        </div>

        {/* 2 Art-Rich Architectural Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: Chronometer & In-Flight Tracking */}
          <div className="bg-[#101216] rounded-[26px] border border-[#C9A961]/20 overflow-hidden flex flex-col justify-between transition-transform duration-500 hover:-translate-y-1">
            <div className="aspect-[16/10] relative overflow-hidden">
              <Image
                src="/assets/chronometer.jpg"
                alt="Renaissance Celestial Astrolabe Chronometer"
                fill
                className="object-cover filter brightness-[0.9] contrast-[1.1]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#101216] via-transparent to-transparent" />
            </div>
            <div className="p-8 space-y-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#C9A961]">
                TRACKING SUBSYSTEM
              </span>
              <h3 className="font-serif text-2xl text-white">Deterministic Sequence Tracking</h3>
              <p className="text-xs text-[#C2BEB4] leading-relaxed">
                The <code className="text-[#C9A961]">nonceTracker.ts</code> engine monitors pending vs mined nonces at 200ms intervals matching Base Flashblocks. It maintains an eviction timer on every in-flight hash, distinguishing normal block latency from silent drops.
              </p>
              <div className="pt-2 flex items-center gap-4 text-xs font-mono text-[#C9A961]">
                <span>✓ 200ms Polling Tick</span>
                <span>✓ Eviction Timeout Window</span>
                <span>✓ Ghost Nonce Reaper</span>
              </div>
            </div>
          </div>

          {/* Card 2: Celestial Dome & Clamped Resolution */}
          <div className="bg-[#101216] rounded-[26px] border border-[#C9A961]/20 overflow-hidden flex flex-col justify-between transition-transform duration-500 hover:-translate-y-1">
            <div className="aspect-[16/10] relative overflow-hidden">
              <Image
                src="/assets/celestial_dome.jpg"
                alt="Celestial Dome Consensus Architecture"
                fill
                className="object-cover filter brightness-[0.88] contrast-[1.1]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#101216] via-transparent to-transparent" />
            </div>
            <div className="p-8 space-y-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#4A7A99]">
                RESOLVER SUBSYSTEM
              </span>
              <h3 className="font-serif text-2xl text-white">AI Diagnostics & Clamped Gas Bumping</h3>
              <p className="text-xs text-[#C2BEB4] leading-relaxed">
                When a gap is confirmed, <code className="text-[#4A7A99]">agent.ts</code> classifies the root cause via Claude 3.5 Sonnet or local fast heuristics. <code className="text-[#4A7A99]">resolver.ts</code> constructs a zero-value cancellation or bumped replacement, strictly clamped within user-defined percentage bounds.
              </p>
              <div className="pt-2 flex items-center gap-4 text-xs font-mono text-[#4A7A99]">
                <span>✓ Bounded Gas Clamp (10% to 100%)</span>
                <span>✓ Fallback Heuristics</span>
                <span>✓ Nonce Unblocking</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Security Axioms (Cloud Citadel) */}
      <section
        id="axioms"
        className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 space-y-12"
      >
        <div className="relative rounded-[28px] overflow-hidden border border-[#C9A961]/20 bg-[#101216] shadow-[0_0_45px_-12px_rgba(201,169,97,0.3)]">
          <div className="aspect-[21/9] relative">
            <Image
              src="/assets/cloud_citadel.jpg"
              alt="Neoclassical Sentinel Citadel"
              fill
              className="object-cover filter brightness-[0.7] contrast-[1.15]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-[#08090C]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#08090C]/90 via-transparent to-[#08090C]/90" />

            <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-end max-w-3xl space-y-3">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#C9A961]">
                INSTITUTIONAL SAFETY MANDATE
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-white">
                The Armored Citadel: Fail-Safe Guardrails.
              </h2>
              <p className="text-xs sm:text-sm text-[#C2BEB4] leading-relaxed">
                Autonomous healing must never run amok. Sentinel is designed with strict mathematical constraints that guarantee agent capital preservation under catastrophic network conditions.
              </p>
            </div>
          </div>

          {/* 4 Axiom Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-8 bg-[#101216] border-t border-[#C9A961]/15">
            <div className="space-y-2">
              <div className="text-xs font-mono text-[#C9A961]">AXIOM I</div>
              <div className="font-serif text-base text-white">Hard Clamped Bumping</div>
              <div className="text-xs text-[#C2BEB4] leading-relaxed">
                AI recommendations are strictly clamped between <code className="text-[#C9A961]">minGasBumpPct</code> (10%) and <code className="text-[#C9A961]">maxGasBumpPct</code> (100%). Zero runaway fees.
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono text-[#C9A961]">AXIOM II</div>
              <div className="font-serif text-base text-white">Triple-Strike Breaker</div>
              <div className="text-xs text-[#C2BEB4] leading-relaxed">
                If 3 healing interventions occur within a 60-second sliding window, the circuit breaker trips, freezing all automated writes and sounding an urgent webhook alert.
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono text-[#C9A961]">AXIOM III</div>
              <div className="font-serif text-base text-white">Zero Key Exposure</div>
              <div className="text-xs text-[#C2BEB4] leading-relaxed">
                Deploy in Proxy Interceptor mode to inspect and repair JSON-RPC traffic in flight without storing private keys inside Sentinel itself.
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono text-[#C9A961]">AXIOM IV</div>
              <div className="font-serif text-base text-white">Audit Trail Provenance</div>
              <div className="text-xs text-[#C2BEB4] leading-relaxed">
                Every gap detection, diagnosis reason, gas bump calculation, and broadcast hash is permanently recorded to structured JSONL logs.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Autonomous CLI Daemon Showcase Section */}
      <section id="cli" className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A961]/10 text-[#C9A961] text-[11px] font-mono uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5" />
              <span>Headless Autonomous Daemon</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif text-white">
              Built for the Terminal.
            </h2>
            <p className="text-sm text-[#C2BEB4] leading-relaxed">
              Algorithmic trading desks operate in headless Linux and VPS environments. Sentinel runs as an ultra-lightweight, out-of-band daemon alongside your bot with sub-second response times and zero UI overhead.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 font-mono text-xs text-ash">
            <span className="px-3 py-1.5 rounded-xl bg-[#101216] border border-white/10 text-[#C9A961]">
              500ms Polling Loop
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-[#101216] border border-white/10 text-emerald-400">
              Claude 3.5 Diagnosis
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-[#101216] border border-white/10 text-[#F5F3EF]">
              [10%, 50%] Clamped
            </span>
          </div>
        </div>

        {/* Interactive Terminal Window */}
        <div className="rounded-[24px] border border-white/10 bg-[#0C0E14] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)]">
          {/* Terminal Titlebar */}
          <div className="px-5 py-3.5 bg-[#12151C] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 font-mono text-xs text-ash">sentinel-daemon ~ node v20+</span>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1.5 bg-[#08090C] p-1 rounded-xl border border-white/[0.06]">
              <button
                onClick={() => setCliTab("watch")}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                  cliTab === "watch"
                    ? "bg-[#C9A961]/20 text-[#C9A961] border border-[#C9A961]/30 font-semibold"
                    : "text-ash hover:text-white"
                }`}
              >
                watch
              </button>
              <button
                onClick={() => setCliTab("scan")}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                  cliTab === "scan"
                    ? "bg-[#C9A961]/20 text-[#C9A961] border border-[#C9A961]/30 font-semibold"
                    : "text-ash hover:text-white"
                }`}
              >
                single-scan
              </button>
              <button
                onClick={() => setCliTab("compile")}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                  cliTab === "compile"
                    ? "bg-[#C9A961]/20 text-[#C9A961] border border-[#C9A961]/30 font-semibold"
                    : "text-ash hover:text-white"
                }`}
              >
                build-binary
              </button>
              <button
                onClick={() => setCliTab("demo")}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
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
          <div className="p-6 font-mono text-xs space-y-4 overflow-x-auto bg-[#08090C]/90">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
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
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Terminal Live Output Simulation */}
            {cliTab === "watch" && (
              <div className="space-y-2 text-marble-dim/90 leading-relaxed">
                <p className="text-ash">
                  Watching 0x742d35Cc6634C0532925a3b844Bc454e4438BaEa on https://sepolia.base.org every 500ms. (resolution enabled) (AI diagnosis enabled)
                </p>
                <p className="text-ash/70">[2026-09-19T14:00:01.120Z] Latest: 42, Pending: 42, Gap: none</p>
                <p className="text-ash/70">[2026-09-19T14:00:01.625Z] Latest: 42, Pending: 42, Gap: none</p>
                <p className="text-amber-300 font-semibold">[2026-09-19T14:00:02.130Z] Latest: 42, Pending: 44, Gap: 43</p>
                <p className="text-sky-300">
                  {"  "}[DIAGNOSIS] underpriced: "Gas tip below priority threshold" (recommended bump: 18%)
                </p>
                <p className="text-emerald-400 font-semibold">
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
                <p className="text-emerald-400 font-semibold">
                  Latest nonce: 44, Pending nonce: 44, Gap: none
                </p>
                <p className="text-ash/70">Execution completed in 42ms. Zero gaps detected on Base Sepolia.</p>
              </div>
            )}

            {cliTab === "compile" && (
              <div className="space-y-2 text-marble-dim/90 leading-relaxed">
                <p className="text-ash">&gt; sentinel@0.1.0 build:cli</p>
                <p className="text-ash">&gt; tsc -p tsconfig.cli.json</p>
                <p className="text-emerald-400">✓ Compiled TypeScript into dist/cli.js (Zero external dev dependencies)</p>
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
                <p className="text-rose-400">   - Tx #2 (nonce 43): Underpriced (1 wei tip) [STUCK]</p>
                <p className="text-amber-400">   - Tx #3 (nonce 44): High fee [QUEUED behind stuck nonce 43]</p>
                <p className="text-sky-300 pt-1">2. Sentinel detects gap at nonce 43</p>
                <p className="text-ash">3. Triggering AI Diagnosis (Claude reasoning layer)...</p>
                <p className="text-emerald-400">   - Clamped recommendation: 10%</p>
                <p className="text-ash">4. Resolving stuck transaction via GapResolver (Dry Run)...</p>
                <p className="text-emerald-400 font-semibold">   Resolution outcome: resolved (0xdryrun002b1a0b9baeaf1)</p>
                <p className="text-ash">5. Audit log updated in ./sentinel.log. Verification complete!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Two Modes of Integration & Hidden Capabilities Showcase */}
      <section id="integration" className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A961]/10 text-[#C9A961] text-[11px] font-mono uppercase tracking-wider">
            Flexible Integration
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif text-white">
            Two Ways to Deploy. Zero Intrusiveness.
          </h2>
          <p className="text-sm text-[#C2BEB4] leading-relaxed">
            Whether you want a drop-in SDK wrapper inside your trading bot codebase or an out-of-band headless daemon running in a background container, Sentinel adapts seamlessly to your infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: In-Line Transaction Interceptor */}
          <div className="bg-[#0C0E14] border border-[#C9A961]/25 rounded-[24px] p-7 sm:p-8 space-y-6 flex flex-col justify-between shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-semibold">
                  MODE 1: IN-LINE INTERCEPTOR
                </span>
                <span className="font-mono text-xs text-ash">src/interceptor.ts</span>
              </div>
              <h3 className="font-serif text-2xl text-white">The Drop-In Bot Interceptor</h3>
              <p className="text-xs text-[#C2BEB4] leading-relaxed font-mono">
                Instead of calling client.sendRawTransaction directly, your trading bot calls interceptor.submitTransaction(signedTx). The interceptor checks for missing nonces behind your trade, heals the gap atomically, and forwards your transaction without head-of-line blocking.
              </p>

              {/* Code Snippet */}
              <div className="p-4 rounded-xl bg-[#08090C] border border-white/[0.08] font-mono text-xs space-y-2 text-marble-dim/90 overflow-x-auto">
                <p className="text-ash">// Drop-in replacement for algorithmic bots</p>
                <p className="text-sky-300">import <span className="text-white">&#123; TransactionInterceptor &#125;</span> from <span className="text-emerald-300">&quot;sentinel&quot;</span>;</p>
                <p className="text-ash">// Replace: await client.sendRawTransaction(signedTx)</p>
                <p className="text-[#C9A961] font-semibold">const hash = await interceptor.submitTransaction(signedTx);</p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-ash">
              <span>Zero nonce management burden</span>
              <span className="text-emerald-400">Pre-flight gap resolution</span>
            </div>
          </div>

          {/* Card 2: Silent Mempool Eviction Monitor */}
          <div className="bg-[#0C0E14] border border-[#C9A961]/25 rounded-[24px] p-7 sm:p-8 space-y-6 flex flex-col justify-between shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-mono text-xs font-semibold">
                  MODE 2: OUT-OF-BAND WATCHDOG
                </span>
                <span className="font-mono text-xs text-ash">src/evictionMonitor.ts</span>
              </div>
              <h3 className="font-serif text-2xl text-white">Silent Eviction Detection</h3>
              <p className="text-xs text-[#C2BEB4] leading-relaxed font-mono">
                Base L2 sequencers drop underpriced transactions under heavy load without emitting error events. Sentinel continuously audits in-flight hashes: when a transaction vanishes past EVICTION_TIMEOUT_MS, Sentinel detects the eviction and autonomously resubmits.
              </p>

              {/* Eviction State Flow */}
              <div className="p-4 rounded-xl bg-[#08090C] border border-white/[0.08] font-mono text-xs space-y-2 text-marble-dim/90">
                <div className="flex items-center justify-between text-ash text-[11px] pb-1 border-b border-white/[0.06]">
                  <span>PROPAGATION STATE</span>
                  <span>AUTONOMOUS ACTION</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-300">everSeenPending: true</span>
                  <span className="text-ash">Mempool inclusion verified</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-rose-400">status: not_found &gt; 30s</span>
                  <span className="text-rose-400 font-semibold">Silent eviction confirmed</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-semibold">Autonomous Recovery</span>
                  <span className="text-emerald-400 font-semibold">Resubmit with clamped bump</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-ash">
              <span>Solves Base zero-event dropouts</span>
              <span className="text-sky-300">Continuous 500ms loop</span>
            </div>
          </div>
        </div>

        {/* Live SSE Telemetry & Dry-Run Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-5 rounded-2xl bg-[#101216] border border-white/[0.08] space-y-2">
            <div className="text-emerald-400 font-semibold flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Real-Time SSE Stream</span>
            </div>
            <p className="text-ash text-[11px] leading-relaxed">
              Open streaming endpoint at <code className="text-white">/api/stream</code>. Pipe live Base L2 sub-second telemetry directly into custom terminals or Grafana dashboards.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#101216] border border-white/[0.08] space-y-2">
            <div className="text-[#C9A961] font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero-Key Dry-Run Mode</span>
            </div>
            <p className="text-ash text-[11px] leading-relaxed">
              Set <code className="text-white">DRY_RUN=true</code> to test full detection, AI reasoning, and safety clamping against live Base Sepolia RPC with zero financial risk.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#101216] border border-white/[0.08] space-y-2">
            <div className="text-sky-300 font-semibold flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              <span>Triple-Strike Circuit Breaker</span>
            </div>
            <p className="text-ash text-[11px] leading-relaxed">
              Protects against network outages. If consecutive resolution failures exceed threshold, Sentinel trips into SAFE mode and alerts Telegram or Discord.
            </p>
          </div>
        </div>
      </section>

      {/* Live Observatory Teaser / Call to Action */}
      <section id="dapp-preview" className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="rounded-[28px] bg-gradient-to-b from-[#171A20] to-[#101216] border border-[#C9A961]/20 p-8 sm:p-14 text-center space-y-8 relative overflow-hidden shadow-[0_0_45px_-12px_rgba(201,169,97,0.3)]">
          <div className="w-full max-w-xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C9A961]/10 border border-[#C9A961]/25 text-[#C9A961] text-xs font-mono">
              <Activity className="w-3.5 h-3.5 text-[#C9A961]" />
              <span>REAL-TIME OBSERVATORY INTERFACE</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif text-white">
              Enter the Live Observatory.
            </h2>
            <p className="text-sm text-[#C2BEB4] font-light leading-relaxed">
              Step inside the telemetry console. Inspect the active mempool pipeline, simulate stuck transactions, and witness Sentinel execute bounded auto-healing in real-time.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <Link
              href="/dapp"
              className="px-8 py-4 rounded-full bg-[#C9A961] hover:bg-[#E5C989] text-black font-semibold text-sm font-mono transition-all transform hover:scale-[1.03] shadow-[0_0_35px_rgba(201,169,97,0.35)] flex items-center justify-center"
            >
              <span>Open Fullscreen Observatory Console</span>
            </Link>
          </div>

          {/* Artwork Accent: Oracle Waveform */}
          <div className="max-w-md mx-auto pt-6 opacity-60">
            <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden border border-[#C9A961]/20">
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
      <footer className="border-t border-white/10 py-12 px-6 bg-[#08090C] text-[#686660] text-xs font-mono">
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
            <Link href="/privacy" className="hover:text-[#F5F3EF] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#F5F3EF] transition-colors">
              Terms of Service
            </Link>
            <Link href="/security" className="hover:text-[#F5F3EF] transition-colors">
              Security
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
