import type { DatabaseConnection, DatabaseTransaction, QueryResult } from './types.js';

export interface SqliteDriver {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    all(...params: unknown[]): unknown[];
  };
  close(): void;
}

export class SqliteDatabaseConnection implements DatabaseConnection {
  readonly provider = 'sqlite' as const;

  constructor(private readonly db: SqliteDriver) {}

  execute(sql: string, params: readonly unknown[] = []): QueryResult {
    const trimmed = sql.trim();
    if (trimmed.toLowerCase().startsWith('select')) {
      const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
      return { rows, changes: 0 };
    }
    const result = this.db.prepare(sql).run(...params);
    return {
      rows: [],
      changes: result.changes,
      lastInsertId: Number(result.lastInsertRowid),
    };
  }

  query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): readonly T[] {
    return this.db.prepare(sql).all(...(params ?? [])) as T[];
  }

  transaction<T>(fn: (tx: DatabaseTransaction) => T): T {
    this.db.exec('BEGIN');
    const tx: DatabaseTransaction = {
      execute: (sql, params) => this.execute(sql, params),
      commit: () => this.db.exec('COMMIT'),
      rollback: () => this.db.exec('ROLLBACK'),
    };
    try {
      const result = fn(tx);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }
}
