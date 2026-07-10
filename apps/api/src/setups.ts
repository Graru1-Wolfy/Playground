import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import {
  decodeSetupBytes,
  rankSetups,
  serializeSetup,
  type DecodedSetup,
  type RankedSetup,
  type SerializedSetup,
  type SetupDataSource,
} from "@playground/schema";
import type { PreferenceWeights } from "@playground/schema";
import { heightBucket } from "./height.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

export interface SetupLoadResult {
  setups: DecodedSetup[];
  source: SetupDataSource;
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
  return decodeSetupBytes(buffer);
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

export function prepareSetupResults(
  setups: DecodedSetup[],
  options: {
    ranked?: boolean;
    limit?: number;
    weights?: PreferenceWeights;
  } = {},
): { results: RankedSetup[] | SerializedSetup[]; ranked: boolean } {
  const ranked = options.ranked !== false;
  const list = ranked ? rankSetups(setups, options.weights) : setups.map(serializeSetup);
  const limit = options.limit;
  const slice =
    limit !== undefined ? list.slice(0, Math.max(0, Math.floor(limit))) : list;
  return { results: slice, ranked };
}

export { serializeSetup };
