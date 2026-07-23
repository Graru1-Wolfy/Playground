import type { CommandDefinition } from '../commands/types.js';
import type { ServiceContainer } from '../di/types.js';
import type {
  Plugin,
  PluginContext,
  PluginManager,
  SidebarContribution,
} from './types.js';

export class DefaultPluginManager implements PluginManager {
  private readonly plugins = new Map<string, Plugin>();
  private readonly enabled = new Set<string>();
  private readonly sidebars: SidebarContribution[] = [];
  private readonly container: ServiceContainer;
  private readonly registerCommandFn: (command: CommandDefinition) => void;

  constructor(
    container: ServiceContainer,
    registerCommand: (command: CommandDefinition) => void,
  ) {
    this.container = container;
    this.registerCommandFn = registerCommand;
  }

  async load(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.manifest.metadata.name)) {
      throw new Error(`Plugin already loaded: ${plugin.manifest.metadata.name}`);
    }

    const context: PluginContext = {
      container: this.container,
      pluginId: plugin.manifest.metadata.name,
      registerCommand: (cmd) => this.registerCommandFn(cmd),
      registerSidebar: (panel) => this.sidebars.push(panel),
      registerService: () => {
        throw new Error('Plugin service registration requires platform wiring');
      },
    };

    await plugin.activate(context);
    this.plugins.set(plugin.manifest.metadata.name, plugin);
    this.enabled.add(plugin.manifest.metadata.name);
  }

  async unload(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;
    await plugin.deactivate();
    this.plugins.delete(pluginId);
    this.enabled.delete(pluginId);
    return true;
  }

  get(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  list(): readonly Plugin[] {
    return [...this.plugins.values()];
  }

  isEnabled(pluginId: string): boolean {
    return this.enabled.has(pluginId);
  }

  setEnabled(pluginId: string, enabled: boolean): void {
    if (enabled) {
      this.enabled.add(pluginId);
    } else {
      this.enabled.delete(pluginId);
    }
  }

  getSidebars(): readonly SidebarContribution[] {
    return [...this.sidebars].sort((a, b) => a.order - b.order);
  }
}
