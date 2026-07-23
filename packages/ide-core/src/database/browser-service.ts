import type { DatabaseConfig, DatabaseConnection, DatabaseService } from './types.js';
import { InMemoryDatabaseConnection } from './in-memory.js';
import { SCHEMA_STATEMENTS } from './schema.js';

/** Browser-only database service — no native SQLite. */
export class BrowserDatabaseService implements DatabaseService {
  private connection?: DatabaseConnection;

  async connect(_config: DatabaseConfig): Promise<DatabaseConnection> {
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
