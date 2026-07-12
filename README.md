# Playground

## On-demand generated height publishing

Use the **Publish Generated Heights** GitHub Actions workflow to generate bounce setup data for a single height or inclusive range without changing the repository.

Inputs:

- `height_range`: a height or inclusive range, such as `64`, `0-99`, or `100:199`.
- `workers`: number of parallel `engine-sim` workers.
- `max_heights`: safety limit for the requested range size.
- `publish_release`: when enabled, uploads a `bounce-data-<range>.tar.gz` archive to a prerelease.

The archive extracts into `data/generated/` and is also stored as a workflow artifact.
