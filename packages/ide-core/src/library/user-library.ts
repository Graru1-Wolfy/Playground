export interface LibraryModule {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly version: string;
  readonly category: string;
  readonly exports: readonly string[];
  readonly path: string;
}

export interface UserLibrary {
  readonly rootPath: string;
  listModules(category?: string): readonly LibraryModule[];
  getModule(name: string): LibraryModule | undefined;
  importForProject(projectRoot: string, moduleNames: readonly string[]): void;
}

const DEFAULT_MODULES: Omit<LibraryModule, 'path'>[] = [
  { name: 'fs.read', displayName: 'Read File', description: 'Read file contents', version: '1.0.0', category: 'Filesystem', exports: ['read', 'readJson'] },
  { name: 'fs.write', displayName: 'Write File', description: 'Write file contents', version: '1.0.0', category: 'Filesystem', exports: ['write', 'append'] },
  { name: 'git.status', displayName: 'Git Status', description: 'Get repository status', version: '1.0.0', category: 'Git', exports: ['status', 'diff'] },
  { name: 'net.fetch', displayName: 'HTTP Fetch', description: 'Perform HTTP requests', version: '1.0.0', category: 'Networking', exports: ['get', 'post'] },
  { name: 'math.vector', displayName: 'Vector Math', description: 'Vector operations', version: '1.0.0', category: 'Math', exports: ['add', 'dot', 'normalize'] },
  { name: 'util.uuid', displayName: 'UUID', description: 'Generate UUIDs', version: '1.0.0', category: 'Utilities', exports: ['v4', 'parse'] },
  { name: 'ui.notify', displayName: 'Notifications', description: 'Show UI notifications', version: '1.0.0', category: 'UI', exports: ['info', 'warn', 'error'] },
];

export class DefaultUserLibrary implements UserLibrary {
  private readonly modules: LibraryModule[];

  constructor(readonly rootPath: string) {
    this.modules = DEFAULT_MODULES.map((m) => ({
      ...m,
      path: `${rootPath}/${m.category}/${m.name}`,
    }));
  }

  listModules(category?: string): readonly LibraryModule[] {
    if (!category) return [...this.modules];
    return this.modules.filter((m) => m.category === category);
  }

  getModule(name: string): LibraryModule | undefined {
    return this.modules.find((m) => m.name === name);
  }

  importForProject(_projectRoot: string, moduleNames: readonly string[]): void {
    for (const name of moduleNames) {
      if (!this.getModule(name)) {
        throw new Error(`Library module not found: ${name}`);
      }
    }
  }
}
