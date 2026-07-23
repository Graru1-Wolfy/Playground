import { useState } from 'react';
import { useEditor } from '../hooks/useIdeServices';

export function EditorArea() {
  const editor = useEditor();
  const docs = editor.list();
  const active = editor.getActiveDocument();
  const [content, setContent] = useState(active?.content ?? '// Welcome to Playground IDE\n');

  const onChange = (value: string) => {
    setContent(value);
    if (active) {
      editor.setContent(active.id, value);
    }
  };

  return (
    <div className="editor-area">
      <div className="editor-tabs">
        {docs.length === 0 ? (
          <div className="editor-tab active">Welcome</div>
        ) : (
          docs.map((doc) => (
            <div
              key={doc.id}
              className={`editor-tab ${doc.id === active?.id ? 'active' : ''}`}
              onClick={() => editor.setActiveDocument(doc.id)}
            >
              {doc.path.split('/').pop()}
              {doc.dirty && <span className="dirty">●</span>}
            </div>
          ))
        )}
      </div>
      <textarea
        className="editor-content"
        value={active?.content ?? content}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
