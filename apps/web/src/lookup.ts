import { decodeSetupFile, type DecodedSetup } from "@playground/schema";
import { sampleDataUrl, setupDataUrl } from "./height.js";

export interface LoadResult {
  setups: DecodedSetup[];
  source: "generated" | "sample" | "none";
}

async function gunzipBuffer(compressed: ArrayBuffer): Promise<ArrayBuffer> {
  const ds = new DecompressionStream("gzip");
  return new Response(new Blob([compressed]).stream().pipeThrough(ds)).arrayBuffer();
}

async function fetchBinary(url: string, decompress: boolean): Promise<ArrayBuffer | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  const buffer = await response.arrayBuffer();
  if (!decompress) return buffer;
  try {
    return await gunzipBuffer(buffer);
  } catch {
    return null;
  }
}

async function fetchSetups(url: string, decompress: boolean): Promise<DecodedSetup[] | null> {
  try {
    const buffer = await fetchBinary(url, decompress);
    if (!buffer || buffer.byteLength === 0) return null;
    return decodeSetupFile(buffer);
  } catch {
    return null;
  }
}

async function loadNativeGeneratedSetups(height: number): Promise<DecodedSetup[] | null> {
  if (!window.bounceNative?.loadGeneratedSetup) return null;
  const result = await window.bounceNative.loadGeneratedSetup(height);
  if (!result.ok || !result.data?.length) return null;
  const bytes = Uint8Array.from(result.data);
  const buffer = await gunzipBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  return decodeSetupFile(buffer);
}

export async function loadSetupsForHeight(height: number): Promise<DecodedSetup[]> {
  const result = await loadSetupsWithSource(height);
  return result.setups;
}

export async function loadSetupsWithSource(height: number): Promise<LoadResult> {
  const nativeGenerated = await loadNativeGeneratedSetups(height);
  if (nativeGenerated && nativeGenerated.length > 0) {
    return { setups: nativeGenerated, source: "generated" };
  }

  const generated = await fetchSetups(setupDataUrl(height), true);
  if (generated && generated.length > 0) {
    return { setups: generated, source: "generated" };
  }

  const sample = await fetchSetups(sampleDataUrl(height), false);
  if (sample && sample.length > 0) {
    return { setups: sample, source: "sample" };
  }

  return { setups: [], source: "none" };
}
