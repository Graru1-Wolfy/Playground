import type {
  DatabaseConfig,
  DatabaseConnection,
  DatabaseService,
} from './types.js';
import { InMemoryDatabaseConnection } from './in-memory.js';
import { SCHEMA_STATEMENTS } from './schema.js';

async function createNativeConnection(filePath?: string): Promise<DatabaseConnection | null> {
  try {
    const { mkdir } = await import('node:fs/promises');
    const { dirname } = await import('node:path');
    const BetterSqlite3 = (await import('better-sqlite3')).default;
    const { SqliteDatabaseConnection } = await import('./sqlite-connection.js');
    if (filePath) {
      await mkdir(dirname(filePath), { recursive: true });
    }
    const db = new BetterSqlite3(filePath ?? ':memory:');
    return new SqliteDatabaseConnection(db);
  } catch {
    return null;
  }
}

export class DefaultDatabaseService implements DatabaseService {
  private connection?: DatabaseConnection;
  private useNative = false;

  async connect(config: DatabaseConfig): Promise<DatabaseConnection> {
    if (config.provider !== 'sqlite') {
      throw new Error(`Provider not yet implemented: ${config.provider}`);
    }
    if (config.filePath) {
      const native = await createNativeConnection(config.filePath);
      if (native) {
        this.connection = native;
        this.useNative = true;
        await this.initializeSchema();
        return this.connection;
      }
    }
    this.connection = new InMemoryDatabaseConnection();
    this.useNative = false;
    await this.initializeSchema();
    return this.connection;
  }

  getConnection(): DatabaseConnection | undefined {
    return this.connection;
  }

  isNative(): boolean {
    return this.useNative;
  }

  async migrate(): Promise<void> {
    const conn = this.getConnection();
    if (!conn) return;
    conn.execute(`CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )`);
    const rows = conn.query<{ version: number }>('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1');
    const current = rows[0]?.version ?? 0;
    if (current < 1) {
      conn.execute('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)', [1, Date.now()]);
    }
    await this.initializeSchema();
  }

  async initializeSchema(): Promise<void> {
    const conn = this.connection ?? await this.connect({ provider: 'sqlite' });
    for (const statement of SCHEMA_STATEMENTS) {
      conn.execute(statement);
    }
  }
}
