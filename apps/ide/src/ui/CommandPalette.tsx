import { useState } from 'react';
import type { CommandDefinition } from '@playground/ide-core';
import { useCommands, useExecuteCommand } from '../hooks/useIdeServices';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const commands = useCommands();
  const execute = useExecuteCommand();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  if (!open) return null;

  const filtered = filterCommands(commands, query).slice(0, 20);

  const run = async (cmd: CommandDefinition) => {
    try {
      await execute(cmd.metadata.name);
    } catch {
      // command may require args
    }
    onClose();
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowDown') setSelected((s) => Math.min(s + 1, filtered.length - 1));
    if (e.key === 'ArrowUp') setSelected((s) => Math.max(s - 1, 0));
    if (e.key === 'Enter' && filtered[selected]) {
      e.preventDefault();
      run(filtered[selected]);
    }
  };

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="palette-input"
          placeholder="Type a command…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          onKeyDown={onKeyDown}
        />
        <ul className="palette-results">
          {filtered.map((cmd, i) => (
            <li
              key={cmd.metadata.uuid}
              className={i === selected ? 'selected' : ''}
              onClick={() => run(cmd)}
            >
              <span className="palette-icon">{cmd.metadata.icon ?? '⌘'}</span>
              <div className="palette-item-body">
                <span className="palette-title">{cmd.metadata.displayName}</span>
                <span className="palette-desc">{cmd.metadata.description || cmd.metadata.name}</span>
              </div>
              <span className="palette-meta">{cmd.metadata.category}</span>
              {cmd.keybindings[0] && <span className="palette-shortcut">{cmd.keybindings[0]}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function filterCommands(commands: readonly CommandDefinition[], query: string): CommandDefinition[] {
  if (!query.trim()) return commands.filter((c) => c.metadata.visibility !== 'hidden');
  const q = query.toLowerCase();
  return commands
    .filter(
      (c) =>
        c.metadata.visibility !== 'hidden' &&
        (c.metadata.name.toLowerCase().includes(q) ||
          c.metadata.displayName.toLowerCase().includes(q) ||
          c.metadata.description.toLowerCase().includes(q) ||
          c.metadata.category.toLowerCase().includes(q)),
    )
    .sort((a, b) => a.metadata.displayName.localeCompare(b.metadata.displayName));
}
