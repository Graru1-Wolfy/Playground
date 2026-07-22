import { describe, expect, it } from "vitest";
import { snapToStep } from "../src/sliderSnap.js";

describe("snapToStep", () => {
  it("snaps height values to integer steps", () => {
    expect(snapToStep(64.4, 0, 99, 1)).toBe(64);
    expect(snapToStep(64.6, 0, 99, 1)).toBe(65);
  });

  it("snaps teleheight to 1/32 increments without float drift", () => {
    expect(snapToStep(1.01, 0, 2, 0.03125)).toBe(1);
    expect(snapToStep(1.03125, 0, 2, 0.03125)).toBe(1.03125);
  });

  it("clamps to min and max", () => {
    expect(snapToStep(-5, 0, 99, 1)).toBe(0);
    expect(snapToStep(150, 0, 99, 1)).toBe(99);
  });
});
