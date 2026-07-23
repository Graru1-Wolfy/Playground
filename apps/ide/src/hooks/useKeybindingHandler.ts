import { useEffect } from 'react';
import { usePlatform } from '../platform/PlatformContext';
import { Tokens, type KeybindingDefinition } from '@playground/ide-core/browser';

export function useKeybindingHandler(): void {
  const platform = usePlatform();

  useEffect(() => {
    const keybindings = platform.container.resolve(Tokens.KeybindingManager);

    const onKeyDown = (e: KeyboardEvent) => {
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Meta');
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      }
      const chordStr = parts.join('+');
      const binding = keybindings.list().find(
        (b: KeybindingDefinition) => keybindings.chordToString(b.chord) === chordStr,
      );
      if (binding) {
        e.preventDefault();
        platform.executeCommand(binding.command).catch(() => {});
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [platform]);
}
