"use client";

import React, { useState } from "react";
import { RiCheckLine, RiFileCopyLine } from "react-icons/ri";

interface DocsCodeBlockProps {
  language?: string;
  code: string;
  filename?: string;
}

export default function DocsCodeBlock({ language = "bash", code, filename }: DocsCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="my-5 rounded-xl border border-white/[0.08] bg-[#07080A] overflow-hidden text-sm shadow-xl font-mono">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-[#000000]/60 text-xs text-[#8A867D]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1A1A1E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#1A1A1E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#1A1A1E]" />
          <span className="ml-2 uppercase text-[10px] tracking-widest text-[#C9A961]/80 font-bold">
            {filename || language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[#C2BEB4] hover:text-white transition-colors text-xs"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <RiCheckLine className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <RiFileCopyLine className="w-3.5 h-3.5 opacity-70" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-[#EDE9E1] leading-relaxed">
        <pre className="text-[13px] leading-6 font-mono whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
