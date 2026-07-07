/** Terminal-velocity height normalization (Fancy-BCheck / bcheck). */
export function normalizeHeight(input: number): number {
  if (!Number.isFinite(input) || input < 0) {
    throw new Error("Height must be a non-negative integer");
  }
  const n = Math.floor(input);
  if (n > 8000) {
    return 7000 - ((8000 - n) % 105);
  }
  return n;
}

export function heightBucket(height: number): string {
  const base = Math.floor(height / 100) * 100;
  return `${String(base).padStart(3, "0")}to${String(base + 99).padStart(3, "0")}`;
}

export function setupDataUrl(height: number, basePath = "data"): string {
  return `${basePath}/${heightBucket(height)}/${height}.bin.gz`;
}
