export type EventPriority = 'highest' | 'high' | 'normal' | 'low' | 'lowest';

export interface EventMetadata {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly category: string;
  readonly cancellable: boolean;
}

export interface EventPayload {
  readonly [key: string]: unknown;
}

export interface Event<T extends EventPayload = EventPayload> {
  readonly metadata: EventMetadata;
  readonly payload: T;
  readonly timestamp: number;
  readonly source?: string;
  defaultPrevented: boolean;
  preventDefault(): void;
}

export type EventHandler<T extends EventPayload = EventPayload> = (
  event: Event<T>,
) => void | Promise<void>;

export interface EventSubscription {
  readonly id: string;
  unsubscribe(): void;
}

export interface EventBus {
  registerEvent(metadata: EventMetadata): void;
  emit<T extends EventPayload>(name: string, payload: T, source?: string): Promise<void>;
  on<T extends EventPayload>(
    name: string,
    handler: EventHandler<T>,
    priority?: EventPriority,
  ): EventSubscription;
  once<T extends EventPayload>(name: string, handler: EventHandler<T>): EventSubscription;
  off(subscription: EventSubscription): void;
  listEvents(): readonly EventMetadata[];
}

export const StandardEvents = {
  OnStartup: 'OnStartup',
  OnShutdown: 'OnShutdown',
  OnProjectOpened: 'OnProjectOpened',
  OnProjectClosed: 'OnProjectClosed',
  OnWorkspaceChanged: 'OnWorkspaceChanged',
  OnFileOpened: 'OnFileOpened',
  OnFileSaved: 'OnFileSaved',
  OnDocumentChanged: 'OnDocumentChanged',
  OnSelectionChanged: 'OnSelectionChanged',
  OnCommandExecuted: 'OnCommandExecuted',
  OnPluginLoaded: 'OnPluginLoaded',
  OnPluginUnloaded: 'OnPluginUnloaded',
  OnScriptLoaded: 'OnScriptLoaded',
  OnBuild: 'OnBuild',
  OnCompile: 'OnCompile',
} as const;

export const STANDARD_EVENT_METADATA: EventMetadata[] = [
  { name: StandardEvents.OnStartup, displayName: 'Startup', description: 'IDE startup complete', category: 'lifecycle', cancellable: false },
  { name: StandardEvents.OnShutdown, displayName: 'Shutdown', description: 'IDE shutting down', category: 'lifecycle', cancellable: true },
  { name: StandardEvents.OnProjectOpened, displayName: 'Project Opened', description: 'A project was opened', category: 'project', cancellable: false },
  { name: StandardEvents.OnProjectClosed, displayName: 'Project Closed', description: 'A project was closed', category: 'project', cancellable: false },
  { name: StandardEvents.OnWorkspaceChanged, displayName: 'Workspace Changed', description: 'Active workspace profile changed', category: 'workspace', cancellable: false },
  { name: StandardEvents.OnFileOpened, displayName: 'File Opened', description: 'A file was opened in the editor', category: 'editor', cancellable: false },
  { name: StandardEvents.OnFileSaved, displayName: 'File Saved', description: 'A file was saved', category: 'editor', cancellable: false },
  { name: StandardEvents.OnDocumentChanged, displayName: 'Document Changed', description: 'Editor document content changed', category: 'editor', cancellable: false },
  { name: StandardEvents.OnSelectionChanged, displayName: 'Selection Changed', description: 'Editor or UI selection changed', category: 'editor', cancellable: false },
  { name: StandardEvents.OnCommandExecuted, displayName: 'Command Executed', description: 'A command was executed', category: 'commands', cancellable: false },
  { name: StandardEvents.OnPluginLoaded, displayName: 'Plugin Loaded', description: 'A plugin was loaded', category: 'plugins', cancellable: false },
  { name: StandardEvents.OnPluginUnloaded, displayName: 'Plugin Unloaded', description: 'A plugin was unloaded', category: 'plugins', cancellable: false },
  { name: StandardEvents.OnScriptLoaded, displayName: 'Script Loaded', description: 'A script was loaded', category: 'scripts', cancellable: false },
  { name: StandardEvents.OnBuild, displayName: 'Build', description: 'Build started or completed', category: 'build', cancellable: false },
  { name: StandardEvents.OnCompile, displayName: 'Compile', description: 'Compile started or completed', category: 'build', cancellable: false },
];
