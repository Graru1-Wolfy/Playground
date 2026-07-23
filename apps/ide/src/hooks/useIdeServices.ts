import { useEffect, useState } from 'react';
import {
  Tokens,
  type CommandDefinition,
  type SearchResult,
} from '@playground/ide-core/browser';
import { usePlatform } from '../platform/PlatformContext';

export function useCommands(): readonly CommandDefinition[] {
  const platform = usePlatform();
  return platform.container.resolve(Tokens.CommandRegistry).list();
}

export function useExecuteCommand() {
  const platform = usePlatform();
  return (name: string, args?: Record<string, unknown>) => platform.executeCommand(name, args);
}

export function useSearch(query: string): SearchResult[] {
  const platform = usePlatform();
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    const search = platform.container.resolve(Tokens.SearchService);
    search.search(query).then((r: readonly SearchResult[]) => setResults([...r]));
  }, [platform, query]);

  return results;
}

export function useInfo(topic: string): Record<string, unknown> | null {
  const platform = usePlatform();
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const result = platform.getInfo(topic) as { data: Record<string, unknown> };
    setData(result.data);
  }, [platform, topic]);

  return data;
}

export function useWorkspace() {
  const platform = usePlatform();
  return platform.container.resolve(Tokens.WorkspaceService);
}

export function useEditor() {
  const platform = usePlatform();
  return platform.container.resolve(Tokens.EditorService);
}

export function useKeybindings() {
  const platform = usePlatform();
  return platform.container.resolve(Tokens.KeybindingManager);
}
