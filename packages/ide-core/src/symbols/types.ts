export type SymbolKind =
  | 'class'
  | 'function'
  | 'variable'
  | 'enum'
  | 'namespace'
  | 'interface'
  | 'type'
  | 'file'
  | 'comment'
  | 'documentation';

export interface SymbolLocation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

export interface SymbolEntry {
  readonly id: string;
  readonly name: string;
  readonly kind: SymbolKind;
  readonly location: SymbolLocation;
  readonly container?: string;
  readonly documentation?: string;
  readonly signature?: string;
  readonly references: readonly string[];
}

export interface SymbolDatabase {
  indexFile(filePath: string, content: string): Promise<void>;
  removeFile(filePath: string): void;
  getDefinition(name: string, context?: SymbolLocation): SymbolEntry | undefined;
  findReferences(symbolId: string): readonly SymbolEntry[];
  getCallHierarchy(symbolId: string): readonly SymbolEntry[];
  getOutline(filePath: string): readonly SymbolEntry[];
  search(query: string, kinds?: readonly SymbolKind[]): readonly SymbolEntry[];
  list(): readonly SymbolEntry[];
}
