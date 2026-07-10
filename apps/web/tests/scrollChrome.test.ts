import { describe, expect, it } from "vitest";
import { nextRetractState } from "../src/scrollChrome.js";

describe("nextRetractState", () => {
  it("expands near the top of the page", () => {
    expect(
      nextRetractState({
        scrollY: 20,
        delta: -10,
        retracted: true,
        layoutLocked: false,
        mainGridTop: 400,
      }),
    ).toBe(false);
  });

  it("ignores scroll while layout is locked", () => {
    expect(
      nextRetractState({
        scrollY: 200,
        delta: 20,
        retracted: false,
        layoutLocked: true,
        mainGridTop: 40,
      }),
    ).toBeNull();
  });

  it("retracts only once main content enters view", () => {
    expect(
      nextRetractState({
        scrollY: 300,
        delta: 12,
        retracted: false,
        layoutLocked: false,
        mainGridTop: 80,
      }),
    ).toBe(true);
  });

  it("does not retract while still reading hero results", () => {
    expect(
      nextRetractState({
        scrollY: 120,
        delta: 12,
        retracted: false,
        layoutLocked: false,
        mainGridTop: 420,
      }),
    ).toBeNull();
  });

  it("expands on scroll up", () => {
    expect(
      nextRetractState({
        scrollY: 500,
        delta: -12,
        retracted: true,
        layoutLocked: false,
        mainGridTop: 40,
      }),
    ).toBe(false);
  });
});
