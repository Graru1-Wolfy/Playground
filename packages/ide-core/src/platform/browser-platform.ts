/**
 * Browser-safe platform bootstrap — no Node.js dependencies.
 * Use this entry point in web builds; use createIdePlatform from main for Node/Electron/API.
 */
import { DefaultServiceContainer } from '../di/container.js';
import { DefaultEventBus } from '../events/event-bus.js';
import { STANDARD_EVENT_METADATA } from '../events/types.js';
import { DefaultCommandRegistry } from '../commands/registry.js';
import { DefaultCommandHistoryService } from '../commands/history-service.js';
import { DefaultAliasRegistry } from '../aliases/registry.js';
import { BrowserDatabaseService } from '../database/browser-service.js';
import { DefaultLogger } from '../logging/logger.js';
import { DefaultDiagnosticsService } from '../logging/diagnostics.js';
import { DefaultSettingsService } from '../settings/service.js';
import { BrowserProjectService } from '../project/browser-service.js';
import { DefaultWorkspaceService } from '../workspace/service.js';
import { DefaultKeybindingManager } from '../keybindings/manager.js';
import { DefaultSearchService } from '../search/service.js';
import { registerAllSearchProviders } from '../search/providers.js';
import { DefaultScriptEngine } from '../scripts/engine.js';
import { DefaultSymbolDatabase } from '../symbols/database.js';
import { DefaultPermissionService } from '../permissions/service.js';
import { DefaultPluginManager } from '../plugins/manager.js';
import { DefaultEditorService } from '../editor/service.js';
import { DefaultInfoService } from '../info/service.js';
import { DefaultUserLibrary } from '../library/user-library.js';
import { DefaultThemeService } from '../theme/service.js';
import { DefaultAssetDatabase } from '../assets/database.js';
import { DefaultPackageManagerService } from '../packages/manager.js';
import { ApiFilesystemService } from '../filesystem/api-filesystem.js';
import {
  registerBuiltinAliases,
  registerBuiltinCommands,
  registerBuiltinKeybindings,
} from './builtins.js';
import { Tokens, type IdePlatform } from './tokens.js';

export { Tokens };
export type { IdePlatform };
export { chordToString, parseChordString } from '../keybindings/manager.js';
export type { KeyChord, KeybindingDefinition } from '../keybindings/types.js';
export type { CommandDefinition } from '../commands/types.js';
export type { SearchResult } from '../search/types.js';
export type { WorkspaceProfile } from '../workspace/types.js';
export type { EditorDocument } from '../editor/types.js';

export async function createBrowserIdePlatform(apiBase = 'http://localhost:3100'): Promise<IdePlatform> {
  const container = new DefaultServiceContainer();
  const eventBus = new DefaultEventBus();
  for (const meta of STANDARD_EVENT_METADATA) eventBus.registerEvent(meta);

  const history = new DefaultCommandHistoryService();
  const permissions = new DefaultPermissionService();
  const commands = new DefaultCommandRegistry({ history, permissions });
  const aliases = new DefaultAliasRegistry();
  const database = new BrowserDatabaseService();
  const logger = new DefaultLogger('ide-browser');
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
  const filesystem = new ApiFilesystemService(apiBase);
  const userLibrary = new DefaultUserLibrary('UserLibrary');
  const project = new BrowserProjectService();
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

  registerBuiltinCommands(commands, { info, editor, project, aliases, keybindings, filesystem, eventBus, symbols });
  registerBuiltinAliases(aliases);
  registerBuiltinKeybindings(keybindings);
  registerAllSearchProviders({ search, commands, aliases, scripts, settings, fs: filesystem });

  return {
    container,
    async start() {
      await database.connect({ provider: 'sqlite' });
      logger.info('IDE browser platform started');
      await eventBus.emit('OnStartup', { version: '0.1.0', mode: 'browser' });
    },
    async shutdown() {
      await eventBus.emit('OnShutdown', {});
      await container.dispose();
    },
    async executeCommand(name: string, args?: Record<string, unknown>) {
      try {
        const res = await fetch(`${apiBase}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, args }),
        });
        const data = await res.json() as { success: boolean; data?: unknown; error?: string };
        if (data.success) return data.data;
      } catch {
        // fall through to local
      }
      const aliasResolution = aliases.resolve(name, args);
      const commandName = aliasResolution?.commandName ?? name;
      const mergedArgs = aliasResolution?.args ?? args ?? {};
      const result = await commands.execute(commandName, { source: 'api', args: mergedArgs });
      await eventBus.emit('OnCommandExecuted', { command: commandName, success: result.success });
      if (!result.success) throw new Error(result.error ?? 'Command failed');
      return result.data;
    },
    getInfo(topic: string) {
      return info.get(topic as Parameters<typeof info.get>[0]);
    },
  };
}
