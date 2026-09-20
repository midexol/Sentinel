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
      id="site-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out flex justify-center ${
        scrolled ? "py-2 px-3 sm:px-4" : "py-3 sm:py-4 px-4 sm:px-6"
      }`}
    >
      <div
        className={`transition-all duration-300 ease-out flex items-center justify-between gap-3 py-2 px-3.5 sm:px-5 rounded-full relative ${
          scrolled
            ? "max-w-[860px] w-full bg-[#000000]/90 backdrop-blur-xl border border-aurum/25 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.85)]"
            : "max-w-[1200px] w-full bg-[#000000]/70 backdrop-blur-lg border border-white/[0.08]"
        }`}
      >
        {/* Brand Logo & Name */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group shrink-0"
        >
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-[#C9A961]/40 group-hover:border-[#C9A961] transition-colors shrink-0">
            <Image
              src="/assets/logo-transparent.png"
              alt="Sentinel Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="font-script text-xl sm:text-2xl text-white tracking-wide">
            Sentinel
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 ml-auto" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[13px] px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                  isActive
                    ? "text-[#C9A961] bg-[#C9A961]/10 border border-[#C9A961]/30 font-medium"
                    : "text-[#C2BEB4] hover:text-[#F5F3EF] hover:bg-white/[0.08]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA & Mobile Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/dapp"
            className="inline-flex items-center px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs font-mono font-medium transition-all bg-gradient-to-b from-[#ECD79B] to-[#C9A961] hover:from-[#F3E5AB] hover:to-[#D4B574] text-[#07080B] shadow-md hover:-translate-y-0.5 active:translate-y-0 shrink-0"
          >
            <span className="sm:hidden">Observatory</span>
            <span className="hidden sm:inline">Launch Observatory</span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-[#C2BEB4] hover:text-white transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-3 top-16 z-50 bg-[#07080A]/95 backdrop-blur-2xl border border-aurum/30 rounded-2xl p-4 shadow-2xl space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-xl transition-colors ${
                    isActive
                      ? "bg-aurum/15 text-aurum font-semibold border border-aurum/30"
                      : "bg-white/[0.03] hover:bg-white/[0.08] text-[#C2BEB4] hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/dapp"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl bg-aurum/10 text-aurum border border-aurum/30 transition-colors font-semibold"
            >
              Observatory
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
