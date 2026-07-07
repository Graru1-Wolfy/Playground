import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { decodeSetup, RECORD_SIZE } from "../src/decode.js";

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
