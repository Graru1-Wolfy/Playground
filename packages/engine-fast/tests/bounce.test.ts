import { describe, expect, it } from "vitest";
import {
  LandType,
  canBounce,
  checkBounce,
  getBounceAngles,
  getLandTickFromStartZVel,
  getVelFromAngle,
  getZFromTick,
} from "../src/index.js";

describe("physics (bcheck parity)", () => {
  it("getZFromTick at tick 0 returns start height", () => {
    expect(getZFromTick(500, 0, 100)).toBeCloseTo(100, 5);
  });

  it("getLandTickFromStartZVel matches bcheck for sample inputs", () => {
    expect(getLandTickFromStartZVel(64, 500)).toBeCloseTo(91.136, 2);
    expect(getLandTickFromStartZVel(100, 500)).toBeCloseTo(95.026, 2);
  });
});

describe("canBounce / checkBounce", () => {
  it("detects double bounce at height 64 vel 500 uncrouched", () => {
    expect(checkBounce(64, { vel: 500, crouched: false }, LandType.UNCROUCHED)).toBe(2);
    expect(canBounce(64, 500, [1, 2])).toBe(2);
  });

  it("returns no bounce at height 100 vel 500", () => {
    expect(checkBounce(100, { vel: 500, crouched: false }, LandType.UNCROUCHED)).toBe(0);
  });

  it("returns no bounce for crouched land at height 200 vel 800", () => {
    expect(checkBounce(200, { vel: 800, crouched: true }, LandType.CROUCHED)).toBe(0);
  });
});

describe("getVelFromAngle", () => {
  it("computes stock uncrouched velocity at 45°", () => {
    expect(getVelFromAngle(45, false, [12, 121])).toBeCloseTo(200.829, 2);
  });
});

describe("getBounceAngles", () => {
  it("finds angle interval for height 50 stock default", () => {
    const ang = getBounceAngles(
      50,
      { weapon: "Stock", crouched: false, double: false, ang: true },
      LandType.UNCROUCHED,
      1,
    );
    expect(ang).toEqual([40.05, 40.27]);
  });
});
