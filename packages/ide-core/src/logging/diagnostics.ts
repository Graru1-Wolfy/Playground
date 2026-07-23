import type { Diagnostic, DiagnosticSeverity, DiagnosticsService } from './types.js';

export class DefaultDiagnosticsService implements DiagnosticsService {
  private readonly diagnostics: Diagnostic[] = [];

  report(input: Omit<Diagnostic, 'id' | 'timestamp'>): Diagnostic {
    const diagnostic: Diagnostic = {
      ...input,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    this.diagnostics.push(diagnostic);
    return diagnostic;
  }

  list(filter?: { severity?: DiagnosticSeverity; source?: string }): readonly Diagnostic[] {
    return this.diagnostics.filter((d) => {
      if (filter?.severity && d.severity !== filter.severity) return false;
      if (filter?.source && d.source !== filter.source) return false;
      return true;
    });
  }

  clear(source?: string): void {
    if (!source) {
      this.diagnostics.length = 0;
      return;
    }
    const remaining = this.diagnostics.filter((d) => d.source !== source);
    this.diagnostics.length = 0;
    this.diagnostics.push(...remaining);
  }

  getSummary(): Record<DiagnosticSeverity, number> {
    const summary: Record<DiagnosticSeverity, number> = {
      hint: 0,
      info: 0,
      warning: 0,
      error: 0,
    };
    for (const d of this.diagnostics) {
      summary[d.severity]++;
    }
    return summary;
  }
}
