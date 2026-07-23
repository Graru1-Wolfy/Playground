import type { ProjectConfig, ProjectService } from './types.js';

const DEFAULT_PROJECT_CONFIG = (rootPath: string): ProjectConfig => ({
  name: 'untitled',
  displayName: 'Untitled Project',
  version: '1.0.0',
  description: '',
  rootPath,
  plugins: [],
  aliases: ['aliases'],
  libraries: [],
  workspace: 'default',
  searchPaths: ['src', 'lib', 'scripts'],
  databaseConnections: ['database/project.db'],
  enabledFeatures: ['editor', 'terminal', 'search', 'scripts'],
  editorSettings: { tabSize: 2, insertSpaces: true, wordWrap: 'off', fontSize: 14 },
});

/** Browser-safe project service without filesystem access. */
export class BrowserProjectService implements ProjectService {
  private current?: ProjectConfig;

  async open(rootPath: string): Promise<ProjectConfig> {
    this.current = DEFAULT_PROJECT_CONFIG(rootPath);
    return this.current;
  }

  async close(): Promise<void> {
    this.current = undefined;
  }

  getCurrent(): ProjectConfig | undefined {
    return this.current;
  }

  getConfig(): ProjectConfig | undefined {
    return this.current;
  }

  async updateConfig(patch: Partial<ProjectConfig>): Promise<ProjectConfig> {
    if (!this.current) throw new Error('No project is open');
    this.current = { ...this.current, ...patch };
    return this.current;
  }

  resolvePath(relativePath: string): string {
    if (!this.current) throw new Error('No project is open');
    return `${this.current.rootPath}/${relativePath}`.replace(/\/+/g, '/');
  }
}
