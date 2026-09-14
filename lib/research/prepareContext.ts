import "server-only";

import { planRetrieval } from "@/lib/ai/planner";
import type { RetrievalPlan } from "@/lib/ai/types";
import { fetchArticle, type RetrievedSource } from "@/lib/content/fetchArticle";
import { looksmaxServerPagefindProvider } from "@/lib/search/pagefind-server";
import type { SearchResult } from "@/lib/search/types";

const MAX_SELECTED_SOURCES = 8;

export type PreparedResearchContext = {
  question: string;
  plan: RetrievalPlan;
  retrieval: {
    totalResults: number;
    selectedSources: RetrievedSource[];
    failedUrls: string[];
    totalExtractedCharacters: number;
  };
};

function selectTopUniqueResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const selected: SearchResult[] = [];

  for (const result of results) {
    const key = new URL(result.url, "https://looksmaxxing.guide").pathname;
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(result);
    if (selected.length === MAX_SELECTED_SOURCES) break;
  }

  return selected;
}

export async function prepareResearchContext(question: string): Promise<PreparedResearchContext> {
  const plan = await planRetrieval(question);
  const matches = await looksmaxServerPagefindProvider.search(plan.searchQuery);
  const candidates = selectTopUniqueResults(matches);
  const extracted = await Promise.all(
    candidates.map(async (result, index) => ({
      url: result.url,
      source: await fetchArticle(result, index + 1),
    })),
  );

  const selectedSources = extracted
    .flatMap(({ source }) => (source ? [source] : []))
    .map((source, index) => ({ ...source, id: index + 1 }));
  const failedUrls = extracted.flatMap(({ url, source }) => (source ? [] : [url]));

  return {
    question,
    plan,
    retrieval: {
      totalResults: matches.length,
      selectedSources,
      failedUrls,
      totalExtractedCharacters: selectedSources.reduce((total, source) => total + source.content.length, 0),
    },
  };
}
