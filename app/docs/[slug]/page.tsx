import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { DOCS_ARTICLES } from "@/lib/docs-data";
import DocArticleViewer from "@/components/doc-article-viewer";

interface DocPageProps {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  return Object.keys(DOCS_ARTICLES).map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const article = DOCS_ARTICLES[params.slug];
  if (!article) {
    return {
      title: "Not Found | Sentinel Documentation",
    };
  }
  return {
    title: `${article.title} | Sentinel Documentation`,
    description: article.subtitle,
  };
}

export default function DocSlugPage({ params }: DocPageProps) {
  const article = DOCS_ARTICLES[params.slug];
  if (!article) {
    notFound();
  }

  return <DocArticleViewer article={article} />;
}
