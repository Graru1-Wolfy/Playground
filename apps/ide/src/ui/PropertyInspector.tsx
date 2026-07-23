interface PropertyField {
  key: string;
  label: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'readonly';
}

interface PropertyInspectorProps {
  title: string;
  fields: PropertyField[];
  onChange?: (key: string, value: unknown) => void;
}

export function PropertyInspector({ title, fields, onChange }: PropertyInspectorProps) {
  if (fields.length === 0) {
    return (
      <div className="inspector">
        <div className="inspector-header">Properties</div>
        <div className="inspector-empty">Nothing selected</div>
      </div>
    );
  }

  return (
    <div className="inspector">
      <div className="inspector-header">{title}</div>
      <div className="inspector-body">
        {fields.map((field) => (
          <label key={field.key} className="inspector-field">
            <span className="inspector-label">{field.label}</span>
            {renderField(field, onChange)}
          </label>
        ))}
      </div>
    </div>
  );
}

function renderField(
  field: PropertyField,
  onChange?: (key: string, value: unknown) => void,
) {
  if (field.type === 'readonly') {
    return <span className="inspector-value">{String(field.value ?? '')}</span>;
  }
  if (field.type === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={Boolean(field.value)}
        onChange={(e) => onChange?.(field.key, e.target.checked)}
      />
    );
  }
  if (field.type === 'number') {
    return (
      <input
        type="number"
        value={Number(field.value ?? 0)}
        onChange={(e) => onChange?.(field.key, Number(e.target.value))}
      />
    );
  }
  return (
    <input
      type="text"
      value={String(field.value ?? '')}
      onChange={(e) => onChange?.(field.key, e.target.value)}
    />
  );
}

export function metadataToFields(
  metadata: Record<string, unknown>,
  editable: string[] = [],
): PropertyField[] {
  return Object.entries(metadata).map(([key, value]) => ({
    key,
    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
    value,
    type: typeof value === 'boolean'
      ? 'boolean'
      : typeof value === 'number'
        ? 'number'
        : editable.includes(key)
          ? 'string'
          : 'readonly',
  }));
}
