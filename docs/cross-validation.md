# Cross-validation: engine-fast vs tf2sim

> **Version:** 1.0.0  
> **Date:** 2026-07-07  
> **Related:** [ROADMAP.md](../ROADMAP.md), [packages/engine-fast/README.md](../packages/engine-fast/README.md)

## Goal

Confirm the **analytical bounce engine** (`packages/engine-fast`) agrees with the **tick simulation** (`packages/tf2sim`) for DEFAULT start types, within documented tolerance.

## What is compared

| Layer | Test | Pass criteria |
|-------|------|----------------|
| **Formula parity** | Python `tf2sim.analytical` vs built `engine-fast` (Node) | Exact match on `checkBounce` for all DEFAULT setups |
| **Z trajectory** | `get_land_tick_from_start_z_vel` vs sim free-fall landing tick | Within **2.0 ticks** |
| **DEFAULT sweep** | `checkBounce` over heights 1–200 | Stable; Jump-family setups have bounce heights |

## DEFAULT setups (from bcheck)

| Name | Z velocity | Flags |
|------|------------|-------|
| Walk | −6 | — |
| Crouch Walk | −6 | crouched |
| Jump | 283 | — |
| Crouch Jump | 289 | — |
| Ctap | 289 | crouched |
| Ceilingsmash | −6 | ceiling |

Land types: **UNCROUCHED**, **CROUCHED**, **JUMPBUG**.

## Tolerance rationale

The analytical model is a **closed-form point-mass Z arc** with Source split-gravity and terminal velocity cap. `tf2sim` integrates the same constants per tick but also applies:

- Hull-based ground categorization (`COORD_RESOLUTION` = 1/32)
- Discrete 66.67 Hz ticks
- `float_mode` rounding at integration hot points

Empirically, landing tick agreement is within **0–2 ticks** for heights ≥ 4 units. Lower heights are skipped because standing hull offset dominates.

## Running locally

```bash
cd packages/engine-fast && npm install && npm run build
cd ../tf2sim && pip install -e ".[dev]"
pytest tests/test_analytical_crossval.py -v
```

## CI

`tf2sim` workflow builds `engine-fast` before pytest so Node golden comparisons run on every sim change.

## Not in scope (yet)

- Full rocket-jump angle → velocity → bounce pipeline in sim (requires shooting + knockback scenario per height)
- SPECIAL / multi-rocket setups (v0.3.0+ precomputed data)
- Live 64-bit TF2 zlog (v0.4.0)
