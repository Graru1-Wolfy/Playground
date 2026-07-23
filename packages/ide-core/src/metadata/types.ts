/** Scope for metadata-driven objects (commands, aliases, settings, etc.). */
export type MetadataScope = 'global' | 'user' | 'workspace' | 'project';

/** Visibility controls discoverability in UI and search. */
export type MetadataVisibility = 'public' | 'internal' | 'hidden';

/** Base metadata shared by every data-driven IDE object. */
export interface Metadata {
  readonly uuid: string;
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly version: string;
  readonly author: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly permissions: readonly string[];
  readonly visibility: MetadataVisibility;
  readonly icon?: string;
  readonly enabled: boolean;
  readonly scope: MetadataScope;
  readonly custom: Readonly<Record<string, unknown>>;
}

export type MetadataInput = Partial<Metadata> & Pick<Metadata, 'name' | 'displayName'>;

const DEFAULT_METADATA: Omit<Metadata, 'name' | 'displayName'> = {
  uuid: '',
  description: '',
  version: '1.0.0',
  author: 'system',
  category: 'general',
  tags: [],
  permissions: [],
  visibility: 'public',
  enabled: true,
  scope: 'global',
  custom: {},
};

export function createMetadata(input: MetadataInput): Metadata {
  return {
    ...DEFAULT_METADATA,
    ...input,
    uuid: input.uuid ?? crypto.randomUUID(),
    tags: [...(input.tags ?? DEFAULT_METADATA.tags)],
    permissions: [...(input.permissions ?? DEFAULT_METADATA.permissions)],
    custom: { ...(input.custom ?? {}) },
  };
}

export function mergeMetadata(base: Metadata, patch: Partial<Metadata>): Metadata {
  return {
    ...base,
    ...patch,
    tags: patch.tags ? [...patch.tags] : [...base.tags],
    permissions: patch.permissions ? [...patch.permissions] : [...base.permissions],
    custom: { ...base.custom, ...(patch.custom ?? {}) },
  };
}
