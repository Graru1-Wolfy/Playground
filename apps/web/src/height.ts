/** Terminal-velocity height normalization (Fancy-BCheck / bcheck). */
export const MAX_HAMMER_HEIGHT = 65536;
export const HAMMER_SLIDER_STEP = 100;

export function snapHammerSlider(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const snapped = Math.round(value / HAMMER_SLIDER_STEP) * HAMMER_SLIDER_STEP;
  return Math.min(MAX_HAMMER_HEIGHT, Math.max(0, snapped));
}

export function normalizeHeight(input: number): number {
  if (!Number.isFinite(input) || input < 0 || input > MAX_HAMMER_HEIGHT) {
    throw new Error(`Height must be between 0 and ${MAX_HAMMER_HEIGHT} Hammer units`);
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

export function setupDataUrl(height: number, basePath?: string): string {
  const root = basePath ?? `${import.meta.env.BASE_URL}data`;
  const prefix = root.endsWith("/") ? root : `${root}/`;
  return `${prefix}${heightBucket(height)}/${height}.bin.gz`;
}

export function sampleDataUrl(height: number): string {
  const root = `${import.meta.env.BASE_URL}sample-data`;
  const prefix = root.endsWith("/") ? root : `${root}/`;
  return `${prefix}${heightBucket(height)}/${height}.bin`;
}
