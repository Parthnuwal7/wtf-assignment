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
  matchedContent: string;
  content: string;
};

const MAX_MATCHED_CONTENT_CHARACTERS = 3_000;
const MATCH_STOP_WORDS = new Set([
  "about", "after", "also", "and", "are", "but", "can", "does", "for",
  "from", "have", "how", "into", "its", "not", "that", "the", "their",
  "this", "was", "what", "when", "where", "which", "with", "you", "your",
]);

function matchTerms(value: string): string[] {
  return [...new Set(value.toLowerCase().replace(/<[^>]+>/g, " ").match(/[a-z0-9]+/g) ?? [])]
    .filter((term) => term.length >= 3 && !MATCH_STOP_WORDS.has(term));
}

function relevantArticleContent(content: string, result: SearchResult): string {
  const blocks = content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const matches = [
    ...(result.matchedSections ?? []).flatMap((section) => [section.title, section.excerpt]),
    result.excerpt,
  ].filter((value): value is string => Boolean(value));
  const selectedIndexes = new Set<number>();
  const searchTerms = (result.searchTerms ?? [])
    .filter((term) => term.length >= 3 && !MATCH_STOP_WORDS.has(term));

  for (const match of matches.slice(0, 4)) {
    const excerptTerms = matchTerms(match);
    const terms = [...new Set([...searchTerms, ...excerptTerms])];
    if (terms.length === 0) continue;

    let bestIndex = -1;
    let bestScore = 0;
    blocks.forEach((block, index) => {
      const normalizedBlock = block.toLowerCase();
      const score = terms.reduce(
        (total, term) => total + (normalizedBlock.includes(term)
          ? searchTerms.includes(term) ? 20 : Math.min(term.length, 8)
          : 0),
        0,
      );
      if (score > bestScore) {
        bestIndex = index;
        bestScore = score;
      }
    });

    if (bestIndex < 0 || bestScore === 0) continue;
    let headingIndex = bestIndex;
    while (headingIndex > 0 && !blocks[headingIndex].startsWith("#")) headingIndex -= 1;
    if (blocks[headingIndex]?.startsWith("#")) selectedIndexes.add(headingIndex);
    if (bestIndex > 0 && !blocks[bestIndex - 1].startsWith("#")) selectedIndexes.add(bestIndex - 1);
    selectedIndexes.add(bestIndex);
    if (bestIndex + 1 < blocks.length && !blocks[bestIndex + 1].startsWith("#")) selectedIndexes.add(bestIndex + 1);
  }

  const selected = [...selectedIndexes]
    .sort((left, right) => left - right)
    .map((index) => blocks[index])
    .join("\n\n");
  if (selected) return selected.slice(0, MAX_MATCHED_CONTENT_CHARACTERS).trimEnd();

  const excerptFallback = matches.join("\n\n").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return (excerptFallback || content).slice(0, MAX_MATCHED_CONTENT_CHARACTERS).trimEnd();
}

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
      matchedContent: relevantArticleContent(content, result),
      content,
    };
  } catch {
    return null;
  }
}
