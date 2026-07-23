import type {
  DatabaseConnection,
  DatabaseTransaction,
  QueryResult,
} from './types.js';

/** In-memory SQLite-compatible store for tests and browser bootstrap. */
export class InMemoryDatabaseConnection implements DatabaseConnection {
  readonly provider = 'sqlite' as const;
  private readonly tables = new Map<string, Array<Record<string, unknown>>>();
  private closed = false;

  execute(sql: string, params: readonly unknown[] = []): QueryResult {
    this.assertOpen();
    const normalized = sql.trim().toLowerCase();

    if (normalized.startsWith('create table') || normalized.startsWith('create index')) {
      const tableMatch = sql.match(/(?:TABLE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      const name = tableMatch?.[1];
      if (name && !this.tables.has(name)) {
        this.tables.set(name, []);
      }
      return { rows: [], changes: 0 };
    }

    if (normalized.startsWith('insert')) {
      const tableMatch = sql.match(/INTO\s+(\w+)/i);
      const table = tableMatch?.[1];
      if (!table) throw new Error(`Invalid INSERT: ${sql}`);
      const rows = this.tables.get(table) ?? [];
      const row: Record<string, unknown> = {};
      const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
      const cols = colMatch?.[1].split(',').map((c) => c.trim()) ?? [];
      cols.forEach((col, i) => {
        row[col] = params[i];
      });
      rows.push(row);
      this.tables.set(table, rows);
      return { rows: [], changes: 1, lastInsertId: rows.length };
    }

    if (normalized.startsWith('select')) {
      const tableMatch = sql.match(/FROM\s+(\w+)/i);
      const table = tableMatch?.[1];
      let rows = table ? [...(this.tables.get(table) ?? [])] : [];
      if (normalized.includes('where') && params.length > 0) {
        const keyMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
        if (keyMatch) {
          const key = keyMatch[1];
          rows = rows.filter((r) => r[key] === params[0]);
        }
      }
      return { rows, changes: 0 };
    }

    if (normalized.startsWith('update')) {
      const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
      const table = tableMatch?.[1];
      if (!table) return { rows: [], changes: 0 };
      const rows = this.tables.get(table) ?? [];
      const setMatch = sql.match(/SET\s+(\w+)\s*=\s*\?/i);
      const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      if (setMatch && whereMatch) {
        const setKey = setMatch[1];
        const whereKey = whereMatch[1];
        let changes = 0;
        for (const row of rows) {
          if (row[whereKey] === params[1]) {
            row[setKey] = params[0];
            changes++;
          }
        }
        return { rows: [], changes };
      }
      return { rows: [], changes: 0 };
    }

    return { rows: [], changes: 0 };
  }

  query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): readonly T[] {
    return this.execute(sql, params).rows as T[];
  }

  transaction<T>(fn: (tx: DatabaseTransaction) => T): T {
    const tx: DatabaseTransaction = {
      execute: (sql, params) => this.execute(sql, params),
      commit: () => {},
      rollback: () => {},
    };
    return fn(tx);
  }

  close(): void {
    this.closed = true;
    this.tables.clear();
  }

  private assertOpen(): void {
    if (this.closed) throw new Error('Database connection is closed');
  }
}
