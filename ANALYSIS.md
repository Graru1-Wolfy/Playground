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
- Should be audited against [source-sdk-2013](https://github.com/ValveSoftware/source-sdk-2013) `tf_gamemovement.cpp`, not only community tools

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

1. **Foundation** — Package TF2Simulator; diff movement code against `source-sdk-2013` `tf_gamemovement.cpp`; validation tests from 17 examples; port bcheck analytical core to TypeScript
2. **Search engine** — Port Fancy-BCheck generator; fix schema bugs; Numba/Rust hot path; CI-generated data (not in git)
3. **Frontend** — Vite + TypeScript; shared schema; hybrid precomputed + on-demand lookup
4. **Validation** — zlog pipeline to compare sim vs in-game measurements after patches
5. **Differentiators** — WASM browser sim, automated regen, map-aware setups, test coverage, SDK-grounded float semantics for 64-bit TF2

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

---

## Official reference: Source SDK 2013 (TF2 game code)

**Repo:** https://github.com/ValveSoftware/source-sdk-2013

Valve released the full TF2 client/server game code in the Feb 2025 SDK update. This is the authoritative ground truth for movement physics — use it to validate and extend any simulator, rather than reverse-engineering from community tools alone.

### 64-bit TF2 vs float precision (important distinction)

TF2’s 2024 update added **64-bit binaries** (Windows/Linux client and server). That refers to **process pointer width and CPU architecture**, not physics using `double`.

Source movement still uses **`float` (32-bit IEEE 754)** for positions, velocities, and most game math (`Vector`, `mv->m_vecVelocity`, etc.). The 64-bit port mainly changed how those floats are *computed* at the CPU level (e.g. SSE2 vs legacy x87 register behavior, compiler optimizations), which can introduce small divergences from older 32-bit builds — but the data type is still `float`.

**Implication for your tool:**
- TF2Simulator’s `round_to_nearest_float()` / `float_mode` approach remains correct in principle — you are emulating C++ `float` casts, not 64-bit doubles.
- After the 64-bit port, re-validate against live TF2 (zlog) because rounding *order* may differ even when types stay `float`.
- Do not assume switching your sim to pure `double` will match modern TF2 better; match the SDK’s `float` semantics instead.

### Key SDK files for bounce/movement simulation

| File | Purpose |
|------|---------|
| `src/game/shared/gamemovement.cpp` | Base `CGameMovement`: friction, gravity, duck, jump, air/ground move |
| `src/game/shared/tf/tf_gamemovement.cpp` | TF2 overrides: `PreventBunnyJumping`, `CheckJumpButton`, `CategorizePosition`, `GetAirSpeedCap`, CTAP-related duck logic |
| `src/game/shared/tf/tf_player.cpp` | Soldier knockback, blast damage (for rocket jumps) |
| `src/game/shared/movevars_shared.cpp` | `sv_gravity`, `sv_friction`, `sv_accelerate`, etc. |

TF2Simulator already cites these paths in `simulation.py` comments (e.g. `CTFGameMovement::CategorizePosition`, `PreventBunnyJumping`). Your optimized version should treat the SDK as the spec and TF2Simulator as an initial port to audit line-by-line.

### Recommended validation workflow

1. **SDK** — extract constants and tick order from `tf_gamemovement.cpp` / `gamemovement.cpp`
2. **TF2Simulator** — port or diff against SDK; fix any drift (grounded unduck, mangler charge, etc.)
3. **zlog (bcheck)** — measure live outcomes for exotic setups the SDK doesn’t document behaviorally
4. **abounce** — cross-check analytical landing-tick math against in-engine traces on real maps

### SDK licensing note

The Source SDK is **non-commercial** (mods must be free). Your bounce checker as a standalone lookup/sim tool is likely fine, but if you embed SDK code directly or ship a TF2-derived mod, read Valve’s SDK license terms carefully.
