export type SearchResultType =
  | 'file'
  | 'symbol'
  | 'command'
  | 'alias'
  | 'script'
  | 'setting'
  | 'menu'
  | 'asset'
  | 'recent'
  | 'documentation';

export interface SearchResult {
  readonly id: string;
  readonly type: SearchResultType;
  readonly title: string;
  readonly subtitle?: string;
  readonly description?: string;
  readonly icon?: string;
  readonly score: number;
  readonly source?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SearchProvider {
  readonly type: SearchResultType;
  search(query: string, limit?: number): Promise<readonly SearchResult[]> | readonly SearchResult[];
}

export interface SearchService {
  registerProvider(provider: SearchProvider): void;
  unregisterProvider(type: SearchResultType): boolean;
  search(query: string, types?: readonly SearchResultType[], limit?: number): Promise<readonly SearchResult[]>;
}
