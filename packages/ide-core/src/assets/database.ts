import type { Metadata } from '../metadata/types.js';

export interface AssetEntry {
  readonly metadata: Metadata;
  readonly path: string;
  readonly assetType: string;
  readonly thumbnail?: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface AssetDatabase {
  register(asset: AssetEntry): void;
  unregister(uuid: string): boolean;
  get(uuid: string): AssetEntry | undefined;
  list(filter?: { assetType?: string }): readonly AssetEntry[];
  search(query: string): readonly AssetEntry[];
}

export class DefaultAssetDatabase implements AssetDatabase {
  private readonly assets = new Map<string, AssetEntry>();

  register(asset: AssetEntry): void {
    this.assets.set(asset.metadata.uuid, asset);
  }

  unregister(uuid: string): boolean {
    return this.assets.delete(uuid);
  }

  get(uuid: string): AssetEntry | undefined {
    return this.assets.get(uuid);
  }

  list(filter?: { assetType?: string }): readonly AssetEntry[] {
    const all = [...this.assets.values()];
    if (!filter?.assetType) return all;
    return all.filter((a) => a.assetType === filter.assetType);
  }

  search(query: string): readonly AssetEntry[] {
    const q = query.toLowerCase();
    return [...this.assets.values()].filter(
      (a) =>
        a.metadata.name.toLowerCase().includes(q) ||
        a.metadata.displayName.toLowerCase().includes(q) ||
        a.assetType.toLowerCase().includes(q),
    );
  }
}
