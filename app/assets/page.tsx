"use client";

import React from "react";
import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import SiteAtmosphere from "@/components/site-atmosphere";
import { truncateAddress, formatEther, getBaseScanAddressUrl } from "@/lib/viem";
import { RiExternalLinkLine, RiBankLine } from "react-icons/ri";

const keystores = [
  {
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    name: "Prime Arbitrage Pipeline Alpha",
    dexTarget: "Aerodrome / Uniswap v3",
    balanceWei: "4820000000000000000",
    status: "HEALTHY",
    minedNonce: 1420,
    pendingNonce: 1420,
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    name: "High-Frequency Market Maker Beta",
    dexTarget: "Seamless / Moonwell",
    balanceWei: "12500000000000000000",
    status: "HEALTHY",
    minedNonce: 8840,
    pendingNonce: 8840,
  },
  {
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    name: "Flash Liquidator Gamma",
    dexTarget: "Aave v3 (Base)",
    balanceWei: "850000000000000000",
    status: "HEALTHY",
    minedNonce: 304,
    pendingNonce: 304,
  },
];

export default function AssetsPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-marble relative overflow-hidden font-sans selection:bg-aurum/20 selection:text-aurum-light">
      <SiteAtmosphere />
      <SiteHeader />

      <main className="pt-36 md:pt-44 pb-24 px-6 max-w-7xl mx-auto relative z-10 space-y-12">
        <div className="max-w-3xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#C9A961]">
            <RiBankLine className="w-3.5 h-3.5 text-[#C9A961]" />
            <span>Registered Execution Keystores</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif text-white font-medium tracking-tight">
            Monitored Keystores & Pipelines
          </h1>
          <p className="text-sm sm:text-base text-[#C2BEB4] font-light leading-relaxed">
            Institutional trading bots on Base L2 register their public addresses with Sentinel. The autonomous watchdog monitors mempool state, Flashblock transactions, and sequencer queues to prevent stalled execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {keystores.map((k) => (
            <div
              key={k.address}
              className="rounded-2xl bg-[#07080A] border border-white/[0.08] hover:border-[#C9A961]/35 p-6 shadow-sm flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase text-[#8FAF92]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8FAF92]" />
                    {k.status}
                  </span>
                  <a
                    href={getBaseScanAddressUrl(k.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#686660] hover:text-[#C9A961] transition-colors"
                    title="View on BaseScan Explorer"
                  >
                    <RiExternalLinkLine className="w-4 h-4" />
                  </a>
                </div>

                <h3 className="font-serif text-xl font-medium text-white mb-1">
                  {k.name}
                </h3>
                <p className="text-xs font-mono text-[#686660] mb-4">
                  Target: {k.dexTarget}
                </p>

                <div className="space-y-2.5 pt-4 border-t border-white/[0.06] font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#686660]">Address:</span>
                    <span className="text-white font-mono">{truncateAddress(k.address)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#686660]">Mined Nonce:</span>
                    <span className="text-[#C9A961] font-semibold">#{k.minedNonce}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#686660]">Balance:</span>
                    <span className="text-white">{formatEther(k.balanceWei)} ETH</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06]">
                <Link
                  href="/dapp"
                  className="flex items-center justify-between text-xs font-mono text-[#C9A961] hover:text-white font-semibold transition-colors"
                >
                  <span>Open in Observatory</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
