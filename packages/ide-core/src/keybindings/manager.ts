import type {
  KeybindingConflict,
  KeybindingDefinition,
  KeybindingManager,
  KeyChord,
  InputDevice,
} from './types.js';
import type { MetadataScope } from '../metadata/types.js';

const MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift', 'Meta'];

export function chordToString(chord: KeyChord): string {
  const parts = [...chord.keys].sort((a, b) => {
    const ai = MODIFIER_ORDER.indexOf(a);
    const bi = MODIFIER_ORDER.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b);
  });
  if (chord.sequence?.length) {
    return [...chord.sequence, parts.join('+')].join(' ');
  }
  return parts.join('+');
}

export function parseChordString(input: string, device: InputDevice = 'keyboard'): KeyChord {
  const sequenceParts = input.trim().split(/\s+/);
  if (sequenceParts.length > 1) {
    const last = sequenceParts[sequenceParts.length - 1];
    return {
      keys: last.split('+').map((k) => k.trim()),
      device,
      sequence: sequenceParts.slice(0, -1),
    };
  }
  return {
    keys: input.split('+').map((k) => k.trim()),
    device,
  };
}

export class DefaultKeybindingManager implements KeybindingManager {
  private readonly bindings = new Map<string, KeybindingDefinition>();

  register(binding: KeybindingDefinition): void {
    this.bindings.set(binding.id, binding);
  }

  unregister(id: string): boolean {
    return this.bindings.delete(id);
  }

  get(id: string): KeybindingDefinition | undefined {
    return this.bindings.get(id);
  }

  list(scope?: MetadataScope): readonly KeybindingDefinition[] {
    const all = [...this.bindings.values()].filter((b) => b.enabled);
    if (!scope) return all;
    return all.filter((b) => b.scope === scope || b.scope === 'global');
  }

  resolve(chord: KeyChord): KeybindingDefinition | undefined {
    const target = chordToString(chord);
    const candidates = this.list().filter((b) => chordToString(b.chord) === target);
    const priority: MetadataScope[] = ['project', 'workspace', 'user', 'global'];
    for (const scope of priority) {
      const match = candidates.find((b) => b.scope === scope);
      if (match) return match;
    }
    return candidates[0];
  }

  detectConflicts(): readonly KeybindingConflict[] {
    const conflicts: KeybindingConflict[] = [];
    const byChord = new Map<string, KeybindingDefinition[]>();
    for (const binding of this.list()) {
      const key = chordToString(binding.chord);
      const list = byChord.get(key) ?? [];
      list.push(binding);
      byChord.set(key, list);
    }
    for (const [chordString, group] of byChord) {
      if (group.length < 2) continue;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          conflicts.push({
            binding: group[i],
            conflictsWith: group[j],
            chordString,
          });
        }
      }
    }
    return conflicts;
  }

  search(query: string): readonly KeybindingDefinition[] {
    const q = query.toLowerCase();
    return this.list().filter(
      (b) =>
        b.command.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        chordToString(b.chord).toLowerCase().includes(q),
    );
  }

  importBindings(bindings: readonly KeybindingDefinition[], scope: MetadataScope = 'user'): void {
    for (const binding of bindings) {
      this.register({ ...binding, scope });
    }
  }

  exportBindings(scope?: MetadataScope): readonly KeybindingDefinition[] {
    return this.list(scope);
  }

  chordToString(chord: KeyChord): string {
    return chordToString(chord);
  }
}
