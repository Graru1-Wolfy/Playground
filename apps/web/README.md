# TF2 Bounce Checker — Web

Vite + TypeScript frontend for hybrid bounce lookup.

## Features

- **Instant DEFAULT checks** via `@playground/engine-fast` (Walk, Jump, Ctap, etc.)
- **Precomputed setups** from `data/generated/{bucket}/{height}.bin.gz` (heights 0–99 in MVP)
- **Preference-weighted ranking** with localStorage persistence

## Development

```bash
# From repo root
npm install
npm run build:packages

# Generate data if needed (see packages/engine-sim)
engine-sim --range 0-99 --workers 4

# Optional: refresh bundled sample setups for dev/screenshots (height 64)
PYTHONPATH=packages/engine-sim/src python3 scripts/write-web-sample-data.py

# Dev server (serves ../../data/generated at /data)
npm run dev:web
```

Open the URL printed by Vite (usually `http://localhost:5173/Playground/`).

## Production build

```bash
npm run build:web
bash scripts/prepare-web-data.sh apps/web/dist/data
npm run preview -w @playground/web
```

## GitHub Pages

- URL: `https://graru1-wolfy.github.io/Playground/` (after deploy succeeds)
- Base path: `/Playground/` (override with `VITE_BASE_PATH=/` for custom domains)
- **Repo settings:** Settings → Pages → Build and deployment → Source: **GitHub Actions** (required once)
- Workflow: `.github/workflows/deploy-pages.yml`
- Full 0–99 data: cache `data/generated` in CI or run generation locally before deploy

### Known fixes (2026-07-07)

- **`upload-pages-artifact@v3` is deprecated** — workflow now uses `@v4` (required since Jan 2025)
- **Node.js 20 action runtime deprecated** — `checkout` / `setup-node` bumped to `@v5` (Node 24)
- **Data fetch path** — setup URLs use Vite `BASE_URL` so `/Playground/data/...` resolves on project pages

If deploy still fails, check Actions logs for the `Deploy GitHub Pages` workflow and confirm Pages source is **GitHub Actions**, not “Deploy from branch”.

## License

MIT
