import { createMetadata } from '../metadata/types.js';
import { defineCommand } from '../commands/registry.js';
import type { CommandRegistry } from '../commands/types.js';
import type { AliasRegistry } from '../aliases/types.js';
import type { InfoService } from '../info/service.js';
import type { KeybindingManager } from '../keybindings/types.js';
import { parseChordString } from '../keybindings/manager.js';

export function registerBuiltinCommands(
  commands: CommandRegistry,
  deps: {
    info: InfoService;
    editor: { getActiveDocument(): { path: string; content: string } | undefined; open(path: string, content?: string): unknown; list(): readonly { id: string; path: string; dirty: boolean }[] };
    project: { getCurrent(): unknown; open(rootPath: string): Promise<unknown> };
    aliases: AliasRegistry;
    keybindings: KeybindingManager;
  },
): void {
  const infoTopics = deps.info.listTopics();

  for (const topic of infoTopics) {
    commands.register(
      defineCommand({
        name: `info.${topic}`,
        displayName: `Info: ${topic}`,
        description: `Return structured information about ${topic}`,
        category: 'info',
        arguments: [],
        handler: async () => ({
          success: true,
          data: deps.info.get(topic),
          undoable: false,
        }),
        undoable: false,
        scriptAccessible: true,
        apiAccessible: true,
        aliases: [],
        keybindings: [],
        documentation: `Structured info command for ${topic}`,
      }),
    );
  }

  commands.register(
    defineCommand({
      name: 'editor.open',
      displayName: 'Open File',
      description: 'Open a file in the editor',
      category: 'editor',
      arguments: [
        { name: 'path', displayName: 'Path', description: 'File path', type: 'file', required: true },
      ],
      handler: async (ctx) => {
        const path = String(ctx.args.path ?? '');
        const doc = deps.editor.open(path);
        return { success: true, data: doc, undoable: false };
      },
      undoable: false,
      scriptAccessible: true,
      apiAccessible: true,
      aliases: ['of'],
      keybindings: ['Ctrl+O'],
      documentation: 'Opens a file in the editor',
    }),
  );

  commands.register(
    defineCommand({
      name: 'editor.save',
      displayName: 'Save',
      description: 'Save the active document',
      category: 'editor',
      arguments: [],
      handler: async () => {
        const doc = deps.editor.getActiveDocument();
        if (!doc) return { success: false, error: 'No active document', undoable: false };
        return { success: true, data: { path: doc.path }, undoable: false };
      },
      undoable: false,
      scriptAccessible: true,
      apiAccessible: true,
      aliases: [],
      keybindings: ['Ctrl+S'],
      documentation: 'Saves the active editor document',
    }),
  );

  commands.register(
    defineCommand({
      name: 'project.open',
      displayName: 'Open Project',
      description: 'Open a project from disk',
      category: 'project',
      arguments: [
        { name: 'rootPath', displayName: 'Root Path', description: 'Project root', type: 'string', required: true },
      ],
      handler: async (ctx) => {
        const rootPath = String(ctx.args.rootPath ?? '');
        const project = await deps.project.open(rootPath);
        return { success: true, data: project, undoable: false };
      },
      undoable: false,
      scriptAccessible: true,
      apiAccessible: true,
      aliases: [],
      keybindings: [],
      documentation: 'Opens a project workspace',
    }),
  );

  commands.register(
    defineCommand({
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
    }),
  );
}

export function registerBuiltinAliases(aliases: AliasRegistry): void {
  aliases.register({
    metadata: createMetadata({
      name: 'gs',
      displayName: 'Git Status',
      description: 'Alias for Git.Status command',
      category: 'git',
      scope: 'global',
    }),
    target: 'git.status',
    arguments: [],
    description: 'Quick git status',
    priority: 10,
    autoLoad: true,
  });

  aliases.register({
    metadata: createMetadata({
      name: 'rb',
      displayName: 'Rebuild Project',
      description: 'Alias for Project.Rebuild',
      category: 'build',
      scope: 'global',
    }),
    target: 'project.rebuild',
    arguments: [],
    description: 'Rebuild the current project',
    priority: 10,
    autoLoad: true,
  });
}

export function registerBuiltinKeybindings(keybindings: KeybindingManager): void {
  const builtins = [
    { id: 'kb-palette', command: 'palette.show', chord: 'Ctrl+Shift+P', description: 'Command palette' },
    { id: 'kb-save', command: 'editor.save', chord: 'Ctrl+S', description: 'Save file' },
    { id: 'kb-open', command: 'editor.open', chord: 'Ctrl+O', description: 'Open file' },
  ];

  for (const b of builtins) {
    keybindings.register({
      id: b.id,
      command: b.command,
      chord: parseChordString(b.chord),
      scope: 'global',
      description: b.description,
      enabled: true,
    });
  }
}
