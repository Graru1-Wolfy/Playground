import { describe, expect, it } from "vitest";
import {
  computeDefaultReliability,
  formatDefaultDetailHtml,
  formatDefaultSetupCard,
  runDefaultChecks,
} from "../src/defaultCheck.js";

describe("computeDefaultReliability", () => {
  it("counts landing types that bounce", () => {
    expect(computeDefaultReliability({ label: "Walk", uncrouched: 1, crouched: 0, jumpbug: 2 })).toEqual({
      hits: 2,
      total: 3,
      percent: 67,
    });
    expect(computeDefaultReliability({ label: "Walk", uncrouched: 0, crouched: 0, jumpbug: 0 })).toEqual({
      hits: 0,
      total: 3,
      percent: 0,
    });
  });
});

describe("formatDefaultSetupCard", () => {
  it("shows reliability and DEFAULT badge", () => {
    const [row] = runDefaultChecks(64);
    const html = formatDefaultSetupCard(row!, 1);
    expect(html).toContain("DEFAULT");
    expect(html).toContain("setup-reliability-score");
    expect(html).toContain('data-setup-id="default:Walk"');
  });
});

describe("formatDefaultDetailHtml", () => {
  it("lists execution steps before config script", () => {
    const [row] = runDefaultChecks(64);
    const html = formatDefaultDetailHtml(row!, {
      rank: 1,
      height: 64,
      teleheight: 1,
      ceilingGap: null,
    });

    expect(html).toContain("Execution steps");
    expect(html).toContain("Landing reliability");
    expect(html).toContain("Config script");
    expect(html).toContain("alias +walk");
    expect(html.indexOf("Execution steps")).toBeLessThan(html.indexOf("Config script"));
  });
});
