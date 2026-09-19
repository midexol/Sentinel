import React from "react";
import SiteHeader from "@/components/site-header";
import SimulationRunner from "@/components/simulation-runner";
import { Terminal, ShieldAlert, Zap, Cpu } from "lucide-react";

export default function SimulatePage() {
  return (
    <div className="min-h-screen bg-void text-marble selection:bg-aurum/20 selection:text-aurum-light">
      <SiteHeader />

      <main className="pt-36 md:pt-44 pb-24 px-6 max-w-7xl mx-auto space-y-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-void-2 border border-aurum/30 text-xs font-mono mb-4 text-aurum">
            <Terminal className="w-3.5 h-3.5" />
            <span>Deterministic Fault Injection</span>
          </div>
          <h1 className="font-cinzel text-3xl sm:text-5xl font-bold tracking-wide text-marble">
            CONFORMANCE & RECOVERY ENGINE
          </h1>
          <p className="mt-4 font-sans text-marble-dim/80 text-base leading-relaxed">
            Execute automated stress scenarios to verify that Sentinel's heuristic diagnostic loop recovers stalled nonces without exceeding hard safety invariants.
          </p>
        </div>

        {/* The 6-stage interactive simulator */}
        <SimulationRunner />

        {/* Failure Scenarios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="bg-[#0C0E14] border border-white/[0.08] p-6 rounded-2xl">
            <div className="flex items-center gap-3 text-aurum mb-3">
              <Zap className="w-5 h-5" />
              <h3 className="font-cinzel text-sm font-semibold">Scenario A: Flash Surge</h3>
            </div>
            <p className="font-mono text-xs text-marble-dim/70 leading-relaxed">
              Base L2 base fee spikes from 0.08 to 1.8 Gwei in 400ms. Transaction N is dropped from the local mempool while downstream transactions buffer.
            </p>
          </div>

          <div className="bg-[#0C0E14] border border-white/[0.08] p-6 rounded-2xl">
            <div className="flex items-center gap-3 text-aurum mb-3">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-cinzel text-sm font-semibold">Scenario B: RPC Node Eviction</h3>
            </div>
            <p className="font-mono text-xs text-marble-dim/70 leading-relaxed">
              An upstream RPC node fails to broadcast nonce N before receiving N+1. The node returns a nonce gap error, deadlocking the agent until Sentinel intervenes.
            </p>
          </div>

          <div className="bg-[#0C0E14] border border-white/[0.08] p-6 rounded-2xl">
            <div className="flex items-center gap-3 text-aurum mb-3">
              <Cpu className="w-5 h-5" />
              <h3 className="font-cinzel text-sm font-semibold">Scenario C: Sequencer Reorg</h3>
            </div>
            <p className="font-mono text-xs text-marble-dim/70 leading-relaxed">
              A 1-block reorg invalidates transaction N. Sentinel detects the discrepancy between latest mined nonce and mempool sequence and re-synchronizes.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
