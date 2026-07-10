import { describe, expect, it } from "vitest";
import type { DecodedSetup } from "@playground/schema";
import { formatSetupDetailHtml } from "../src/setupDetail.js";

const sampleSetup: DecodedSetup = {
  ID: 123456789n,
  launcher: 0,
  start_moving: 1,
  start_action: 0,
  num_rockets: 2,
  tick_delay_auto_bounce: 0,
  tick_delay_auto_synced_bounce: 0,
  tick_delay_auto_standing_bounce: 0,
  tick_delay_auto_synced_standing_bounce: 0,
  bounce_flag: 1,
  standing_bounce_flag: 0,
  rocket_fired_crouched_flag: 1,
  rocket_hit_crouched_flag: 0,
  speeds: [285.5, 241.25],
  STOCK: 128,
  BOUNCE: 64,
  SIMPLE: 65,
  CONSIST: 200,
  HEIGHT: 80,
  SPEED: 55,
};

describe("formatSetupDetailHtml", () => {
  it("includes summary, steps, reliability, and script at the bottom", () => {
    const html = formatSetupDetailHtml(sampleSetup, { rank: 3, score: 842, maxScore: 900 });

    expect(html).toContain("#3");
    expect(html).toContain("Stock");
    expect(html).toContain("842");
    expect(html).toContain("285");
    expect(html).toContain("241");
    expect(html).toContain("Bounce (64)");
    expect(html).toContain("Height");
    expect(html).toContain("Setup ID");
    expect(html).toContain("123456789");
    expect(html).toContain("Execution steps");
    expect(html).toContain("Config script");
    expect(html).toContain("Consistency reliability");
    expect(html).toContain("alias +walk");
    expect(html).toContain("alias +strike");
    expect(html).toContain("Movement:");
    expect(html).toContain("Copy script");
    expect(html.indexOf("Execution steps")).toBeLessThan(html.indexOf("Config script"));
  });
});
