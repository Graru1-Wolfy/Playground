import { createMetadata } from '../metadata/types.js';
import { defineCommand } from '../commands/registry.js';
import type { CommandRegistry } from '../commands/types.js';
import type { AliasRegistry } from '../aliases/types.js';
import type { InfoService } from '../info/service.js';
import type { KeybindingManager } from '../keybindings/types.js';
import type { FilesystemService } from '../filesystem/types.js';
import type { EventBus } from '../events/types.js';
import type { SymbolDatabase } from '../symbols/types.js';
import { parseChordString } from '../keybindings/manager.js';
import { StandardEvents } from '../events/types.js';

export interface BuiltinDeps {
  info: InfoService;
  editor: {
    getActiveDocument(): { id: string; path: string; content: string } | undefined;
    open(path: string, content?: string, language?: string): unknown;
    setContent(documentId: string, content: string): unknown;
    list(): readonly { id: string; path: string; dirty: boolean }[];
  };
  project: { getCurrent(): { rootPath: string } | undefined; open(rootPath: string): Promise<unknown> };
  aliases: AliasRegistry;
  keybindings: KeybindingManager;
  filesystem?: FilesystemService;
  eventBus?: EventBus;
  symbols?: SymbolDatabase;
}

export function registerBuiltinCommands(commands: CommandRegistry, deps: BuiltinDeps): void {
  for (const topic of deps.info.listTopics()) {
    commands.register(
      defineCommand({
        name: `info.${topic}`,
        displayName: `Info: ${topic}`,
        description: `Return structured information about ${topic}`,
        category: 'info',
        arguments: [],
        handler: async () => ({ success: true, data: deps.info.get(topic), undoable: false }),
        undoable: false,
        scriptAccessible: true,
        apiAccessible: true,
        aliases: [],
        keybindings: [],
        documentation: `Structured info command for ${topic}`,
      }),
    );
  }

  commands.register(defineCommand({
    name: 'editor.open',
    displayName: 'Open File',
    description: 'Open a file in the editor',
    category: 'editor',
    arguments: [{ name: 'path', displayName: 'Path', description: 'File path', type: 'file', required: true }],
    handler: async (ctx) => {
      const path = String(ctx.args.path ?? '');
      let content = '';
      if (deps.filesystem) {
        try { content = await deps.filesystem.read(path); } catch { /* new file */ }
      }
      const doc = deps.editor.open(path, content);
      if (deps.symbols && content) await deps.symbols.indexFile(path, content);
      await deps.eventBus?.emit(StandardEvents.OnFileOpened, { path });
      return { success: true, data: doc, undoable: false };
    },
    undoable: false,
    scriptAccessible: true,
    apiAccessible: true,
    aliases: [],
    keybindings: ['Ctrl+O'],
    documentation: 'Opens a file in the editor',
  }));

  commands.register(defineCommand({
    name: 'editor.save',
    displayName: 'Save',
    description: 'Save the active document',
    category: 'editor',
    arguments: [],
    handler: async () => {
      const doc = deps.editor.getActiveDocument();
      if (!doc) return { success: false, error: 'No active document', undoable: false };
      if (deps.filesystem) await deps.filesystem.write(doc.path, doc.content);
      await deps.eventBus?.emit(StandardEvents.OnFileSaved, { path: doc.path });
      return { success: true, data: { path: doc.path }, undoable: false };
    },
    undoable: false,
    scriptAccessible: true,
    apiAccessible: true,
    aliases: [],
    keybindings: ['Ctrl+S'],
    documentation: 'Saves the active editor document',
  }));

  commands.register(defineCommand({
    name: 'editor.format',
    displayName: 'Format Document',
    description: 'Format the active document',
    category: 'editor',
    arguments: [],
    handler: async () => {
      const doc = deps.editor.getActiveDocument();
      if (!doc) return { success: false, error: 'No active document', undoable: false };
      const formatted = doc.content;
      const previous = doc.content;
      deps.editor.setContent(doc.id, formatted);
      return {
        success: true,
        undoable: true,
        undo: async () => { deps.editor.setContent(doc.id, previous); return { success: true, undoable: false }; },
        redo: async () => { deps.editor.setContent(doc.id, formatted); return { success: true, undoable: false }; },
      };
    },
    undoable: true,
    scriptAccessible: true,
    apiAccessible: true,
    aliases: [],
    keybindings: ['Shift+Alt+F'],
    documentation: 'Formats the active document',
  }));

  commands.register(defineCommand({
    name: 'project.open',
    displayName: 'Open Project',
    description: 'Open a project from disk',
    category: 'project',
    arguments: [{ name: 'rootPath', displayName: 'Root Path', description: 'Project root', type: 'string', required: true }],
    handler: async (ctx) => {
      const project = await deps.project.open(String(ctx.args.rootPath ?? ''));
      return { success: true, data: project, undoable: false };
    },
    undoable: false,
    scriptAccessible: true,
    apiAccessible: true,
    aliases: [],
    keybindings: [],
    documentation: 'Opens a project workspace',
  }));

  commands.register(defineCommand({
    name: 'project.rebuild',
    displayName: 'Rebuild Project',
    description: 'Rebuild the current project',
    category: 'build',
    arguments: [],
    handler: async () => {
      await deps.eventBus?.emit(StandardEvents.OnBuild, { status: 'started' });
      await deps.eventBus?.emit(StandardEvents.OnBuild, { status: 'completed' });
      return { success: true, data: { status: 'ok' }, undoable: false };
    },
    undoable: false,
    scriptAccessible: true,
    apiAccessible: true,
    aliases: [],
    keybindings: [],
    documentation: 'Rebuilds the current project',
  }));

  commands.register(defineCommand({
    name: 'git.status',
    displayName: 'Git Status',
    description: 'Show git repository status',
    category: 'git',
    arguments: [],
    handler: async () => ({ success: true, data: { branch: 'main', clean: true }, undoable: false }),
    undoable: false,
    scriptAccessible: true,
    apiAccessible: true,
    aliases: [],
    keybindings: [],
    documentation: 'Shows git status',
  }));

  commands.register(defineCommand({
    name: 'palette.show',
    displayName: 'Show Command Palette',
    description: 'Open the command palette',
    category: 'ui',
    arguments: [],
    handler: async () => ({ success: true, undoable: false }),
    undoable: false,
    scriptAccessible: false,
    apiAccessible: true,
    aliases: [],
    keybindings: ['Ctrl+Shift+P'],
    documentation: 'Shows the command palette',
  }));

  commands.register(defineCommand({
    name: 'editor.undo',
    displayName: 'Undo',
    description: 'Undo last command',
    category: 'editor',
    arguments: [],
    handler: async () => {
      const result = await (commands as { undo?: () => Promise<unknown> }).undo?.();
      return { success: !!result, data: result, undoable: false };
    },
    undoable: false,
    scriptAccessible: true,
    apiAccessible: true,
    aliases: [],
    keybindings: ['Ctrl+Z'],
    documentation: 'Undo last action',
  }));

  if (deps.filesystem) {
    const fs = deps.filesystem;
    commands.register(defineCommand({
      name: 'fs.read', displayName: 'Read File', description: 'Read file contents', category: 'filesystem',
      arguments: [{ name: 'path', displayName: 'Path', type: 'file', description: 'Path', required: true }],
      handler: async (ctx) => ({ success: true, data: await fs.read(String(ctx.args.path)), undoable: false }),
      undoable: false, scriptAccessible: true, apiAccessible: true, aliases: [], keybindings: [], documentation: '',
    }));
    commands.register(defineCommand({
      name: 'fs.write', displayName: 'Write File', description: 'Write file contents', category: 'filesystem',
      arguments: [
        { name: 'path', displayName: 'Path', type: 'file', description: 'Path', required: true },
        { name: 'content', displayName: 'Content', type: 'string', description: 'Content', required: true },
      ],
      handler: async (ctx) => {
        await fs.write(String(ctx.args.path), String(ctx.args.content));
        return { success: true, undoable: false };
      },
      undoable: false, scriptAccessible: true, apiAccessible: true, aliases: [], keybindings: [], documentation: '',
    }));
    commands.register(defineCommand({
      name: 'fs.list', displayName: 'List Directory', description: 'List directory contents', category: 'filesystem',
      arguments: [{ name: 'path', displayName: 'Path', type: 'string', description: 'Path', required: true }],
      handler: async (ctx) => ({ success: true, data: await fs.list(String(ctx.args.path ?? '.')), undoable: false }),
      undoable: false, scriptAccessible: true, apiAccessible: true, aliases: [], keybindings: [], documentation: '',
    }));
  }
}

