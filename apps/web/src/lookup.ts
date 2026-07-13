import { decodeSetupFile, RECORD_SIZE, type DecodedSetup } from "@playground/schema";
import { sampleDataUrl, setupDataUrl } from "./height.js";

export interface LoadResult {
  setups: DecodedSetup[];
  source: "generated" | "sample" | "none";
}

async function gunzipBuffer(compressed: ArrayBuffer): Promise<ArrayBuffer> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("gzip decompression is not available in this WebView");
  }
  const ds = new DecompressionStream("gzip");
  return new Response(new Blob([compressed]).stream().pipeThrough(ds)).arrayBuffer();
}

function isGzipBuffer(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 2));
  return bytes.length === 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

function decodeRawSetups(buffer: ArrayBuffer): DecodedSetup[] | null {
  if (buffer.byteLength === 0 || buffer.byteLength % RECORD_SIZE !== 0) return null;
  const setups = decodeSetupFile(buffer);
  return setups.length > 0 ? setups : null;
}

async function decodeSetupBuffer(buffer: ArrayBuffer, compressed: boolean): Promise<DecodedSetup[] | null> {
  if (!compressed) return decodeRawSetups(buffer);

  try {
    const decompressed = await gunzipBuffer(buffer);
    return decodeRawSetups(decompressed);
  } catch {
    // Android WebView/Capacitor can serve .gz assets as already-decoded bytes.
    // In that case the gzip magic header is gone and the raw schema records are usable directly.
    return isGzipBuffer(buffer) ? null : decodeRawSetups(buffer);
  }
}

async function fetchBinary(url: string): Promise<ArrayBuffer | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.arrayBuffer();
}

async function fetchSetups(url: string, decompress: boolean): Promise<DecodedSetup[] | null> {
  try {
    const buffer = await fetchBinary(url);
    if (!buffer || buffer.byteLength === 0) return null;
    return decodeSetupBuffer(buffer, decompress);
  } catch {
    return null;
  }
}

async function loadNativeGeneratedSetups(height: number): Promise<DecodedSetup[] | null> {
  if (!window.bounceNative?.loadGeneratedSetup) return null;
  const result = await window.bounceNative.loadGeneratedSetup(height);
  if (!result.ok || !result.data?.length) return null;
  const bytes = Uint8Array.from(result.data);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return decodeSetupBuffer(buffer, true);
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
