import "server-only";

import type { SearchProvider, SearchResult } from "./types";

const TARGET_ORIGIN = "https://looksmaxxing.guide";
const PAGEFIND_BASE_PATH = `${TARGET_ORIGIN}/pagefind/`;
const PAGEFIND_MODULE_URL = `${PAGEFIND_BASE_PATH}pagefind.js`;

type PagefindSearchResult = {
  id: string;
  score: number;
  data: () => Promise<{
    url: string;
    meta?: { title?: string };
    excerpt?: string;
    plain_excerpt?: string;
    sub_results?: Array<{
      title?: string;
      url: string;
      excerpt?: string;
      plain_excerpt?: string;
    }>;
  }>;
};

type PagefindInstance = {
  search: (query: string) => Promise<{ results: PagefindSearchResult[] }>;
  destroy: () => Promise<void>;
};

type PagefindModule = {
  createInstance: (options: {
    basePath: string;
    baseUrl: string;
    language: string;
    noWorker: boolean;
  }) => PagefindInstance;
};

let modulePromise: Promise<PagefindModule> | undefined;

async function loadRemotePagefind(): Promise<PagefindModule> {
  modulePromise ??= (async () => {
    const response = await fetch(PAGEFIND_MODULE_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load Pagefind (HTTP ${response.status}).`);
    }

    const source = await response.text();
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
    return (await import(/* webpackIgnore: true */ moduleUrl)) as PagefindModule;
  })();

  return modulePromise;
}

function toTargetPath(url: string): string {
  const parsed = new URL(url, TARGET_ORIGIN);
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/** Server-side Pagefind provider used by the research pipeline. */
export const looksmaxServerPagefindProvider: SearchProvider = {
  async search(query: string): Promise<SearchResult[]> {
    const pagefind = await loadRemotePagefind();
    const instance = pagefind.createInstance({
      basePath: PAGEFIND_BASE_PATH,
      baseUrl: TARGET_ORIGIN,
      language: "en",
      noWorker: true,
    });

    try {
      const response = await instance.search(query);
      return await Promise.all(
        response.results.map(async (result) => {
          const data = await result.data();
          return {
            id: result.id,
            score: result.score,
            title: data.meta?.title,
            url: toTargetPath(data.url),
            excerpt: data.plain_excerpt ?? data.excerpt,
            searchTerms: query.toLowerCase().match(/[a-z0-9]+/g) ?? [],
            matchedSections: data.sub_results?.map((section) => ({
              title: section.title,
              url: toTargetPath(section.url),
              excerpt: section.plain_excerpt ?? section.excerpt,
            })),
          };
        }),
      );
    } finally {
      await instance.destroy();
    }
  },
};
