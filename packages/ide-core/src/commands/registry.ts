import { createMetadata } from '../metadata/types.js';
import type {
  CommandContext,
  CommandDefinition,
  CommandRegistry,
  CommandResult,
  CommandSearchResult,
} from './types.js';

function defaultContext(partial?: Partial<CommandContext>): CommandContext {
  return {
    source: partial?.source ?? 'api',
    args: partial?.args ?? {},
    metadata: partial?.metadata ?? {},
    signal: partial?.signal,
  };
}

function scoreMatch(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 50;
  return 0;
}

export class DefaultCommandRegistry implements CommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>();

  register(command: CommandDefinition): void {
    if (this.commands.has(command.metadata.name)) {
      throw new Error(`Command already registered: ${command.metadata.name}`);
    }
    this.commands.set(command.metadata.name, command);
  }

  unregister(name: string): boolean {
    return this.commands.delete(name);
  }

  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  list(filter?: { category?: string; enabled?: boolean }): readonly CommandDefinition[] {
    return [...this.commands.values()].filter((cmd) => {
      if (filter?.category && cmd.metadata.category !== filter.category) return false;
      if (filter?.enabled !== undefined && cmd.metadata.enabled !== filter.enabled) return false;
      return cmd.metadata.visibility !== 'hidden';
    });
  }

  search(query: string, limit = 50): readonly CommandSearchResult[] {
    if (!query.trim()) {
      return this.list().slice(0, limit).map((command) => ({
        command,
        score: 0,
        matchedField: 'name',
      }));
    }

    const results: CommandSearchResult[] = [];
    for (const command of this.commands.values()) {
      if (command.metadata.visibility === 'hidden') continue;
      const fields: Array<[string, string]> = [
        ['name', command.metadata.name],
        ['displayName', command.metadata.displayName],
        ['description', command.metadata.description],
        ['category', command.metadata.category],
        ...command.metadata.tags.map((t) => ['tag', t] as [string, string]),
      ];
      let best = 0;
      let matchedField = 'name';
      for (const [field, value] of fields) {
        const score = scoreMatch(query, value);
        if (score > best) {
          best = score;
          matchedField = field;
        }
      }
      if (best > 0) {
        results.push({ command, score: best, matchedField });
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async execute(name: string, partial?: Partial<CommandContext>): Promise<CommandResult> {
    const command = this.commands.get(name);
    if (!command) {
      return { success: false, error: `Command not found: ${name}`, undoable: false };
    }
    if (!command.metadata.enabled) {
      return { success: false, error: `Command disabled: ${name}`, undoable: false };
    }

    const context = defaultContext(partial);
    if (context.source === 'script' && !command.scriptAccessible) {
      return { success: false, error: `Command not script-accessible: ${name}`, undoable: false };
    }
    if (context.source === 'api' && !command.apiAccessible) {
      return { success: false, error: `Command not API-accessible: ${name}`, undoable: false };
    }

    try {
      return await command.handler(context);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        undoable: false,
      };
    }
  }
}

export function defineCommand(
  input: Omit<CommandDefinition, 'metadata'> & {
    name: string;
    displayName: string;
    category?: string;
    description?: string;
  },
): CommandDefinition {
  return {
    metadata: createMetadata({
      name: input.name,
      displayName: input.displayName,
      description: input.description ?? '',
      category: input.category ?? 'general',
    }),
    arguments: input.arguments,
    handler: input.handler,
    undoable: input.undoable,
    scriptAccessible: input.scriptAccessible,
    apiAccessible: input.apiAccessible,
    aliases: input.aliases,
    keybindings: input.keybindings,
    documentation: input.documentation,
  };
}
