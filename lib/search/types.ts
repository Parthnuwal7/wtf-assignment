export type SearchResult = {
  id?: string;
  score: number;
  title?: string;
  url: string;
  excerpt?: string;
  searchTerms?: string[];
  matchedSections?: Array<{
    title?: string;
    url: string;
    excerpt?: string;
  }>;
};

export interface SearchProvider {
  search(query: string): Promise<SearchResult[]>;
}
