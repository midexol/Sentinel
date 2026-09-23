"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ArrowLeft, ArrowRight, ExternalLink, ShieldCheck, AlertTriangle, Info, Terminal } from "lucide-react";
import { DocArticle } from "@/lib/docs-data";
import DocsCodeBlock from "@/components/docs-code-block";

interface DocArticleViewerProps {
  article: DocArticle;
}

export default function DocArticleViewer({ article }: DocArticleViewerProps) {
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const handleScroll = () => {
      const headings = article.sections.map((s) => document.getElementById(s.id)).filter(Boolean);
      const scrollPos = window.scrollY + 120;

      for (let i = headings.length - 1; i >= 0; i--) {
        const el = headings[i];
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(el.id);
          return;
        }
      }
      if (article.sections[0]) {
        setActiveSection(article.sections[0].id);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [article]);

  // Helper to parse content chunks (markdown-like headers, code blocks, lists, callouts)
  const renderFormattedContent = (raw: string) => {
    // Split by code blocks first
    const parts = raw.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```")) {
        const firstLineEnd = part.indexOf("\n");
        const lang = part.slice(3, firstLineEnd).trim() || "bash";
        const code = part.slice(firstLineEnd + 1, -3);
        return <DocsCodeBlock key={index} language={lang} code={code} />;
      }

      // Process lines for headings, callouts, lists, and tables
      const lines = part.split("\n");
      const elements: React.ReactNode[] = [];
      let currentTable: string[] = [];

      lines.forEach((line, lineIdx) => {
        const trimmed = line.trim();

        // Check if table row
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
          currentTable.push(trimmed);
          return;
        } else if (currentTable.length > 0) {
          elements.push(renderTable(currentTable, `table-${lineIdx}`));
          currentTable = [];
        }

        // H3 (mapped to doc section anchor)
        if (trimmed.startsWith("### ")) {
          const title = trimmed.replace("### ", "").trim();
          // Find matching section id
          const sec = article.sections.find(
            (s) => s.title.toLowerCase().replace(/[^a-z0-9]/g, "") === title.toLowerCase().replace(/[^a-z0-9]/g, "")
          );
          const anchorId = sec ? sec.id : title.toLowerCase().replace(/\s+/g, "-");

          elements.push(
            <h3
              key={`h3-${lineIdx}`}
              id={anchorId}
              className="text-lg sm:text-xl font-semibold text-white mt-10 mb-4 pt-6 border-t border-white/[0.06] first:border-0 first:pt-0 scroll-mt-24 flex items-center gap-2 group"
            >
              <a href={`#${anchorId}`} className="hover:text-[#C9A961] transition-colors">
                {title}
              </a>
              <span className="opacity-0 group-hover:opacity-100 text-[#C9A961] text-sm transition-opacity">
                #
              </span>
            </h3>
          );
          return;
        }

        // Horizontal Rule
        if (trimmed === "---") {
          elements.push(<hr key={`hr-${lineIdx}`} className="my-8 border-white/[0.06]" />);
          return;
        }

        // Callouts
        if (trimmed.startsWith("> ")) {
          const quoteText = trimmed.replace("> ", "");
          elements.push(
            <div
              key={`quote-${lineIdx}`}
              className="my-4 p-4 rounded-xl border border-[rgba(201,169,97,0.25)] bg-[#C9A961]/5 flex items-start gap-3 text-sm text-[#EDE9E1]"
            >
              <ShieldCheck className="w-5 h-5 text-[#C9A961] shrink-0 mt-0.5" />
              <div className="leading-relaxed font-sans">{quoteText}</div>
            </div>
          );
          return;
        }

        // Bullet point
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const bullet = trimmed.slice(2);
          elements.push(
            <div key={`li-${lineIdx}`} className="flex items-start gap-2.5 my-2 text-sm text-[#C2BEB4] leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A961] mt-2 shrink-0" />
              <div>{renderInlineFormatting(bullet)}</div>
            </div>
          );
          return;
        }

        // Numbered list
        if (/^\d+\.\s/.test(trimmed)) {
          const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
          if (numMatch) {
            elements.push(
              <div key={`num-${lineIdx}`} className="flex items-start gap-3 my-2 text-sm text-[#C2BEB4] leading-relaxed">
                <span className="text-xs font-mono font-bold text-[#C9A961] px-1.5 py-0.5 rounded bg-white/[0.06]">
                  {numMatch[1]}
                </span>
                <div>{renderInlineFormatting(numMatch[2])}</div>
              </div>
            );
            return;
          }
        }

        // Regular paragraph
        if (trimmed !== "") {
          elements.push(
            <p key={`p-${lineIdx}`} className="my-3 text-sm sm:text-[15px] leading-relaxed text-[#A8A49C]">
              {renderInlineFormatting(trimmed)}
            </p>
          );
        }
      });

      if (currentTable.length > 0) {
        elements.push(renderTable(currentTable, `table-end`));
      }

      return <div key={index}>{elements}</div>;
    });
  };

  const renderInlineFormatting = (text: string) => {
    // Replace **bold** with <strong>
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="text-white font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="font-mono text-xs text-[#C9A961] bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.06]">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("[") && part.includes("](")) {
        const match = part.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          return (
            <Link key={i} href={match[2]} className="text-[#C9A961] hover:underline font-medium">
              {match[1]}
            </Link>
          );
        }
      }
      return part;
    });
  };

  const renderTable = (rows: string[], key: string) => {
    if (rows.length < 2) return null;
    const headerRow = rows[0].split("|").filter((c) => c.trim() !== "");
    const bodyRows = rows.slice(2).map((r) => r.split("|").filter((c) => c.trim() !== ""));

    return (
      <div key={key} className="my-6 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#07080A]">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-[#000000] border-b border-white/[0.08] text-[#8A867D] font-mono uppercase text-[11px]">
            <tr>
              {headerRow.map((h, i) => (
                <th key={i} className="py-3 px-4 font-semibold">
                  {h.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {bodyRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-white/[0.02] transition-colors">
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className="py-3 px-4 text-[#C2BEB4] font-sans">
                    {renderInlineFormatting(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex gap-12">
      {/* Article Content */}
      <article className="flex-1 min-w-0 max-w-3xl">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-mono text-[#686660] mb-6">
          <Link href="/docs" className="hover:text-white transition-colors">
            Docs
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-50" />
          <span className="uppercase text-[#8A867D]">{article.category}</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-50" />
          <span className="text-[#C9A961] truncate">{article.title}</span>
        </div>

        {/* Title Header */}
        <div className="space-y-3 pb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white font-sans">
              {article.title}
            </h1>
            {article.badge && (
              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-[#C9A961]/15 text-[#C9A961] border border-[#C9A961]/30">
                {article.badge}
              </span>
            )}
          </div>
          <p className="text-base sm:text-lg text-[#8A867D] leading-relaxed">
            {article.subtitle}
          </p>
        </div>

        {/* Rendered Prose Content */}
        <div className="mt-8 font-sans">
          {renderFormattedContent(article.content)}
        </div>

        {/* Previous / Next Sequential Navigation Cards */}
        <div className="mt-16 pt-8 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-4">
          {article.prev ? (
            <Link
              href={`/docs/${article.prev.slug}`}
              className="group p-4 rounded-xl border border-white/[0.08] hover:border-[#C9A961]/40 bg-[#07080A] hover:bg-[#0D0E12] transition-all flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 text-xs font-mono text-[#686660] group-hover:text-[#C9A961] transition-colors">
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>PREVIOUS</span>
              </div>
              <span className="mt-2 text-sm font-semibold text-white group-hover:text-[#C9A961] transition-colors">
                {article.prev.title}
              </span>
            </Link>
          ) : (
            <div />
          )}

          {article.next ? (
            <Link
              href={`/docs/${article.next.slug}`}
              className="group p-4 rounded-xl border border-white/[0.08] hover:border-[#C9A961]/40 bg-[#07080A] hover:bg-[#0D0E12] transition-all flex flex-col justify-between text-right"
            >
              <div className="flex items-center justify-end gap-2 text-xs font-mono text-[#686660] group-hover:text-[#C9A961] transition-colors">
                <span>NEXT</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <span className="mt-2 text-sm font-semibold text-white group-hover:text-[#C9A961] transition-colors">
                {article.next.title}
              </span>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </article>

      {/* Right Sidebar: "On This Page" Table of Contents */}
      <aside className="hidden xl:block w-64 shrink-0 sticky top-24 self-start space-y-6">
        <div className="space-y-3">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#8A867D]">
            On This Page
          </div>
          <nav className="space-y-1 text-xs font-sans">
            {article.sections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`block py-1 px-2 rounded-md transition-all ${
                    isActive
                      ? "text-[#C9A961] bg-[#C9A961]/10 font-medium translate-x-1"
                      : "text-[#686660] hover:text-[#C2BEB4] hover:bg-white/[0.02]"
                  }`}
                >
                  {section.title}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Quick Protocol Links */}
        <div className="pt-6 border-t border-white/[0.06] space-y-2 text-xs font-mono text-[#686660]">
          <div className="text-[11px] font-semibold text-[#8A867D] uppercase">
            Protocol Resources
          </div>
          <a
            href="https://sepolia.basescan.org"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between text-[#8A867D] hover:text-[#C9A961] transition-colors py-0.5"
          >
            <span>BaseScan Sepolia</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          <a
            href="https://docs.base.org"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between text-[#8A867D] hover:text-[#C9A961] transition-colors py-0.5"
          >
            <span>Base Official Docs</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          <a
            href="https://github.com/midexol/Sentinel"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between text-[#8A867D] hover:text-[#C9A961] transition-colors py-0.5"
          >
            <span>GitHub Repository</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      </aside>
    </div>
  );
}
