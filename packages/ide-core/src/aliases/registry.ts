import type { MetadataScope } from '../metadata/types.js';
import type { AliasDefinition, AliasRegistry, AliasResolution } from './types.js';

function scoreMatch(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 50;
  return 0;
}

function parseTarget(target: string): { commandName: string; defaultArgs: Record<string, unknown> } {
  const [commandName, ...argParts] = target.split(/\s+/);
  const defaultArgs: Record<string, unknown> = {};
  for (const part of argParts) {
    const eq = part.indexOf('=');
    if (eq > 0) {
      defaultArgs[part.slice(0, eq)] = part.slice(eq + 1);
    }
  }
  return { commandName, defaultArgs };
}

export class DefaultAliasRegistry implements AliasRegistry {
  private readonly aliases = new Map<string, AliasDefinition>();

  private key(name: string, scope: string): string {
    return `${scope}:${name}`;
  }

  register(alias: AliasDefinition): void {
    const key = this.key(alias.metadata.name, alias.metadata.scope);
    this.aliases.set(key, alias);
  }

  unregister(name: string, scope = 'global'): boolean {
    return this.aliases.delete(this.key(name, scope));
  }

  get(name: string, scope = 'global'): AliasDefinition | undefined {
    return this.aliases.get(this.key(name, scope))
      ?? this.aliases.get(this.key(name, 'global'));
  }

  list(scope?: MetadataScope): readonly AliasDefinition[] {
    const all = [...this.aliases.values()].filter((a) => a.metadata.enabled);
    if (!scope) return all;
    return all.filter((a) => a.metadata.scope === scope || a.metadata.scope === 'global');
  }

  resolve(name: string, args: Record<string, unknown> = {}): AliasResolution | undefined {
    const candidates = [
      this.get(name, 'project'),
      this.get(name, 'workspace'),
      this.get(name, 'user'),
      this.get(name, 'global'),
    ].filter((a): a is AliasDefinition => a !== undefined);

    if (candidates.length === 0) return undefined;

    const alias = candidates.sort((a, b) => b.priority - a.priority)[0];
    const { commandName, defaultArgs } = parseTarget(alias.target);
    const mergedArgs: Record<string, unknown> = { ...defaultArgs, ...args };

    for (let i = 0; i < alias.arguments.length; i++) {
      const argName = alias.arguments[i];
      if (mergedArgs[argName] === undefined && args[`arg${i}`] !== undefined) {
        mergedArgs[argName] = args[`arg${i}`];
      }
    }

    return { alias, commandName, args: mergedArgs };
  }

  search(query: string): readonly AliasDefinition[] {
    return this.list()
      .map((alias) => {
        const scores = [
          scoreMatch(query, alias.metadata.name),
          scoreMatch(query, alias.metadata.displayName),
          scoreMatch(query, alias.target),
          scoreMatch(query, alias.description),
        ];
        return { alias, score: Math.max(...scores) };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.alias);
  }

  importAliases(aliases: readonly AliasDefinition[], scope: MetadataScope = 'project'): void {
    for (const alias of aliases) {
      this.register({
        ...alias,
        metadata: { ...alias.metadata, scope },
      });
    }
  }

  exportAliases(scope?: MetadataScope): readonly AliasDefinition[] {
    return this.list(scope);
  }
}
