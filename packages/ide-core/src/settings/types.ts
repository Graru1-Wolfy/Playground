import type { MetadataScope } from '../metadata/types.js';

export interface SettingDefinition {
  readonly key: string;
  readonly displayName: string;
  readonly description: string;
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly defaultValue: unknown;
  readonly scope: MetadataScope;
  readonly category: string;
}

export interface SettingsService {
  register(definition: SettingDefinition): void;
  get<T = unknown>(key: string, scope?: MetadataScope): T;
  set(key: string, value: unknown, scope?: MetadataScope): void;
  list(scope?: MetadataScope): readonly SettingDefinition[];
  reset(key: string, scope?: MetadataScope): void;
  export(scope?: MetadataScope): Record<string, unknown>;
  import(settings: Record<string, unknown>, scope?: MetadataScope): void;
}
