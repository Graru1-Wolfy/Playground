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
  hasResolvablePatterns,
  isMovementAllowedForLauncher,
  resolveSetupPatterns,
} from "../src/binds.js";

describe("generateSetupBinds", () => {
  it("generates movement and action aliases from fixture setup", () => {
    const fixture = resolve(__dirname, "fixtures/sample_setup.bin");
    const buf = readFileSync(fixture);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const setup = decodeSetup(view, 0);

    const binds = generateSetupBinds(setup);
    expect(binds).not.toBeNull();
    expect(binds!.movement.plus).toContain("+moveleft");
    expect(binds!.action.plus).toContain("+duck; -duck -1");
    expect(formatBindBlock(binds!)).toContain("alias +walk");
    expect(formatBindBlock(binds!)).toContain("alias +strike");
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
    expect(instructions.some((line) => line.includes("pattern 255"))).toBe(false);
  });
});

describe("resolveSetupPatterns", () => {
  it("hides unset pattern bytes and skips bind generation", () => {
    const setup = {
      ID: 1n,
      launcher: 0,
      start_moving: 255,
      start_action: 255,
      num_rockets: 1,
      tick_delay_auto_bounce: 255,
      tick_delay_auto_synced_bounce: 255,
      tick_delay_auto_standing_bounce: 255,
      tick_delay_auto_synced_standing_bounce: 255,
      bounce_flag: 0,
      standing_bounce_flag: 0,
      rocket_fired_crouched_flag: 0,
      rocket_hit_crouched_flag: 0,
      speeds: [],
    };

    expect(resolveSetupPatterns(setup)).toBeNull();
    expect(generateSetupBinds(setup)).toBeNull();
    expect(hasResolvablePatterns(setup)).toBe(false);
    expect(generateSetupInstructions(setup).some((line) => line.startsWith("Movement:"))).toBe(false);
  });

  it("infers action patterns from setup flags", () => {
    const setup = {
      ID: 2n,
      launcher: 0,
      start_moving: 255,
      start_action: 255,
      num_rockets: 1,
      tick_delay_auto_bounce: 255,
      tick_delay_auto_synced_bounce: 255,
      tick_delay_auto_standing_bounce: 255,
      tick_delay_auto_synced_standing_bounce: 255,
      bounce_flag: 0,
      standing_bounce_flag: 0,
      rocket_fired_crouched_flag: 0,
      rocket_hit_crouched_flag: 0,
      speeds: [],
      JS: 128,
      NOMOVING: 128,
    };

    expect(resolveSetupPatterns(setup)).toMatchObject({
      movementLabel: "No movement",
      actionLabel: "Jump shoot",
    });
  });

  it("blocks Original-only impossible movement patterns", () => {
    expect(isMovementAllowedForLauncher(1, 4)).toBe(false);
    expect(isMovementAllowedForLauncher(0, 4)).toBe(true);
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
