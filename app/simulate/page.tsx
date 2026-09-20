"use client";

import React from "react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import SiteAtmosphere from "@/components/site-atmosphere";
import SimulationRunner from "@/components/simulation-runner";
import { Terminal, ShieldAlert, Zap, Cpu } from "lucide-react";

export default function SimulatePage() {
  return (
    <div className="min-h-screen bg-void text-marble relative overflow-hidden font-sans selection:bg-aurum/20 selection:text-aurum-light">
      <SiteAtmosphere />
      <SiteHeader />

      <main className="pt-36 md:pt-44 pb-24 px-6 max-w-7xl mx-auto relative z-10 space-y-12">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C9A961]/10 border border-[#C9A961]/25 text-[#C9A961] text-xs font-mono">
            <Terminal className="w-3.5 h-3.5 text-[#C9A961]" />
            <span>DETERMINISTIC FAULT INJECTION</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif text-white font-medium tracking-tight">
            Conformance & Recovery Engine
          </h1>
          <p className="text-sm sm:text-base text-[#C2BEB4] font-light leading-relaxed">
            Execute automated stress scenarios to verify that Sentinel's heuristic diagnostic loop recovers stalled nonces without exceeding hard safety invariants.
          </p>
        </div>

        {/* The 6-stage interactive simulator */}
        <SimulationRunner />

        {/* Failure Scenarios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="rounded-2xl bg-[#101216] border border-white/[0.08] hover:border-[#C9A961]/35 p-6 transition-all shadow-sm space-y-3">
            <div className="flex items-center gap-3 text-[#C9A961]">
              <Zap className="w-5 h-5" />
              <h3 className="font-serif text-lg font-medium text-white">Scenario A: Flash Surge</h3>
            </div>
            <p className="font-mono text-xs text-[#C2BEB4]/80 leading-relaxed">
              Base L2 base fee spikes from 0.08 to 1.8 Gwei in 400ms. Transaction N is dropped from the local mempool while downstream transactions buffer.
            </p>
          </div>

          <div className="rounded-2xl bg-[#101216] border border-white/[0.08] hover:border-[#C9A961]/35 p-6 transition-all shadow-sm space-y-3">
            <div className="flex items-center gap-3 text-[#C9A961]">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-serif text-lg font-medium text-white">Scenario B: RPC Node Eviction</h3>
            </div>
            <p className="font-mono text-xs text-[#C2BEB4]/80 leading-relaxed">
              An upstream RPC node fails to broadcast nonce N before receiving N+1. The node returns a nonce gap error, deadlocking the agent until Sentinel intervenes.
            </p>
          </div>

          <div className="rounded-2xl bg-[#101216] border border-white/[0.08] hover:border-[#C9A961]/35 p-6 transition-all shadow-sm space-y-3">
            <div className="flex items-center gap-3 text-[#C9A961]">
              <Cpu className="w-5 h-5" />
              <h3 className="font-serif text-lg font-medium text-white">Scenario C: Sequencer Reorg</h3>
            </div>
            <p className="font-mono text-xs text-[#C2BEB4]/80 leading-relaxed">
              A 1-block reorg invalidates transaction N. Sentinel detects the discrepancy between latest mined nonce and mempool sequence and re-synchronizes.
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
