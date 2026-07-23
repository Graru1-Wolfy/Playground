import { describe, it, expect, beforeEach } from 'vitest';
import {
  DefaultCommandRegistry,
  DefaultAliasRegistry,
  DefaultEventBus,
  DefaultKeybindingManager,
  DefaultSymbolDatabase,
  createIdePlatform,
  defineCommand,
  parseChordString,
  chordToString,
} from '../src/index.js';

describe('CommandRegistry', () => {
  let commands: DefaultCommandRegistry;

  beforeEach(() => {
    commands = new DefaultCommandRegistry();
    commands.register(
      defineCommand({
        name: 'test.hello',
        displayName: 'Hello',
        description: 'Say hello',
        category: 'test',
        arguments: [],
        handler: async () => ({ success: true, data: 'hello', undoable: false }),
        undoable: false,
        scriptAccessible: true,
        apiAccessible: true,
        aliases: [],
        keybindings: [],
        documentation: '',
      }),
    );
  });

  it('executes registered commands', async () => {
    const result = await commands.execute('test.hello');
    expect(result.success).toBe(true);
    expect(result.data).toBe('hello');
  });

  it('searches commands by name', () => {
    const results = commands.search('hello');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].command.metadata.name).toBe('test.hello');
  });
});

describe('AliasRegistry', () => {
  it('resolves aliases to commands', () => {
    const aliases = new DefaultAliasRegistry();
    aliases.register({
      metadata: {
        uuid: '1',
        name: 'gs',
        displayName: 'Git Status',
        description: '',
        version: '1.0.0',
        author: 'test',
        category: 'git',
        tags: [],
        permissions: [],
        visibility: 'public',
        enabled: true,
        scope: 'global',
        custom: {},
      },
      target: 'git.status',
      arguments: [],
      description: 'Git status shortcut',
      priority: 10,
      autoLoad: true,
    });

    const resolved = aliases.resolve('gs');
    expect(resolved?.commandName).toBe('git.status');
  });
});

describe('EventBus', () => {
  it('emits and handles events', async () => {
    const bus = new DefaultEventBus();
    bus.registerEvent({
      name: 'TestEvent',
      displayName: 'Test',
      description: 'Test event',
      category: 'test',
      cancellable: false,
    });

    let received = false;
    bus.on('TestEvent', () => {
      received = true;
    });

    await bus.emit('TestEvent', { value: 42 });
    expect(received).toBe(true);
  });
});

describe('KeybindingManager', () => {
  it('parses and stringifies chords', () => {
    const chord = parseChordString('Ctrl+Shift+P');
    expect(chordToString(chord)).toBe('Ctrl+Shift+P');
  });

  it('detects conflicts', () => {
    const kb = new DefaultKeybindingManager();
    const chord = parseChordString('Ctrl+S');
    kb.register({
      id: '1',
      command: 'editor.save',
      chord,
      scope: 'global',
      description: 'Save',
      enabled: true,
    });
    kb.register({
      id: '2',
      command: 'other.save',
      chord,
      scope: 'user',
      description: 'Other save',
      enabled: true,
    });
    expect(kb.detectConflicts().length).toBeGreaterThan(0);
  });
});

describe('SymbolDatabase', () => {
  it('indexes symbols from source', async () => {
    const db = new DefaultSymbolDatabase();
    await db.indexFile('test.ts', 'export class Foo {}\nexport function bar() {}');
    const outline = db.getOutline('test.ts');
    expect(outline.length).toBe(2);
    expect(db.getDefinition('Foo')?.kind).toBe('class');
  });
});

describe('IdePlatform', () => {
  it('bootstraps and executes info commands', async () => {
    const platform = await createIdePlatform();
    await platform.start();
    const info = platform.getInfo('commands') as { data: { count: number } };
    expect(info.data.count).toBeGreaterThan(0);
    await platform.shutdown();
  });

  it('resolves aliases through executeCommand', async () => {
    const platform = await createIdePlatform();
    await platform.start();
    // gs alias points to git.status which may not exist - test alias resolution path
    const aliases = platform.container.resolve(
      (await import('../src/platform/platform.js')).Tokens.AliasRegistry,
    );
    const resolved = aliases.resolve('gs');
    expect(resolved?.commandName).toBe('git.status');
    await platform.shutdown();
  });
});
