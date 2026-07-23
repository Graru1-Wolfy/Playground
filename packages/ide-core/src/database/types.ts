export type DatabaseProvider = 'sqlite' | 'postgresql' | 'mysql' | 'remote';

export interface DatabaseConfig {
  readonly provider: DatabaseProvider;
  readonly connectionString?: string;
  readonly filePath?: string;
  readonly options?: Readonly<Record<string, unknown>>;
}

export interface QueryResult<T = Record<string, unknown>> {
  readonly rows: readonly T[];
  readonly changes: number;
  readonly lastInsertId?: number | string;
}

export interface DatabaseTransaction {
  execute(sql: string, params?: readonly unknown[]): QueryResult;
  commit(): void;
  rollback(): void;
}

export interface DatabaseConnection {
  readonly provider: DatabaseProvider;
  execute(sql: string, params?: readonly unknown[]): QueryResult;
  query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): readonly T[];
  transaction<T>(fn: (tx: DatabaseTransaction) => T): T;
  close(): void;
}

export interface DatabaseService {
  connect(config: DatabaseConfig): Promise<DatabaseConnection>;
  getConnection(): DatabaseConnection | undefined;
  migrate(): Promise<void>;
  initializeSchema(): Promise<void>;
}
