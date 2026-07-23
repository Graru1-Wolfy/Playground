import type { SearchProvider, SearchResult } from './types.js';
import type { AliasRegistry } from '../aliases/types.js';
import type { ScriptEngine } from '../scripts/types.js';
import type { SettingsService } from '../settings/types.js';
import type { CommandRegistry } from '../commands/types.js';
import type { FilesystemService } from '../filesystem/types.js';

function scoreMatch(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 50;
  return 0;
}

export function createAliasSearchProvider(aliases: AliasRegistry): SearchProvider {
  return {
    type: 'alias',
    search(query: string) {
      return aliases.search(query).map((alias) => ({
        id: alias.metadata.uuid,
        type: 'alias' as const,
        title: alias.metadata.displayName,
        subtitle: alias.target,
        description: alias.description,
        score: 80,
        metadata: { alias: alias.metadata.name, target: alias.target },
      }));
    },
  };
}

export function createScriptSearchProvider(scripts: ScriptEngine): SearchProvider {
  return {
    type: 'script',
    search(query: string) {
      const q = query.toLowerCase();
      return scripts
        .list()
        .filter((s) => s.metadata.name.toLowerCase().includes(q))
        .map((s) => ({
          id: s.metadata.uuid,
          type: 'script' as const,
          title: s.metadata.displayName,
          subtitle: s.language,
          description: s.metadata.description,
          score: 70,
          metadata: { script: s.metadata.name },
        }));
    },
  };
}

export function createSettingsSearchProvider(settings: SettingsService): SearchProvider {
  return {
    type: 'setting',
    search(query: string) {
      const q = query.toLowerCase();
      return settings
        .list()
        .filter((s) => s.key.toLowerCase().includes(q) || s.displayName.toLowerCase().includes(q))
        .map((s) => ({
          id: s.key,
          type: 'setting' as const,
          title: s.displayName,
          subtitle: s.key,
          description: s.description,
          score: 60,
          metadata: { key: s.key },
        }));
    },
  };
}

export function createFileSearchProvider(fs: FilesystemService, rootPath = '.'): SearchProvider {
  return {
    type: 'file',
    async search(query: string, limit = 30): Promise<readonly SearchResult[]> {
      if (!query.trim()) return [];
      const results: SearchResult[] = [];
      await walk(fs, rootPath, query.toLowerCase(), results, limit);
      return results.sort((a, b) => b.score - a.score).slice(0, limit);
    },
  };
}

async function walk(
  fs: FilesystemService,
  path: string,
  query: string,
  results: SearchResult[],
  limit: number,
): Promise<void> {
  if (results.length >= limit) return;
  let entries;
  try {
    entries = await fs.list(path);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (results.length >= limit) break;
    const score = scoreMatch(query, entry.name);
    if (score > 0 && entry.type === 'file') {
      results.push({
        id: entry.path,
        type: 'file',
        title: entry.name,
        subtitle: entry.path,
        score,
        metadata: { path: entry.path },
      });
    }
    if (entry.type === 'directory' && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      await walk(fs, entry.path, query, results, limit);
    }
  }
}

export function createRecentSearchProvider(
  getRecent: () => readonly { path: string; timestamp: number }[],
): SearchProvider {
  return {
    type: 'recent',
    search(query: string) {
      const q = query.toLowerCase();
      return getRecent()
        .filter((r) => !q || r.path.toLowerCase().includes(q))
        .map((r) => ({
          id: r.path,
          type: 'recent' as const,
          title: r.path.split('/').pop() ?? r.path,
          subtitle: r.path,
          score: 40,
          metadata: { path: r.path },
        }));
    },
  };
}

export function registerAllSearchProviders(deps: {
  search: import('./types.js').SearchService;
  commands: CommandRegistry;
  aliases: AliasRegistry;
  scripts: ScriptEngine;
  settings: SettingsService;
  fs?: FilesystemService;
  getRecent?: () => readonly { path: string; timestamp: number }[];
}): void {
  deps.search.registerProvider({
    type: 'command',
    search(query: string) {
      return deps.commands.search(query).map((r) => ({
        id: r.command.metadata.uuid,
        type: 'command' as const,
        title: r.command.metadata.displayName,
        subtitle: r.command.metadata.name,
        description: r.command.metadata.description,
        score: r.score,
        metadata: { command: r.command.metadata.name },
      }));
    },
  });
  deps.search.registerProvider(createAliasSearchProvider(deps.aliases));
  deps.search.registerProvider(createScriptSearchProvider(deps.scripts));
  deps.search.registerProvider(createSettingsSearchProvider(deps.settings));
  if (deps.fs) {
    deps.search.registerProvider(createFileSearchProvider(deps.fs));
  }
  if (deps.getRecent) {
    deps.search.registerProvider(createRecentSearchProvider(deps.getRecent));
  }
}
