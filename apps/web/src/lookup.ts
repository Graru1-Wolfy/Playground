import { decodeSetupFile, type DecodedSetup } from "@playground/schema";
import { setupDataUrl } from "./height.js";

export async function loadSetupsForHeight(height: number): Promise<DecodedSetup[]> {
  const url = setupDataUrl(height);
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }
  const ds = new DecompressionStream("gzip");
  const decompressed = new Response(response.body!.pipeThrough(ds));
  const buffer = await decompressed.arrayBuffer();
  return decodeSetupFile(buffer);
}
