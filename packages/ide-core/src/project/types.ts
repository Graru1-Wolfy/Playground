export interface ProjectConfig {
  readonly name: string;
  readonly displayName: string;
  readonly version: string;
  readonly description: string;
  readonly rootPath: string;
  readonly plugins: readonly string[];
  readonly aliases: readonly string[];
  readonly libraries: readonly string[];
  readonly workspace: string;
  readonly searchPaths: readonly string[];
  readonly databaseConnections: readonly string[];
  readonly enabledFeatures: readonly string[];
  readonly editorSettings: Readonly<Record<string, unknown>>;
}

export interface ProjectService {
  open(rootPath: string): Promise<ProjectConfig>;
  close(): Promise<void>;
  getCurrent(): ProjectConfig | undefined;
  getConfig(): ProjectConfig | undefined;
  updateConfig(patch: Partial<ProjectConfig>): Promise<ProjectConfig>;
  resolvePath(relativePath: string): string;
}
