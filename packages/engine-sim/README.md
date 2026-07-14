# Engine-sim — setup search & data generation

Port of [Fancy-BCheck](https://github.com/bjorn-martinsson/Fancy-BCheck) `generate_setups/` wired to `packages/tf2sim`.

## Install

```bash
pip install -e packages/tf2sim
pip install -e "packages/engine-sim[dev]"
```

## Generate setups

```bash
# Single height (~4 min first run; ~18 s on a cached re-run)
engine-sim --height 0

# Test bucket 0–99 (sequential; use --workers for parallel)
engine-sim --range 0-99 --workers 4

# Resume a run: skip heights whose .bin.gz already exists
engine-sim --range 0-99 --workers 4 --skip-existing
```

Output: `data/generated/{bucket}/{height}.bin.gz`  
Precompute cache: `data/precompute/{bucket}/{height}.bin.gz`

Override paths with `BOUNCE_DATA_ROOT` and `BOUNCE_PRECOMPUTE_ROOT`.

### All heights up to max fall speed (terminal velocity)

Heights `0–6999` cover every distinct landing case — above height 6999 the player has
reached terminal velocity (max fall speed) and results repeat periodically (remapped
client-side in `apps/web/src/height.ts`).

```bash
# Full range 0–6999 via the CLI (resumable)
engine-sim --to-max-fallspeed --workers 4 --skip-existing

# Convenience wrapper: generates 0–6999 and writes per-bucket manifest.json files.
# Resumable and safe to interrupt/re-run. Args: [START] [END] [WORKERS].
scripts/generate-all-heights.sh              # 0–6999, workers = nproc
scripts/generate-all-heights.sh 0 99 4       # just the first bucket
```

A full first run is a multi-day compute job (~4 min/height) producing >1 GB of `.bin.gz`.
The `.bin.gz` are git-ignored; only the per-bucket `manifest.json` files are committed
(see `.gitignore`). Runs are resumable: completed heights are skipped and the phase-1
path enumeration is cached under `data/precompute/`.

## Schema

92-byte little-endian records. Preference field typos fixed vs upstream:

- `CONIST` → `CONSIST`
- `STANDBBOUNCE` → `STANDBOUNCE` (now packed correctly)

TypeScript decoder: `packages/schema`

## Tests

```bash
cd packages/engine-sim && pytest -m "not slow"
pytest -m slow  # full height-0 generation (~1 min)
```

## License

MIT (ported from Fancy-BCheck)
