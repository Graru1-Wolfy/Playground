const API_BASE = import.meta.env.VITE_IDE_API ?? 'http://localhost:3100';

export async function apiCommand(name: string, args?: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${API_BASE}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, args }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? 'Command failed');
  return data.data;
}

export async function apiSearch(query: string): Promise<unknown[]> {
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function apiListDir(path: string): Promise<Array<{ name: string; path: string; type: string }>> {
  const res = await fetch(`${API_BASE}/fs/list?path=${encodeURIComponent(path)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function apiReadFile(path: string): Promise<string> {
  const res = await fetch(`${API_BASE}/fs/read?path=${encodeURIComponent(path)}`);
  const data = await res.json();
  return data.content ?? '';
}

export { API_BASE };
