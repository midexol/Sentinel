"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Assets", href: "/assets" },
    { label: "CLI Daemon", href: "/#cli" },
    { label: "Simulate", href: "/simulate" },
    { label: "Security", href: "/security" },
    { label: "Status", href: "/status" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out flex justify-center ${
        scrolled ? "pt-3 pb-1 px-4" : "pt-6 pb-4 px-6 md:px-12"
      }`}
    >
      <div
        className={`transition-all duration-500 ease-out flex items-center justify-between ${
          scrolled
            ? "w-full max-w-4xl bg-[#000000]/85 backdrop-blur-xl border border-aurum/25 rounded-full px-5 py-2.5 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.85)]"
            : "w-full max-w-7xl bg-transparent border-b border-white/[0.06] pb-4"
        }`}
      >
        {/* Clickable Brand Logo & Name */}
        <Link
          href="/"
          className="flex items-center gap-3 group transition-transform duration-300 "
        >
          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-aurum/40  group-hover:border-aurum transition-colors">
            <Image
              src="/assets/logo-transparent.png"
              alt="Sentinel Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="font-script text-2xl text-marble group-hover:text-aurum-light transition-colors tracking-wide">
            Sentinel
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                  isActive
                    ? "text-aurum bg-aurum/10 border border-aurum/30 font-medium"
                    : "text-marble-dim hover:text-marble hover:bg-white/[0.04]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Button: Launch Observatory */}
        <div className="flex items-center gap-3">
          <Link
            href="/dapp"
            className="flex items-center text-xs uppercase tracking-[0.16em] font-medium px-4 py-2 rounded-full transition-all duration-300 bg-gradient-to-b from-[#ECD79B] to-[#C9A961] hover:from-[#F3E5AB] hover:to-[#D4B574] text-[#07080B] font-medium shadow-md transition-all"
          >
            <span>Launch Observatory</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
