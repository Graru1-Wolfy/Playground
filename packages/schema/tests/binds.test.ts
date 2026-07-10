import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { decodeSetup } from "../src/decode.js";
import {
  DEFAULT_START_GUIDES,
  formatBindBlock,
  formatGuideBindBlock,
  generateSetupBinds,
  generateSetupInstructions,
} from "../src/binds.js";

describe("generateSetupBinds", () => {
  it("generates movement and action aliases from fixture setup", () => {
    const fixture = resolve(__dirname, "fixtures/sample_setup.bin");
    const buf = readFileSync(fixture);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const setup = decodeSetup(view, 0);

    const binds = generateSetupBinds(setup);
    expect(binds.movement.plus).toContain("+moveleft");
    expect(binds.action.plus).toContain("+duck; -duck -1");
    expect(formatBindBlock(binds)).toContain("alias +walk");
    expect(formatBindBlock(binds)).toContain("alias +strike");
  });
});

describe("generateSetupInstructions", () => {
  it("includes movement, action, and technique notes", () => {
    const fixture = resolve(__dirname, "fixtures/sample_setup.bin");
    const buf = readFileSync(fixture);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const setup = decodeSetup(view, 0);

    const instructions = generateSetupInstructions(setup);
    expect(instructions.some((line) => line.startsWith("Movement:"))).toBe(true);
    expect(instructions.some((line) => line.startsWith("Start action:"))).toBe(true);
    expect(instructions.some((line) => line.includes("CTAP"))).toBe(true);
    expect(instructions.some((line) => line.includes("Standing bounce"))).toBe(true);
  });
});

describe("DEFAULT_START_GUIDES", () => {
  it("covers all DEFAULT analytical start types", () => {
    expect(DEFAULT_START_GUIDES.map((g) => g.label)).toEqual([
      "Walk",
      "Crouch Walk",
      "Jump",
      "Crouch Jump",
      "Ctap",
      "Ceilingsmash",
    ]);
    expect(DEFAULT_START_GUIDES[2]!.action.plus).toContain("+jump");
  });

  it("formats guide bind blocks without a decoded setup", () => {
    const block = formatGuideBindBlock(DEFAULT_START_GUIDES[0]!);
    expect(block).toContain("alias +walk");
    expect(block).toContain("alias +strike");
    expect(block.split("\n")).toHaveLength(4);
  });
});
