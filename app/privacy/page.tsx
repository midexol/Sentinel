import React from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/site-header';
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
    <div className="min-h-screen bg-void text-marble selection:bg-aurum/20 selection:text-aurum-light font-sans">
      <SiteHeader />

      <main className="pt-36 md:pt-44 pb-24 px-6 max-w-5xl mx-auto space-y-12">
        <div className="space-y-4 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-void-2 border border-aurum/30 text-xs font-mono text-aurum">
            <Shield className="w-3.5 h-3.5" />
            <span>Institutional Governance</span>
          </div>
          <h1 className="font-cinzel text-3xl sm:text-5xl font-bold tracking-wide text-marble">
            PRIVACY POLICY
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
                className="bg-[#0C0E14] border border-aurum/20 rounded-2xl p-6 md:p-8 shadow-xl space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-aurum/10 border border-aurum/30 flex items-center justify-center text-aurum shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2 className="font-cinzel text-lg md:text-xl font-semibold text-marble">
                    {sec.title}
                  </h2>
                </div>
                <p className="font-sans text-marble-dim/85 text-sm md:text-base leading-relaxed pl-11">
                  {sec.content}
                </p>
              </div>
            );
          })}
        </div>

        <div className="p-8 rounded-2xl bg-gradient-to-r from-aurum/10 via-void-2 to-void-2 border border-aurum/35 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-cinzel text-lg font-bold text-marble">
              Verify Nonce Pipeline in Observatory
            </h3>
            <p className="text-xs md:text-sm text-marble-dim/80 mt-1 font-sans">
              Explore live Base Sepolia telemetry with zero tracking and full operator sovereignty.
            </p>
          </div>
          <Link
            href="/dapp"
            className="px-6 py-3 rounded-full bg-aurum hover:bg-aurum-light text-void font-semibold text-xs font-mono transition-all shrink-0"
          >
            Launch Observatory
          </Link>
        </div>
      </main>
    </div>
  );
}
