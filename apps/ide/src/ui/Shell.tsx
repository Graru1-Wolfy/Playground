import { useState } from 'react';
import { ExplorerSidebar, SearchSidebar, OutlineSidebar } from './sidebars/ExplorerSidebar';
import { EditorArea } from './EditorArea';
import { TerminalPanel } from './TerminalPanel';
import { CommandPalette } from './CommandPalette';
import { PropertyInspector, metadataToFields } from './PropertyInspector';
import { useCommands, useInfo, useWorkspace } from '../hooks/useIdeServices';

const LEFT_SIDEBARS = [
  { id: 'explorer', label: 'Explorer', icon: '📁' },
  { id: 'search', label: 'Search', icon: '🔍' },
  { id: 'outline', label: 'Outline', icon: '≡' },
  { id: 'git', label: 'Git', icon: '⎇' },
  { id: 'scripts', label: 'Scripts', icon: '⚡' },
  { id: 'extensions', label: 'Extensions', icon: '🧩' },
] as const;

type SidebarId = (typeof LEFT_SIDEBARS)[number]['id'];

export function Shell() {
  const workspace = useWorkspace();
  const activeProfile = workspace.getActive();
  const [activeSidebar, setActiveSidebar] = useState<SidebarId>('explorer');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const commands = useCommands();
  const pluginInfo = useInfo('plugins');

  const selectedCommand = commands[0];
  const inspectorFields = selectedCommand
    ? metadataToFields(selectedCommand.metadata as unknown as Record<string, unknown>)
    : [];

  return (
    <div className="ide-shell">
      <header className="ide-titlebar">
        <span className="ide-logo">◆ Playground IDE</span>
        <span className="ide-profile">{activeProfile?.displayName ?? 'Programming'}</span>
        <div className="titlebar-actions">
          <button type="button" onClick={() => setPaletteOpen(true)} title="Command Palette (Ctrl+Shift+P)">
            ⌘ Commands
          </button>
        </div>
      </header>

      <div className="ide-body">
        <nav className="activity-bar">
          {LEFT_SIDEBARS.map((sb) => (
            <button
              key={sb.id}
              type="button"
              className={activeSidebar === sb.id ? 'active' : ''}
              title={sb.label}
              onClick={() => setActiveSidebar(sb.id)}
            >
              <span>{sb.icon}</span>
            </button>
          ))}
        </nav>

        <aside className="sidebar">
          <div className="sidebar-header">{LEFT_SIDEBARS.find((s) => s.id === activeSidebar)?.label}</div>
          {activeSidebar === 'explorer' && <ExplorerSidebar />}
          {activeSidebar === 'search' && <SearchSidebar />}
          {activeSidebar === 'outline' && <OutlineSidebar />}
          {activeSidebar === 'git' && <div className="sidebar-panel sidebar-empty">Git integration (plugin)</div>}
          {activeSidebar === 'scripts' && <div className="sidebar-panel sidebar-empty">Scripts panel</div>}
          {activeSidebar === 'extensions' && (
            <div className="sidebar-panel">
              <div>Plugins: {(pluginInfo?.count as number) ?? 0}</div>
            </div>
          )}
        </aside>

        <main className="main-area">
          <EditorArea />
          {showTerminal && <TerminalPanel />}
        </main>

        {showInspector && (
          <aside className="inspector-panel">
            <PropertyInspector
              title={selectedCommand ? `Command: ${selectedCommand.metadata.displayName}` : 'Properties'}
              fields={inspectorFields}
            />
          </aside>
        )}
      </div>

      <footer className="status-bar">
        <span>Ready</span>
        <span>{commands.length} commands</span>
        <button type="button" className="status-toggle" onClick={() => setShowTerminal(!showTerminal)}>
          Terminal
        </button>
        <button type="button" className="status-toggle" onClick={() => setShowInspector(!showInspector)}>
          Inspector
        </button>
      </footer>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
