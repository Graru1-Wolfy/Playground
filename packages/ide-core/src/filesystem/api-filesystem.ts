import type { FileEntry, FilesystemService } from './types.js';

/** Browser-side filesystem backed by REST API. */
export class ApiFilesystemService implements FilesystemService {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}/fs${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Filesystem API error: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async read(path: string): Promise<string> {
    const data = await this.request<{ content: string }>('GET', `/read?path=${encodeURIComponent(path)}`);
    return data.content;
  }

  async write(path: string, content: string): Promise<void> {
    await this.request('POST', '/write', { path, content });
  }

  async list(path: string): Promise<readonly FileEntry[]> {
    return this.request<readonly FileEntry[]>('GET', `/list?path=${encodeURIComponent(path)}`);
  }

  async exists(path: string): Promise<boolean> {
    const data = await this.request<{ exists: boolean }>('GET', `/exists?path=${encodeURIComponent(path)}`);
    return data.exists;
  }

  async mkdir(path: string, recursive = true): Promise<void> {
    await this.request('POST', '/mkdir', { path, recursive });
  }

  async remove(path: string, recursive = false): Promise<void> {
    await this.request('POST', '/remove', { path, recursive });
  }

  async rename(from: string, to: string): Promise<void> {
    await this.request('POST', '/rename', { from, to });
  }

  async stat(path: string): Promise<FileEntry> {
    return this.request<FileEntry>('GET', `/stat?path=${encodeURIComponent(path)}`);
  }
}
