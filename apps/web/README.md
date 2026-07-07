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

- Base path: `/Playground/` (override with `VITE_BASE_PATH=/` for custom domains)
- Enable **GitHub Pages → GitHub Actions** in repo settings
- Workflow: `.github/workflows/deploy-pages.yml`
- Full 0–99 data: cache `data/generated` in CI or run generation locally before deploy

## License

MIT
