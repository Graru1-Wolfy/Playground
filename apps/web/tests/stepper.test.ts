import { describe, expect, it } from "vitest";
import { formatStepperValue, stepValue } from "../src/stepper.js";

describe("stepValue", () => {
  it("steps height by 1 within bounds", () => {
    expect(stepValue(64, 1, 0, 99, 1)).toBe(65);
    expect(stepValue(64, -1, 0, 99, 1)).toBe(63);
    expect(stepValue(0, -1, 0, 99, 1)).toBe(0);
    expect(stepValue(99, 1, 0, 99, 1)).toBe(99);
  });

  it("steps teleheight by 1/32", () => {
    expect(stepValue(1, 0.03125, 0, 2, 0.03125)).toBe(1.03125);
    expect(stepValue(1.03125, -0.03125, 0, 2, 0.03125)).toBe(1);
  });

  it("steps slope by degree", () => {
    expect(stepValue(0, 1, 0, 45, 1)).toBe(1);
    expect(stepValue(45, 1, 0, 45, 1)).toBe(45);
  });
});

describe("formatStepperValue", () => {
  it("formats integers without decimals", () => {
    expect(formatStepperValue(64, 1)).toBe("64");
  });

  it("formats fractional teleheight without trailing zeros", () => {
    expect(formatStepperValue(1, 0.03125)).toBe("1");
    expect(formatStepperValue(1.03125, 0.03125)).toBe("1.03125");
  });
});
