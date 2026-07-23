import type { CommandResult } from '../commands/types.js';

export interface HistoryEntry {
  readonly id: string;
  readonly command: string;
  readonly args: Readonly<Record<string, unknown>>;
  readonly timestamp: number;
  readonly success: boolean;
}

export interface UndoEntry {
  readonly command: string;
  readonly undo: () => Promise<CommandResult>;
  readonly redo: () => Promise<CommandResult>;
}

export interface CommandHistoryService {
  record(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry;
  getRecent(limit?: number): readonly HistoryEntry[];
  getPinned(): readonly string[];
  pin(command: string): void;
  unpin(command: string): void;
  getFavorites(): readonly string[];
  addFavorite(command: string): void;
  pushUndo(entry: UndoEntry): void;
  undo(): Promise<CommandResult | undefined>;
  redo(): Promise<CommandResult | undefined>;
  canUndo(): boolean;
  canRedo(): boolean;
}
