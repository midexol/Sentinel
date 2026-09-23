"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X, FileText, ChevronRight } from "lucide-react";
import { DOCS_ARTICLES } from "@/lib/docs-data";

interface DocsSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DocsSearchModal({ isOpen, onClose }: DocsSearchModalProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: {
      slug: string;
      title: string;
      subtitle: string;
      category: string;
      matchedSection?: string;
    }[] = [];

    Object.values(DOCS_ARTICLES).forEach((article) => {
      const titleMatch = article.title.toLowerCase().includes(q);
      const subtitleMatch = article.subtitle.toLowerCase().includes(q);
      const contentMatch = article.content.toLowerCase().includes(q);

      const sectionMatch = article.sections.find((s) =>
        s.title.toLowerCase().includes(q)
      );

      if (titleMatch || subtitleMatch || contentMatch || sectionMatch) {
        results.push({
          slug: article.slug,
          title: article.title,
          subtitle: article.subtitle,
          category: article.category,
          matchedSection: sectionMatch?.title,
        });
      }
    });

    return results;
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (slug: string) => {
    onClose();
    router.push(`/docs/${slug}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[#07080A] border border-[rgba(201,169,97,0.25)] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] gap-3 bg-[#0D0E12]">
          <Search className="w-5 h-5 text-[#C9A961] shrink-0" />
          <input
            type="text"
            placeholder="Search documentation, invariants, SDK guide..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent border-0 text-white placeholder-[#686660] text-sm font-sans focus:outline-none focus:ring-0"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/[0.08] text-[#8A867D] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-white/[0.04]">
          {query.trim() === "" ? (
            <div className="p-8 text-center text-xs text-[#686660] font-mono">
              Type keywords to search Sentinel technical documentation...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8A867D] font-mono">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            searchResults.map((item) => (
              <button
                key={item.slug}
                onClick={() => handleSelect(item.slug)}
                className="w-full text-left p-3 rounded-xl hover:bg-white/[0.04] transition-colors flex items-center justify-between group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white/[0.04] text-[#C9A961] mt-0.5 group-hover:bg-[#C9A961]/10 transition-colors">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white group-hover:text-[#C9A961] transition-colors">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/[0.06] text-[#8A867D]">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#8A867D] line-clamp-1 mt-0.5">
                      {item.matchedSection ? `Section: ${item.matchedSection}` : item.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#686660] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </button>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-[#000000] border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#686660] font-mono">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[#EDE9E1]">ESC</kbd>
            <span>to close</span>
          </div>
          <span className="text-[#C9A961]">Sentinel Docs Engine</span>
        </div>
      </div>
    </div>
  );
}
