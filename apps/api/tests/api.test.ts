import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "../src/app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

describe("bounce-check-api", () => {
  const app = createApp({
    dataRoot: path.join(repoRoot, "data", "generated"),
    sampleRoot: path.join(repoRoot, "apps", "web", "public", "sample-data"),
  });

  it("GET /health returns ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.version).toBe("0.6.0");
  });

  it("GET /v1/bounce/default/64 returns DEFAULT rows", async () => {
    const res = await app.request("/v1/bounce/default/64");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.height).toBe(64);
    expect(body.defaults).toHaveLength(6);
    expect(body.defaults[0].label).toBe("Walk");
  });

  it("GET /v1/setups/64 returns ranked setups", async () => {
    const res = await app.request("/v1/setups/64?limit=5");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(["generated", "sample"]).toContain(body.source);
    expect(body.ranked).toBe(true);
    expect(body.count).toBeGreaterThan(0);
    expect(body.count).toBeLessThanOrEqual(5);
    expect(typeof body.setups[0].ID).toBe("string");
    expect(typeof body.setups[0].rank).toBe("number");
    expect(typeof body.setups[0].score).toBe("number");
    expect(body.setups[0].rank).toBe(1);
  });

  it("GET /v1/setups/64?ranked=false returns raw order", async () => {
    const res = await app.request("/v1/setups/64?limit=3&ranked=false");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ranked).toBe(false);
    expect(body.setups[0].rank).toBeUndefined();
    expect(body.setups[0].score).toBeUndefined();
  });

  it("GET /v1/bounce/default/-1 returns 400", async () => {
    const res = await app.request("/v1/bounce/default/-1");
    expect(res.status).toBe(400);
  });
});
