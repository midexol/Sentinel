"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X, ExternalLink } from "lucide-react";

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { label: "Pipelines", href: "/assets" },
    { label: "Integration", href: "/integrate" },
    { label: "Simulation", href: "/simulate" },
    { label: "Security", href: "/security" },
    { label: "Status", href: "/status" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out flex justify-center ${
        scrolled ? "pt-2.5 pb-1 px-3 sm:px-4" : "pt-4 sm:pt-6 pb-3 sm:pb-4 px-4 sm:px-6 md:px-12"
      }`}
    >
      <div
        className={`transition-all duration-300 ease-out flex items-center justify-between relative ${
          scrolled
            ? "w-full max-w-4xl bg-[#000000]/90 backdrop-blur-xl border border-aurum/25 rounded-full px-3.5 sm:px-5 py-2 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.85)]"
            : "w-full max-w-7xl bg-[#000000]/60 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border border-white/[0.08] sm:border-transparent sm:border-b sm:border-white/[0.06] rounded-full sm:rounded-none px-4 sm:px-0 py-2 sm:py-0 sm:pb-4"
        }`}
      >
        {/* Clickable Brand Logo & Name */}
        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-3 group shrink-0"
        >
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-aurum/40 group-hover:border-aurum transition-colors shrink-0">
            <Image
              src="/assets/logo-transparent.png"
              alt="Sentinel Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="font-script text-xl sm:text-2xl text-marble group-hover:text-aurum-light transition-colors tracking-wide">
            Sentinel
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-1.5" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs uppercase tracking-[0.16em] px-3 lg:px-3.5 py-1.5 rounded-full transition-all duration-200 ${
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

        {/* Right CTA & Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/dapp"
            className="flex items-center text-[11px] sm:text-xs uppercase tracking-[0.14em] font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all duration-200 bg-gradient-to-b from-[#ECD79B] to-[#C9A961] hover:from-[#F3E5AB] hover:to-[#D4B574] text-[#07080B] shadow-md hover:-translate-y-0.5 active:translate-y-0 shrink-0"
          >
            <span className="sm:hidden">Observatory</span>
            <span className="hidden sm:inline">Launch Observatory</span>
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-marble-dim hover:text-marble transition-colors focus:outline-none"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-3 top-16 z-50 bg-[#07080A]/95 backdrop-blur-2xl border border-aurum/30 rounded-2xl p-4 shadow-2xl space-y-3">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs uppercase tracking-[0.16em] font-mono transition-colors ${
                    isActive
                      ? "bg-aurum/15 text-aurum font-semibold border border-aurum/30"
                      : "text-marble-dim hover:text-marble hover:bg-white/[0.04]"
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-aurum" />}
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-ash px-2">
            <span>Base Sepolia L2</span>
            <a
              href="https://sepolia.basescan.org"
              target="_blank"
              rel="noreferrer"
              className="text-aurum hover:underline flex items-center gap-1"
            >
              <span>Explorer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
