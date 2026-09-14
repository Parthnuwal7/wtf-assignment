import type { SearchProvider, SearchResult } from "./types";

type PagefindSearchResult = {
  id: string;
  score: number;
  data: () => Promise<{
    url: string;
    meta?: { title?: string };
    excerpt?: string;
  }>;
};

type PagefindModule = {
  search: (query: string) => Promise<{ results: PagefindSearchResult[] }>;
};

const pagefindModulePath = "/pagefind-proxy/pagefind.js";
const targetOrigin = "https://looksmaxxing.guide";

/**
 * Loads the site's own Pagefind bundle through a same-origin proxy. The proxy
 * exists only because a localhost browser must not depend on the target site's
 * cross-origin module and worker headers.
 */
async function loadPagefind(): Promise<PagefindModule> {
  return (await import(/* webpackIgnore: true */ pagefindModulePath)) as PagefindModule;
}

function toTargetPath(url: string): string {
  const parsed = new URL(url, targetOrigin);
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export const looksmaxPagefindProvider: SearchProvider = {
  async search(query: string): Promise<SearchResult[]> {
    const pagefind = await loadPagefind();
    const response = await pagefind.search(query);

    return Promise.all(
      response.results.map(async (result) => {
        const data = await result.data();
        return {
          id: result.id,
          score: result.score,
          title: data.meta?.title,
          url: toTargetPath(data.url),
          excerpt: data.excerpt,
        };
      }),
    );
  },
};

export async function searchLooksmax(query: string): Promise<SearchResult[]> {
  return looksmaxPagefindProvider.search(query);
}
