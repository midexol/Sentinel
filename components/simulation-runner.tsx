"use client";

import React, { useState } from "react";
import { Play, RotateCcw, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { truncateHash, getBaseScanTxUrl } from "@/lib/viem";

const steps = [
  {
    step: 1,
    title: "Arbitrage Execution Fire",
    description: "HFT Bot dispatches transaction with Nonce #1421 into Base L2 Flashblock sequencer.",
    status: "DISPATCHED",
  },
  {
    step: 2,
    title: "Flashblock Gap Discovery",
    description: "Sequencer detects Nonce #1420 missing. Pipeline enters STALLED state.",
    status: "GAP_DISCOVERED",
  },
  {
    step: 3,
    title: "Heuristic AI Diagnosis",
    description: "Analyzer discovers Nonce #1420 was dropped during a 1.8 Gwei gas spike.",
    status: "DIAGNOSED",
  },
  {
    step: 4,
    title: "Invariant & Bounds Verification",
    description: "Circuit breaker calculates required gas bump: +12.5%. Enforces maximum safety limit (<= 25%).",
    status: "INVARIANT_VERIFIED",
  },
  {
    step: 5,
    title: "Autonomous Healing Dispatch",
    description: "Zero-value self-transfer signed and broadcast with Nonce #1420 and 12.5% higher maxPriorityFee.",
    status: "HEALED",
  },
  {
    step: 6,
    title: "Pipeline Unlocked & Cleared",
    description: "Replacement included in next Flashblock (200ms). Downstream transactions unblock immediately.",
    status: "RESOLVED",
  },
];

export default function SimulationRunner() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [sampleTx] = useState("0x7f9a14b62f1c8e0d9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f");

  const runSimulation = () => {
    setIsRunning(true);
    setCurrentStep(1);
    let step = 1;
    const interval = setInterval(() => {
      step += 1;
      if (step > 6) {
        clearInterval(interval);
        setIsRunning(false);
      } else {
        setCurrentStep(step);
      }
    }, 1100);
  };

  const reset = () => {
    setCurrentStep(1);
    setIsRunning(false);
  };

  return (
    <div className="bg-[#0D0F14] border border-aurum/20 rounded-2xl p-6 shadow-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <h3 className="font-cinzel text-base font-semibold tracking-wider text-marble">
            INTERACTIVE CONFORMANCE SIMULATOR
          </h3>
          <p className="text-xs font-mono text-ash mt-1">
            Simulate synthetic mempool stalls and step through Sentinel's 6-phase autonomous recovery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono text-ash hover:text-marble bg-void-2 border border-white/[0.06] hover:border-white/[0.15] transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={runSimulation}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-mono font-semibold bg-gradient-to-r from-aurum to-aurum-light text-void hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_4px_16px_rgba(201,169,97,0.3)]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? "Simulating…" : "Run Conformance Suite"}</span>
          </button>
        </div>
      </div>

      {/* Progress timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {steps.map((s) => {
          const isDone = s.step < currentStep;
          const isCurrent = s.step === currentStep;

          return (
            <div
              key={s.step}
              className={`p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                isCurrent
                  ? "bg-[#161410] border-aurum/70 shadow-[0_0_20px_rgba(201,169,97,0.15)]"
                  : isDone
                  ? "bg-[#0E1117] border-white/[0.08]"
                  : "bg-void/40 border-white/[0.03] opacity-50"
              }`}
            >
              {isCurrent && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-aurum via-aurum-light to-aurum" />
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-ash">
                  Stage 0{s.step}
                </span>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isCurrent ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-aurum opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-aurum"></span>
                  </span>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-white/[0.1]" />
                )}
              </div>

              <div className="text-xs font-semibold text-marble mb-1 tracking-wide">
                {s.title}
              </div>
              <p className="text-[11px] font-mono text-marble-dim/70 leading-relaxed">
                {s.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Terminal Inspection Box */}
      <div className="bg-[#080A0D] border border-white/[0.08] rounded-xl p-4 font-mono text-xs text-marble-dim/80 space-y-1.5">
        <div className="text-ash text-[10px] tracking-widest uppercase mb-1">
          Telemetry Inspection Output
        </div>
        <div className="text-aurum-light">
          {">"} [SENTINEL::ENGINE] Active Step: {currentStep} / 6
        </div>
        <div className="text-marble-dim">
          {">"} Invariant Assertion: Nonce gap strictly non-decreasing, gas ceiling locked at 25%.
        </div>
        {currentStep >= 5 && (
          <div className="text-emerald-400 flex items-center gap-2">
            <span>{">"} Onchain Resolution Tx:</span>
            <a
              href={getBaseScanTxUrl(sampleTx)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-aurum underline"
            >
              {truncateHash(sampleTx, 8)} (View on BaseScan)
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
