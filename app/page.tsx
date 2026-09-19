"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  const [condensed, setCondensed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
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

      {/* Live Observatory Teaser / Call to Action */}
      <section id="dapp-preview" className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="rounded-[28px] bg-gradient-to-b from-[#171A20] to-[#101216] border border-[#C9A961]/20 p-8 sm:p-14 text-center space-y-8 relative overflow-hidden shadow-[0_0_45px_-12px_rgba(201,169,97,0.3)]">
          <div className="w-full max-w-xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C9A961]/10 text-[#C9A961] text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-[#C9A961] animate-pulse" />
              REAL-TIME OBSERVATORY INTERFACE
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
