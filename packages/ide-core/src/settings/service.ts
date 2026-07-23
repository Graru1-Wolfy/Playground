import type { MetadataScope } from '../metadata/types.js';
import type { SettingDefinition, SettingsService } from './types.js';

function scopeKey(key: string, scope: MetadataScope): string {
  return `${scope}:${key}`;
}

export class DefaultSettingsService implements SettingsService {
  private readonly definitions = new Map<string, SettingDefinition>();
  private readonly values = new Map<string, unknown>();

  register(definition: SettingDefinition): void {
    this.definitions.set(scopeKey(definition.key, definition.scope), definition);
    const sk = scopeKey(definition.key, definition.scope);
    if (!this.values.has(sk)) {
      this.values.set(sk, definition.defaultValue);
    }
  }

  get<T = unknown>(key: string, scope: MetadataScope = 'global'): T {
    const scopes: MetadataScope[] = ['project', 'workspace', 'user', 'global'];
    const start = scopes.indexOf(scope);
    for (let i = start; i >= 0; i--) {
      const sk = scopeKey(key, scopes[i]);
      if (this.values.has(sk)) {
        return this.values.get(sk) as T;
      }
    }
    const def = this.definitions.get(scopeKey(key, scope));
    return (def?.defaultValue ?? undefined) as T;
  }

  set(key: string, value: unknown, scope: MetadataScope = 'user'): void {
    this.values.set(scopeKey(key, scope), value);
  }

  list(scope?: MetadataScope): readonly SettingDefinition[] {
    const all = [...this.definitions.values()];
    if (!scope) return all;
    return all.filter((d) => d.scope === scope);
  }

  reset(key: string, scope: MetadataScope = 'user'): void {
    const def = this.definitions.get(scopeKey(key, scope));
    if (def) {
      this.values.set(scopeKey(key, scope), def.defaultValue);
    } else {
      this.values.delete(scopeKey(key, scope));
    }
  }

  export(scope: MetadataScope = 'user'): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [sk, value] of this.values) {
      if (sk.startsWith(`${scope}:`)) {
        result[sk.slice(scope.length + 1)] = value;
      }
    }
    return result;
  }

  import(settings: Record<string, unknown>, scope: MetadataScope = 'user'): void {
    for (const [key, value] of Object.entries(settings)) {
      this.set(key, value, scope);
    }
  }
}
