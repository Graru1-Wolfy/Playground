import type { CommandHistoryService, HistoryEntry, UndoEntry } from './history.js';
import type { CommandResult } from './types.js';

export class DefaultCommandHistoryService implements CommandHistoryService {
  private readonly recent: HistoryEntry[] = [];
  private readonly pinned = new Set<string>();
  private readonly favorites = new Set<string>();
  private readonly undoStack: UndoEntry[] = [];
  private readonly redoStack: UndoEntry[] = [];

  record(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry {
    const full: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    this.recent.unshift(full);
    if (this.recent.length > 100) this.recent.pop();
    return full;
  }

  getRecent(limit = 20): readonly HistoryEntry[] {
    return this.recent.slice(0, limit);
  }

  getPinned(): readonly string[] {
    return [...this.pinned];
  }

  pin(command: string): void {
    this.pinned.add(command);
  }

  unpin(command: string): void {
    this.pinned.delete(command);
  }

  getFavorites(): readonly string[] {
    return [...this.favorites];
  }

  addFavorite(command: string): void {
    this.favorites.add(command);
  }

  pushUndo(entry: UndoEntry): void {
    this.undoStack.push(entry);
    this.redoStack.length = 0;
  }

  async undo(): Promise<CommandResult | undefined> {
    const entry = this.undoStack.pop();
    if (!entry) return undefined;
    const result = await entry.undo();
    if (result.success) this.redoStack.push(entry);
    return result;
  }

  async redo(): Promise<CommandResult | undefined> {
    const entry = this.redoStack.pop();
    if (!entry) return undefined;
    const result = await entry.redo();
    if (result.success) this.undoStack.push(entry);
    return result;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
