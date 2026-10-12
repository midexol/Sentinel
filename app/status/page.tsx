import React from "react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import SiteAtmosphere from "@/components/site-atmosphere";
import { RiPulseLine, RiShieldCheckLine, RiErrorWarningLine, RiExternalLinkLine } from "react-icons/ri";
import { chainLabel, explorerBase, probeRpc } from "@/lib/viem";
import { readSettings } from "@/lib/server/settings";
import { computeMetrics, readAuditEntries } from "@/lib/server/audit";
import { readControlState } from "@/lib/server/control";

// Rendered at most once per window and shared by every visitor (and uptime probe).
export const revalidate = 30;

type Level = "ok" | "warn" | "down";
interface Check {
  name: string;
  note: string;
  status: string;
  level: Level;
  detail?: string;
}

async function rpcCheck(): Promise<Check> {
  try {
    const { block, latencyMs } = await probeRpc();
    return {
      name: `${chainLabel} RPC`,
      note: `Latest block #${block.toLocaleString()}`,
      status: "OPERATIONAL",
      level: "ok",
      detail: `Latency: ${latencyMs}ms`,
    };
  } catch {
    return { name: `${chainLabel} RPC`, note: "The RPC endpoint did not respond", status: "UNREACHABLE", level: "down" };
  }
}

function ago(iso: string | null): string {
  if (!iso) return "no events recorded yet";
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const levelStyles: Record<Level, string> = {
  ok: "bg-[#8FAF92]/10 text-[#8FAF92] border-[#8FAF92]/25",
  warn: "bg-[#D4A359]/10 text-[#D4A359] border-[#D4A359]/30",
  down: "bg-red-500/10 text-red-400 border-red-500/30",
};

export default async function StatusPage() {
  const settings = readSettings();
  const metrics = computeMetrics(readAuditEntries());
  const control = readControlState();
  const rpc = await rpcCheck();

  const breaker: Check = !settings.circuitBreaker.enabled
    ? { name: "Circuit Breaker", note: "Disabled in settings", status: "DISABLED", level: "warn" }
    : (control.available ? control.breakerTripped : metrics.circuitBreakerStatus === "TRIPPED")
      ? { name: "Circuit Breaker", note: `${metrics.totalCircuitBreakerTrips} trip(s) recorded`, status: "TRIPPED", level: "down" }
      : { name: "Circuit Breaker", note: `${metrics.totalCircuitBreakerTrips} trip(s) recorded in the audit log`, status: "ARMED", level: "ok" };

  const daemon: Check = !control.available
    ? { name: "Watchdog Control", note: "No state file shared with the web app, so the daemon state is unknown", status: "UNKNOWN", level: "warn" }
    : control.halted
      ? { name: "Watchdog Control", note: "Resolution paused by an operator", status: "HALTED", level: "warn" }
      : { name: "Watchdog Control", note: "Not halted", status: "ACTIVE", level: "ok" };

  const audit: Check = {
    name: "Audit Log",
    note: `${metrics.totalGapsDetected} gap(s) detected, ${metrics.totalGapsResolved} resolved, ${metrics.totalGapsFailed} failed`,
    status: metrics.lastEventAt ? "RECORDING" : "EMPTY",
    level: metrics.lastEventAt ? "ok" : "warn",
    detail: `Last event: ${ago(metrics.lastEventAt)}`,
  };

  const checks = [rpc, breaker, daemon, audit];
  const worst: Level = checks.some((c) => c.level === "down") ? "down" : checks.some((c) => c.level === "warn") ? "warn" : "ok";
  const headline = worst === "ok" ? "All Checks Passing" : worst === "warn" ? "Operating With Notices" : "Degraded";
  const wallet = settings.system.walletAddress as string;

  return (
    <div className="relative min-h-screen bg-[#000000] text-marble selection:bg-aurum/20 selection:text-aurum-light font-sans overflow-x-hidden flex flex-col justify-between">
      <SiteAtmosphere />
      <SiteHeader />

      <main className="relative z-10 pt-36 md:pt-44 pb-24 px-6 max-w-6xl mx-auto w-full space-y-12">
        <div className="max-w-3xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#C9A961]">
            <RiPulseLine className="w-3.5 h-3.5" />
            <span>Telemetry & Uptime</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-semibold tracking-tight text-marble">Integration Status</h1>
          <p className="font-sans text-marble-dim/80 text-base leading-relaxed">
            Refreshed every 30 seconds: the RPC connection, the circuit breaker, daemon controls and the audit log.
          </p>
        </div>

        <div className="bg-[#07080A]/95 border border-aurum/25 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${levelStyles[worst]}`}>
              {worst === "ok" ? <RiShieldCheckLine className="w-5 h-5" /> : <RiErrorWarningLine className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-serif text-lg font-medium text-marble">{headline}</div>
              <div className="text-xs font-mono text-marble-dim/70 mt-0.5">
                {wallet ? `Monitoring ${wallet.slice(0, 8)}…${wallet.slice(-4)} on ${chainLabel}` : `No wallet configured on ${chainLabel}`}
              </div>
            </div>
          </div>

          <a
            href={wallet ? `${explorerBase}/address/${wallet}` : explorerBase}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-aurum transition-all shadow-sm"
          >
            <span>{wallet ? "View wallet on explorer" : `Open ${chainLabel} explorer`}</span>
            <RiExternalLinkLine className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="bg-[#07080A]/95 border border-white/[0.08] rounded-2xl divide-y divide-white/[0.06] overflow-hidden shadow-2xl backdrop-blur-xl">
          {checks.map((c) => (
            <div key={c.name} className="p-5 md:p-6 flex flex-wrap items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] shrink-0 select-none ${levelStyles[c.level].split(" ")[1]}`}>◆</span>
                <div>
                  <div className="font-medium text-sm font-sans text-marble">{c.name}</div>
                  <div className="text-xs text-marble-dim/60 font-mono mt-0.5">{c.note}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 font-mono text-xs">
                {c.detail && <span className="text-marble-dim/70">{c.detail}</span>}
                <span className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${levelStyles[c.level]}`}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
