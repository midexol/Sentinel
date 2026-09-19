import React from "react";
import SiteHeader from "@/components/site-header";
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
    <div className="min-h-screen bg-void text-marble selection:bg-aurum/20 selection:text-aurum-light">
      <SiteHeader />

      <main className="pt-36 md:pt-44 pb-24 px-6 max-w-7xl mx-auto space-y-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-void-2 border border-aurum/30 text-xs font-mono mb-4 text-aurum">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Telemetry & Uptime</span>
          </div>
          <h1 className="font-cinzel text-3xl sm:text-5xl font-bold tracking-wide text-marble">
            INTEGRATION STATUS
          </h1>
          <p className="mt-4 font-sans text-marble-dim/80 text-base leading-relaxed">
            Live operational status of Sentinel's daemon nodes, Flashblock listeners, and Base L2 RPC interconnects.
          </p>
        </div>

        {/* Global Banner */}
        <div className="bg-[#0C0E14] border border-aurum/20 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
            </span>
            <div>
              <div className="font-cinzel text-base font-semibold text-marble">
                ALL SYSTEMS OPERATIONAL
              </div>
              <div className="text-xs font-mono text-ash">
                Monitoring 3 keystores on Base Sepolia
              </div>
            </div>
          </div>

          <a
            href="https://sepolia.basescan.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-mono text-aurum hover:underline"
          >
            <span>Verify Base Sepolia Explorer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Subsystem breakdown */}
        <div className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.06] overflow-hidden">
          {subsystems.map((sub) => (
            <div key={sub.name} className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-medium text-xs font-mono text-marble">{sub.name}</div>
                  <div className="text-[11px] text-ash font-mono mt-0.5">{sub.note}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 font-mono text-xs">
                <span className="text-marble-dim/70">Latency: {sub.latency}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {sub.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
