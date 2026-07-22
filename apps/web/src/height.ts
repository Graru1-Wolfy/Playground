import { heightBucket } from "@playground/schema";

export { heightBucket, normalizeHeight } from "@playground/schema";

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
