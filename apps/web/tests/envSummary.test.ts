import { describe, expect, it } from "vitest";
import { formatEnvCompactSummary } from "../src/envSummary.js";

describe("formatEnvCompactSummary", () => {
  it("formats floor, ceiling, and tele in one line", () => {
    expect(formatEnvCompactSummary(64, { teleheight: 1, ceilingGap: null })).toBe(
      "64 ft · ceil off · tele 1",
    );
    expect(formatEnvCompactSummary(80, { teleheight: 0.5, ceilingGap: 82 })).toBe(
      "80 ft · ceil 82 · tele 0.5",
    );
  });
});
