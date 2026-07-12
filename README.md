# Playground

## On-demand ranked simulation setup publishing

Use the **Generate Ranked Simulation Setups** GitHub Actions workflow to generate ranked bounce setup data for a single height or inclusive range without changing the repository.

Inputs:

- `height_range`: a height or inclusive range, such as `64`, `0-99`, or `100:199`.
- `workers`: number of parallel `engine-sim` workers.
- `max_heights`: safety limit for the requested range size.
- `publish_release`: when enabled, uploads a `ranked-simulation-setups-<range>.tar.gz` archive to a prerelease.

The archive extracts into `data/generated/` and is also stored as a workflow artifact.

### Local generation

Use the local workflow equivalent when you want to generate and package ranked simulation setups from your machine:

```bash
pip install -e packages/tf2sim
pip install -e packages/engine-sim
WORKERS=2 npm run generate:ranked-setups -- 64
```

The local command writes `artifacts/generated-setups/ranked-simulation-setups-<range>.tar.gz`.
