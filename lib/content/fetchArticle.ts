import "server-only";

import { extractArticleText, MIN_ARTICLE_CHARACTERS } from "./extractArticle";
import type { SearchResult } from "@/lib/search/types";

const TARGET_ORIGIN = "https://looksmaxxing.guide";

export type RetrievedSource = {
  id: number;
  title: string;
  url: string;
  score: number;
  excerpt?: string;
  content: string;
};

export async function fetchArticle(result: SearchResult, id: number): Promise<RetrievedSource | null> {
  const url = new URL(result.url, TARGET_ORIGIN);
  if (url.origin !== TARGET_ORIGIN) return null;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Looksmaxxing research prototype" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html")) return null;

    const content = extractArticleText(await response.text());
    if (content.length < MIN_ARTICLE_CHARACTERS) return null;

    return {
      id,
      title: result.title?.trim() || "Untitled source",
      url: `${url.pathname}${url.search}${url.hash}`,
      score: result.score,
      excerpt: result.excerpt,
      content,
    };
  } catch {
    return null;
  }
}
