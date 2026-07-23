import { useEffect, useState, useCallback } from 'react';
import { apiListDir } from '../../api/client';
import { useExecuteCommand } from '../../hooks/useIdeServices';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

export function ExplorerSidebar() {
  const [root, setRoot] = useState<FileNode[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true);
  const execute = useExecuteCommand();

  const loadRoot = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await apiListDir('.');
      setRoot(entries.map((e) => ({ name: e.name, path: e.path, type: e.type as 'file' | 'directory' })));
      setApiAvailable(true);
    } catch {
      setApiAvailable(false);
      setRoot([
        { name: 'templates', path: 'templates', type: 'directory' },
        { name: 'packages', path: 'packages', type: 'directory' },
        { name: 'apps', path: 'apps', type: 'directory' },
        { name: 'docs', path: 'docs', type: 'directory' },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRoot(); }, [loadRoot]);

  const openFile = async (path: string) => {
    try {
      await execute('editor.open', { path });
    } catch {
      // fallback local open
    }
  };

  return (
    <div className="sidebar-panel">
      <div className="sidebar-toolbar">
        <input className="sidebar-filter" placeholder="Filter files…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        {!apiAvailable && <div className="api-hint">Start API: npm run dev:ide-api</div>}
      </div>
      {loading ? <div className="sidebar-empty">Loading…</div> : (
        <div className="file-tree">
          {root.filter((n) => !filter || n.name.toLowerCase().includes(filter.toLowerCase())).map((node) => (
            <FileTreeNode key={node.path} node={node} depth={0} onOpen={openFile} filter={filter} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileTreeNode({
  node, depth, onOpen, filter,
}: {
  node: FileNode; depth: number; onOpen: (path: string) => void; filter: string;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const [children, setChildren] = useState<FileNode[]>([]);
  const isDir = node.type === 'directory';

  const toggle = async () => {
    if (!isDir) { onOpen(node.path); return; }
    if (!expanded && children.length === 0) {
      try {
        const entries = await apiListDir(node.path);
        setChildren(entries.map((e) => ({ name: e.name, path: e.path, type: e.type as 'file' | 'directory' })));
      } catch { /* ignore */ }
    }
    setExpanded(!expanded);
  };

  return (
    <div className="tree-node">
      <div className={`tree-row ${node.type}`} style={{ paddingLeft: `${depth * 12 + 8}px` }} onClick={toggle}>
        <span className="tree-icon">{isDir ? (expanded ? '▼' : '▶') : '📄'}</span>
        <span>{node.name}</span>
      </div>
      {isDir && expanded && children.filter((c) => !filter || c.name.toLowerCase().includes(filter.toLowerCase())).map((child) => (
        <FileTreeNode key={child.path} node={child} depth={depth + 1} onOpen={onOpen} filter={filter} />
      ))}
    </div>
  );
}

export function SearchSidebar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ title: string; subtitle?: string; type: string }>>([]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    import('../../api/client').then(({ apiSearch }) =>
      apiSearch(query).then((r) => setResults(r as Array<{ title: string; subtitle?: string; type: string }>)).catch(() => setResults([])),
    );
  }, [query]);

  return (
    <div className="sidebar-panel">
      <input className="sidebar-filter" placeholder="Search workspace…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="search-results">
        {results.map((r, i) => (
          <li key={i}><span className="search-type">{r.type}</span> {r.title} <span className="search-sub">{r.subtitle}</span></li>
        ))}
      </ul>
    </div>
  );
}

export function OutlineSidebar() {
  return <div className="sidebar-panel"><div className="sidebar-empty">Open a file to see outline</div></div>;
}
