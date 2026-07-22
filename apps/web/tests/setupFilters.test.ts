import { describe, expect, it } from "vitest";
import type { DecodedSetup } from "@playground/schema";
import { setupMatchesActiveFilters } from "../src/setupFilters.js";

const sampleSetup: DecodedSetup = {
  ID: 1n,
  launcher: 0,
  start_moving: 1,
  start_action: 0,
  num_rockets: 1,
  tick_delay_auto_bounce: 255,
  tick_delay_auto_synced_bounce: 255,
  tick_delay_auto_standing_bounce: 255,
  tick_delay_auto_synced_standing_bounce: 255,
  bounce_flag: 0,
  standing_bounce_flag: 0,
  rocket_fired_crouched_flag: 0,
  rocket_hit_crouched_flag: 0,
  speeds: [285],
  STOCK: 128,
  BOUNCE: 64,
  SIMPLE: 65,
};

describe("setupMatchesActiveFilters", () => {
  it("shows all setups when no filters are selected", () => {
    expect(setupMatchesActiveFilters(sampleSetup, new Set())).toBe(true);
  });

  it("matches selected launcher and bounce filters together", () => {
    expect(setupMatchesActiveFilters(sampleSetup, new Set(["stock", "bounce"]))).toBe(true);
    expect(setupMatchesActiveFilters(sampleSetup, new Set(["original"]))).toBe(false);
    expect(setupMatchesActiveFilters(sampleSetup, new Set(["stock", "bhop"]))).toBe(false);
  });
});
