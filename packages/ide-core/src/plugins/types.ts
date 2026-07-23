import type { Metadata } from '../metadata/types.js';
import type { ServiceContainer } from '../di/types.js';
import type { CommandDefinition } from '../commands/types.js';

export interface PluginManifest {
  readonly metadata: Metadata;
  readonly entryPoint: string;
  readonly dependencies: readonly string[];
  readonly contributes: Readonly<{
    commands?: readonly string[];
    menus?: readonly string[];
    panels?: readonly string[];
    themes?: readonly string[];
    sidebars?: readonly string[];
    events?: readonly string[];
    services?: readonly string[];
  }>;
}

export interface PluginContext {
  readonly container: ServiceContainer;
  readonly pluginId: string;
  registerCommand(command: CommandDefinition): void;
  registerSidebar(panel: SidebarContribution): void;
  registerService<T>(token: symbol, factory: (ctx: PluginContext) => T): void;
}

export interface SidebarContribution {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly position: 'left' | 'right' | 'bottom';
  readonly order: number;
}

export interface Plugin {
  readonly manifest: PluginManifest;
  activate(context: PluginContext): Promise<void> | void;
  deactivate(): Promise<void> | void;
}

export interface PluginManager {
  load(plugin: Plugin): Promise<void>;
  unload(pluginId: string): Promise<boolean>;
  get(pluginId: string): Plugin | undefined;
  list(): readonly Plugin[];
  isEnabled(pluginId: string): boolean;
  setEnabled(pluginId: string, enabled: boolean): void;
}
