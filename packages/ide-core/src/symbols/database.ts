import type { SymbolDatabase, SymbolEntry, SymbolKind, SymbolLocation } from './types.js';

const SYMBOL_PATTERNS: Array<{ kind: SymbolKind; pattern: RegExp }> = [
  { kind: 'class', pattern: /(?:export\s+)?class\s+(\w+)/g },
  { kind: 'function', pattern: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g },
  { kind: 'interface', pattern: /(?:export\s+)?interface\s+(\w+)/g },
  { kind: 'type', pattern: /(?:export\s+)?type\s+(\w+)/g },
  { kind: 'enum', pattern: /(?:export\s+)?enum\s+(\w+)/g },
  { kind: 'variable', pattern: /(?:export\s+)?(?:const|let|var)\s+(\w+)/g },
];

function lineColumnAt(content: string, index: number): { line: number; column: number } {
  const before = content.slice(0, index);
  const lines = before.split('\n');
  return { line: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 };
}

export class DefaultSymbolDatabase implements SymbolDatabase {
  private readonly symbols = new Map<string, SymbolEntry>();
  private readonly byFile = new Map<string, Set<string>>();
  private readonly byName = new Map<string, Set<string>>();

  async indexFile(filePath: string, content: string): Promise<void> {
    this.removeFile(filePath);
    const ids = new Set<string>();

    for (const { kind, pattern } of SYMBOL_PATTERNS) {
      for (const match of content.matchAll(pattern)) {
        const name = match[1];
        const index = match.index ?? 0;
        const { line, column } = lineColumnAt(content, index);
        const id = crypto.randomUUID();
        const entry: SymbolEntry = {
          id,
          name,
          kind,
          location: { file: filePath, line, column },
          references: [],
        };
        this.symbols.set(id, entry);
        ids.add(id);
        const nameSet = this.byName.get(name) ?? new Set();
        nameSet.add(id);
        this.byName.set(name, nameSet);
      }
    }

    this.byFile.set(filePath, ids);
  }

  removeFile(filePath: string): void {
    const ids = this.byFile.get(filePath);
    if (!ids) return;
    for (const id of ids) {
      const sym = this.symbols.get(id);
      if (sym) {
        const nameSet = this.byName.get(sym.name);
        nameSet?.delete(id);
      }
      this.symbols.delete(id);
    }
    this.byFile.delete(filePath);
  }

  getDefinition(name: string, context?: SymbolLocation): SymbolEntry | undefined {
    const ids = this.byName.get(name);
    if (!ids || ids.size === 0) return undefined;
    if (context) {
      for (const id of ids) {
        const sym = this.symbols.get(id);
        if (sym?.location.file === context.file) return sym;
      }
    }
    return this.symbols.get([...ids][0]);
  }

  findReferences(symbolId: string): readonly SymbolEntry[] {
    const sym = this.symbols.get(symbolId);
    if (!sym) return [];
    return [...this.symbols.values()].filter(
      (s) => s.name === sym.name && s.id !== symbolId,
    );
  }

  getCallHierarchy(symbolId: string): readonly SymbolEntry[] {
    const sym = this.symbols.get(symbolId);
    if (!sym || sym.kind !== 'function') return [];
    return this.findReferences(symbolId);
  }

  getOutline(filePath: string): readonly SymbolEntry[] {
    const ids = this.byFile.get(filePath);
    if (!ids) return [];
    return [...ids].map((id) => this.symbols.get(id)!).filter(Boolean);
  }

  search(query: string, kinds?: readonly SymbolKind[]): readonly SymbolEntry[] {
    const q = query.toLowerCase();
    return [...this.symbols.values()].filter((s) => {
      if (kinds && !kinds.includes(s.kind)) return false;
      return s.name.toLowerCase().includes(q);
    });
  }

  list(): readonly SymbolEntry[] {
    return [...this.symbols.values()];
  }
}
