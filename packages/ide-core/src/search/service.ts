import type { SearchProvider, SearchResult, SearchResultType, SearchService } from './types.js';

export class DefaultSearchService implements SearchService {
  private readonly providers = new Map<SearchResultType, SearchProvider>();

  registerProvider(provider: SearchProvider): void {
    this.providers.set(provider.type, provider);
  }

  unregisterProvider(type: SearchResultType): boolean {
    return this.providers.delete(type);
  }

  async search(
    query: string,
    types?: readonly SearchResultType[],
    limit = 50,
  ): Promise<readonly SearchResult[]> {
    const activeTypes = types ?? [...this.providers.keys()];
    const results: SearchResult[] = [];

    for (const type of activeTypes) {
      const provider = this.providers.get(type);
      if (!provider) continue;
      const partial = await provider.search(query, limit);
      results.push(...partial);
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
