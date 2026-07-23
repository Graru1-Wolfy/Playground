import { useState } from 'react';

export function TerminalPanel() {
  const [tabs] = useState(['bash', 'zsh']);
  const [activeTab, setActiveTab] = useState(0);
  const [lines] = useState([
    '$ playground-ide --version 0.1.0',
    'Playground IDE Platform',
    '$ ',
  ]);

  return (
    <div className="terminal">
      <div className="terminal-tabs">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            type="button"
            className={i === activeTab ? 'active' : ''}
            onClick={() => setActiveTab(i)}
          >
            {tab}
          </button>
        ))}
        <button type="button" className="terminal-add">+</button>
      </div>
      <pre className="terminal-output">
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </pre>
    </div>
  );
}
