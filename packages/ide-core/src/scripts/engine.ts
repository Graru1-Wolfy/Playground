import type {
  ScriptDefinition,
  ScriptEngine,
  ScriptExecutionContext,
  ScriptLanguageAdapter,
  ScriptResult,
} from './types.js';

class JavaScriptAdapter implements ScriptLanguageAdapter {
  readonly language = 'javascript';

  async execute(script: ScriptDefinition, context: ScriptExecutionContext): Promise<ScriptResult> {
    const logs: string[] = [];
    try {
      const fn = new Function(
        'args',
        'log',
        `"use strict";\n${script.source}\nreturn typeof main === 'function' ? main(args) : undefined;`,
      );
      const output = await fn(context.args, (msg: unknown) => logs.push(String(msg)));
      return { success: true, output, logs };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        logs,
      };
    }
  }

  async validate(script: ScriptDefinition): Promise<readonly string[]> {
    try {
      new Function(script.source);
      return [];
    } catch (error) {
      return [error instanceof Error ? error.message : String(error)];
    }
  }
}

class StubLanguageAdapter implements ScriptLanguageAdapter {
  constructor(readonly language: string) {}

  async execute(script: ScriptDefinition): Promise<ScriptResult> {
    return {
      success: false,
      error: `${this.language} adapter not yet connected. Script "${script.metadata.name}" queued for future runtime.`,
      logs: [],
    };
  }

  async validate(): Promise<readonly string[]> {
    return [];
  }
}

export class DefaultScriptEngine implements ScriptEngine {
  private readonly adapters = new Map<string, ScriptLanguageAdapter>();
  private readonly scripts = new Map<string, ScriptDefinition>();

  constructor() {
    this.registerAdapter(new JavaScriptAdapter());
    this.registerAdapter(new StubLanguageAdapter('python'));
    this.registerAdapter(new StubLanguageAdapter('lua'));
  }

  registerAdapter(adapter: ScriptLanguageAdapter): void {
    this.adapters.set(adapter.language, adapter);
  }

  async load(script: ScriptDefinition): Promise<void> {
    const adapter = this.adapters.get(script.language);
    if (!adapter) {
      throw new Error(`No adapter for language: ${script.language}`);
    }
    const errors = await adapter.validate(script);
    if (errors.length > 0) {
      throw new Error(`Script validation failed: ${errors.join('; ')}`);
    }
    this.scripts.set(script.metadata.name, script);
  }

  unload(name: string): boolean {
    return this.scripts.delete(name);
  }

  get(name: string): ScriptDefinition | undefined {
    return this.scripts.get(name);
  }

  list(): readonly ScriptDefinition[] {
    return [...this.scripts.values()];
  }

  async execute(name: string, context: ScriptExecutionContext = { args: {}, permissions: [] }): Promise<ScriptResult> {
    const script = this.scripts.get(name);
    if (!script) {
      return { success: false, error: `Script not found: ${name}`, logs: [] };
    }
    const adapter = this.adapters.get(script.language);
    if (!adapter) {
      return { success: false, error: `No adapter for language: ${script.language}`, logs: [] };
    }
    return adapter.execute(script, context);
  }

  async callFunction(
    scriptName: string,
    functionName: string,
    args: Record<string, unknown> = {},
  ): Promise<ScriptResult> {
    const script = this.scripts.get(scriptName);
    if (!script) {
      return { success: false, error: `Script not found: ${scriptName}`, logs: [] };
    }
    const wrapped: ScriptDefinition = {
      ...script,
      source: `${script.source}\nreturn ${functionName}(args);`,
    };
    const adapter = this.adapters.get(script.language);
    if (!adapter) {
      return { success: false, error: `No adapter for language: ${script.language}`, logs: [] };
    }
    return adapter.execute(wrapped, { args, permissions: script.metadata.permissions });
  }
}
