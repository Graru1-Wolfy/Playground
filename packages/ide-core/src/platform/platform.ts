import { homedir } from 'node:os';
import { join } from 'node:path';
import { DefaultServiceContainer } from '../di/container.js';
import { DefaultEventBus } from '../events/event-bus.js';
import { STANDARD_EVENT_METADATA } from '../events/types.js';
import { DefaultCommandRegistry } from '../commands/registry.js';
import { DefaultCommandHistoryService } from '../commands/history-service.js';
import { DefaultAliasRegistry } from '../aliases/registry.js';
import { DefaultDatabaseService } from '../database/service.js';
import { DefaultLogger } from '../logging/logger.js';
import { DefaultDiagnosticsService } from '../logging/diagnostics.js';
import { DefaultSettingsService } from '../settings/service.js';
import { DefaultProjectService } from '../project/service.js';
import { DefaultWorkspaceService } from '../workspace/service.js';
import { DefaultKeybindingManager } from '../keybindings/manager.js';
import { DefaultSearchService } from '../search/service.js';
import { registerAllSearchProviders } from '../search/providers.js';
import { DefaultScriptEngine } from '../scripts/engine.js';
import { DefaultSymbolDatabase } from '../symbols/database.js';
import { DefaultPermissionService } from '../permissions/service.js';
import { DefaultPluginManager } from '../plugins/manager.js';
import { loadPluginsFromDirectory } from '../plugins/loader.js';
import { DefaultEditorService } from '../editor/service.js';
import { DefaultInfoService } from '../info/service.js';
import { DefaultUserLibrary } from '../library/user-library.js';
import { NodeFilesystemService } from '../filesystem/node-filesystem.js';
import { DefaultThemeService } from '../theme/service.js';
import { DefaultAssetDatabase } from '../assets/database.js';
import { DefaultPackageManagerService } from '../packages/manager.js';
import {
  registerBuiltinAliases,
  registerBuiltinCommands,
  registerBuiltinKeybindings,
  loadGlobalAliases,
} from './builtins.js';
import { Tokens, type IdePlatform, type PlatformOptions } from './tokens.js';

export { Tokens };
export type { IdePlatform, PlatformOptions };

const recentFiles: { path: string; timestamp: number }[] = [];

export async function createIdePlatform(options: PlatformOptions = {}): Promise<IdePlatform> {
  const container = new DefaultServiceContainer();
  const rootPath = options.rootPath ?? process.cwd();

  const eventBus = new DefaultEventBus();
  for (const meta of STANDARD_EVENT_METADATA) eventBus.registerEvent(meta);

  const history = new DefaultCommandHistoryService();
  const permissions = new DefaultPermissionService();
  const commands = new DefaultCommandRegistry({ history, permissions });
  const aliases = new DefaultAliasRegistry();
  const database = new DefaultDatabaseService();
  const logger = new DefaultLogger('ide-platform');
  const diagnostics = new DefaultDiagnosticsService();
  const settings = new DefaultSettingsService();
  const scripts = new DefaultScriptEngine();
  const symbols = new DefaultSymbolDatabase();
  const editor = new DefaultEditorService();
  const workspace = new DefaultWorkspaceService();
  const keybindings = new DefaultKeybindingManager();
  const search = new DefaultSearchService();
  const theme = new DefaultThemeService();
  const assets = new DefaultAssetDatabase();
  const packages = new DefaultPackageManagerService();
  const filesystem = options.filesystem ?? new NodeFilesystemService(rootPath);
  const userLibrary = new DefaultUserLibrary(options.userLibraryPath ?? 'UserLibrary');

  const project = new DefaultProjectService({
    aliasRegistry: aliases,
    scriptEngine: scripts,
    eventBus,
  });

  const pluginManager = new DefaultPluginManager(container, (cmd) => commands.register(cmd));

  const info = new DefaultInfoService({
    commands, aliases, project, workspace, plugins: pluginManager,
    scripts, database, keybindings, diagnostics, settings, symbols, logger,
  });

  container.registerInstance(Tokens.EventBus, eventBus);
  container.registerInstance(Tokens.CommandRegistry, commands);
  container.registerInstance(Tokens.CommandHistory, history);
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
  container.registerInstance(Tokens.FilesystemService, filesystem);
  container.registerInstance(Tokens.ThemeService, theme);
  container.registerInstance(Tokens.AssetDatabase, assets);
  container.registerInstance(Tokens.PackageManager, packages);

  settings.register({
    key: 'editor', displayName: 'Editor Settings', description: 'Editor configuration',
    type: 'object', defaultValue: { tabSize: 2, fontSize: 14 }, scope: 'global', category: 'editor',
  });
  settings.register({
    key: 'theme', displayName: 'Theme', description: 'Active theme',
    type: 'string', defaultValue: 'dark', scope: 'user', category: 'appearance',
  });

  registerBuiltinCommands(commands, {
    info, editor, project, aliases, keybindings, filesystem, eventBus, symbols,
  });
  registerBuiltinAliases(aliases);
  registerBuiltinKeybindings(keybindings);

  registerAllSearchProviders({
    search, commands, aliases, scripts, settings, fs: filesystem,
    getRecent: () => recentFiles,
  });

  const dbPath = options.databasePath ?? join(homedir(), '.playground-ide', 'platform.db');

  return {
    container,
    async start() {
      await database.connect({ provider: 'sqlite', filePath: dbPath });
      await database.migrate();
      const conn = database.getConnection();
      if (conn) settings.setDatabase(conn);

      const globalAliases = options.globalAliasesPath ?? join(homedir(), '.playground-ide', 'aliases');
      await loadGlobalAliases(aliases, globalAliases);

      const pluginsPath = options.pluginsPath ?? join(rootPath, 'plugins');
      await loadPluginsFromDirectory(pluginsPath, pluginManager);

      logger.info('IDE platform started', { dbPath, rootPath });
      await eventBus.emit('OnStartup', { version: '0.1.0' });
    },
    async shutdown() {
      await eventBus.emit('OnShutdown', {});
      database.getConnection()?.close();
      await container.dispose();
      logger.info('IDE platform shut down');
    },
    async executeCommand(name: string, args?: Record<string, unknown>) {
      const aliasResolution = aliases.resolve(name, args);
      const commandName = aliasResolution?.commandName ?? name;
      const mergedArgs = aliasResolution?.args ?? args ?? {};
      const result = await commands.execute(commandName, { source: 'api', args: mergedArgs });
      await eventBus.emit('OnCommandExecuted', { command: commandName, success: result.success });
      if (!result.success) throw new Error(result.error ?? 'Command failed');
      if (commandName === 'editor.open' && mergedArgs.path) {
        recentFiles.unshift({ path: String(mergedArgs.path), timestamp: Date.now() });
        if (recentFiles.length > 50) recentFiles.pop();
      }
      return result.data;
    },
    getInfo(topic: string) {
      return info.get(topic as Parameters<typeof info.get>[0]);
    },
  };
}
