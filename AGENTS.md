# AGENTS.md

## Cursor Cloud specific instructions

This repo ("Playground") is a monorepo for the **TF2 Bounce Checker**. Dependencies are refreshed
automatically by the startup update script (`npm install` for the JS workspaces, plus editable
`pip install` of the two Python packages). The notes below are durable, non-obvious caveats for
running/testing; standard commands live in the root `package.json` scripts and the CI workflows
under `.github/workflows/`.

### Services / components
- `apps/web` (`@playground/web`) — the product UI (Vite 6 PWA). This is the main deliverable.
- `apps/api` (`@playground/api`) — optional Hono HTTP API exposing the same lookups.
- `packages/engine-fast`, `packages/schema` — TS libraries consumed by web + api.
- `packages/tf2sim`, `packages/engine-sim` — Python (data-generation only, not runtime services).

### Running (dev)
- Web: `npm run dev:web` → serves at `http://localhost:5173/Playground/` (note the `/Playground/`
  base path — the bare `http://localhost:5173/` will 404).
- API: `npm run dev:api` → `http://localhost:8787`. Routes are under `/health`, `/v1/meta`,
  `/v1/bounce/default/:height`, `/v1/setups/:height` (there is no `/` root route).

### Non-obvious caveats
- **Build the TS libraries before running/testing the API.** `apps/api` (and `npm test`, which
  includes the api workspace) resolves `@playground/engine-fast` / `@playground/schema` via their
  built `dist/` (Node package exports). Run `npm run build:packages` first, or the api build/tests
  fail with "Failed to resolve entry for package @playground/engine-fast". The **web** dev server
  does NOT need this — its `vite.config.ts` aliases those packages to their TS source.
- The web app does **not** call the API at runtime; it fetches static `.bin.gz` files (served in dev
  by a Vite middleware at `/data` from `data/generated`) and falls back to bundled sample data in
  `apps/web/public/sample-data`.
- `data/generated/` is git-ignored and normally only holds `manifest.json`. Setup lookups shown in
  the UI come from the bundled sample data; regenerating full precomputed data for arbitrary heights
  requires the Python `engine-sim` CLI.
- Python console scripts (`engine-sim`, `pytest`) install to `~/.local/bin`, which may not be on
  `PATH`. Invoke via modules instead, e.g. `python3 -m pytest`.

### Testing
- JS: `npm test` (Vitest for engine-fast, schema, api — run `npm run build:packages` first).
- Python: `cd packages/tf2sim && python3 -m pytest`, and
  `cd packages/engine-sim && python3 -m pytest -m "not slow"`.
- Typecheck (the repo's effective "lint"): `npm run typecheck -w @playground/api`; TS packages use
  `tsc`/`tsc --noEmit`.
