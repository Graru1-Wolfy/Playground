import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createMetadata } from '../metadata/types.js';
import type { Plugin, PluginManifest } from './types.js';
import type { PluginManager } from './types.js';

export async function loadPluginsFromDirectory(
  directory: string,
  manager: PluginManager,
): Promise<readonly string[]> {
  const loaded: string[] = [];
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = join(directory, entry.name, 'plugin.json');
      try {
        const raw = await readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(raw) as PluginManifest & { activate?: string };
        const plugin: Plugin = {
          manifest: {
            ...manifest,
            metadata: createMetadata({
              name: manifest.metadata?.name ?? entry.name,
              displayName: manifest.metadata?.displayName ?? entry.name,
              version: manifest.metadata?.version ?? '1.0.0',
              description: manifest.metadata?.description ?? '',
            }),
          },
          async activate() {
            // Plugin activation handled by manifest contributes
          },
          async deactivate() {},
        };
        await manager.load(plugin);
        loaded.push(entry.name);
      } catch {
        // skip invalid plugins
      }
    }
  } catch {
    // plugins directory may not exist
  }
  return loaded;
}
