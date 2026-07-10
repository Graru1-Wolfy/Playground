import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { runDefaultChecks } from "./defaultCheck.js";
import { normalizeHeight } from "./height.js";
import { loadSetupsForHeight, resolveApiPaths, serializeSetup } from "./setups.js";

export const API_VERSION = "0.6.0";

export interface ApiAppOptions {
  dataRoot?: string;
  sampleRoot?: string;
}

function parseHeightParam(raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new HTTPException(400, { message: "Invalid height parameter" });
  }
  try {
    return normalizeHeight(value);
  } catch {
    throw new HTTPException(400, { message: "Invalid height parameter" });
  }
}

function parseOptionalNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new HTTPException(400, { message: "Invalid numeric query parameter" });
  }
  return value;
}

export function createApp(options: ApiAppOptions = {}): Hono {
  const paths = resolveApiPaths({
    ...process.env,
    ...(options.dataRoot ? { DATA_ROOT: options.dataRoot } : {}),
    ...(options.sampleRoot ? { SAMPLE_ROOT: options.sampleRoot } : {}),
  });

  const app = new Hono();

  app.use("*", cors());

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "bounce-check-api",
      version: API_VERSION,
    }),
  );

  app.get("/v1/meta", (c) =>
    c.json({
      version: API_VERSION,
      endpoints: {
        health: "GET /health",
        meta: "GET /v1/meta",
        defaultChecks: "GET /v1/bounce/default/:height",
        defaultChecksPost: "POST /v1/bounce/default",
        setups: "GET /v1/setups/:height",
      },
    }),
  );

  app.get("/v1/bounce/default/:height", (c) => {
    const rawHeight = Number(c.req.param("height"));
    const height = parseHeightParam(String(rawHeight));
    const teleheight = parseOptionalNumber(c.req.query("teleheight"), 1);
    const ceilingRaw = c.req.query("ceilingGap");
    const ceilingGap =
      ceilingRaw === undefined || ceilingRaw === "" ? null : parseOptionalNumber(ceilingRaw, 82);

    return c.json({
      height,
      rawHeight: rawHeight,
      teleheight,
      ceilingGap,
      defaults: runDefaultChecks(height, { teleheight, ceilingGap }),
    });
  });

  app.post("/v1/bounce/default", async (c) => {
    const body = await c.req.json<{ height?: number; teleheight?: number; ceilingGap?: number | null }>();
    if (body.height === undefined) {
      throw new HTTPException(400, { message: "Missing height in request body" });
    }
    const rawHeight = body.height;
    const height = parseHeightParam(String(rawHeight));
    const teleheight = body.teleheight ?? 1;
    const ceilingGap = body.ceilingGap ?? null;

    return c.json({
      height,
      rawHeight,
      teleheight,
      ceilingGap,
      defaults: runDefaultChecks(height, { teleheight, ceilingGap }),
    });
  });

  app.get("/v1/setups/:height", async (c) => {
    const rawHeight = Number(c.req.param("height"));
    const height = parseHeightParam(String(rawHeight));
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? parseOptionalNumber(limitRaw, 20) : undefined;

    const { setups, source } = await loadSetupsForHeight(height, paths);
    const slice = limit !== undefined ? setups.slice(0, Math.max(0, Math.floor(limit))) : setups;

    return c.json({
      height,
      rawHeight,
      source,
      count: slice.length,
      total: setups.length,
      setups: slice.map(serializeSetup),
    });
  });

  app.notFound((c) => c.json({ error: "Not found" }, 404));

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }
    console.error(err);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}

export const app = createApp();
