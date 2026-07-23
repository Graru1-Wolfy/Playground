import { useState } from 'react';
import { ExplorerSidebar, SearchSidebar, OutlineSidebar } from './sidebars/ExplorerSidebar';
import { MonacoEditorArea } from './MonacoEditorArea';
import { TerminalPanel } from './TerminalPanel';
import { CommandPalette } from './CommandPalette';
import { PropertyInspector, metadataToFields } from './PropertyInspector';
import { KeyRecordingDialog } from './KeyRecordingDialog';
import { useCommands, useInfo, useWorkspace } from '../hooks/useIdeServices';
import { useKeybindingHandler } from '../hooks/useKeybindingHandler';
import { Tokens, type WorkspaceProfile } from '@playground/ide-core/browser';
import { usePlatform } from '../platform/PlatformContext';

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
  const platform = usePlatform();
  const workspace = useWorkspace();
  const activeProfile = workspace.getActive();
  const [activeSidebar, setActiveSidebar] = useState<SidebarId>('explorer');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const commands = useCommands();
  const pluginInfo = useInfo('plugins');
  const scriptInfo = useInfo('scripts');

  useKeybindingHandler();

  const selectedCommand = commands[selectedIndex];
  const inspectorFields = selectedCommand
    ? metadataToFields(selectedCommand.metadata as unknown as Record<string, unknown>)
    : [];

  const profiles = workspace.listProfiles();

  return (
    <div className="ide-shell">
      <header className="ide-titlebar">
        <span className="ide-logo">◆ Playground IDE</span>
        <select
          className="profile-select"
          value={activeProfile?.id}
          onChange={(e) => workspace.setActive(e.target.value)}
        >
          {profiles.map((p: WorkspaceProfile) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
        </select>
        <div className="titlebar-actions">
          <button type="button" onClick={() => setPaletteOpen(true)}>⌘ Commands</button>
          <button type="button" onClick={() => setKeyDialogOpen(true)}>⌨ Bindings</button>
        </div>
      </header>

      <div className="ide-body">
        <nav className="activity-bar">
          {LEFT_SIDEBARS.map((sb) => (
            <button key={sb.id} type="button" className={activeSidebar === sb.id ? 'active' : ''} title={sb.label} onClick={() => setActiveSidebar(sb.id)}>
              <span>{sb.icon}</span>
            </button>
          ))}
        </nav>

        <aside className="sidebar">
          <div className="sidebar-header">{LEFT_SIDEBARS.find((s) => s.id === activeSidebar)?.label}</div>
          {activeSidebar === 'explorer' && <ExplorerSidebar />}
          {activeSidebar === 'search' && <SearchSidebar />}
          {activeSidebar === 'outline' && <OutlineSidebar />}
          {activeSidebar === 'git' && <div className="sidebar-panel sidebar-empty">Git panel — use <code>gs</code> alias</div>}
          {activeSidebar === 'scripts' && (
            <div className="sidebar-panel">
              <div>Scripts: {(scriptInfo?.count as number) ?? 0}</div>
            </div>
          )}
          {activeSidebar === 'extensions' && (
            <div className="sidebar-panel">
              <div>Plugins: {(pluginInfo?.count as number) ?? 0}</div>
            </div>
          )}
        </aside>

        <main className="main-area">
          <MonacoEditorArea />
          {showTerminal && <TerminalPanel />}
        </main>

        {showInspector && (
          <aside className="inspector-panel">
            <div className="inspector-nav">
              {commands.slice(0, 5).map((cmd, i) => (
                <button key={cmd.metadata.uuid} type="button" className={i === selectedIndex ? 'active' : ''} onClick={() => setSelectedIndex(i)}>
                  {cmd.metadata.displayName}
                </button>
              ))}
            </div>
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
        <button type="button" className="status-toggle" onClick={() => setShowTerminal(!showTerminal)}>Terminal</button>
        <button type="button" className="status-toggle" onClick={() => setShowInspector(!showInspector)}>Inspector</button>
      </footer>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <KeyRecordingDialog
        open={keyDialogOpen}
        onAccept={(chord) => {
          const kb = platform.container.resolve(Tokens.KeybindingManager);
          kb.register({
            id: crypto.randomUUID(),
            command: 'palette.show',
            chord,
            scope: 'user',
            description: 'User binding',
            enabled: true,
          });
          setKeyDialogOpen(false);
        }}
        onCancel={() => setKeyDialogOpen(false)}
        onClear={() => {}}
      />
    </div>
  );
}
