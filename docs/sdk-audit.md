# SDK Audit — tf2sim vs Source SDK 2013

> **Audit version:** `1.0.0`  
> **Date:** 2026-07-07  
> **SDK reference:** [ValveSoftware/source-sdk-2013](https://github.com/ValveSoftware/source-sdk-2013) (TF2 game code, Feb 2025 release)  
> **Sim reference:** `packages/tf2sim/src/tf2sim/simulation.py` (ported from [TF2Simulator](https://github.com/bjorn-martinsson/TF2Simulator))  
> **Related:** [ANALYSIS.md](../ANALYSIS.md), [ROADMAP.md](../ROADMAP.md)

This document maps TF2 movement and Soldier knockback code in the official SDK to `tf2sim`, records constant parity, compares per-tick execution order, and lists known gaps.

---

## Executive summary

| Area | Verdict | Notes |
|------|---------|-------|
| Movement constants | **Match** | `sv_gravity`, `sv_friction`, `COORD_RESOLUTION`, `BUNNYJUMP_MAX_SPEED_FACTOR`, duck timers, jump speed |
| Tick order (`PlayerMove` → `FullWalkMove`) | **Mostly match** | Simplified: no water, ladders, stuck checks, conveyors, TF conditions |
| `CategorizePosition` early call | **Match (default path)** | Sim skips full early categorize when `sv_optimizedmovement=1` (default) |
| Ground friction / walk / air accel | **Match** | TF `WalkMove` wish-speed boost formula replicated |
| Duck / CTAP logic | **Partial** | Air unduck (+20 / −20 Z) present; **grounded unduck TODO** |
| Knockback (`simulate_knockback`) | **Approximate** | Uses review.pdf-style impulse, not full `DamageForce()` pipeline |
| Rocket weapon data | **Partial** | Stock/Original offsets OK; **Mangler charge missing** |
| `float_mode` | **Correct approach** | Emulates C++ `float` at hot points; zlog re-validation still needed |

**Regression status:** 17 TF2Simulator example scenarios pass snapshot tests with `float_mode = True`.

**Critical open gaps (block v0.1.0 release):**
1. Grounded unduck hull trace (`FinishUnDuck` on ground)
2. Mangler charged shot
3. Knockback force model vs SDK `DamageForce()` + ConVar scales

---

## Scope

### In scope (Soldier bounce / RJ simulation)

- `src/game/shared/gamemovement.cpp` — base movement
- `src/game/shared/tf/tf_gamemovement.cpp` — TF overrides
- `src/game/shared/movevars_shared.cpp` — `sv_*` defaults
- `src/game/shared/shareddefs.h` — duck timing
- `src/game/server/tf/tf_player.cpp` — self rocket jump force (`ApplyPushFromDamage`)

### Out of scope (documented, not implemented)

- Water, ladders, grappling hook, parachute, kart, ghost mode
- Scout air dash, double jump, class-specific movement
- Map traces (slopes, teleports, walls) — see abounce for reference
- Full weapon/projectile SDK (`tf_weapon_rocketlauncher.cpp`, etc.)
- Client prediction / networking origin quantization

---

## Per-tick execution order

### SDK: `CGameMovement::PlayerMove` → `CTFGameMovement::FullWalkMove`

```
PlayerMove()
├── CheckParameters()
├── ReduceTimers()
├── AngleVectors()
├── [Early ground categorize]
│   if NOT (WALK && !game_code_moved && sv_optimizedmovement)
│       CategorizePosition()          // full trace-based
│   else if velocity.z > 250
│       SetGroundEntity(NULL)         // optimized path (DEFAULT)
├── UpdateDuckJumpEyeOffset()
├── Duck()                            // TF: DuckOverrides + OnDuck/OnUnDuck
└── FullWalkMove()
    ├── StartGravity()                // vel.z -= g * 0.5 * dt
    ├── CheckJumpButton()             // if IN_JUMP
    ├── CheckVelocity()               // clamp to sv_maxvelocity
    ├── if on ground:
    │       vel.z = 0; Friction(); WalkMove()
    │   else:
    │       AirMove()
    ├── CategorizePosition()          // end-of-tick ground snap
    ├── FinishGravity()               // vel.z -= g * 0.5 * dt
    └── if on ground: vel.z = 0
```

### Sim: `Player.simulate_tick` → `Soldier.simulate_tick`

```
simulate_tick()                       // Player
├── [Early ground] — matches optimized SDK path
│   if False: categorize_position()   // dead branch (sv_optimizedmovement=1)
│   elif vel[2] > 250: set_ground_state(False)
├── handle_ducking()                  // DuckOverrides + Duck/Unduck
├── StartGravity + CheckVelocity      // half_grav applied to all axes
├── jump handling                     // CheckJumpButton + PreventBunnyJumping
├── if on ground: friction + walkmove
│   else: airmove
├── categorize_position()
├── FinishGravity
└── clamp vel; vel.z = 0 if grounded

Soldier.simulate_tick()               // extends Player
├── super().simulate_tick()
├── rocket tick + explosion knockback
├── weapon deploy / fire cooldown
└── shoot rocket if +attack
```

### Order differences

| Step | SDK | Sim | Impact |
|------|-----|-----|--------|
| Gravity before duck | Duck() then FullWalkMove gravity | Duck then gravity | **Low** — same relative order within tick |
| `CheckVelocity` placement | Before walk/air, after friction setup | Combined with StartGravity | **Low** — both clamp to 3500 |
| Jump before friction | Yes (`CheckJumpButton` before `Friction`) | Yes | **Match** |
| Rockets | Separate weapon/projectile systems | Same tick after movement | **Approximate** — TF2Simulator models post-movement explosions |
| `UpdateDuckJumpEyeOffset` | Called in `PlayerMove` | TODO in `handle_ducking` | **Low** for bounce height; affects eye offset only |

---

## Constants verification

| Constant | SDK source | SDK value (TF) | `simulation.py` | Match |
|----------|-----------|----------------|-----------------|-------|
| `sv_gravity` | `movevars_shared.cpp` | `800` | `800.0` | ✅ |
| `sv_friction` | `movevars_shared.cpp` | `4` | `4.0` | ✅ |
| `sv_accelerate` | `movevars_shared.cpp` | `10` | `10.0` | ✅ |
| `sv_airaccelerate` | `movevars_shared.cpp` | `10` | `10.0` | ✅ |
| `sv_stopspeed` | `movevars_shared.cpp` | `100` | `100.0` | ✅ |
| `sv_stepsize` | `movevars_shared.cpp` | `18` | `18.0` | ✅ |
| `sv_maxvelocity` | `movevars_shared.cpp` | `3500` | `3500.0` (`max_vel`) | ✅ |
| `COORD_RESOLUTION` | engine constant (used in `gamemovement.cpp`) | `0.03125` (1/32) | `0.03125` | ✅ |
| `BUNNYJUMP_MAX_SPEED_FACTOR` | `tf_gamemovement.cpp:1087` | `1.2f` | `1.2` | ✅ |
| Jump speed | `CheckJumpButton` `289.0f * flJumpMod` | `289` base | `jump_speed = 289.0` | ✅ |
| `GetAirSpeedCap()` | `gamemovement.h` | `30.f` | `AIRSPEEDCAP = 30.0` | ✅ |
| `TIME_TO_DUCK` | `shareddefs.h` (TF) | `0.2` | `DUCKING_TIME = 0.2` | ✅ |
| `TIME_TO_UNDUCK` | `shareddefs.h` | `0.2` | `UNDUCKING_TIME = 0.3` | ⚠️ see note |
| `TF_TIME_TO_DUCK` | `tf_gamemovement.cpp:89` | `0.3f` | `REDUCK_TIME = 0.3` | ✅ |
| `TF_AIRDUCKED_COUNT` | `tf_gamemovement.cpp:90` | `2` | `AIRDUCK_LIMIT = 2` | ✅ |
| Tick interval | `gpGlobals->frametime` | `0.015` (66.67 Hz) | `tick_duration = 3/200` | ✅ |
| Soldier `m_flMaxspeed` | class data | `240` | `flMaxSpeed = 240` | ✅ |
| Wish-speed threshold | `WalkMove` | `100 * friction / accel` | `WISHSPEEDTHR` | ✅ |
| Rocket damage | projectile data | `90` | `explosion_damage = 90.0` | ✅ |
| Rocket radius | projectile data | `~121` | `explosion_radius = 121.0` | ✅ |
| Self RJ ground scale | `tf_damageforcescale_self_soldier_badrj` | `5.0` | `inital_damage * 5.0` | ✅ |
| Self RJ air scale | `tf_damageforcescale_self_soldier_rj` | `10.0` | `inital_damage * 6.0` | ⚠️ **Mismatch** |
| Duck knockback hull Z | `tf_player.cpp` comment | `55` modified | `82/55` multiplier | ✅ (equivalent intent) |

**`UNDUCKING_TIME` note:** SDK `TIME_TO_UNDUCK` is `0.2s`, but TF2Simulator uses `0.3`. This was inherited from the upstream port. Regression tests pass with `0.3`; verify against zlog whether in-game unduck animation timing uses `0.2` or TF-specific override.

**Air RJ force scale:** SDK uses `tf_damageforcescale_self_soldier_rj = 10.0` with `DamageForce()`. Sim uses a simplified `modified_damage = initial * 6.0` impulse directly. Ground RJ uses `5.0` in both. This is a **known approximation** — the 17 examples were tuned against game behavior via TF2Simulator/review.pdf, not line-by-line SDK port.

---

## Function mapping

### `gamemovement.cpp` / `tf_gamemovement.cpp` → `simulation.py`

| SDK function | Sim method | Status |
|--------------|------------|--------|
| `CGameMovement::PlayerMove` | `Player.simulate_tick` (first half) | ✅ simplified |
| `CGameMovement::ReduceTimers` | duck timers in `handle_ducking` | ✅ |
| `CTFGameMovement::DuckOverrides` | `handle_ducking` (reduck, airduck limit) | ✅ |
| `CTFGameMovement::OnDuck` / `OnUnDuck` | `handle_ducking` press/release | ⚠️ grounded unduck incomplete |
| `CGameMovement::StartGravity` | `simulate_tick` half_grav subtract | ✅ |
| `CGameMovement::FinishGravity` | `simulate_tick` end half_grav | ✅ |
| `CGameMovement::CheckVelocity` | `truncate(..., -max_vel, max_vel)` | ✅ |
| `CTFGameMovement::CheckJumpButton` | jump block in `simulate_tick` | ✅ no scout air dash |
| `CTFGameMovement::PreventBunnyJumping` | bunnyhop scale in `simulate_tick` | ✅ |
| `CGameMovement::Friction` | `friction()` | ✅ |
| `CTFGameMovement::WalkMove` | `walkmove()` | ✅ incl. wish-speed boost + back-speed clamp |
| `CGameMovement::Accelerate` | inline in `walkmove()` | ✅ |
| `CTFGameMovement::AirMove` | `airmove()` | ✅ simplified (no `StepMove`) |
| `CGameMovement::AirAccelerate` | inline in `airmove()` | ✅ |
| `CTFGameMovement::CategorizePosition` | `categorize_position()` | ✅ flat floor only |
| `CGameMovement::SetGroundEntity` | `set_ground_state()` | ✅ |
| `CGameMovement::TryPlayerMove` | `airmove` position integrate + floor clamp | ⚠️ no wall collision |
| `CTFGameMovement::GetAirSpeedCap` | `AIRSPEEDCAP` constant | ✅ default only |
| `CTFGameMovement::FullWalkMove` | body of `simulate_tick` | ✅ |

### `tf_player.cpp` → `Soldier.simulate_knockback`

| SDK | Sim | Status |
|-----|-----|--------|
| `CTFPlayer::ApplyPushFromDamage` | `simulate_knockback` | ⚠️ simplified |
| `DamageForce(vecSize, damage, scale)` | `modified_damage` added to velocity | Different model |
| Bounding box center for direction | `center_pos` + bbox closest point | ✅ similar |
| Explosion position offset | `explosion_pos[2] -= 10.0` | ✅ |
| Falloff `1 - 0.5 * d/radius` | same formula | ✅ |
| Max impulse cap | SDK via damage pipeline | Sim: `min(..., 1000.0)` |
| `tf_damageforcescale_self_soldier_badrj` (5.0) ground | `* 5.0` when grounded | ✅ |
| `tf_damageforcescale_self_soldier_rj` (10.0) air | `* 6.0` when airborne | ⚠️ |

### Rocket / weapon

| SDK (conceptual) | Sim | Status |
|------------------|-----|--------|
| `CTFWeaponRocketLauncher::FireProjectile` | `Soldier.shoot_rocket` | ✅ |
| Launcher view offsets (Stock/Original) | `Rocket_launcher` offsets | ✅ |
| Mangler uncharged | `Mangler` class | ✅ |
| Mangler charged shot | — | ❌ TODO |
| `CTFBaseRocket::Explode` | `Rocket.simulate_tick` explosion | ⚠️ simplified collision |
| Fire rate / deploy time | `fire_rate=0.8`, `deploy_speed=0.5` | ✅ approximate |

---

## `float_mode` and 64-bit TF2

**SDK:** All movement uses `float` (`Vector`, `mv->m_vecVelocity`, etc.). `CheckVelocity` clamps to `sv_maxvelocity` (3500).

**Sim:** Uses Python `float` (64-bit IEEE 754) everywhere, with `round_to_nearest_float()` applied after:
- `walkmove()` velocity and position integration
- `airmove()` velocity and position integration
- `Rocket.simulate_tick()` position integration

`round_to_nearest_float()` emulates a C++ `float` cast via frexp/ldexp rounding to 24-bit mantissa — the correct approach for matching Source `float` semantics.

**64-bit TF2 implication:** The 2024 64-bit port changes CPU register behavior (SSE2 vs x87), not the `float` type. Residual divergence vs live game is possible from compiler/ordering differences — **zlog validation (v0.4.0) is the correct final check**, not switching the sim to `double`.

**Current evidence:** 17 regression snapshots pass with `float_mode=True`. Disabling `float_mode` would likely break walkmove rounding-sensitive scenarios (e.g. example_10 ground jumps).

---

## Known gaps and audit findings

### Critical (fix before v0.1.0 release)

| ID | Location | SDK reference | Description |
|----|----------|---------------|-------------|
| G1 | `handle_ducking` L526-528 | `CGameMovement::FinishUnDuck` | Grounded unduck hull trace not implemented (`TODO: Grounded unduck`) |
| G2 | `Mangler` class | `tf_weapon_rocketlauncher.cpp` | Charged shot not implemented |
| G3 | `simulate_knockback` | `ApplyPushFromDamage` + `DamageForce` | Air RJ scale 6.0 vs SDK ConVar 10.0; no `DamageForce()` size-based curve |

### Medium (may affect exotic setups)

| ID | Location | Description |
|----|----------|-------------|
| M1 | `handle_ducking` L453 | `UpdateDuckJumpEyeOffset` not called per tick |
| M2 | `handle_ducking` L492-496 | `HACKHACK` duck-on-ground block empty |
| M3 | `Rocket.simulate_tick` | Collision uses analytic floor hit, not SDK `TraceHull` |
| M4 | `simulate_tick` L557 | `if False` dead branch — correct for default but confusing; add comment or `sv_optimizedmovement` flag |
| M5 | `UNDUCKING_TIME` | `0.3` in sim vs `0.2` in SDK — verify empirically |

### Low / out of scope

- No conveyor `basevelocity`, no water, no TF conditions (blast jumping air control, etc.)
- Single infinite floor plane; no `TryPlayerMove` wall slides
- No weapon attributes (`mod_jump_height`, `mult_dmgself_push_force`)

---

## Validation checklist

| Task | Status | Evidence |
|------|--------|----------|
| Map SDK files to sim functions | ✅ Done | Tables above |
| Verify `sv_gravity`, `sv_friction`, `COORD_RESOLUTION`, `BUNNYJUMP_MAX_SPEED_FACTOR` | ✅ Match | Constants table |
| Verify tick order `PlayerMove` / `FullWalkMove` | ✅ Documented | Order section; minor diffs noted |
| Confirm `float_mode` emulates C++ `float` | ✅ Principle confirmed | Implementation review; zlog pending |
| SDK `gamemovement.cpp` audit | ✅ Done | Friction, gravity, accelerate |
| SDK `tf_gamemovement.cpp` audit | ✅ Done | TF duck, jump, walk, categorize |
| SDK `tf_player.cpp` knockback audit | ⚠️ Partial | Formula mismatch documented |
| No unresolved **critical** mismatches | ❌ Open | G1–G3 remain |
| zlog cross-check (64-bit TF2) | ⏳ Deferred | v0.4.0 |

---

## Recommended next steps

1. **G1 — Grounded unduck:** Port `FinishUnDuck` ground trace from `gamemovement.cpp` (~L4490+); add pytest scenario for crouch-jump-land-unduck on flat ground.
2. **G3 — Knockback:** Port `DamageForce()` from SDK and wire `tf_damageforcescale_self_soldier_rj` / `badrj`; re-run all 17 snapshots and adjust tolerances.
3. **G2 — Mangler charge:** Read `tf_weapon_rocketlauncher.cpp` charge logic; add weapon variant + test.
4. **M5 — Unduck timing:** zlog or in-game test to confirm `0.2` vs `0.3`.
5. **v0.4.0:** Run bcheck zlog pipeline on 64-bit TF2 to classify sim-fix vs empirical-only divergences.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| `1.0.0` | 2026-07-07 | Initial SDK audit against source-sdk-2013 and tf2sim v0.1.0 |
