import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createMetadata } from '../metadata/types.js';
import type { AliasDefinition } from '../aliases/types.js';
import type { ProjectConfig, ProjectService } from './types.js';
import type { ScriptDefinition } from '../scripts/types.js';
import type { ScriptEngine } from '../scripts/types.js';
import type { AliasRegistry } from '../aliases/types.js';
import type { EventBus } from '../events/types.js';
import { StandardEvents } from '../events/types.js';

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
  editorSettings: {
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'off',
    fontSize: 14,
  },
});

export interface ProjectServiceDeps {
  aliasRegistry?: AliasRegistry;
  scriptEngine?: ScriptEngine;
  eventBus?: EventBus;
}

export class DefaultProjectService implements ProjectService {
  private current?: ProjectConfig;

  constructor(private readonly deps: ProjectServiceDeps = {}) {}

  async open(rootPath: string): Promise<ProjectConfig> {
    const configPath = join(rootPath, 'Project.json');
    try {
      const raw = await readFile(configPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<ProjectConfig>;
      this.current = { ...DEFAULT_PROJECT_CONFIG(rootPath), ...parsed, rootPath };
    } catch {
      this.current = DEFAULT_PROJECT_CONFIG(rootPath);
      try {
        await writeFile(configPath, JSON.stringify(this.current, null, 2), 'utf-8');
      } catch {
        // read-only filesystem
      }
    }

    await this.loadAliases();
    await this.loadScripts();
    await this.deps.eventBus?.emit(StandardEvents.OnProjectOpened, {
      project: this.current.name,
      rootPath,
    });

    return this.current;
  }

  async close(): Promise<void> {
    if (this.current) {
      await this.deps.eventBus?.emit(StandardEvents.OnProjectClosed, {
        project: this.current.name,
      });
    }
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
    const configPath = join(this.current.rootPath, 'Project.json');
    await writeFile(configPath, JSON.stringify(this.current, null, 2), 'utf-8');
    return this.current;
  }

  resolvePath(relativePath: string): string {
    if (!this.current) throw new Error('No project is open');
    return join(this.current.rootPath, relativePath);
  }

  private async loadAliases(): Promise<void> {
    if (!this.current || !this.deps.aliasRegistry) return;
    for (const aliasPath of this.current.aliases) {
      const fullPath = this.resolvePath(aliasPath);
      try {
        if (aliasPath.endsWith('.json')) {
          const raw = await readFile(fullPath, 'utf-8');
          const items = JSON.parse(raw) as Array<{
            name: string;
            displayName?: string;
            target: string;
            description?: string;
            priority?: number;
            scope?: string;
            enabled?: boolean;
          }>;
          for (const item of items) {
            const alias: AliasDefinition = {
              metadata: createMetadata({
                name: item.name,
                displayName: item.displayName ?? item.name,
                description: item.description ?? '',
                scope: 'project',
                enabled: item.enabled ?? true,
              }),
              target: item.target,
              arguments: [],
              description: item.description ?? '',
              priority: item.priority ?? 0,
              autoLoad: true,
            };
            this.deps.aliasRegistry.register(alias);
          }
        } else {
          const dir = await readdir(fullPath);
          for (const file of dir.filter((f) => f.endsWith('.json'))) {
            const raw = await readFile(join(fullPath, file), 'utf-8');
            const items = JSON.parse(raw) as Array<{ name: string; target: string; description?: string; priority?: number }>;
            for (const item of items) {
              this.deps.aliasRegistry.register({
                metadata: createMetadata({ name: item.name, displayName: item.name, scope: 'project' }),
                target: item.target,
                arguments: [],
                description: item.description ?? '',
                priority: item.priority ?? 0,
                autoLoad: true,
              });
            }
          }
        }
      } catch {
        // aliases directory may not exist yet
      }
    }
  }

  private async loadScripts(): Promise<void> {
    if (!this.current || !this.deps.scriptEngine) return;
    const scriptsDir = this.resolvePath('scripts');
    try {
      const files = await readdir(scriptsDir);
      for (const file of files) {
        if (!/\.(js|mjs|ts)$/.test(file)) continue;
        const source = await readFile(join(scriptsDir, file), 'utf-8');
        const name = file.replace(/\.[^.]+$/, '');
        const script: ScriptDefinition = {
          metadata: createMetadata({ name, displayName: name, category: 'scripts', scope: 'project' }),
          language: 'javascript',
          source,
          dependencies: [],
          minIdeVersion: '0.1.0',
          exports: ['main'],
        };
        await this.deps.scriptEngine.load(script);
        await this.deps.eventBus?.emit(StandardEvents.OnScriptLoaded, { name });
      }
    } catch {
      // scripts directory may not exist
    }
  }
}
