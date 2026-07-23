// Dependency injection
export { DefaultServiceContainer } from './di/container.js';
export { createToken } from './di/types.js';
export type { ServiceContainer, ServiceDescriptor, ServiceToken } from './di/types.js';

// Metadata
export { createMetadata, mergeMetadata } from './metadata/types.js';
export type { Metadata, MetadataInput, MetadataScope, MetadataVisibility } from './metadata/types.js';

// Events
export { DefaultEventBus } from './events/event-bus.js';
export { StandardEvents, STANDARD_EVENT_METADATA } from './events/types.js';
export type { Event, EventBus, EventHandler, EventMetadata, EventPayload } from './events/types.js';

// Commands
export { DefaultCommandRegistry, defineCommand } from './commands/registry.js';
export type { CommandContext, CommandDefinition, CommandRegistry, CommandResult } from './commands/types.js';

// Aliases
export { DefaultAliasRegistry } from './aliases/registry.js';
export type { AliasDefinition, AliasRegistry, AliasResolution } from './aliases/types.js';

// Database
export { DefaultDatabaseService } from './database/service.js';
export type { DatabaseConfig, DatabaseConnection, DatabaseService } from './database/types.js';

// Logging & diagnostics
export { DefaultLogger } from './logging/logger.js';
export { DefaultDiagnosticsService } from './logging/diagnostics.js';
export type { Logger, LogEntry, Diagnostic, DiagnosticsService } from './logging/types.js';

// Settings
export { DefaultSettingsService } from './settings/service.js';
export type { SettingDefinition, SettingsService } from './settings/types.js';

// Project & workspace
export { DefaultProjectService } from './project/service.js';
export type { ProjectConfig, ProjectService } from './project/types.js';
export { DefaultWorkspaceService } from './workspace/service.js';
export type { WorkspaceProfile, WorkspaceService, DockPanelState } from './workspace/types.js';

// Keybindings
export { DefaultKeybindingManager, chordToString, parseChordString } from './keybindings/manager.js';
export type { KeybindingDefinition, KeybindingManager, KeyChord } from './keybindings/types.js';

// Search
export { DefaultSearchService } from './search/service.js';
export type { SearchResult, SearchService, SearchProvider } from './search/types.js';

// Scripts
export { DefaultScriptEngine } from './scripts/engine.js';
export type { ScriptDefinition, ScriptEngine, ScriptLanguage, LogicNode } from './scripts/types.js';

// Symbols
export { DefaultSymbolDatabase } from './symbols/database.js';
export type { SymbolDatabase, SymbolEntry, SymbolKind } from './symbols/types.js';

// Permissions
export { DefaultPermissionService } from './permissions/service.js';
export type { Permission, PermissionService } from './permissions/types.js';

// Plugins
export { DefaultPluginManager } from './plugins/manager.js';
export type { Plugin, PluginContext, PluginManager, PluginManifest } from './plugins/types.js';

// Editor
export { DefaultEditorService } from './editor/service.js';
export type { EditorDocument, EditorService } from './editor/types.js';

// Info
export { DefaultInfoService } from './info/service.js';
export type { InfoResult, InfoService, InfoTopic } from './info/service.js';

// User library
export { DefaultUserLibrary } from './library/user-library.js';
export type { UserLibrary, LibraryModule } from './library/user-library.js';

// Platform
export { createIdePlatform, Tokens } from './platform/platform.js';
export type { IdePlatform, PlatformOptions } from './platform/platform.js';
