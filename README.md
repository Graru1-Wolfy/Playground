# Playground

## On-demand ranked simulation setup generation

Use the local generator when you want to generate and package ranked simulation setups from your machine:

```bash
WORKERS=2 npm run generate:ranked-setups -- 64
```

The script installs the local Python generator packages automatically if `engine_sim` is not importable. Set `SKIP_INSTALL=true` to disable that behavior.

The local command writes `artifacts/generated-setups/ranked-simulation-setups-<range>.tar.gz`.
