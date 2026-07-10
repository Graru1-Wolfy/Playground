import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { decodeSetupFile, type DecodedSetup } from "@playground/schema";
import { heightBucket } from "./height.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

export interface SetupLoadResult {
  setups: DecodedSetup[];
  source: "generated" | "sample" | "none";
}

export interface ApiPaths {
  dataRoot: string;
  sampleRoot: string;
}

export function resolveApiPaths(env: NodeJS.ProcessEnv = process.env): ApiPaths {
  return {
    dataRoot: env.DATA_ROOT ?? path.join(repoRoot, "data", "generated"),
    sampleRoot: env.SAMPLE_ROOT ?? path.join(repoRoot, "apps", "web", "public", "sample-data"),
  };
}

function bucketFile(root: string, height: number, ext: string): string {
  return path.join(root, heightBucket(height), `${height}${ext}`);
}

async function readFileIfExists(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

function decodeBuffer(buffer: Buffer): DecodedSetup[] {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  return decodeSetupFile(arrayBuffer);
}

export async function loadSetupsForHeight(
  height: number,
  paths = resolveApiPaths(),
): Promise<SetupLoadResult> {
  const generatedPath = bucketFile(paths.dataRoot, height, ".bin.gz");
  const generatedRaw = await readFileIfExists(generatedPath);
  if (generatedRaw) {
    try {
      const decoded = decodeBuffer(gunzipSync(generatedRaw));
      if (decoded.length > 0) {
        return { setups: decoded, source: "generated" };
      }
    } catch {
      /* fall through to sample */
    }
  }

  const samplePath = bucketFile(paths.sampleRoot, height, ".bin");
  const sampleRaw = await readFileIfExists(samplePath);
  if (sampleRaw) {
    const decoded = decodeBuffer(sampleRaw);
    if (decoded.length > 0) {
      return { setups: decoded, source: "sample" };
    }
  }

  return { setups: [], source: "none" };
}

export function serializeSetup(setup: DecodedSetup): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(setup)) {
    if (typeof value === "bigint") {
      out[key] = value.toString();
    } else {
      out[key] = value;
    }
  }
  return out;
}
