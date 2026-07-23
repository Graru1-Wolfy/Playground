export interface EditorDocument {
  readonly id: string;
  readonly path: string;
  readonly language: string;
  readonly content: string;
  readonly dirty: boolean;
  readonly version: number;
}

export interface EditorSelection {
  readonly documentId: string;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export interface EditorService {
  open(path: string, content?: string, language?: string): EditorDocument;
  close(documentId: string): boolean;
  get(documentId: string): EditorDocument | undefined;
  getByPath(path: string): EditorDocument | undefined;
  list(): readonly EditorDocument[];
  setContent(documentId: string, content: string): EditorDocument;
  getSelection(): EditorSelection | undefined;
  setSelection(selection: EditorSelection): void;
  getActiveDocument(): EditorDocument | undefined;
  setActiveDocument(documentId: string): void;
}
