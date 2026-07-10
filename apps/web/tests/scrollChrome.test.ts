import { describe, expect, it } from "vitest";
import { nextAnalyticalCollapse } from "../src/scrollChrome.js";

describe("nextAnalyticalCollapse", () => {
  it("expands near the top of the page", () => {
    expect(
      nextAnalyticalCollapse({
        scrollY: 20,
        delta: -10,
        collapsed: true,
        layoutLocked: false,
      }),
    ).toBe(false);
  });

  it("ignores scroll while layout is locked", () => {
    expect(
      nextAnalyticalCollapse({
        scrollY: 200,
        delta: 20,
        collapsed: false,
        layoutLocked: true,
      }),
    ).toBeNull();
  });

  it("collapses on scroll down after threshold", () => {
    expect(
      nextAnalyticalCollapse({
        scrollY: 120,
        delta: 12,
        collapsed: false,
        layoutLocked: false,
      }),
    ).toBe(true);
  });

  it("does not collapse on scroll down at page top", () => {
    expect(
      nextAnalyticalCollapse({
        scrollY: 30,
        delta: 12,
        collapsed: false,
        layoutLocked: false,
      }),
    ).toBeNull();
  });

  it("expands on scroll up", () => {
    expect(
      nextAnalyticalCollapse({
        scrollY: 500,
        delta: -12,
        collapsed: true,
        layoutLocked: false,
      }),
    ).toBe(false);
  });
});
