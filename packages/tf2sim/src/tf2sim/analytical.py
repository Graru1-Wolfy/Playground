"""Closed-form bounce math (must match packages/engine-fast).

Ported from bcheck / engine-fast for cross-validation against tf2sim trajectories.
"""

from __future__ import annotations

import math
from enum import IntEnum

TICK = 0.015
GRAVITY = -800.0
TICKGRAV = TICK * GRAVITY
MAXVEL = 3500.0
EPSILON = 0.03125

OFFSET_CROUCHED = 20
OFFSET_CEILING = 82
DRANGE = (0.705078, 0.999999)

# bcheck DEFAULT setups (src/bounces.json)
DEFAULT_BOUNCES: tuple[dict, ...] = (
    {"text": "Walk", "vel": -6},
    {"text": "Crouch Walk", "vel": -6, "crouched": True},
    {"text": "Jump", "vel": 283},
    {"text": "Crouch Jump", "vel": 289},
    {"text": "Ctap", "vel": 289, "crouched": True},
    {"text": "Ceilingsmash", "vel": -6, "ceiling": True},
)


class LandType(IntEnum):
    UNCROUCHED = 0
    CROUCHED = 1
    JUMPBUG = 2


def get_max_vel_tick_from_start_z_vel(vel: float) -> int:
    return math.ceil(-(vel + MAXVEL) / TICKGRAV)


def get_z_from_tick(vel: float, tick: float, height: float) -> float:
    maxveltick = get_max_vel_tick_from_start_z_vel(vel)
    tick0 = tick if tick < maxveltick else (maxveltick - 1)
    z = height + 0.5 * TICKGRAV * TICK * tick0 * tick0 + vel * TICK * tick0
    if tick >= maxveltick:
        z -= MAXVEL * TICK * (tick - tick0)
    return z


def get_valid_height(vel: float, height: float) -> float:
    ticktop = int(-vel / TICKGRAV) if TICKGRAV else 0
    if ticktop < 0:
        ticktop = 0
    maxzrel = get_z_from_tick(vel, ticktop, 0.0) if ticktop >= 0 else 0.0
    return max(height, -maxzrel)


def get_land_tick_from_start_z_vel(height: float, vel: float) -> float:
    tick0 = get_max_vel_tick_from_start_z_vel(vel) - 1
    if tick0 == -1:
        tick0 = 0
    z0 = get_z_from_tick(vel, tick0, height)
    if z0 <= 0.0:
        return -(vel + (vel * vel - 2.0 * GRAVITY * height) ** 0.5) / TICKGRAV
    return (
        height / (MAXVEL * TICK)
        + (1 + vel / MAXVEL) * tick0
        + 0.5 * TICKGRAV / MAXVEL * tick0 * tick0
    )


def can_bounce(height: float, vel: float, interval: tuple[float, float]) -> int:
    heightmax = get_valid_height(vel, height - interval[0])
    heightmin = get_valid_height(vel, height - interval[1])

    tickmax = math.floor(get_land_tick_from_start_z_vel(heightmax, vel))
    tickmin = math.ceil(get_land_tick_from_start_z_vel(heightmin, vel))

    b = (height - interval[0] >= heightmax or height - interval[1] >= heightmin) and (
        tickmax - tickmin
    ) >= 0.0
    if b:
        raw = -get_z_from_tick(vel, tickmin, 0.0) % 1.0
        if DRANGE[0] <= raw <= DRANGE[1]:
            return 2
    return int(b)


def check_bounce(
    height: float,
    bounce: dict,
    land: LandType,
    teleheight: float = 1.0,
) -> int:
    offs = 0.0
    if bounce.get("crouched"):
        offs -= OFFSET_CROUCHED
    if bounce.get("ceiling"):
        offs -= OFFSET_CEILING
    if bounce.get("offs"):
        offs += float(bounce["offs"])
    if land == LandType.CROUCHED:
        offs += OFFSET_CROUCHED

    height += offs + (-EPSILON if bounce.get("ceiling") else EPSILON)

    if land == LandType.JUMPBUG:
        interval = (max(0.0, teleheight - 283 * TICK), 2.0)
    else:
        interval = (teleheight, 2.0)

    vel = float(bounce.get("vel", 0))
    result = can_bounce(height, vel, interval)
    if result == 2 and land == LandType.CROUCHED:
        return 1
    return result
