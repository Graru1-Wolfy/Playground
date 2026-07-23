import type { MetadataScope } from '../metadata/types.js';

export type InputDevice = 'keyboard' | 'mouse' | 'gamepad' | 'tablet';

export interface KeyChord {
  readonly keys: readonly string[];
  readonly device: InputDevice;
  readonly sequence?: readonly string[];
}

export interface KeybindingDefinition {
  readonly id: string;
  readonly command: string;
  readonly chord: KeyChord;
  readonly scope: MetadataScope;
  readonly when?: string;
  readonly description: string;
  readonly enabled: boolean;
}

export interface KeybindingConflict {
  readonly binding: KeybindingDefinition;
  readonly conflictsWith: KeybindingDefinition;
  readonly chordString: string;
}

export interface KeybindingManager {
  register(binding: KeybindingDefinition): void;
  unregister(id: string): boolean;
  get(id: string): KeybindingDefinition | undefined;
  list(scope?: MetadataScope): readonly KeybindingDefinition[];
  resolve(chord: KeyChord): KeybindingDefinition | undefined;
  detectConflicts(): readonly KeybindingConflict[];
  search(query: string): readonly KeybindingDefinition[];
  importBindings(bindings: readonly KeybindingDefinition[], scope?: MetadataScope): void;
  exportBindings(scope?: MetadataScope): readonly KeybindingDefinition[];
  chordToString(chord: KeyChord): string;
}
