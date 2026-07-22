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

## Android (phone / tablet)

The app is a **Progressive Web App** — run it in Chrome on Android, or install it to your home screen.

### Installable APK (native app)

Build a **signed release APK** with Capacitor (bundles the web UI + sample setups offline):

```bash
# One-time: Android SDK (Linux/macOS)
bash scripts/setup-android-sdk.sh

# Signed release (dev keystore — sideload / GitHub releases)
npm run build:android

# Debug build (unsigned debug key)
bash scripts/build-android-apk.sh debug
```

**Download:** [Latest GitHub Release](https://github.com/Graru1-Wolfy/Playground/releases/latest)

Install on a USB-connected device:

```bash
adb install -r apps/web/android/app/build/outputs/apk/release/app-release.apk
```

Or download the APK from GitHub Releases and open it on your phone (enable “Install unknown apps” for your file manager).

**Dev signing key** (sideload only, not Play Store production):

| Property | Value |
|----------|-------|
| Keystore | `apps/web/android/keystore/bounce-check-dev.jks` |
| Alias | `bouncecheck-dev` |
| Password | `bouncecheck-dev` |

App id: `com.playground.bouncecheck` · launcher name: **Bounce Check**

## Windows (desktop)

Portable **`.exe`** (no installer) via Electron — bundles the web UI and sample setups offline:

```bash
# From repo root (requires Node 22+; builds on Windows or CI)
npm run build:windows
```

Output: `apps/web/release/bounce-check-v<version>.exe`

**Releases always include both APK and EXE.** Download from [GitHub Releases](https://github.com/Graru1-Wolfy/Playground/releases/latest) or publish locally:

```bash
npm run release:bounce-check
```

### Same Wi‑Fi (local dev)

```bash
npm run dev:web:android
bash scripts/android-dev-url.sh
```

On your Android device (same network as this machine), open the printed URL in Chrome, e.g. `http://192.168.x.x:5173/Playground/`.

Install: Chrome menu → **Install app** or **Add to Home screen**.

### Production (HTTPS)

After deploy: `https://graru1-wolfy.github.io/Playground/`

Open in Chrome → install from the menu. Offline caching works via the service worker after the first load.

If the URL returns 404, confirm **Settings → Pages → Build and deployment → Source: GitHub Actions**, then check the **Deploy GitHub Pages** workflow on `main`.

## API server download

**Download:** [bounce-api-v0.6.0.tar.gz](https://github.com/Graru1-Wolfy/Playground/releases/download/bounce-api-v0.6.0/bounce-api-v0.6.0.tar.gz)  
Run locally: `npm run dev:api` or see `apps/api/README.md`

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
