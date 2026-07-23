import type {
  DatabaseConfig,
  DatabaseConnection,
  DatabaseService,
  DatabaseTransaction,
  QueryResult,
} from './types.js';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS metadata_store (
    uuid TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'global',
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS commands (
    uuid TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS aliases (
    uuid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'global',
    data TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL,
    UNIQUE(name, scope)
  )`,
  `CREATE TABLE IF NOT EXISTS scripts (
    uuid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    language TEXT NOT NULL,
    data TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS plugins (
    uuid TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    version TEXT NOT NULL,
    data TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS search_index (
    uuid TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    score_boost REAL NOT NULL DEFAULT 1.0,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS bookmarks (
    uuid TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    label TEXT,
    data TEXT,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS history (
    uuid TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    reference TEXT NOT NULL,
    data TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    scope TEXT NOT NULL DEFAULT 'global',
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS diagnostics (
    uuid TEXT PRIMARY KEY,
    level TEXT NOT NULL,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_search_index_type ON search_index(type)`,
  `CREATE INDEX IF NOT EXISTS idx_search_index_name ON search_index(name)`,
  `CREATE INDEX IF NOT EXISTS idx_history_type ON history(type)`,
  `CREATE INDEX IF NOT EXISTS idx_aliases_scope ON aliases(scope)`,
];

/** In-memory SQLite-compatible store for tests and browser bootstrap. */
class InMemoryDatabaseConnection implements DatabaseConnection {
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
      const rows = table ? [...(this.tables.get(table) ?? [])] : [];
      return { rows, changes: 0 };
    }

    if (normalized.startsWith('update') || normalized.startsWith('delete')) {
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

export class DefaultDatabaseService implements DatabaseService {
  private connection?: DatabaseConnection;

  async connect(config: DatabaseConfig): Promise<DatabaseConnection> {
    if (config.provider !== 'sqlite') {
      throw new Error(`Provider not yet implemented: ${config.provider}`);
    }
    this.connection = new InMemoryDatabaseConnection();
    await this.initializeSchema();
    return this.connection;
  }

  getConnection(): DatabaseConnection | undefined {
    return this.connection;
  }

  async migrate(): Promise<void> {
    await this.initializeSchema();
  }

  async initializeSchema(): Promise<void> {
    const conn = this.connection ?? await this.connect({ provider: 'sqlite' });
    for (const statement of SCHEMA_STATEMENTS) {
      conn.execute(statement);
    }
  }
}
