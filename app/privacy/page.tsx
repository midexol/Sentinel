import React from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';
import SiteAtmosphere from '@/components/site-atmosphere';
import { Shield, EyeOff, KeyRound, Server, HardDrive, FileText } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy : Sentinel Autonomous Nonce Watchdog',
  description: 'Privacy Policy and non-custodial cryptographic disclosures for Sentinel on Base L2.',
};

export default function PrivacyPolicyPage() {
  const sections = [
    {
      icon: KeyRound,
      title: '1. Non-Custodial Architecture & Zero Key Transmission',
      content:
        'Sentinel is designed from first principles as non-custodial middleware. Private keys, signing credentials, and API secrets configured by operators remain strictly within the operator local execution environment or browser runtime. Sentinel never transmits, logs, or exports private keys to external servers or third-party cloud infrastructure.',
    },
    {
      icon: EyeOff,
      title: '2. Personal Data We Do Not Collect',
      content:
        'Sentinel does not require, request, or store any Personally Identifiable Information (PII). We do not collect names, email addresses, phone numbers, physical locations, or government-issued identifiers. Interactions with the software are entirely pseudonymous and anchored to public cryptographic addresses.',
    },
    {
      icon: Server,
      title: '3. Public Blockchain Telemetry',
      content:
        'To monitor for mempool transaction gaps, Sentinel reads public on-chain state from Base L2 via standard JSON-RPC queries (including eth_getTransactionCount, eth_getBlockByNumber, and eth_getTransactionReceipt). Public wallet addresses and transaction hashes processed by the observatory console are inherently public on the Base blockchain ledger.',
    },
    {
      icon: HardDrive,
      title: '4. Local Storage & In-Memory State',
      content:
        'The Sentinel Observatory interface stores operator preferences (such as polling intervals, gas ceiling parameters, and alert thresholds) locally within settings.json or browser LocalStorage. This data is never monetized, synchronized to marketing trackers, or shared with data brokers.',
    },
    {
      icon: Shield,
      title: '5. Webhook Alerts & Operator Control',
      content:
        'When failure alerts or circuit breaker notifications are configured, payloads are dispatched directly to the operator specified endpoint (e.g. Discord, Slack, or Telegram webhook). Operators maintain unilateral control to modify, disable, or clear webhook endpoints at any time through Settings.',
    },
    {
      icon: FileText,
      title: '6. Zero Tracking Cookies & Advertising Pixels',
      content:
        'The Sentinel application does not use commercial advertising cookies, tracking pixels, behavioral telemetry SDKs, or third-party marketing scripts. Our telemetry streams are strictly functional and dedicated to monitoring real-time block progression and nonce sequence integrity.',
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#000000] text-marble selection:bg-aurum/20 selection:text-aurum-light font-sans overflow-x-hidden flex flex-col justify-between">
      <SiteAtmosphere />
      <SiteHeader />

      <main className="relative z-10 pt-36 md:pt-44 pb-24 px-6 max-w-5xl mx-auto w-full space-y-12">
        <div className="space-y-4 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B0D11]/90 border border-aurum/30 text-xs font-mono text-aurum shadow-sm">
            <Shield className="w-3.5 h-3.5" />
            <span>Institutional Governance</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-semibold tracking-tight text-marble">
            Privacy Policy
          </h1>
          <p className="font-sans text-marble-dim/80 text-base leading-relaxed max-w-3xl">
            Last updated: September 2026. This policy describes our uncompromising commitment to non-custodial cryptography, zero personal data retention, and open-source transparency on Base L2.
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <div
                key={idx}
                className="bg-[#07080A]/95 border border-white/[0.08] hover:border-aurum/30 transition-all rounded-2xl p-6 md:p-8 shadow-xl space-y-3 backdrop-blur-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-aurum/10 border border-aurum/30 flex items-center justify-center text-aurum shrink-0">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <h2 className="font-serif text-lg md:text-xl font-medium text-marble">
                    {sec.title}
                  </h2>
                </div>
                <p className="font-sans text-marble-dim/85 text-sm md:text-base leading-relaxed pl-12">
                  {sec.content}
                </p>
              </div>
            );
          })}
        </div>

        <div className="p-8 rounded-2xl bg-[#07080A]/95 border border-aurum/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl backdrop-blur-xl">
          <div>
            <h3 className="font-serif text-xl font-medium text-marble">
              Verify Nonce Pipeline in Observatory
            </h3>
            <p className="text-xs md:text-sm text-marble-dim/80 mt-1 font-sans">
              Explore live Base Sepolia telemetry with zero tracking and full operator sovereignty.
            </p>
          </div>
          <Link
            href="/dapp"
            className="px-6 py-3 rounded-xl bg-gradient-to-b from-[#ECD79B] to-[#C9A961] hover:from-[#F3E5AB] hover:to-[#D4B574] text-[#07080B] font-semibold text-xs font-mono transition-all shrink-0 shadow-lg shadow-aurum/20"
          >
            Launch Observatory
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
