import type { Metadata, MetadataScope } from '../metadata/types.js';

export interface AliasDefinition {
  readonly metadata: Metadata;
  readonly target: string;
  readonly arguments: readonly string[];
  readonly description: string;
  readonly priority: number;
  readonly autoLoad: boolean;
}

export interface AliasResolution {
  readonly alias: AliasDefinition;
  readonly commandName: string;
  readonly args: Record<string, unknown>;
}

export interface AliasRegistry {
  register(alias: AliasDefinition): void;
  unregister(name: string, scope?: MetadataScope): boolean;
  get(name: string, scope?: MetadataScope): AliasDefinition | undefined;
  list(scope?: MetadataScope): readonly AliasDefinition[];
  resolve(name: string, args?: Record<string, unknown>): AliasResolution | undefined;
  search(query: string): readonly AliasDefinition[];
  importAliases(aliases: readonly AliasDefinition[], scope?: MetadataScope): void;
  exportAliases(scope?: MetadataScope): readonly AliasDefinition[];
}
