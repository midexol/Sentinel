import React from "react";
import Link from "next/link";
import SiteHeader from "@/components/site-header";
import { truncateAddress, formatEther, getBaseScanAddressUrl } from "@/lib/viem";
import { ShieldCheck, ExternalLink, Cpu, Database } from "lucide-react";

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
    <div className="min-h-screen bg-void text-marble selection:bg-aurum/20 selection:text-aurum-light">
      <SiteHeader />

      <main className="pt-36 md:pt-44 pb-24 px-6 max-w-7xl mx-auto">
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-void-2 border border-aurum/30 text-xs font-mono mb-4 text-aurum">
            <Database className="w-3.5 h-3.5" />
            <span>Monitored Assets & Keystores</span>
          </div>
          <h1 className="font-cinzel text-3xl sm:text-5xl font-bold tracking-wide text-marble">
            REGISTERED EXECUTION KEYSTORES
          </h1>
          <p className="mt-4 font-sans text-marble-dim/80 text-base leading-relaxed">
            Institutional trading bots on Base L2 register their public addresses with Sentinel. The watchdog continuously polls local mempools and the Base sequencer to protect against deadlocks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {keystores.map((k) => (
            <div
              key={k.address}
              className="bg-[#0C0E14] border border-aurum/20 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-aurum/50 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {k.status}
                  </span>
                  <a
                    href={getBaseScanAddressUrl(k.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ash hover:text-aurum transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <h3 className="font-cinzel text-base font-semibold text-marble mb-1">
                  {k.name}
                </h3>
                <p className="text-xs font-mono text-ash mb-4">
                  Target: {k.dexTarget}
                </p>

                <div className="space-y-2 pt-3 border-t border-white/[0.06] font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-ash">Address:</span>
                    <span className="text-marble">{truncateAddress(k.address)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ash">Mined Nonce:</span>
                    <span className="text-aurum">#{k.minedNonce}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ash">Balance:</span>
                    <span className="text-marble">{formatEther(k.balanceWei)} ETH</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06]">
                <Link
                  href="/dapp"
                  className="flex items-center justify-between text-xs font-mono text-aurum group-hover:text-aurum-light"
                >
                  <span>Open in Observatory</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
