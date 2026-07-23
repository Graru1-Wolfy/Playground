import { useState } from 'react';
import { useEditor } from '../../hooks/useIdeServices';

const SAMPLE_TREE: FileNode[] = [
  { name: 'src', type: 'folder', children: [
    { name: 'main.ts', type: 'file' },
    { name: 'app.ts', type: 'file' },
  ]},
  { name: 'scripts', type: 'folder', children: [
    { name: 'build.js', type: 'file' },
  ]},
  { name: 'Project.json', type: 'file' },
];

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

export function ExplorerSidebar() {
  const editor = useEditor();
  const [filter, setFilter] = useState('');

  const openFile = (name: string) => {
    editor.open(`/${name}`, `// ${name}\n`, 'typescript');
  };

  return (
    <div className="sidebar-panel">
      <div className="sidebar-toolbar">
        <input
          className="sidebar-filter"
          placeholder="Filter files…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="file-tree">
        {SAMPLE_TREE.filter((n) => !filter || n.name.toLowerCase().includes(filter.toLowerCase())).map((node) => (
          <TreeNode key={node.name} node={node} depth={0} onOpen={openFile} filter={filter} />
        ))}
      </div>
    </div>
  );
}

function TreeNode({
  node,
  depth,
  onOpen,
  filter,
}: {
  node: FileNode;
  depth: number;
  onOpen: (name: string) => void;
  filter: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const isFolder = node.type === 'folder';

  return (
    <div className="tree-node">
      <div
        className={`tree-row ${node.type}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => (isFolder ? setExpanded(!expanded) : onOpen(node.name))}
      >
        <span className="tree-icon">{isFolder ? (expanded ? '▼' : '▶') : '📄'}</span>
        <span>{node.name}</span>
        {isFolder && <span className="git-status" />}
      </div>
      {isFolder && expanded && node.children?.map((child) => (
        <TreeNode key={child.name} node={child} depth={depth + 1} onOpen={onOpen} filter={filter} />
      ))}
    </div>
  );
}

export function SearchSidebar() {
  const [query, setQuery] = useState('');
  return (
    <div className="sidebar-panel">
      <input
        className="sidebar-filter"
        placeholder="Search workspace…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="search-hint">Unified search across files, symbols, commands, and more.</div>
    </div>
  );
}

export function OutlineSidebar() {
  return (
    <div className="sidebar-panel">
      <div className="sidebar-empty">Open a file to see outline</div>
    </div>
  );
}

export function ProblemsSidebar() {
  return (
    <div className="sidebar-panel">
      <div className="sidebar-empty">No problems detected</div>
    </div>
  );
}
