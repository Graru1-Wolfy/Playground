import type { Metadata } from '../metadata/types.js';

export type CommandArgumentType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'file'
  | 'symbol'
  | 'any';

export interface CommandArgumentSchema {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly type: CommandArgumentType;
  readonly required: boolean;
  readonly defaultValue?: unknown;
}

export interface CommandContext {
  readonly source: 'ui' | 'api' | 'script' | 'alias' | 'keybinding' | 'palette' | 'terminal';
  readonly args: Readonly<Record<string, unknown>>;
  readonly metadata: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface CommandResult<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly undoable: boolean;
}

export interface UndoableCommandResult<T = unknown> extends CommandResult<T> {
  readonly undo: () => Promise<CommandResult>;
  readonly redo: () => Promise<CommandResult>;
}

export type CommandHandler<T = unknown> = (
  context: CommandContext,
) => Promise<CommandResult<T>> | CommandResult<T>;

export interface CommandDefinition {
  readonly metadata: Metadata;
  readonly arguments: readonly CommandArgumentSchema[];
  readonly handler: CommandHandler;
  readonly undoable: boolean;
  readonly scriptAccessible: boolean;
  readonly apiAccessible: boolean;
  readonly aliases: readonly string[];
  readonly keybindings: readonly string[];
  readonly documentation: string;
}

export interface CommandSearchResult {
  readonly command: CommandDefinition;
  readonly score: number;
  readonly matchedField: string;
}

export interface CommandRegistry {
  register(command: CommandDefinition): void;
  unregister(name: string): boolean;
  get(name: string): CommandDefinition | undefined;
  list(filter?: { category?: string; enabled?: boolean }): readonly CommandDefinition[];
  search(query: string, limit?: number): readonly CommandSearchResult[];
  execute(name: string, context?: Partial<CommandContext>): Promise<CommandResult>;
}
