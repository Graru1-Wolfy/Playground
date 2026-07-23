import { createToken } from '../di/types.js';
import type { EventBus } from '../events/types.js';
import type { CommandRegistry } from '../commands/types.js';
import type { CommandHistoryService } from '../commands/history.js';
import type { AliasRegistry } from '../aliases/types.js';
import type { DatabaseService } from '../database/types.js';
import type { Logger, DiagnosticsService } from '../logging/types.js';
import type { SettingsService } from '../settings/types.js';
import type { ProjectService } from '../project/types.js';
import type { WorkspaceService } from '../workspace/types.js';
import type { KeybindingManager } from '../keybindings/types.js';
import type { SearchService } from '../search/types.js';
import type { ScriptEngine } from '../scripts/types.js';
import type { SymbolDatabase } from '../symbols/types.js';
import type { PermissionService } from '../permissions/types.js';
import type { PluginManager } from '../plugins/types.js';
import type { EditorService } from '../editor/types.js';
import type { InfoService } from '../info/service.js';
import type { UserLibrary } from '../library/user-library.js';
import type { FilesystemService } from '../filesystem/types.js';
import type { ThemeService } from '../theme/service.js';
import type { AssetDatabase } from '../assets/database.js';
import type { PackageManagerService } from '../packages/manager.js';
import type { ServiceContainer } from '../di/types.js';

export const Tokens = {
  EventBus: createToken<EventBus>('EventBus'),
  CommandRegistry: createToken<CommandRegistry>('CommandRegistry'),
  CommandHistory: createToken<CommandHistoryService>('CommandHistory'),
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
  FilesystemService: createToken<FilesystemService>('FilesystemService'),
  ThemeService: createToken<ThemeService>('ThemeService'),
  AssetDatabase: createToken<AssetDatabase>('AssetDatabase'),
  PackageManager: createToken<PackageManagerService>('PackageManager'),
} as const;

export interface IdePlatform {
  readonly container: ServiceContainer;
  start(): Promise<void>;
  shutdown(): Promise<void>;
  executeCommand(name: string, args?: Record<string, unknown>): Promise<unknown>;
  getInfo(topic: string): unknown;
}

export interface PlatformOptions {
  readonly userLibraryPath?: string;
  readonly databasePath?: string;
  readonly globalAliasesPath?: string;
  readonly pluginsPath?: string;
  readonly rootPath?: string;
  readonly filesystem?: FilesystemService;
}
