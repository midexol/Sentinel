"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  RiSearchLine,
  RiMenu4Line,
  RiCloseLine,
  RiExternalLinkLine,
  RiBookOpenLine,
  RiShieldLine,
  RiStackLine,
  RiCodeSSlashLine,
  RiQuestionLine,
} from "react-icons/ri";
import { DOCS_CATEGORIES } from "@/lib/docs-data";
import DocsSearchModal from "@/components/docs-search-modal";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const pathname = usePathname();

  const getCategoryIcon = (categoryTitle: string) => {
    switch (categoryTitle) {
      case "GETTING STARTED":
        return RiBookOpenLine;
      case "CORE CONCEPTS":
        return RiStackLine;
      case "INTEGRATION & SDK":
        return RiCodeSSlashLine;
      case "SECURITY & AUTHORITY":
        return RiShieldLine;
      default:
        return RiQuestionLine;
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#EDE9E1] font-sans selection:bg-[#C9A961]/30 selection:text-[#FFF]">
      {/* Top Docs Header */}
      <header className="sticky top-0 z-40 w-full h-16 border-b border-white/[0.08] bg-[#000000]/85 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#C2BEB4] hover:text-white hover:bg-white/[0.06]"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <RiCloseLine className="w-5 h-5" /> : <RiMenu4Line className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-7 h-7 rounded-full overflow-hidden border border-[#C9A961]/40 group-hover:border-[#C9A961] transition-colors shrink-0">
              <Image
                src="/assets/logo-transparent.png"
                alt="Sentinel"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="font-script text-xl text-white tracking-wide">
              Sentinel
            </span>
          </Link>

          <span className="text-[#3A3835]">/</span>

          <Link
            href="/docs"
            className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-[#C9A961]/10 text-[#C9A961] border border-[#C9A961]/25 hover:bg-[#C9A961]/20 transition-colors"
          >
            Docs
          </Link>
        </div>

        {/* Center Search Input Trigger */}
        <div className="hidden sm:flex flex-1 max-w-md mx-4">
          <button
            onClick={() => setSearchModalOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-full border border-white/[0.08] bg-[#07080A] hover:border-[#C9A961]/40 text-[#8A867D] hover:text-[#C2BEB4] transition-all text-xs font-mono group shadow-inner"
          >
            <div className="flex items-center gap-2">
              <RiSearchLine className="w-3.5 h-3.5 text-[#C9A961]/70 group-hover:text-[#C9A961]" />
              <span>Search documentation...</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#686660]">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.06]">
                ⌘K
              </kbd>
            </div>
          </button>
        </div>

        {/* Right Action Links */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchModalOpen(true)}
            className="sm:hidden p-2 rounded-lg text-[#C2BEB4] hover:text-white hover:bg-white/[0.06]"
            aria-label="Search"
          >
            <RiSearchLine className="w-4 h-4 text-[#C9A961]" />
          </button>

          <a
            href="https://github.com/midexol/Sentinel"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:flex items-center gap-1.5 text-xs font-mono text-[#8A867D] hover:text-white transition-colors"
          >
            <span>GitHub</span>
            <RiExternalLinkLine className="w-3 h-3 opacity-60" />
          </a>

          <Link
            href="/dapp"
            className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all bg-gradient-to-b from-[#ECD79B] to-[#C9A961] hover:from-[#F3E5AB] hover:to-[#D4B574] text-[#07080B] shadow-md hover:-translate-y-0.5"
          >
            <span className="hidden sm:inline">Observatory</span>
            <span className="sm:hidden">App</span>
          </Link>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div className="max-w-[1440px] mx-auto flex">
        {/* Left Sidebar - Desktop */}
        <aside className="hidden md:block w-72 shrink-0 border-r border-white/[0.06] min-h-[calc(100vh-4rem)] sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-5 space-y-6">
          {DOCS_CATEGORIES.map((category) => {
            const Icon = getCategoryIcon(category.title);
            return (
              <div key={category.title} className="space-y-1.5">
                <div className="flex items-center gap-2 px-2.5 py-1 text-[11px] font-mono font-semibold tracking-wider text-[#8A867D] uppercase">
                  <Icon className="w-3.5 h-3.5 text-[#C9A961]/70" />
                  <span>{category.title}</span>
                </div>
                <div className="space-y-0.5">
                  {category.articles.map((item) => {
                    const href = `/docs/${item.slug}`;
                    const isActive =
                      pathname === href || (item.slug === "introduction" && pathname === "/docs");
                    return (
                      <Link
                        key={item.slug}
                        href={href}
                        className={`group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all ${
                          isActive
                            ? "bg-[#C9A961]/10 text-[#C9A961] font-medium border border-[#C9A961]/25"
                            : "text-[#8A867D] hover:text-[#EDE9E1] hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className="truncate">{item.title}</span>
                        {item.badge && (
                          <span
                            className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded ${
                              isActive
                                ? "bg-[#C9A961]/20 text-[#C9A961]"
                                : "bg-white/[0.06] text-[#686660] group-hover:text-[#8A867D]"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="pt-4 border-t border-white/[0.06] space-y-2 text-[11px] font-mono text-[#686660] px-2.5">
            <div className="flex items-center justify-between">
              <span>Network:</span>
              <span className="text-[#C9A961]">Base L2 (Sepolia & Mainnet)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Sequencer:</span>
              <span className="text-[#EDE9E1]">Flashblocks ~200ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Safety Model:</span>
              <span className="text-emerald-400">INV-01-04 Clamped</span>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-black/90 backdrop-blur-md pt-16 px-6 overflow-y-auto">
            <div className="flex justify-end py-2">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg bg-white/[0.06] text-[#C2BEB4]"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6 pb-12">
              {DOCS_CATEGORIES.map((category) => (
                <div key={category.title} className="space-y-2">
                  <div className="text-[11px] font-mono font-semibold tracking-wider text-[#C9A961] uppercase">
                    {category.title}
                  </div>
                  <div className="space-y-1">
                    {category.articles.map((item) => {
                      const href = `/docs/${item.slug}`;
                      const isActive =
                        pathname === href || (item.slug === "introduction" && pathname === "/docs");
                      return (
                        <Link
                          key={item.slug}
                          href={href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`block px-3 py-2 rounded-lg text-sm ${
                            isActive
                              ? "bg-[#C9A961]/15 text-[#C9A961] font-semibold border border-[#C9A961]/30"
                              : "text-[#A8A49C] hover:text-white"
                          }`}
                        >
                          {item.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 lg:px-12 py-8 sm:py-12">
          {children}
        </main>
      </div>

      {/* Global Search Modal */}
      <DocsSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </div>
  );
}
