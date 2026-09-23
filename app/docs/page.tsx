import React from "react";
import { Metadata } from "next";
import { DOCS_ARTICLES } from "@/lib/docs-data";
import DocArticleViewer from "@/components/doc-article-viewer";

export const metadata: Metadata = {
  title: "Introduction | Sentinel Documentation",
  description:
    "Autonomous Nonce-Gap Watchdog & Self-Healing Mempool Pipeline for High-Frequency Trading on Base L2",
};

export default function DocsIndexPage() {
  const article = DOCS_ARTICLES["introduction"];
  return <DocArticleViewer article={article} />;
}
