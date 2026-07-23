import type { LogEntry, LogLevel, Logger } from './types.js';

const LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

export class DefaultLogger implements Logger {
  private readonly entries: LogEntry[] = [];
  private readonly minLevel: LogLevel;
  private readonly source: string;

  constructor(source = 'ide', minLevel: LogLevel = 'debug') {
    this.source = source;
    this.minLevel = minLevel;
  }

  trace(message: string, data?: Record<string, unknown>): void {
    this.log('trace', message, data);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);
  }

  fatal(message: string, data?: Record<string, unknown>): void {
    this.log('fatal', message, data);
  }

  getEntries(level?: LogLevel): readonly LogEntry[] {
    if (!level) return [...this.entries];
    const min = LEVEL_ORDER[level];
    return this.entries.filter((e) => LEVEL_ORDER[e.level] >= min);
  }

  clear(): void {
    this.entries.length = 0;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return;
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      level,
      message,
      source: this.source,
      timestamp: Date.now(),
      data,
    };
    this.entries.push(entry);
  }
}
