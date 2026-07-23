export interface FileEntry {
  readonly name: string;
  readonly path: string;
  readonly type: 'file' | 'directory';
  readonly size?: number;
  readonly modifiedAt?: number;
}

export interface FilesystemService {
  read(path: string, encoding?: BufferEncoding): Promise<string>;
  write(path: string, content: string, encoding?: BufferEncoding): Promise<void>;
  list(path: string): Promise<readonly FileEntry[]>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, recursive?: boolean): Promise<void>;
  remove(path: string, recursive?: boolean): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  stat(path: string): Promise<FileEntry>;
  watch?(path: string, callback: (event: string, filename: string) => void): () => void;
}
