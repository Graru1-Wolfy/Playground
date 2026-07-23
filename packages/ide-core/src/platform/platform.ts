import { DefaultServiceContainer } from '../di/container.js';
import { createToken } from '../di/types.js';
import type { ServiceContainer } from '../di/types.js';
import { DefaultEventBus } from '../events/event-bus.js';
import { STANDARD_EVENT_METADATA } from '../events/types.js';
import type { EventBus } from '../events/types.js';
import { DefaultCommandRegistry } from '../commands/registry.js';
import type { CommandRegistry } from '../commands/types.js';
import { DefaultAliasRegistry } from '../aliases/registry.js';
import type { AliasRegistry } from '../aliases/types.js';
import { DefaultDatabaseService } from '../database/service.js';
import type { DatabaseService } from '../database/types.js';
import { DefaultLogger } from '../logging/logger.js';
import { DefaultDiagnosticsService } from '../logging/diagnostics.js';
import type { Logger, DiagnosticsService } from '../logging/types.js';
import { DefaultSettingsService } from '../settings/service.js';
import type { SettingsService } from '../settings/types.js';
import { DefaultProjectService } from '../project/service.js';
import type { ProjectService } from '../project/types.js';
import { DefaultWorkspaceService } from '../workspace/service.js';
import type { WorkspaceService } from '../workspace/types.js';
import { DefaultKeybindingManager } from '../keybindings/manager.js';
import type { KeybindingManager } from '../keybindings/types.js';
import { DefaultSearchService } from '../search/service.js';
import type { SearchService } from '../search/types.js';
import { DefaultScriptEngine } from '../scripts/engine.js';
import type { ScriptEngine } from '../scripts/types.js';
import { DefaultSymbolDatabase } from '../symbols/database.js';
import type { SymbolDatabase } from '../symbols/types.js';
import { DefaultPermissionService } from '../permissions/service.js';
import type { PermissionService } from '../permissions/types.js';
import { DefaultPluginManager } from '../plugins/manager.js';
import type { PluginManager } from '../plugins/types.js';
import { DefaultEditorService } from '../editor/service.js';
import type { EditorService } from '../editor/types.js';
import { DefaultInfoService } from '../info/service.js';
import type { InfoService } from '../info/service.js';
import { DefaultUserLibrary } from '../library/user-library.js';
import type { UserLibrary } from '../library/user-library.js';
import {
  registerBuiltinAliases,
  registerBuiltinCommands,
  registerBuiltinKeybindings,
} from './builtins.js';
import type { SearchProvider } from '../search/types.js';

export const Tokens = {
  EventBus: createToken<EventBus>('EventBus'),
  CommandRegistry: createToken<CommandRegistry>('CommandRegistry'),
  AliasRegistry: createToken<AliasRegistry>('AliasRegistry'),
  DatabaseService: createToken<DatabaseService>('DatabaseService'),
  Logger: createToken<Logger>('Logger'),
  DiagnosticsService: createToken<DiagnosticsService>('DiagnosticsService'),
  SettingsService: createToken<SettingsService>('SettingsService'),
  ProjectService: createToken<ProjectService>('ProjectService'),
  WorkspaceService: createToken<WorkspaceService>('WorkspaceService'),
  KeybindingManager: createToken<KeybindingManager>('KeybindingManager'),
  SearchService: createToken<SearchService>('SearchService'),
  ScriptEngine: createToken<ScriptEngine>('ScriptEngine'),
  SymbolDatabase: createToken<SymbolDatabase>('SymbolDatabase'),
  PermissionService: createToken<PermissionService>('PermissionService'),
  PluginManager: createToken<PluginManager>('PluginManager'),
  EditorService: createToken<EditorService>('EditorService'),
  InfoService: createToken<InfoService>('InfoService'),
  UserLibrary: createToken<UserLibrary>('UserLibrary'),
} as const;

export interface PlatformOptions {
  readonly userLibraryPath?: string;
  readonly databasePath?: string;
}

export interface IdePlatform {
  readonly container: ServiceContainer;
  start(): Promise<void>;
  shutdown(): Promise<void>;
  executeCommand(name: string, args?: Record<string, unknown>): Promise<unknown>;
  getInfo(topic: string): unknown;
}

