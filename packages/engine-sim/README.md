# Engine-sim — setup search & data generation

Port of [Fancy-BCheck](https://github.com/bjorn-martinsson/Fancy-BCheck) `generate_setups/` wired to `packages/tf2sim`.

## Install

```bash
pip install -e packages/tf2sim
pip install -e "packages/engine-sim[dev]"
```

## Generate setups

```bash
# Single height (~1 min for height 0)
engine-sim --height 0

# Test bucket 0–99 (sequential; use --workers for parallel)
engine-sim --range 0-99 --workers 4
```

Output: `data/generated/{bucket}/{height}.bin.gz`  
Precompute cache: `data/precompute/{bucket}/{height}.bin.gz`

Override paths with `BOUNCE_DATA_ROOT` and `BOUNCE_PRECOMPUTE_ROOT`.

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
