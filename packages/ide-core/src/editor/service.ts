import type { EditorDocument, EditorSelection, EditorService } from './types.js';

export class DefaultEditorService implements EditorService {
  private readonly documents = new Map<string, EditorDocument>();
  private readonly byPath = new Map<string, string>();
  private activeId?: string;
  private selection?: EditorSelection;

  open(path: string, content = '', language = 'plaintext'): EditorDocument {
    const existing = this.getByPath(path);
    if (existing) {
      this.activeId = existing.id;
      return existing;
    }
    const doc: EditorDocument = {
      id: crypto.randomUUID(),
      path,
      language,
      content,
      dirty: false,
      version: 1,
    };
    this.documents.set(doc.id, doc);
    this.byPath.set(path, doc.id);
    this.activeId = doc.id;
    return doc;
  }

  close(documentId: string): boolean {
    const doc = this.documents.get(documentId);
    if (!doc) return false;
    this.documents.delete(documentId);
    this.byPath.delete(doc.path);
    if (this.activeId === documentId) {
      this.activeId = [...this.documents.keys()][0];
    }
    return true;
  }

  get(documentId: string): EditorDocument | undefined {
    return this.documents.get(documentId);
  }

  getByPath(path: string): EditorDocument | undefined {
    const id = this.byPath.get(path);
    return id ? this.documents.get(id) : undefined;
  }

  list(): readonly EditorDocument[] {
    return [...this.documents.values()];
  }

  setContent(documentId: string, content: string): EditorDocument {
    const doc = this.documents.get(documentId);
    if (!doc) throw new Error(`Document not found: ${documentId}`);
    const updated: EditorDocument = {
      ...doc,
      content,
      dirty: true,
      version: doc.version + 1,
    };
    this.documents.set(documentId, updated);
    return updated;
  }

  getSelection(): EditorSelection | undefined {
    return this.selection;
  }

  setSelection(selection: EditorSelection): void {
    this.selection = selection;
  }

  getActiveDocument(): EditorDocument | undefined {
    return this.activeId ? this.documents.get(this.activeId) : undefined;
  }

  setActiveDocument(documentId: string): void {
    if (!this.documents.has(documentId)) {
      throw new Error(`Document not found: ${documentId}`);
    }
    this.activeId = documentId;
  }
}
