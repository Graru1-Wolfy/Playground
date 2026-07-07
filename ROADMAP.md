# TF2 Bounce Checker — Roadmap

> **Roadmap document version:** `1.0.0`  
> **Last updated:** 2026-07-07  
> **Status:** Planning  
> **Related:** [ANALYSIS.md](./ANALYSIS.md)

Track progress by checking boxes in this file. Product releases use [Semantic Versioning](https://semver.org/) (`vMAJOR.MINOR.PATCH`).

---

## Release overview

| Version | Codename | Goal | Status |
|---------|----------|------|--------|
| [v0.1.0](#v010--simulation-foundation) | Foundation | Packaged sim + SDK audit + regression tests | In progress |
| [v0.2.0](#v020--fast-analytical-engine) | Fast path | Port bcheck analytical core to TypeScript | Not started |
| [v0.3.0](#v030--setup-search--data-pipeline) | Search | Fancy-BCheck pipeline + CI-generated data | Not started |
| [v0.4.0](#v040--validation-zlog) | Validation | zlog pipeline + post-patch regression | Not started |
| [v0.5.0](#v050--web-mvp) | Web MVP | Hybrid lookup UI (analytical + precomputed) | Not started |
| [v1.0.0](#v100--full-release) | Release | Full height range, CI/CD, preferences UI | Not started |

**Current target:** `v0.1.0`

---

## Repository layout (target)

```
packages/
  tf2sim/          # Python simulation engine (from TF2Simulator)
  engine-fast/     # Analytical bounce math (from bcheck)
  engine-sim/      # Setup search (from Fancy-BCheck)
  schema/          # Binary format + bind generation (shared)
apps/
  web/             # Vite + TypeScript frontend
  cli/             # Command-line lookup tools
tools/
  zlog/            # Empirical validation (from bcheck)
data/generated/    # CI artifact — NOT committed to git
```

---

## v0.1.0 — Simulation foundation

**Goal:** Trustworthy physics core audited against [source-sdk-2013](https://github.com/ValveSoftware/source-sdk-2013).

**Depends on:** nothing  
**Blocks:** v0.2.0, v0.3.0, v0.4.0

### Package & structure

- [x] Create `packages/tf2sim/` with `pyproject.toml`
- [x] Copy `simulation.py` from TF2Simulator into `src/tf2sim/`
- [x] Add `visualizer.py` as optional dev dependency
- [x] Document install: `pip install -e packages/tf2sim`

### Regression tests

- [x] Convert 17 TF2Simulator examples into pytest cases (+ grounded unduck + Mangler charge)
- [x] Assert final `pos` / `vel` per scenario (snapshot or tolerance-based) — **21 scenarios**
- [x] Add CI workflow: run tests on push

### SDK audit (ground truth)

Reference files in [source-sdk-2013](https://github.com/ValveSoftware/source-sdk-2013). Full checklist: **[docs/sdk-audit.md](./docs/sdk-audit.md)**.

| SDK file | Sim function(s) to verify |
|----------|---------------------------|
| `src/game/shared/gamemovement.cpp` | `friction`, `walkmove`, `airmove`, duck, gravity |
| `src/game/shared/tf/tf_gamemovement.cpp` | `PreventBunnyJumping`, `CategorizePosition`, `CheckJumpButton`, `GetAirSpeedCap` |
| `src/game/server/tf/tf_player.cpp` | `Soldier.simulate_knockback` |

- [x] Produce SDK ↔ sim mapping checklist (`docs/sdk-audit.md`)
- [x] Verify constants: `sv_gravity`, `sv_friction`, `COORD_RESOLUTION`, `BUNNYJUMP_MAX_SPEED_FACTOR`
- [x] Verify tick order matches `PlayerMove` / `FullWalkMove` flow
- [x] Confirm `float_mode` emulates C++ `float` (64-bit TF2 still uses 32-bit floats)

### Known gaps to fix

- [x] Grounded unduck (`FinishUnDuck` + `CanUnduck` ceiling check)
- [x] `DamageForce` knockback (`simulate_knockback` — SDK falloff + force scales)
- [x] Mangler charged shot (`+attack2`, 1.33× RJ radius, half falloff)
- [x] `CategorizePosition` early-call path documented (`sv_optimizedmovement=1` default)
- [ ] Multi-floor / `Floor` switching API cleanup

**Release criteria for v0.1.0:**
- All 21 example tests pass
- SDK audit checklist complete with no unresolved critical mismatches
- Package installable via pip

---

## v0.2.0 — Fast analytical engine

**Goal:** Instant DEFAULT/Walk/Jump/Ctap/angle checks without running the sim.

**Depends on:** v0.1.0  
**Blocks:** v0.5.0

### Port bcheck core (~219 lines)

- [ ] Create `packages/engine-fast/` (TypeScript)
- [ ] Port `canBounce()` — closed-form landing tick math
- [ ] Port `getZFromTick`, `getLandTickFromStartZVel`, `getValidHeight`
- [ ] Port `getVelFromAngle()` — ILDPRUT rocket blast inverse
- [ ] Port angle sweep (`ARANGE`, widest-interval picker)
- [ ] Port `DRANGE` double-bhop detection (`0.705078` – `0.999999`)
- [ ] Port weapon tables: Stock, Original, Mangler, Mangler Charged

### Cross-validation

- [ ] Test analytical results against tf2sim for all DEFAULT start types
- [ ] Document acceptable tolerance (float rounding)
- [ ] Add CLI: `bcheck <height>` and `bfind <velocity>` (port from bcheck)

**Release criteria for v0.2.0:**
- Analytical engine matches sim for DEFAULT starts within documented tolerance
- CLI produces same results as bcheck for basic inputs

---

## v0.3.0 — Setup search & data pipeline

**Goal:** Generate precomputed bounce setup tables from simulation.

**Depends on:** v0.1.0  
**Blocks:** v0.5.0, v1.0.0

### Port Fancy-BCheck generator

- [ ] Create `packages/engine-sim/` — port `generate_setups.py`
- [ ] Port `explore_code_paths.py` (LIS path enumeration)
- [ ] Port `setups.py` (92-byte binary schema)
- [ ] Create `packages/schema/` — shared bind generator

### Bug fixes & cleanup

- [ ] Fix `STANDBBOUNCE` → `STANDBOUNCE` typo (preferences + binary flags)
- [ ] Fix `CONIST` → `CONSIST` typo
- [ ] Remove duplicated bind logic (single Python source → generate TS types)

### Performance & data

- [ ] Enable `ProcessPoolExecutor` for parallel height generation
- [ ] Implement incremental `precompute/` cache (path IDs only)
- [ ] Evaluate Numba on `simulate_tick` if parallel Python is too slow
- [ ] Generate test bucket: heights `0–99` locally
- [ ] Add `.gitignore` entry for `data/generated/`
- [ ] CI job: generate changed height buckets, upload as artifact (not committed)

**Release criteria for v0.3.0:**
- Can generate `data/000to099/*.bin.gz` from CLI
- Binary round-trip: Python pack → JS decode without data loss
- Generation time documented per height bucket

---

## v0.4.0 — Validation (zlog)

**Goal:** Empirical cross-check against live 64-bit TF2 after patches.

**Depends on:** v0.1.0  
**Blocks:** v1.0.0

### Port bcheck zlog toolchain

- [ ] Copy `tools/zlog/` from bcheck (zLogger.sp, genConfig.js, logsToJson.js, mergeLogs.js)
- [ ] Document local TF2 server setup for data collection
- [ ] Script: compare zlog output vs sim predictions
- [ ] Script: flag divergences above tolerance threshold
- [ ] Document post-patch regression workflow in `docs/validation.md`

**Release criteria for v0.4.0:**
- zlog runs on 64-bit TF2 server
- Comparison report generated for at least DEFAULT + 10 SPECIAL setups
- Divergences documented with sim-fix vs empirical-only classification

---

## v0.5.0 — Web MVP

**Goal:** Usable web checker with hybrid lookup.

**Depends on:** v0.2.0, v0.3.0  
**Blocks:** v1.0.0

### Frontend scaffold

- [ ] Create `apps/web/` — Vite + TypeScript
- [ ] Import `packages/schema/` for binary decoder
- [ ] Import `packages/engine-fast/` for instant DEFAULT checks
- [ ] Port Fancy-BCheck preference panel (44 dimensions, localStorage)
- [ ] Port bcheck UX: weapon icons, technique tags, copyable binds

### Lookup modes

| Input | Engine | Status |
|-------|--------|--------|
| Walk / Jump / Ctap / ceiling | `engine-fast` (analytical) | [ ] |
| Exotic setups, heights 0–6999 | Precomputed `.bin.gz` | [ ] |
| Arbitrary height (future) | On-demand sim / WASM | Deferred to v1.x |

- [ ] Height input with terminal-velocity normalization (`> 8000` modulo)
- [ ] Fetch + decompress `data/{bucket}/{height}.bin.gz` in browser
- [ ] Preference-weighted reranking
- [ ] Result pagination (20 / 50 / 250 / all)
- [ ] Deploy to GitHub Pages

**Release criteria for v0.5.0:**
- Site live with analytical + precomputed lookup for at least heights 0–99
- Preferences persist in localStorage
- Binds copy correctly to clipboard

---

## v1.0.0 — Full release

**Goal:** Production-ready tool replacing manual workflows across community checkers.

**Depends on:** v0.4.0, v0.5.0

### Data & CI

- [ ] Generate full height range `0–6999`
- [ ] CI: test → generate → deploy pipeline on merge to `main`
- [ ] CDN or Pages deploy for `data/` (no 218 MB in git)

### Quality

- [ ] FAQ / usage docs page
- [ ] License compliance review (MIT forks + SDK non-commercial terms)
- [ ] Performance benchmarks documented (lookup latency, generation time)

### Optional (v1.x backlog)

- [ ] WASM port of sim for on-demand arbitrary-height lookup
- [ ] SourceMod plugin with abounce-style map traces
- [ ] Map heightmap input for per-map bounce checks
- [ ] Mangler charge + new weapon support from SDK
- [ ] Automated zlog run triggered on TF2 patch detection

**Release criteria for v1.0.0:**
- Full 0–6999 precomputed data deployed
- CI/CD fully automated
- zlog validation passing for core setup categories
- Documented accuracy vs bcheck and Fancy-BCheck

---

## Explicitly out of scope

- [ ] ~~Port Graru1.github.io~~ — superseded by bcheck V2
- [ ] ~~Commit third-party clones in `analysis/`~~ — local reference only
- [ ] ~~Maintain 22k-line empirical JSON as primary data~~ — sim + zlog instead

---

## Roadmap changelog

| Doc version | Date | Changes |
|-------------|------|---------|
| `1.0.0` | 2026-07-07 | Initial versioned roadmap (v0.1.0 – v1.0.0) |
| `1.0.1` | 2026-07-07 | v0.1.0 package + 17-example regression suite started |
| `1.0.2` | 2026-07-07 | SDK audit checklist (`docs/sdk-audit.md`) |
| `1.0.3` | 2026-07-07 | Grounded unduck (`FinishUnDuck` + ceiling `CanUnduck`) |
| `1.0.4` | 2026-07-07 | SDK `DamageForce` knockback + Mangler charged shot (21 scenarios) |

---

## Importing to GitHub Issues (optional)

If you have issue-creation permissions, create one milestone per version above and split each checkbox section into issues. Suggested labels:

- `milestone:v0.1.0` … `milestone:v1.0.0`
- `area:sim`, `area:frontend`, `area:data`, `area:validation`, `area:infra`

Example:

```bash
gh issue create --title "Package TF2Simulator as tf2sim" \
  --milestone "v0.1.0 — Simulation foundation" \
  --label "area:sim"
```
