export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  readonly id: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly source: string;
  readonly timestamp: number;
  readonly data?: Record<string, unknown>;
}

export interface Logger {
  trace(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  fatal(message: string, data?: Record<string, unknown>): void;
  getEntries(level?: LogLevel): readonly LogEntry[];
  clear(): void;
}

export type DiagnosticSeverity = 'hint' | 'info' | 'warning' | 'error';

export interface Diagnostic {
  readonly id: string;
  readonly severity: DiagnosticSeverity;
  readonly source: string;
  readonly message: string;
  readonly code?: string;
  readonly file?: string;
  readonly line?: number;
  readonly column?: number;
  readonly data?: Record<string, unknown>;
  readonly timestamp: number;
}

export interface DiagnosticsService {
  report(diagnostic: Omit<Diagnostic, 'id' | 'timestamp'>): Diagnostic;
  list(filter?: { severity?: DiagnosticSeverity; source?: string }): readonly Diagnostic[];
  clear(source?: string): void;
  getSummary(): Record<DiagnosticSeverity, number>;
}
