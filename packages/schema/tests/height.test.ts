import { describe, expect, it } from "vitest";
import { heightBucket, normalizeHeight } from "../src/height.js";

describe("normalizeHeight", () => {
  it("remaps terminal velocity heights above 8000", () => {
    expect(normalizeHeight(8105)).toBe(7000);
    expect(normalizeHeight(64)).toBe(64);
  });
});

describe("heightBucket", () => {
  it("returns zero-padded bucket labels", () => {
    expect(heightBucket(64)).toBe("000to099");
    expect(heightBucket(150)).toBe("100to199");
  });
});
