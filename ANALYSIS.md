# TF2 Bounce Checker — Repository Analysis

Analysis of five community bounce-checker projects, with recommendations for building an optimized successor.

**Repos analyzed (cloned locally to `analysis/`, not committed):**

| Repo | URL | Stack | Size |
|------|-----|-------|------|
| TF2Simulator | https://github.com/bjorn-martinsson/TF2Simulator | Python | ~352 KB |
| Fancy-BCheck | https://github.com/bjorn-martinsson/Fancy-BCheck | Python + HTML/JS + `.bin.gz` | ~242 MB |
| bcheck | https://github.com/bakapear/bcheck | JavaScript + JSON | ~2.5 MB |
| abounce | https://github.com/chrb22/abounce | SourcePawn (`.sp` / `.smx`) | ~356 KB |
| Graru1.github.io | https://github.com/Graru1/Graru1.github.io | HTML/JS (legacy) | ~14 MB |

**Note:** There are no `.so` native libraries. `abounce.smx` is compiled SourceMod bytecode; Fancy-BCheck uses gzip-compressed binary lookup tables.

---

## Problem space

All tools answer: given a vertical drop height (and sometimes weapon, input pattern, ceiling gap), can a Soldier bounce / bhop / jumpbug on landing, and what setup achieves it?

Two core approaches:

| Approach | Repos | Tradeoff |
|----------|-------|----------|
| Analytical math | bcheck, abounce, Graru1 (partial) | Instant; misses exotic multi-rocket chains |
| Tick simulation | TF2Simulator, Fancy-BCheck | Accurate; slow for exhaustive search |
| Empirical lookup | bcheck SPECIAL, Graru1 | Handles engine quirks; goes stale on patches |

---

## Per-repo verdict

### TF2Simulator — **Use as physics foundation**

- ~950-line `simulation.py` reimplements TF2/Source `gamemovement` for Soldier rocket jumping
- Hook-based extension (`Hook_Base`), MIT licensed, actively maintained
- WIP: grounded unduck, mangler charge, multi-floor maps incomplete
- Pure Python — too slow for large combinatorial search without optimization

### Fancy-BCheck — **Use search pipeline + binary format**

- Offline Python search (vendored TF2Simulator) → 92-byte gzip records per height (0–6999)
- Rich technique taxonomy and 44 preference dimensions
- Weaknesses: 218 MB in git, no CI, monolithic 2.3k-line `script.js`, schema typos (`STANDBBOUNCE`)

### bcheck — **Use analytical core + zlog pipeline**

- 219-line closed-form `canBounce` + 22k-line empirical `bounces.json`
- Fast browser/CLI, double-bhop detection, modifier system
- Weaknesses: empirical data maintenance, no map geometry

### abounce — **Reference for in-game map features**

- In-engine analytical checker with real traces (teleports, slopes, walls)
- No double-bhop flag, no exotic setup catalog, requires SourceMod server

### Graru1.github.io — **Skip**

- Legacy (2019–2022), superseded by bcheck V2; tick-loop approach is slow and inconsistent

---

## Recommended architecture

```
your-bounce-tool/
├── packages/
│   ├── tf2sim/          # TF2Simulator as proper Python package
│   ├── engine-fast/     # bcheck analytical core (TypeScript/Rust)
│   ├── engine-sim/      # Fancy-BCheck setup search
│   └── schema/          # Shared binary format + bind generation
├── apps/
│   ├── web/             # Modern frontend
│   ├── cli/             # Node/Rust CLI
│   └── sourcemod/       # Optional in-game plugin (abounce concepts)
├── data/generated/      # CI artifact, not in git
└── tools/zlog/          # Empirical validation (from bcheck)
```

### What to copy from each

| Source | Copy | Skip |
|--------|------|------|
| TF2Simulator | Physics engine, hooks, examples as tests | Flat import structure |
| Fancy-BCheck | Binary format, LIS search, preferences, binds | 218 MB in git, duplicated JS |
| bcheck | `canBounce` math, zlog, modifiers, UI patterns | JSON as sole data source |
| abounce | Map traces, pitch solving, live TAS | Monolithic .sp |
| Graru1 | — | Entire codebase |

---

## Phased next steps

1. **Foundation** — Package TF2Simulator; validation tests from 17 examples; port bcheck analytical core to TypeScript
2. **Search engine** — Port Fancy-BCheck generator; fix schema bugs; Numba/Rust hot path; CI-generated data (not in git)
3. **Frontend** — Vite + TypeScript; shared schema; hybrid precomputed + on-demand lookup
4. **Validation** — zlog pipeline to compare sim vs in-game measurements after patches
5. **Differentiators** — WASM browser sim, automated regen, map-aware setups, test coverage

---

## Lineage

```
nolem (SM plugin) → Graru1.github.io (legacy)
ILDPRUT math → abounce (in-engine) → bcheck (portable JS + zlog)
TF2Simulator → Fancy-BCheck (sim search + static site)
```

---

## Licenses

- TF2Simulator, Fancy-BCheck, bcheck: **MIT**
- abounce: no license declared
- Graru1.github.io: Other

Safe to fork MIT repos for a new tool.
