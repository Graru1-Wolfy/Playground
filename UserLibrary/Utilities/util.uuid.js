export function v4(): string {
  return crypto.randomUUID();
}

export function parse(id: string): { valid: boolean } {
  return { valid: /^[0-9a-f-]{36}$/i.test(id) };
}
