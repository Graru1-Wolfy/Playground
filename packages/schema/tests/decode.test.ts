import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { decodeSetup, decodeSetupBytes, RECORD_SIZE } from "../src/decode.js";
import { rankSetups, scoreSetup, defaultPreferenceWeights } from "../src/scoring.js";
import { serializeSetup } from "../src/serialize.js";
import { getSetupTags } from "../src/tags.js";

describe("decodeSetup", () => {
  it("decodes Python-generated fixture record", () => {
    const fixture = resolve(__dirname, "fixtures/sample_setup.bin");
    const buf = readFileSync(fixture);
    expect(buf.length).toBe(RECORD_SIZE);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const setup = decodeSetup(view, 0);
    expect(setup.ID).toBe(1234n);
    expect(setup.launcher).toBe(2);
    expect(setup.num_rockets).toBe(1);
    expect(setup.STOCK).toBe(0);
    expect(setup.MANG).toBe(128);
    expect(setup.STANDBOUNCE).toBe(64);
    expect(setup.speeds[1]).toBeCloseTo(591.28, 1);
  });
});

describe("setup helpers", () => {
  it("serializes bigint IDs as strings", () => {
    const fixture = resolve(__dirname, "fixtures/sample_setup.bin");
    const buf = readFileSync(fixture);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const setup = decodeSetup(view, 0);
    const serialized = serializeSetup(setup);
    expect(typeof serialized.ID).toBe("string");
    expect(serialized.ID).toBe("1234");
    expect(serialized.MANG).toBe(128);
  });

  it("scores and ranks setups with default weights", () => {
    const sample = resolve(__dirname, "../../../apps/web/public/sample-data/000to099/64.bin");
    const setups = decodeSetupBytes(readFileSync(sample));
    expect(setups.length).toBeGreaterThan(0);

    const weights = defaultPreferenceWeights();
    const top = setups[0]!;
    expect(scoreSetup(top, weights)).toBeGreaterThan(0);

    const ranked = rankSetups(setups, weights);
    expect(ranked[0]!.rank).toBe(1);
    expect(ranked[0]!.score).toBeGreaterThanOrEqual(ranked[1]!.score);
    expect(typeof ranked[0]!.ID).toBe("string");
  });

  it("builds preference tags instead of raw bounce_flag bits", () => {
    const sample = resolve(__dirname, "../../../apps/web/public/sample-data/000to099/64.bin");
    const setups = decodeSetupBytes(readFileSync(sample));
    const bounceSetup = setups.find((s) => s.BOUNCE && s.BOUNCE > 0);
    expect(bounceSetup).toBeDefined();

    const tags = getSetupTags(bounceSetup!);
    expect(tags.some((t) => t.label === "Bounce")).toBe(true);
    expect(tags.every((t) => t.label !== "bounce")).toBe(true);
  });
});