export async function createIdePlatform(options: PlatformOptions = {}): Promise<IdePlatform> {
  const container = new DefaultServiceContainer();

  const eventBus = new DefaultEventBus();
  for (const meta of STANDARD_EVENT_METADATA) {
    eventBus.registerEvent(meta);
  }

  const commands = new DefaultCommandRegistry();
  const aliases = new DefaultAliasRegistry();
  const database = new DefaultDatabaseService();
  const logger = new DefaultLogger('ide-platform');
  const diagnostics = new DefaultDiagnosticsService();
  const settings = new DefaultSettingsService();
  const project = new DefaultProjectService();
  const workspace = new DefaultWorkspaceService();
  const keybindings = new DefaultKeybindingManager();
  const search = new DefaultSearchService();
  const scripts = new DefaultScriptEngine();
  const symbols = new DefaultSymbolDatabase();
  const permissions = new DefaultPermissionService();
  const editor = new DefaultEditorService();
  const userLibrary = new DefaultUserLibrary(options.userLibraryPath ?? 'UserLibrary');

  const pluginManager = new DefaultPluginManager(container, (cmd) => commands.register(cmd));

  const info = new DefaultInfoService({
    commands,
    aliases,
    project,
    workspace,
    plugins: pluginManager,
    scripts,
    database,
    keybindings,
    diagnostics,
    settings,
    symbols,
    logger,
  });

  container.registerInstance(Tokens.EventBus, eventBus);
  container.registerInstance(Tokens.CommandRegistry, commands);
  container.registerInstance(Tokens.AliasRegistry, aliases);
  container.registerInstance(Tokens.DatabaseService, database);
  container.registerInstance(Tokens.Logger, logger);
  container.registerInstance(Tokens.DiagnosticsService, diagnostics);
  container.registerInstance(Tokens.SettingsService, settings);
  container.registerInstance(Tokens.ProjectService, project);
  container.registerInstance(Tokens.WorkspaceService, workspace);
  container.registerInstance(Tokens.KeybindingManager, keybindings);
  container.registerInstance(Tokens.SearchService, search);
  container.registerInstance(Tokens.ScriptEngine, scripts);
  container.registerInstance(Tokens.SymbolDatabase, symbols);
  container.registerInstance(Tokens.PermissionService, permissions);
  container.registerInstance(Tokens.PluginManager, pluginManager);
  container.registerInstance(Tokens.EditorService, editor);
  container.registerInstance(Tokens.InfoService, info);
  container.registerInstance(Tokens.UserLibrary, userLibrary);

  settings.register({
    key: 'editor',
    displayName: 'Editor Settings',
    description: 'Editor configuration',
    type: 'object',
    defaultValue: { tabSize: 2, fontSize: 14 },
    scope: 'global',
    category: 'editor',
  });

  registerBuiltinCommands(commands, { info, editor, project, aliases, keybindings });
  registerBuiltinAliases(aliases);
  registerBuiltinKeybindings(keybindings);

  const commandProvider: SearchProvider = {
    type: 'command',
    search(query: string) {
      return commands.search(query).map((r) => ({
        id: r.command.metadata.uuid,
        type: 'command' as const,
        title: r.command.metadata.displayName,
        subtitle: r.command.metadata.name,
        description: r.command.metadata.description,
        score: r.score,
        metadata: { command: r.command.metadata.name },
      }));
    },
  };
  search.registerProvider(commandProvider);

  return {
    container,
    async start() {
      await database.connect({ provider: 'sqlite', filePath: options.databasePath });
      logger.info('IDE platform started');
      await eventBus.emit('OnStartup', { version: '0.1.0' });
    },
    async shutdown() {
      await eventBus.emit('OnShutdown', {});
      await container.dispose();
      logger.info('IDE platform shut down');
    },
    async executeCommand(name: string, args?: Record<string, unknown>) {
      const aliasResolution = aliases.resolve(name, args);
      const commandName = aliasResolution?.commandName ?? name;
      const mergedArgs = aliasResolution?.args ?? args ?? {};
      const result = await commands.execute(commandName, { source: 'api', args: mergedArgs });
      await eventBus.emit('OnCommandExecuted', { command: commandName, success: result.success });
      if (!result.success) {
        throw new Error(result.error ?? 'Command failed');
      }
      return result.data;
    },
    getInfo(topic: string) {
      return info.get(topic as Parameters<InfoService['get']>[0]);
    },
  };
}
