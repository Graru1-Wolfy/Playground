import type { AliasRegistry } from '../aliases/types.js';
import type { CommandRegistry } from '../commands/types.js';
import type { DatabaseService } from '../database/types.js';
import type { DiagnosticsService } from '../logging/types.js';
import type { Logger } from '../logging/types.js';
import type { PluginManager } from '../plugins/types.js';
import type { ProjectService } from '../project/types.js';
import type { ScriptEngine } from '../scripts/types.js';
import type { SettingsService } from '../settings/types.js';
import type { SymbolDatabase } from '../symbols/types.js';
import type { WorkspaceService } from '../workspace/types.js';
import type { KeybindingManager } from '../keybindings/types.js';

export type InfoTopic =
  | 'commands'
  | 'aliases'
  | 'project'
  | 'workspace'
  | 'plugins'
  | 'scripts'
  | 'database'
  | 'memory'
  | 'editor'
  | 'bindings'
  | 'diagnostics';

export interface InfoResult {
  readonly topic: InfoTopic;
  readonly timestamp: number;
  readonly data: Record<string, unknown>;
}

export interface InfoService {
  get(topic: InfoTopic): InfoResult;
  listTopics(): readonly InfoTopic[];
}

export interface InfoServiceDeps {
  commands: CommandRegistry;
  aliases: AliasRegistry;
  project: ProjectService;
  workspace: WorkspaceService;
  plugins: PluginManager;
  scripts: ScriptEngine;
  database: DatabaseService;
  keybindings: KeybindingManager;
  diagnostics: DiagnosticsService;
  settings: SettingsService;
  symbols: SymbolDatabase;
  logger: Logger;
}

export class DefaultInfoService implements InfoService {
  constructor(private readonly deps: InfoServiceDeps) {}

  listTopics(): readonly InfoTopic[] {
    return [
      'commands',
      'aliases',
      'project',
      'workspace',
      'plugins',
      'scripts',
      'database',
      'memory',
      'editor',
      'bindings',
      'diagnostics',
    ];
  }

  get(topic: InfoTopic): InfoResult {
    const timestamp = Date.now();
    switch (topic) {
      case 'commands':
        return {
          topic,
          timestamp,
          data: {
            count: this.deps.commands.list().length,
            commands: this.deps.commands.list().map((c) => ({
              name: c.metadata.name,
              displayName: c.metadata.displayName,
              category: c.metadata.category,
              enabled: c.metadata.enabled,
            })),
          },
        };
      case 'aliases':
        return {
          topic,
          timestamp,
          data: {
            count: this.deps.aliases.list().length,
            aliases: this.deps.aliases.list().map((a) => ({
              name: a.metadata.name,
              target: a.target,
              scope: a.metadata.scope,
              priority: a.priority,
            })),
          },
        };
      case 'project':
        return {
          topic,
          timestamp,
          data: {
            open: !!this.deps.project.getCurrent(),
            project: this.deps.project.getConfig() ?? null,
          },
        };
      case 'workspace':
        return {
          topic,
          timestamp,
          data: {
            active: this.deps.workspace.getActive() ?? null,
            profiles: this.deps.workspace.listProfiles(),
          },
        };
      case 'plugins':
        return {
          topic,
          timestamp,
          data: {
            count: this.deps.plugins.list().length,
            plugins: this.deps.plugins.list().map((p) => ({
              name: p.manifest.metadata.name,
              version: p.manifest.metadata.version,
              enabled: this.deps.plugins.isEnabled(p.manifest.metadata.name),
            })),
          },
        };
      case 'scripts':
        return {
          topic,
          timestamp,
          data: {
            count: this.deps.scripts.list().length,
            scripts: this.deps.scripts.list().map((s) => ({
              name: s.metadata.name,
              language: s.language,
              exports: s.exports,
            })),
          },
        };
      case 'database':
        return {
          topic,
          timestamp,
          data: {
            connected: !!this.deps.database.getConnection(),
            provider: this.deps.database.getConnection()?.provider ?? null,
          },
        };
      case 'memory':
        return {
          topic,
          timestamp,
          data: {
            heapUsed: (process.memoryUsage?.().heapUsed) ?? 0,
            heapTotal: (process.memoryUsage?.().heapTotal) ?? 0,
            rss: (process.memoryUsage?.().rss) ?? 0,
          },
        };
      case 'editor':
        return {
          topic,
          timestamp,
          data: {
            settings: this.deps.settings.get('editor', 'project'),
            symbolCount: this.deps.symbols.list().length,
          },
        };
      case 'bindings':
        return {
          topic,
          timestamp,
          data: {
            count: this.deps.keybindings.list().length,
            conflicts: this.deps.keybindings.detectConflicts().length,
            bindings: this.deps.keybindings.list().map((b) => ({
              command: b.command,
              chord: this.deps.keybindings.chordToString(b.chord),
              scope: b.scope,
            })),
          },
        };
      case 'diagnostics':
        return {
          topic,
          timestamp,
          data: {
            summary: this.deps.diagnostics.getSummary(),
            items: this.deps.diagnostics.list(),
          },
        };
      default:
        return { topic, timestamp, data: {} };
    }
  }
}
