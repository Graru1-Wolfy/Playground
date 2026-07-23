export interface DockPanelState {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly visible: boolean;
  readonly position: 'left' | 'right' | 'bottom' | 'center';
  readonly size: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface WorkspaceProfile {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly theme: string;
  readonly dockLayout: readonly DockPanelState[];
  readonly openFiles: readonly string[];
  readonly terminalLayout: Readonly<Record<string, unknown>>;
  readonly windowPositions: Readonly<Record<string, unknown>>;
}

export interface WorkspaceService {
  listProfiles(): readonly WorkspaceProfile[];
  getActive(): WorkspaceProfile | undefined;
  setActive(id: string): void;
  create(profile: Omit<WorkspaceProfile, 'id'>): WorkspaceProfile;
  update(id: string, patch: Partial<WorkspaceProfile>): WorkspaceProfile;
  delete(id: string): boolean;
  saveLayout(panels: readonly DockPanelState[]): void;
}