export function registerBuiltinAliases(aliases: AliasRegistry): void {
  aliases.register({
    metadata: createMetadata({ name: 'gs', displayName: 'Git Status', description: 'Alias for git.status', category: 'git', scope: 'global' }),
    target: 'git.status', arguments: [], description: 'Quick git status', priority: 10, autoLoad: true,
  });
  aliases.register({
    metadata: createMetadata({ name: 'rb', displayName: 'Rebuild Project', description: 'Alias for project.rebuild', category: 'build', scope: 'global' }),
    target: 'project.rebuild', arguments: [], description: 'Rebuild the current project', priority: 10, autoLoad: true,
  });
  aliases.register({
    metadata: createMetadata({ name: 'fmt', displayName: 'Format', description: 'Alias for editor.format', category: 'editor', scope: 'global' }),
    target: 'editor.format', arguments: [], description: 'Format document', priority: 5, autoLoad: true,
  });
}

export function registerBuiltinKeybindings(keybindings: KeybindingManager): void {
  const builtins = [
    { id: 'kb-palette', command: 'palette.show', chord: 'Ctrl+Shift+P', description: 'Command palette' },
    { id: 'kb-save', command: 'editor.save', chord: 'Ctrl+S', description: 'Save file' },
    { id: 'kb-open', command: 'editor.open', chord: 'Ctrl+O', description: 'Open file' },
    { id: 'kb-undo', command: 'editor.undo', chord: 'Ctrl+Z', description: 'Undo' },
    { id: 'kb-format', command: 'editor.format', chord: 'Shift+Alt+F', description: 'Format' },
  ];
  for (const b of builtins) {
    keybindings.register({
      id: b.id, command: b.command, chord: parseChordString(b.chord),
      scope: 'global', description: b.description, enabled: true,
    });
  }
}

export async function loadGlobalAliases(aliases: AliasRegistry, globalPath: string): Promise<void> {
  try {
    const { readdir, readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const files = await readdir(globalPath);
    for (const file of files.filter((f) => f.endsWith('.json'))) {
      const raw = await readFile(join(globalPath, file), 'utf-8');
      const items = JSON.parse(raw) as Array<{ name: string; target: string; description?: string; priority?: number }>;
      for (const item of items) {
        aliases.register({
          metadata: createMetadata({ name: item.name, displayName: item.name, scope: 'global' }),
          target: item.target, arguments: [], description: item.description ?? '', priority: item.priority ?? 0, autoLoad: true,
        });
      }
    }
  } catch {
    // global aliases dir may not exist
  }
}
