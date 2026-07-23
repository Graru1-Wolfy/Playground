import { readdir, readFile, writeFile, mkdir, rm, rename, stat as fsStat, access } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type { FileEntry, FilesystemService } from './types.js';

export class NodeFilesystemService implements FilesystemService {
  constructor(private readonly rootPath: string = process.cwd()) {}

  resolve(path: string): string {
    if (path.startsWith('/')) return path;
    return join(this.rootPath, path);
  }

  async read(path: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    return readFile(this.resolve(path), encoding);
  }

  async write(path: string, content: string, encoding: BufferEncoding = 'utf-8'): Promise<void> {
    await writeFile(this.resolve(path), content, encoding);
  }

  async list(path: string): Promise<readonly FileEntry[]> {
    const resolved = this.resolve(path);
    const entries = await readdir(resolved, { withFileTypes: true });
    const result: FileEntry[] = [];
    for (const entry of entries) {
      const entryPath = join(resolved, entry.name);
      const st = await fsStat(entryPath);
      result.push({
        name: entry.name,
        path: entryPath,
        type: entry.isDirectory() ? 'directory' : 'file',
        size: st.size,
        modifiedAt: st.mtimeMs,
      });
    }
    return result.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(this.resolve(path));
      return true;
    } catch {
      return false;
    }
  }

  async mkdir(path: string, recursive = true): Promise<void> {
    await mkdir(this.resolve(path), { recursive });
  }

  async remove(path: string, recursive = false): Promise<void> {
    await rm(this.resolve(path), { recursive, force: true });
  }

  async rename(from: string, to: string): Promise<void> {
    await rename(this.resolve(from), this.resolve(to));
  }

  async stat(path: string): Promise<FileEntry> {
    const resolved = this.resolve(path);
    const st = await fsStat(resolved);
    return {
      name: basename(resolved),
      path: resolved,
      type: st.isDirectory() ? 'directory' : 'file',
      size: st.size,
      modifiedAt: st.mtimeMs,
    };
  }
}
