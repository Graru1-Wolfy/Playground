# Playground

Monorepo for **TF2 Live Bounce Checker** — instant analytical DEFAULT checks plus ranked precomputed simulation setups for Soldier rocket jumps.

- **Web app:** [GitHub Pages](https://graru1-wolfy.github.io/Playground/) · [Android APK releases](https://github.com/Graru1-Wolfy/Playground/releases)
- **Roadmap:** [ROADMAP.md](./ROADMAP.md)
- **Web docs:** [apps/web/README.md](./apps/web/README.md)
- **API docs:** [apps/api/README.md](./apps/api/README.md)

## Architecture

```
packages/
  engine-fast/     # Analytical bounce math (TypeScript, from bcheck)
  engine-sim/      # Setup search pipeline (Python, Fancy-BCheck)
  schema/          # Shared binary format, scoring, binds, DEFAULT checks
  tf2sim/          # Full physics simulation (Python)
apps/
  web/             # Vite + TypeScript PWA (Capacitor Android)
  api/             # HTTP lookup API (Node)
data/generated/    # Precomputed setup buckets (CI artifact, not committed)
```

The web UI combines:

1. **DEFAULT rows** — live `@playground/engine-fast` checks (Walk, Jump, Ctap, …) with bind/instruction text from `@playground/schema`.
2. **Simulation setups** — decoded from `data/generated/{bucket}/{height}.bin.gz` and ranked by user preference weights.

Shared logic (height normalization, DEFAULT table generation, bind pattern tables) lives in `@playground/schema` so web and API stay in sync.

## Prerequisites

- **Node.js 22+** and npm (workspaces)
- **Python 3.11+** for `engine-sim`, bind codegen, and data generation
- **Android SDK** (optional) for APK builds — see `scripts/setup-android-sdk.sh`

## Quick start

```bash
git clone https://github.com/Graru1-Wolfy/Playground.git
cd Playground
npm install
npm run build:packages
```

### Web development

```bash
# Optional: generate lookup data for heights 0–99
PYTHONPATH=packages/engine-sim/src python3 -m engine_sim --range 0-99 --workers 4

# Dev server (serves ../../data/generated at /data when present)
npm run dev:web
```

### API development

```bash
npm run dev:api
# http://localhost:8787
```

### Run all tests

```bash
npm run build:packages
npm test
```

Individual workspaces:

| Command | Package |
|---------|---------|
| `npm run test -w @playground/engine-fast` | Analytical engine |
| `npm run test -w @playground/schema` | Schema + DEFAULT checks |
| `npm run test -w @playground/api` | HTTP API |
| `npm run test -w @playground/web` | Web unit tests (Vitest) |

Python simulation tests: see `.github/workflows/tf2sim.yml` and `engine-sim.yml`.

## Codegen

Regenerate TypeScript bind tables from the Python pattern source of truth:

```bash
npm run codegen:binds
# writes packages/schema/src/binds.data.ts from packages/engine-sim/.../generate_setups.py
```

Run this after editing movement/action pattern cases in `generate_setups.py`.

## Build & release

| Script | Output |
|--------|--------|
| `npm run build:web` | Static site in `apps/web/dist/` |
| `npm run build:android` | Signed release APK |
| `npm run package:api` | API release tarball |

CI workflows under `.github/workflows/` run tests on push/PR and publish Pages, API, and Android releases.

## License

MIT
