"""Scenario runners ported from TF2Simulator example_*.py scripts."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

from tf2sim import simulation


@dataclass
class ScenarioResult:
    pos: list[float]
    vel: list[float]
    max_z: float | None = None
    b_ducked: bool = False
    b_on_ground: bool = False
    extra: dict = field(default_factory=dict)


def _result(p: simulation.Soldier, max_z: float | None = None, **extra) -> ScenarioResult:
    return ScenarioResult(
        pos=list(p.pos),
        vel=list(p.vel),
        max_z=max_z,
        b_ducked=p.b_ducked,
        b_on_ground=p.b_on_ground,
        extra=extra,
    )


def _run_loop(
    ticks: int,
    setup: Callable[[simulation.Key_state], simulation.Soldier],
    tick_fn: Callable[[int, simulation.Soldier, simulation.Key_state], None],
    track_max_z: bool = False,
) -> ScenarioResult:
    keys = simulation.Key_state()
    player = setup(keys)
    positions: list[list[float]] = []
    if track_max_z:

        class TrackHook(simulation.Hook_Base):
            def soldier_created(self, p):
                positions.append(list(p.pos))

            def soldier_after_tick_update(self, p):
                positions.append(list(p.pos))

        if player.hook is None:
            player.hook = TrackHook()
        else:
            orig = player.hook

            class Combined(simulation.Hook_Base):
                def __getattr__(self, name):
                    return getattr(orig, name)

                def soldier_created(self, p):
                    positions.append(list(p.pos))
                    if hasattr(orig, "soldier_created"):
                        orig.soldier_created(p)

                def soldier_after_tick_update(self, p):
                    positions.append(list(p.pos))
                    if hasattr(orig, "soldier_after_tick_update"):
                        orig.soldier_after_tick_update(p)

            player.hook = Combined()

    for tick in range(ticks):
        player.simulate_tick()
        tick_fn(tick, player, keys)

    max_z = max(pos[2] for pos in positions) if positions else None
    return _result(player, max_z=max_z)


def example_01_spam_rockets() -> ScenarioResult:
    def setup(keys):
        keys.press_key("+forward")
        return simulation.Soldier(keys, launcher=simulation.Stock)

    def tick_fn(tick, _p, keys):
        if tick == 20:
            keys.press_key("+attack")
        if tick == 25:
            keys.press_key("+duck")

    return _run_loop(406, setup, tick_fn)


def example_02_hold_m1_hit_ss() -> ScenarioResult:
    def setup(keys):
        return simulation.Soldier(keys, launcher=simulation.Original)

    def tick_fn(tick, _p, keys):
        if tick == 5:
            keys.press_key("+attack")
        if tick == 10:
            keys.press_key("+duck")

    return _run_loop(406, setup, tick_fn)


def example_03_jump_into_jumpbug() -> ScenarioResult:
    floor2 = simulation.Floor(0.0)

    class Hook(simulation.Hook_Base):
        def player_ground_to_air(self, p):
            p.floor = floor2

    def setup(keys):
        keys.press_key("+forward")
        initial_pos = [0.0, 0.0, 1088.0]
        floor1 = simulation.Floor(1088.0)
        return simulation.Soldier(keys, hook=Hook(), pos=initial_pos, floor=floor1)

    def tick_fn(tick, _p, keys):
        if tick == 15:
            keys.press_key("+jump")
        if tick == 16:
            keys.release_key("+jump")
            keys.press_key("+duck")
        if tick == 151:
            keys.release_key("+duck")
            keys.press_key("+jump")

    return _run_loop(406, setup, tick_fn)


def example_04_fancy_setup_into_jumpbug() -> ScenarioResult:
    floor1 = simulation.Floor(-4096.0)
    floor2 = simulation.Floor(-4160.0)
    floor3 = simulation.Floor(-5056.0)

    class Hook(simulation.Hook_Base):
        def soldier_after_hit(self, p, *_args):
            if p.floor == floor1:
                p.floor = floor2
            elif p.floor == floor2:
                p.floor = floor3

    def setup(keys):
        keys.press_key("+forward")
        initial_pos = [0.0, 0.0, -4096.0]
        return simulation.Soldier(
            keys, hook=Hook(), launcher=simulation.Original, pos=initial_pos, floor=floor1
        )

    def tick_fn(tick, _p, keys):
        if tick == 20:
            keys.press_key("+attack")
        if tick == 91:
            keys.release_key("+attack")
        if tick == 100:
            keys.press_key("+duck")
        if tick == 186:
            keys.release_key("+duck")
            keys.press_key("+jump")

    return _run_loop(406, setup, tick_fn)


def example_05_crouched_jump_into_bounce() -> ScenarioResult:
    floor2 = simulation.Floor(-357.0)

    class Hook(simulation.Hook_Base):
        def player_ground_to_air(self, p):
            p.floor = floor2

    def setup(keys):
        keys.press_key("+forward")
        initial_pos = [0.0, 0.0, -64.0]
        floor1 = simulation.Floor(-64.0)
        return simulation.Soldier(keys, hook=Hook(), pos=initial_pos, floor=floor1)

    def tick_fn(tick, _p, keys):
        if tick == 15:
            keys.press_key("+jump")
        if tick == 16:
            keys.release_key("+jump")
            keys.press_key("+duck")
        if tick == 95:
            keys.press_key("+attack")
        if tick == 96:
            keys.release_key("+attack")

    return _run_loop(406, setup, tick_fn)


def example_06_ctap_basic() -> ScenarioResult:
    def setup(keys):
        p = simulation.Soldier(keys, launcher=simulation.Original)
        p.angle = -89.0
        return p

    def tick_fn(tick, _p, keys):
        if tick == 5:
            keys.press_key("+attack")
        if tick == 6:
            keys.release_key("+attack")
        if tick == 7:
            keys.press_keys("+jump", "+duck")
        if tick == 8:
            keys.release_keys("+jump", "+duck")

    return _run_loop(406, setup, tick_fn, track_max_z=True)


def example_07_ctap_perfect_angle() -> ScenarioResult:
    def setup(keys):
        p = simulation.Soldier(keys, launcher=simulation.Original)
        p.angle = -87.5
        return p

    def tick_fn(tick, _p, keys):
        if tick == 5:
            keys.press_key("+attack")
        if tick == 6:
            keys.release_key("+attack")
        if tick == 7:
            keys.press_keys("+jump", "+duck")
        if tick == 8:
            keys.release_keys("+jump", "+duck")

    return _run_loop(406, setup, tick_fn, track_max_z=True)


def example_08_ctap_with_pre_ctaps() -> ScenarioResult:
    def setup(keys):
        p = simulation.Soldier(keys, launcher=simulation.Original)
        p.angle = -87.5
        return p

    def tick_fn(tick, _p, keys):
        for t in (2, 52, 102, 152, 202, 252):
            if tick == t:
                keys.press_keys("+jump", "+duck")
            if tick == t + 1:
                keys.release_keys("+jump", "+duck")
        if tick == 305:
            keys.press_key("+attack")
        if tick == 306:
            keys.release_key("+attack")
        if tick == 307:
            keys.press_keys("+jump", "+duck")
        if tick == 308:
            keys.release_keys("+jump", "+duck")

    return _run_loop(456, setup, tick_fn, track_max_z=True)


def example_09_ctap_super_fancy() -> ScenarioResult:
    def setup(keys):
        p = simulation.Soldier(keys, launcher=simulation.Original)
        p.angle = -88.976
        return p

    def tick_fn(tick, _p, keys):
        for t in (2, 52, 102, 152, 202, 252):
            if tick == t:
                keys.press_keys("+jump", "+duck")
            if tick == t + 1:
                keys.release_keys("+jump", "+duck")
        if tick == 298:
            keys.press_key("+back", 1.0)
        if tick == 299:
            keys.press_key("+back", 1.0)
        if tick == 305:
            keys.release_key("+back")
        if tick == 325:
            keys.press_key("+attack")
        if tick == 326:
            keys.release_key("+attack")
        if tick == 327:
            keys.press_keys("+jump", "+duck")
        if tick == 328:
            keys.release_keys("+jump", "+duck")

    return _run_loop(456, setup, tick_fn, track_max_z=True)


def example_10_jumping_around_on_the_ground() -> ScenarioResult:
    def setup(keys):
        keys.press_key("+forward")
        p = simulation.Soldier(keys)
        p.b_on_ground = True
        return p

    def tick_fn(tick, p, keys):
        if tick == 15:
            keys.press_key("+jump")
        if tick == 16:
            keys.release_key("+jump")
        if tick == 75:
            keys.press_key("+jump")
        if tick == 76:
            keys.release_key("+jump")
            keys.press_key("+duck")
        if tick == 130:
            keys.release_key("+duck")
        if tick == 160:
            keys.press_keys("+jump", "+duck")
        if tick == 162:
            keys.release_keys("+jump", "+duck")
        if tick == 210:
            keys.press_keys("+jump", "+duck")
        if tick == 212:
            keys.release_key("+jump")
        if tick == 267:
            keys.release_key("+duck")
        if tick == 300:
            assert not p.b_ducked
            keys.press_keys("+jump", "+duck")
        if tick == 301:
            keys.release_keys("+jump", "+duck")
        if tick == 302:
            keys.press_key("+duck")
        if tick == 356:
            assert p.b_ducked
            keys.release_key("+duck")
        if tick == 400:
            keys.press_keys("+jump", "+duck")
        if tick == 401:
            keys.release_keys("+jump", "+duck")
        if tick == 450:
            keys.press_keys("+jump", "+duck")
        if tick == 451:
            keys.release_keys("+jump", "+duck")
        if tick == 500:
            keys.press_keys("+jump", "+duck")
        if tick == 501:
            keys.release_keys("+jump", "+duck")
        if tick == 550:
            keys.press_keys("+jump", "+duck")
        if tick == 551:
            keys.release_keys("+jump", "+duck")
        if tick == 600:
            keys.press_keys("+jump", "+duck")
        if tick == 601:
            keys.release_keys("+jump", "+duck")
        if tick == 650:
            keys.press_keys("+jump", "+duck")
        if tick == 651:
            keys.release_keys("+jump", "+duck")
        if tick == 700:
            keys.press_keys("+jump", "+duck")
        if tick == 701:
            keys.release_keys("+jump", "+duck")
        if tick == 750:
            keys.press_keys("+jump", "+duck")
        if tick == 752:
            keys.release_keys("+jump", "+duck")
        if tick == 798:
            keys.press_keys("+jump", "+duck")
        if tick == 800:
            keys.release_keys("+jump", "+duck")

    return _run_loop(1000, setup, tick_fn)


def example_11_just_a_crouch_jump() -> ScenarioResult:
    def setup(keys):
        keys.press_key("+forward")
        p = simulation.Soldier(keys)
        p.b_on_ground = True
        return p

    def tick_fn(tick, _p, keys):
        if tick == 15:
            keys.press_keys("+jump", "+duck")

    return _run_loop(100, setup, tick_fn, track_max_z=True)


def example_12_three_bunny_hops() -> ScenarioResult:
    def setup(keys):
        keys.press_key("+forward")
        p = simulation.Soldier(keys)
        p.b_on_ground = True
        return p

    def tick_fn(tick, _p, keys):
        if tick == 15:
            keys.press_keys("+jump", "+duck")
        if tick == 17:
            keys.release_keys("+jump", "+duck")
        if tick == 63:
            keys.press_keys("+jump", "+duck")
        if tick == 65:
            keys.release_keys("+jump", "+duck")
        if tick == 111:
            keys.press_keys("+jump", "+duck")

    return _run_loop(200, setup, tick_fn, track_max_z=True)


def example_13_74_unit_jump_using_27_tickperfect_bhops() -> ScenarioResult:
    def setup(keys):
        keys.press_key("+forward")
        p = simulation.Soldier(keys)
        p.b_on_ground = True
        return p

    def tick_fn(tick, _p, keys):
        if tick == 15:
            keys.press_key("+jump")
        if tick == 17:
            keys.release_key("+jump")
        if tick == 62:
            keys.press_key("+jump")
        if tick == 64:
            keys.release_key("+jump")
        if tick == 109:
            keys.press_keys("+jump", "+duck")
        if tick == 110:
            keys.release_keys("+jump", "+duck")
        if tick == 112:
            keys.press_key("+duck")
        if tick == 115:
            keys.release_key("+duck")
        delay = 43
        for i in range(1, 30):
            if tick == 109 + delay * i:
                keys.press_keys("+jump", "+duck")
            if tick == 110 + delay * i:
                keys.release_keys("+jump", "+duck")
            if tick == 112 + delay * i:
                keys.press_key("+duck")
            if tick == 115 + delay * i:
                keys.release_key("+duck")
        if tick == 1399:
            keys.press_key("+jump")
        if tick == 1401:
            keys.release_key("+jump")
        if tick == 1446:
            keys.press_keys("+jump", "+duck")

    return _run_loop(1600, setup, tick_fn, track_max_z=True)


def example_14_74_unit_using_high_speed() -> ScenarioResult:
    def setup(keys):
        keys.press_key("+forward")
        p = simulation.Soldier(keys)
        p.b_on_ground = True
        return p

    def tick_fn(tick, p, keys):
        if tick == 15:
            keys.press_keys("+jump", "+duck")
        if tick == 17:
            keys.release_keys("+jump", "+duck")
        if tick == 20:
            p.vel[0] += 76.0
        if tick == 63:
            keys.press_key("+jump")
        if tick == 65:
            keys.release_key("+jump")
        if tick == 110:
            keys.press_keys("+jump", "+duck")

    return _run_loop(300, setup, tick_fn, track_max_z=True)


def example_15_74_units_jump_humanly_viable() -> ScenarioResult:
    def setup(keys):
        keys.press_key("+forward")
        p = simulation.Soldier(keys)
        p.b_on_ground = True
        return p

    def tick_fn(tick, p, keys):
        if tick == 15:
            keys.press_keys("+jump", "+duck")
        if tick == 16:
            keys.release_keys("+jump", "+duck")
        if tick == 20:
            p.vel[0] += 24.0
        if tick == 58:
            keys.press_keys("+jump", "+duck")
        if tick == 59:
            keys.release_keys("+jump", "+duck")
        if tick == 65:
            p.vel[0] += 24.0
        if tick == 101:
            keys.press_key("+jump")
        if tick == 103:
            keys.release_key("+jump")
        if tick == 105:
            p.vel[0] += 44.0
        if tick == 148:
            keys.press_key("+jump")
        if tick == 150:
            keys.release_key("+jump")
        if tick == 195:
            keys.press_keys("+jump", "+duck")

    return _run_loop(300, setup, tick_fn, track_max_z=True)


def example_16_74_units_jump_humanly_viable_alt() -> ScenarioResult:
    speed = 29.0

    def setup(keys):
        keys.press_key("+forward")
        p = simulation.Soldier(keys)
        p.b_on_ground = True
        return p

    def tick_fn(tick, p, keys):
        if tick == 15:
            keys.press_keys("+jump", "+duck")
        if tick == 16:
            keys.release_keys("+jump", "+duck")
        if tick == 20:
            p.vel[0] += speed
        if tick == 58:
            keys.press_keys("+jump", "+duck")
        if tick == 59:
            keys.release_keys("+jump", "+duck")
        if tick == 65:
            p.vel[0] += speed
        if tick == 101:
            keys.press_key("+jump")
        if tick == 103:
            keys.release_key("+jump")
        if tick == 105:
            p.vel[0] += speed
        if tick == 148:
            keys.press_key("+jump")
        if tick == 150:
            keys.release_key("+jump")
        if tick == 195:
            keys.press_keys("+jump", "+duck")

    return _run_loop(300, setup, tick_fn, track_max_z=True)


def example_17_pogo_inplace() -> ScenarioResult:
    positions: list[list[float]] = []

    class Hook(simulation.Hook_Base):
        def soldier_created(self, p):
            positions.append(list(p.pos))

        def soldier_after_tick_update(self, p):
            positions.append(list(p.pos))

        def soldier_after_hit(self, p, *_args):
            p.vel = [0.0, 0.0, p.vel[2]]

    def setup(keys):
        keys.press_key("+jump")
        return simulation.Soldier(keys, hook=Hook(), launcher=simulation.Original)

    def tick_fn(tick, _p, keys):
        if tick == 0:
            keys.release_key("+jump")
        if tick == 12:
            keys.press_key("+attack")
            keys.press_key("+duck")

    ticks = 12 + 54 * 200
    result = _run_loop(ticks, setup, tick_fn)
    peaks: list[float] = []
    for i in range(1, len(positions) - 1):
        if positions[i][2] > positions[i - 1][2] and positions[i][2] > positions[i + 1][2]:
            peaks.append(positions[i][2])
    spread = max(peaks[-100:]) - min(peaks[-100:]) if peaks else 0.0
    result.extra["pogo_peak_spread"] = spread
    return result


def example_18_grounded_unduck_flat() -> ScenarioResult:
    """Crouch on flat ground, release duck — SDK FinishUnDuck (zero hull-min offset on TF)."""

    def setup(keys):
        p = simulation.Soldier(keys)
        p.b_on_ground = True
        return p

    def tick_fn(tick, _p, keys):
        if tick == 10:
            keys.press_key("+duck")
        if tick == 30:
            keys.release_key("+duck")

    return _run_loop(80, setup, tick_fn)


def example_19_grounded_unduck_blocked_by_ceiling() -> ScenarioResult:
    """Low ceiling blocks standing hull — player must stay ducked (CanUnduck fails)."""
    floor_z = 0.0
    ceiling_z = floor_z + 70.0  # standing hull needs 82 units

    def setup(keys):
        p = simulation.Soldier(
            keys,
            floor=simulation.Floor(floor_z),
            ceiling_z=ceiling_z,
        )
        p.b_on_ground = True
        return p

    def tick_fn(tick, p, keys):
        if tick == 10:
            keys.press_key("+duck")
        if tick == 40:
            keys.release_key("+duck")
        if tick == 79:
            assert p.b_ducked, "player should remain ducked under low ceiling"

    result = _run_loop(80, setup, tick_fn)
    result.extra["remained_ducked"] = True
    return result


SCENARIOS: dict[str, Callable[[], ScenarioResult]] = {
    "example_01": example_01_spam_rockets,
    "example_02": example_02_hold_m1_hit_ss,
    "example_03": example_03_jump_into_jumpbug,
    "example_04": example_04_fancy_setup_into_jumpbug,
    "example_05": example_05_crouched_jump_into_bounce,
    "example_06": example_06_ctap_basic,
    "example_07": example_07_ctap_perfect_angle,
    "example_08": example_08_ctap_with_pre_ctaps,
    "example_09": example_09_ctap_super_fancy,
    "example_10": example_10_jumping_around_on_the_ground,
    "example_11": example_11_just_a_crouch_jump,
    "example_12": example_12_three_bunny_hops,
    "example_13": example_13_74_unit_jump_using_27_tickperfect_bhops,
    "example_14": example_14_74_unit_using_high_speed,
    "example_15": example_15_74_units_jump_humanly_viable,
    "example_16": example_16_74_units_jump_humanly_viable_alt,
    "example_17": example_17_pogo_inplace,
    "example_18": example_18_grounded_unduck_flat,
    "example_19": example_19_grounded_unduck_blocked_by_ceiling,
}
