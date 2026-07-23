import { describe, it, expect, beforeEach } from 'vitest';
import {
  DefaultCommandHistoryService,
  DefaultCommandRegistry,
  DefaultSettingsService,
  DefaultDatabaseService,
  DefaultThemeService,
  DefaultAssetDatabase,
  DefaultPackageManagerService,
  defineCommand,
  createIdePlatform,
} from '../src/index.js';

describe('CommandHistoryService', () => {
  it('supports undo/redo', async () => {
    const history = new DefaultCommandHistoryService();
    let value = 0;
    history.pushUndo({
      command: 'test',
      undo: async () => { value = 0; return { success: true, undoable: false }; },
      redo: async () => { value = 1; return { success: true, undoable: false }; },
    });
    value = 1;
    await history.undo();
    expect(value).toBe(0);
    await history.redo();
    expect(value).toBe(1);
  });

  it('tracks recent commands', () => {
    const history = new DefaultCommandHistoryService();
    history.record({ command: 'a', args: {}, success: true });
    history.record({ command: 'b', args: {}, success: true });
    expect(history.getRecent()[0].command).toBe('b');
  });
});

describe('CommandRegistry with history', () => {
  it('records undoable commands', async () => {
    const history = new DefaultCommandHistoryService();
    const commands = new DefaultCommandRegistry({ history });
    let state = 'a';
    commands.register(defineCommand({
      name: 'toggle', displayName: 'Toggle', category: 'test', arguments: [],
      handler: async () => {
        const prev = state;
        state = state === 'a' ? 'b' : 'a';
        return {
          success: true, undoable: true,
          undo: async () => { state = prev; return { success: true, undoable: false }; },
          redo: async () => { state = prev === 'a' ? 'b' : 'a'; return { success: true, undoable: false }; },
        };
      },
      undoable: true, scriptAccessible: true, apiAccessible: true, aliases: [], keybindings: [], documentation: '',
    }));
    await commands.execute('toggle');
    expect(state).toBe('b');
    await commands.undo();
    expect(state).toBe('a');
  });
});

describe('DatabaseService', () => {
  it('migrates schema', async () => {
    const db = new DefaultDatabaseService();
    await db.connect({ provider: 'sqlite' });
    await db.migrate();
    const conn = db.getConnection();
    expect(conn).toBeDefined();
    conn?.close();
  });
});

describe('SettingsService persistence', () => {
  it('stores and retrieves values', () => {
    const settings = new DefaultSettingsService();
    settings.register({
      key: 'test', displayName: 'Test', description: '', type: 'string',
      defaultValue: 'default', scope: 'user', category: 'test',
    });
    settings.set('test', 'hello');
    expect(settings.get('test')).toBe('hello');
  });
});

describe('ThemeService', () => {
  it('lists built-in themes', () => {
    const themes = new DefaultThemeService();
    expect(themes.list().length).toBeGreaterThanOrEqual(2);
    expect(themes.getActive().id).toBe('dark');
  });
});

describe('AssetDatabase', () => {
  it('registers and searches assets', () => {
    const db = new DefaultAssetDatabase();
    db.register({
      metadata: {
        uuid: '1', name: 'hero', displayName: 'Hero', description: '', version: '1.0.0',
        author: 'test', category: 'characters', tags: [], permissions: [], visibility: 'public',
        enabled: true, scope: 'project', custom: {},
      },
      path: '/assets/hero.png', assetType: 'texture', data: {},
    });
    expect(db.search('hero').length).toBe(1);
  });
});

describe('PackageManager', () => {
  it('installs packages', async () => {
    const pm = new DefaultPackageManagerService();
    const pkg = await pm.install('test-pkg');
    expect(pkg.name).toBe('test-pkg');
    expect(pm.list().length).toBe(1);
  });
});

describe('Platform integration', () => {
  it('executes git.status via alias gs', async () => {
    const platform = await createIdePlatform();
    await platform.start();
    const result = await platform.executeCommand('git.status');
    expect(result).toBeDefined();
    await platform.shutdown();
  });
});
