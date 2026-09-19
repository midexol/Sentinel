import React from "react";
import SiteHeader from "@/components/site-header";
import { ShieldCheck, Lock, AlertOctagon, FileCode2 } from "lucide-react";

export default function SecurityPage() {
  const invariants = [
    {
      id: "INV-01",
      title: "Strict Monotonicity Guarantee",
      formula: "Nonce_Mined(t) <= Nonce_Pending(t)",
      description:
        "The monitored keystore's mined nonce must never exceed its pending nonce. Any negative gap triggers an emergency RPC state reconciliation.",
    },
    {
      id: "INV-02",
      title: "Hard Gas Bump Ceiling",
      formula: "Bump_Effective <= 25.0% * maxPriorityFeePerGas",
      description:
        "Replacement transactions are strictly clamped to a 25% ceiling above prevailing base fees. This mathematically prevents gas depletion loops under attack.",
    },
    {
      id: "INV-03",
      title: "Zero-Value Null Execution",
      formula: "Value = 0 ETH ∧ To = From ∧ Data = 0x",
      description:
        "Every autonomous healing transaction is an immutable self-transfer with zero ether and null calldata. The agent cannot drain protocol capital.",
    },
    {
      id: "INV-04",
      title: "Circuit Breaker Trip Rate",
      formula: "Gaps_10_Blocks <= 3 ∨ TRIP",
      description:
        "If more than 3 consecutive gaps occur within 10 blocks for a single keystore, Sentinel trips into SAFE mode, halting autonomous dispatch and alerting operators.",
    },
  ];

  return (
    <div className="min-h-screen bg-void text-marble selection:bg-aurum/20 selection:text-aurum-light">
      <SiteHeader />

      <main className="pt-36 md:pt-44 pb-24 px-6 max-w-7xl mx-auto space-y-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-void-2 border border-aurum/30 text-xs font-mono mb-4 text-aurum">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Formal Security & Invariants</span>
          </div>
          <h1 className="font-cinzel text-3xl sm:text-5xl font-bold tracking-wide text-marble">
            SECURITY MODEL & GUARDRAILS
          </h1>
          <p className="mt-4 font-sans text-marble-dim/80 text-base leading-relaxed">
            Sentinel is architected with defensive invariants designed to withstand adversarial mempool conditions, MEV frontrunning, and RPC desynchronization on Base L2.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {invariants.map((inv) => (
            <div
              key={inv.id}
              className="bg-[#0C0E14] border border-aurum/20 rounded-2xl p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-aurum font-semibold">
                  {inv.id}
                </span>
                <Lock className="w-4 h-4 text-ash" />
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
      </main>
    </div>
  );
}
