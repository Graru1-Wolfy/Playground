import type { DockPanelState, WorkspaceProfile, WorkspaceService } from './types.js';

const DEFAULT_PROFILES: Omit<WorkspaceProfile, 'id'>[] = [
  {
    name: 'programming',
    displayName: 'Programming',
    description: 'Default development layout',
    theme: 'dark',
    dockLayout: [
      { id: 'explorer', type: 'sidebar', title: 'Explorer', visible: true, position: 'left', size: 280, metadata: {} },
      { id: 'editor', type: 'editor', title: 'Editor', visible: true, position: 'center', size: 0, metadata: {} },
      { id: 'terminal', type: 'terminal', title: 'Terminal', visible: true, position: 'bottom', size: 200, metadata: {} },
    ],
    openFiles: [],
    terminalLayout: { tabs: [] },
    windowPositions: {},
  },
  {
    name: 'debugging',
    displayName: 'Debugging',
    description: 'Debug-focused layout with problems and terminal',
    theme: 'dark',
    dockLayout: [
      { id: 'explorer', type: 'sidebar', title: 'Explorer', visible: true, position: 'left', size: 240, metadata: {} },
      { id: 'editor', type: 'editor', title: 'Editor', visible: true, position: 'center', size: 0, metadata: {} },
      { id: 'problems', type: 'sidebar', title: 'Problems', visible: true, position: 'bottom', size: 180, metadata: {} },
      { id: 'terminal', type: 'terminal', title: 'Terminal', visible: true, position: 'bottom', size: 200, metadata: {} },
    ],
    openFiles: [],
    terminalLayout: { tabs: [] },
    windowPositions: {},
  },
];

export class DefaultWorkspaceService implements WorkspaceService {
  private readonly profiles = new Map<string, WorkspaceProfile>();
  private activeId?: string;

  constructor() {
    for (const profile of DEFAULT_PROFILES) {
      const created = this.create(profile);
      if (!this.activeId) {
        this.activeId = created.id;
      }
    }
  }

  listProfiles(): readonly WorkspaceProfile[] {
    return [...this.profiles.values()];
  }

  getActive(): WorkspaceProfile | undefined {
    return this.activeId ? this.profiles.get(this.activeId) : undefined;
  }

  setActive(id: string): void {
    if (!this.profiles.has(id)) {
      throw new Error(`Workspace profile not found: ${id}`);
    }
    this.activeId = id;
  }

  create(profile: Omit<WorkspaceProfile, 'id'>): WorkspaceProfile {
    const id = crypto.randomUUID();
    const full: WorkspaceProfile = { ...profile, id };
    this.profiles.set(id, full);
    return full;
  }

  update(id: string, patch: Partial<WorkspaceProfile>): WorkspaceProfile {
    const existing = this.profiles.get(id);
    if (!existing) {
      throw new Error(`Workspace profile not found: ${id}`);
    }
    const updated = { ...existing, ...patch };
    this.profiles.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    if (this.activeId === id) {
      const remaining = [...this.profiles.keys()].filter((k) => k !== id);
      this.activeId = remaining[0];
    }
    return this.profiles.delete(id);
  }

  saveLayout(panels: readonly DockPanelState[]): void {
    const active = this.getActive();
    if (!active) return;
    this.update(active.id, { dockLayout: panels });
  }
}
