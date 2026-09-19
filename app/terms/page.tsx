import React from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/site-header';
import { Scale, ShieldAlert, Cpu, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service : Sentinel Autonomous Nonce Watchdog',
  description: 'Terms of Service and operator agreements for Sentinel on Base L2.',
};

export default function TermsOfServicePage() {
  const terms = [
    {
      icon: Cpu,
      title: '1. Autonomous Software License & Non-Custodial Nature',
      content:
        'Sentinel is an open-source decentralized watchdog and interceptor provided to trading agents, algorithmic market makers, and web3 developers. Sentinel is completely non-custodial; it does not custody, hold, broker, or clear digital assets on behalf of operators.',
    },
    {
      icon: ShieldAlert,
      title: '2. Gas Bump Safety Clamping & Autonomous Execution',
      content:
        'Operators acknowledge that Sentinel autonomously calculates and submits transaction replacement gas fees within configured bounds (MIN_GAS_BUMP_PCT and MAX_GAS_BUMP_PCT). Operators are solely responsible for setting gas ceilings and failure thresholds that align with their risk tolerances.',
    },
    {
      icon: AlertTriangle,
      title: '3. Mempool Volatility & Network Conditions',
      content:
        'Blockchain networks, including Base L2 and underlying settlement layers, are subject to latency variations, reorganizations, gas price fluctuations, and validator ordering dynamics. While Sentinel provides active eviction detection and nonce sequence healing, no software can guarantee instantaneous inclusion during severe network congestion.',
    },
    {
      icon: CheckCircle2,
      title: '4. Operator Keystore Responsibility',
      content:
        'Operators are exclusively responsible for maintaining the physical and digital security of their private keys, mnemonic seeds, and RPC endpoints. Sentinel will never request private keys over unencrypted channels or prompt operators for seed phrase disclosures.',
    },
    {
      icon: Scale,
      title: '5. Limitation of Liability & No Financial Advice',
      content:
        "Sentinel and its contributors provide this software on an 'as is' and 'as available' basis without warranties of any kind. Sentinel does not provide financial, legal, trading, or investment advice. Operators deploy Sentinel at their own discretion and sole risk.",
    },
  ];

  return (
    <div className="min-h-screen bg-void text-marble selection:bg-aurum/20 selection:text-aurum-light font-sans">
      <SiteHeader />

      <main className="pt-36 md:pt-44 pb-24 px-6 max-w-5xl mx-auto space-y-12">
        <div className="space-y-4 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-void-2 border border-aurum/30 text-xs font-mono text-aurum">
            <Scale className="w-3.5 h-3.5" />
            <span>Legal Framework</span>
          </div>
          <h1 className="font-cinzel text-3xl sm:text-5xl font-bold tracking-wide text-marble">
            TERMS OF SERVICE
          </h1>
          <p className="font-sans text-marble-dim/80 text-base leading-relaxed max-w-3xl">
            Last updated: September 2026. Please review these operational terms governing the deployment and execution of the Sentinel autonomous nonce pipeline on Base L2.
          </p>
        </div>

        <div className="space-y-6">
          {terms.map((term, idx) => {
            const Icon = term.icon;
            return (
              <div
                key={idx}
                className="bg-[#0C0E14] border border-aurum/20 rounded-2xl p-6 md:p-8 shadow-xl space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-aurum/10 border border-aurum/30 flex items-center justify-center text-aurum shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2 className="font-cinzel text-lg md:text-xl font-semibold text-marble">
                    {term.title}
                  </h2>
                </div>
                <p className="font-sans text-marble-dim/85 text-sm md:text-base leading-relaxed pl-11">
                  {term.content}
                </p>
              </div>
            );
          })}
        </div>

        <div className="p-8 rounded-2xl bg-gradient-to-r from-aurum/10 via-void-2 to-void-2 border border-aurum/35 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-cinzel text-lg font-bold text-marble">
              Review Security Invariants
            </h3>
            <p className="text-xs md:text-sm text-marble-dim/80 mt-1 font-sans">
              Read about the strict monotonicity guarantees and mathematical gas ceilings.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/security"
              className="px-5 py-2.5 rounded-full border border-aurum/40 text-aurum hover:bg-aurum/10 text-xs font-mono transition-all"
            >
              Security Model
            </Link>
            <Link
              href="/dapp"
              className="px-6 py-2.5 rounded-full bg-aurum hover:bg-aurum-light text-void font-semibold text-xs font-mono transition-all"
            >
              Launch Observatory
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
