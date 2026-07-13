# Playground

## On-demand ranked simulation setup generation

Use the local generator when you want to generate and package ranked simulation setups from your machine:

```bash
WORKERS=2 npm run generate:ranked-setups -- 64
```

The script installs the local Python generator packages automatically if `engine_sim` is not importable. Set `SKIP_INSTALL=true` to disable that behavior.

The local command writes `artifacts/generated-setups/ranked-simulation-setups-<range>.tar.gz`.

## Native offline data

Native builds copy committed `data/generated/` files into the bundled app at build time. The desktop and Android apps therefore work offline for bundled generated heights, and fall back to bundled sample data where available. Additional ranked setup heights can be generated locally with `npm run generate:ranked-setups -- <height-or-range>` and then included in a future build by committing the generated `data/generated` files intentionally.
