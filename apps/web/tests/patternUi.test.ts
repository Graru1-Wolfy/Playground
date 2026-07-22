import { describe, expect, it } from "vitest";
import type { DecodedSetup } from "@playground/schema";
import { formatSetupCard } from "../src/formatSetup.js";
import { formatSetupDetailHtml } from "../src/setupDetail.js";

const unsetPatternSetup: DecodedSetup = {
  ID: 64001n,
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
  speeds: [285],
  BOUNCE: 64,
  SIMPLE: 65,
};

describe("pattern presentation", () => {
  it("hides impossible pattern labels on cards and detail views", () => {
    const card = formatSetupCard(unsetPatternSetup, { rank: 7, score: 100, maxScore: 100 });
    expect(card).not.toContain("pattern 255");
    expect(card).not.toContain("255 · 255");

    const detail = formatSetupDetailHtml(unsetPatternSetup, { rank: 7, score: 100, maxScore: 100 });
    expect(detail).not.toContain("pattern 255");
    expect(detail).not.toContain("Start pattern");
    expect(detail).not.toContain("Config script");
  });
});
