import { useState, useEffect } from 'react';
import { chordToString, parseChordString, type KeyChord } from '@playground/ide-core';

interface KeyRecordingDialogProps {
  open: boolean;
  onAccept: (chord: KeyChord) => void;
  onCancel: () => void;
  onClear: () => void;
  defaultChord?: string;
}

const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta']);

export function KeyRecordingDialog({
  open,
  onAccept,
  onCancel,
  onClear,
  defaultChord,
}: KeyRecordingDialogProps) {
  const [recorded, setRecorded] = useState<string>('');
  const [chord, setChord] = useState<KeyChord | null>(null);

  useEffect(() => {
    if (!open) {
      setRecorded('');
      setChord(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Meta');
      if (!MODIFIER_KEYS.has(e.key)) {
        parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      }
      const str = parts.join('+');
      setRecorded(str);
      setChord(parseChordString(str));
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="key-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Assign Shortcut</h3>
        <p className="key-dialog-hint">Press desired keys…</p>
        <div className="key-display">{recorded || defaultChord || '—'}</div>
        <div className="key-dialog-actions">
          <button type="button" onClick={() => chord && onAccept(chord)} disabled={!chord}>
            Accept
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={onClear}>
            Clear
          </button>
          {defaultChord && (
            <button
              type="button"
              onClick={() => onAccept(parseChordString(defaultChord))}
            >
              Restore Default
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function formatChord(chord: KeyChord): string {
  return chordToString(chord);
}
