import type { Metadata } from '../metadata/types.js';

export type ScriptLanguage = 'python' | 'lua' | 'javascript' | string;

export interface ScriptDefinition {
  readonly metadata: Metadata;
  readonly language: ScriptLanguage;
  readonly source: string;
  readonly dependencies: readonly string[];
  readonly minIdeVersion: string;
  readonly exports: readonly string[];
}

export interface ScriptExecutionContext {
  readonly args: Readonly<Record<string, unknown>>;
  readonly permissions: readonly string[];
  readonly signal?: AbortSignal;
}

export interface ScriptResult {
  readonly success: boolean;
  readonly output?: unknown;
  readonly error?: string;
  readonly logs: readonly string[];
}

export interface ScriptLanguageAdapter {
  readonly language: ScriptLanguage;
  execute(script: ScriptDefinition, context: ScriptExecutionContext): Promise<ScriptResult>;
  validate(script: ScriptDefinition): Promise<readonly string[]>;
}

/** Future visual scripting node types — share the same execution APIs. */
export type LogicNodeType =
  | 'function'
  | 'loop'
  | 'condition'
  | 'event'
  | 'variable'
  | 'pipeline'
  | 'query'
  | 'macro'
  | 'graph'
  | 'node'
  | 'pin';

export interface LogicNode {
  readonly id: string;
  readonly type: LogicNodeType;
  readonly name: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ScriptEngine {
  registerAdapter(adapter: ScriptLanguageAdapter): void;
  load(script: ScriptDefinition): Promise<void>;
  unload(name: string): boolean;
  get(name: string): ScriptDefinition | undefined;
  list(): readonly ScriptDefinition[];
  execute(name: string, context?: ScriptExecutionContext): Promise<ScriptResult>;
  callFunction(scriptName: string, functionName: string, args?: Record<string, unknown>): Promise<ScriptResult>;
}
