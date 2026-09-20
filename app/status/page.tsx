import React from "react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import SiteAtmosphere from "@/components/site-atmosphere";
import { Activity, CheckCircle2, Radio, Server, ExternalLink } from "lucide-react";

export default function StatusPage() {
  const subsystems = [
    { name: "Base L2 Flashblock Ingestion", status: "OPERATIONAL", latency: "18ms", note: "Sub-200ms tick interval" },
    { name: "Heuristic AI Nonce Gap Detector", status: "OPERATIONAL", latency: "42ms", note: "Local pattern evaluation" },
    { name: "EIP-1559 Replacement Engine", status: "OPERATIONAL", latency: "115ms", note: "Viem signed pipeline" },
    { name: "Circuit Breaker Guardian", status: "ARMED", latency: "2ms", note: "Zero violations in last 24h" },
    { name: "BaseScan Sepolia Explorer Feed", status: "OPERATIONAL", latency: "140ms", note: "Verified receipt ingestion" },
  ];

  return (
    <div className="relative min-h-screen bg-[#07080B] text-marble selection:bg-aurum/20 selection:text-aurum-light font-sans overflow-x-hidden flex flex-col justify-between">
      <SiteAtmosphere />
      <SiteHeader />

      <main className="relative z-10 pt-36 md:pt-44 pb-24 px-6 max-w-6xl mx-auto w-full space-y-12">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141820]/90 border border-aurum/30 text-xs font-mono text-aurum shadow-sm">
            <Activity className="w-3.5 h-3.5 text-aurum" />
            <span>Telemetry & Uptime</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-semibold tracking-tight text-marble">
            Integration Status
          </h1>
          <p className="font-sans text-marble-dim/80 text-base leading-relaxed">
            Live operational status of Sentinel daemon nodes, Flashblock listeners, and Base L2 RPC interconnects.
          </p>
        </div>

        {/* Global Banner */}
        <div className="bg-[#101216]/95 border border-aurum/25 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="font-serif text-lg font-medium text-marble">
                All Systems Operational
              </div>
              <div className="text-xs font-mono text-marble-dim/70 mt-0.5">
                Monitoring keystores on Base Sepolia
              </div>
            </div>
          </div>

          <a
            href="https://sepolia.basescan.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-aurum transition-all shadow-sm"
          >
            <span>Verify Base Sepolia Explorer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Subsystem breakdown */}
        <div className="bg-[#101216]/95 border border-white/[0.08] rounded-2xl divide-y divide-white/[0.06] overflow-hidden shadow-2xl backdrop-blur-xl">
          {subsystems.map((sub) => (
            <div key={sub.name} className="p-5 md:p-6 flex flex-wrap items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-medium text-sm font-sans text-marble">{sub.name}</div>
                  <div className="text-xs text-marble-dim/60 font-mono mt-0.5">{sub.note}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 font-mono text-xs">
                <span className="text-marble-dim/70">Latency: {sub.latency}</span>
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {sub.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
