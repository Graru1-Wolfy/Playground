# Bounce Check API

HTTP API for TF2 bounce lookup — analytical DEFAULT checks and precomputed setup files.

**Version:** `0.6.0`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness + version |
| GET | `/v1/meta` | API metadata |
| GET | `/v1/bounce/default/:height` | Instant DEFAULT table (`?teleheight=1&ceilingGap=82`) |
| POST | `/v1/bounce/default` | Same with JSON body `{ height, teleheight?, ceilingGap? }` |
| GET | `/v1/setups/:height` | Precomputed setups (`?limit=20`) |

## Development

```bash
# From repo root
npm install
npm run build:packages
npm run dev:api
```

Server default: `http://localhost:8787`

## Production build

```bash
npm run build:api
npm run start -w @playground/api
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8787` | Listen port |
| `DATA_ROOT` | `data/generated` | Generated `.bin.gz` bucket root |
| `SAMPLE_ROOT` | `apps/web/public/sample-data` | Bundled sample `.bin` fallback |

## Example

```bash
curl http://localhost:8787/v1/bounce/default/64
curl "http://localhost:8787/v1/setups/64?limit=3"
```
