import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.08] py-12 px-6 bg-[#000000] text-[#686660] text-xs font-mono relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="relative w-6 h-6 rounded-full overflow-hidden border border-[#C9A961]/40">
            <Image
              src="/assets/logo-transparent.png"
              alt="Sentinel Logo"
              fill
              className="object-contain"
            />
          </div>
          <span className="font-script text-white text-base tracking-wide">
            Sentinel
          </span>
          <span>:</span>
          <span>High-Frequency Nonce Watchdog for Base L2</span>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-[11.5px]">
          <Link href="/privacy" className="hover:text-[#F5F3EF] transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-[#F5F3EF] transition-colors">
            Terms of Service
          </Link>
          <Link href="/security" className="hover:text-[#F5F3EF] transition-colors">
            Security
          </Link>
          <a
            href="https://sepolia.basescan.org"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#C9A961] transition-colors"
          >
            Base Sepolia
          </a>
          <Link href="/dapp" className="text-[#C9A961] hover:underline font-semibold">
            Observatory Console
          </Link>
        </div>
      </div>
    </footer>
  );
}
