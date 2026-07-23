import Editor from '@monaco-editor/react';
import { useEditor, useExecuteCommand } from '../hooks/useIdeServices';
import type { EditorDocument } from '@playground/ide-core/browser';
import { useEffect, useState } from 'react';

export function MonacoEditorArea() {
  const editor = useEditor();
  const execute = useExecuteCommand();
  const docs = editor.list();
  const active = editor.getActiveDocument();
  const [language, setLanguage] = useState('typescript');

  useEffect(() => {
    if (!active) return;
    const ext = active.path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      json: 'json', md: 'markdown', py: 'python', lua: 'lua', css: 'css', html: 'html',
    };
    setLanguage(langMap[ext ?? ''] ?? 'plaintext');
  }, [active?.path]);

  const onChange = (value: string | undefined) => {
    if (active && value !== undefined) {
      editor.setContent(active.id, value);
    }
  };

  const save = async () => {
    if (active) await execute('editor.save');
  };

  return (
    <div className="editor-area">
      <div className="editor-tabs">
        {docs.length === 0 ? (
          <div className="editor-tab active">Welcome</div>
        ) : (
          docs.map((doc: EditorDocument) => (
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
        {active && (
          <button type="button" className="editor-save-btn" onClick={save}>Save</button>
        )}
      </div>
      {active ? (
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={active.content}
          onChange={onChange}
          options={{
            fontSize: 14,
            fontFamily: 'JetBrains Mono, monospace',
            minimap: { enabled: true },
            wordWrap: 'off',
            automaticLayout: true,
          }}
        />
      ) : (
        <div className="editor-welcome">
          <h2>Playground IDE</h2>
          <p>Open a file from the explorer or press <kbd>Ctrl+Shift+P</kbd> for commands.</p>
        </div>
      )}
    </div>
  );
}
