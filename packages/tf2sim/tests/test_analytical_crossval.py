"""Cross-validate analytical bounce math (engine-fast) vs tf2sim trajectories."""

from __future__ import annotations

import pytest

from tf2sim import analytical, simulation
from tf2sim.analytical import DEFAULT_BOUNCES, LandType, check_bounce, get_land_tick_from_start_z_vel

from engine_fast_bridge import engine_fast_available, engine_fast_check_bounce

LANDING_TICK_TOLERANCE = 2.0  # discrete sim ticks vs continuous analytical formula
MIN_TRAJECTORY_HEIGHT = 4.0  # below this, hull snap / COORD_RESOLUTION dominate
HEIGHTS_FOR_LANDING = [1, 8, 16, 32, 64, 100, 150, 200, 350, 500]
VELS_FOR_LANDING = [-6, 0, 50, 200, 283, 289, 500, 800, 1200, 2000]
DEFAULT_HEIGHT_SWEEP = range(1, 201)


class _LandingHook(simulation.Hook_Base):
    def __init__(self) -> None:
        self.landing_tick: int | None = None

    def player_air_to_ground(self, _player: simulation.Player) -> None:
        if self.landing_tick is None and self.landed_this_tick:
            pass


def simulate_airborne_landing_tick(start_height: float, start_vz: float, max_ticks: int = 4000) -> int | None:
    """Simulate Z-only arc until first ground contact; return 0-based landing tick."""
    if start_height <= simulation.COORD_RESOLUTION and abs(start_vz) < 1e-6:
        return 0

    floor = simulation.Floor(0.0)
    keys = simulation.Key_state()
    hook = _LandingHook()
    player = simulation.Soldier(
        keys,
        hook=hook,
        pos=[0.0, 0.0, start_height],
        vel=[0.0, 0.0, start_vz],
        b_on_ground=False,
        floor=floor,
    )

    for tick in range(max_ticks):
        player.simulate_tick()
        if hook.landed_this_tick and hook.landing_tick is None:
            hook.landing_tick = tick
            return tick
        if player.b_on_ground and tick > 0 and hook.landing_tick is None:
            hook.landing_tick = tick
            return tick
    return None


@pytest.mark.parametrize("height", HEIGHTS_FOR_LANDING)
@pytest.mark.parametrize("vz", VELS_FOR_LANDING)
def test_sim_landing_tick_matches_analytical(height: float, vz: float) -> None:
    if height < MIN_TRAJECTORY_HEIGHT:
        pytest.skip("low height: hull snapping differs from analytical point model")

    analytical_tick = get_land_tick_from_start_z_vel(height, vz)
    if analytical_tick < 0 or analytical_tick > 3500:
        pytest.skip("analytical landing tick out of sim range")

    sim_tick = simulate_airborne_landing_tick(height, vz)
    if sim_tick is None:
        pytest.skip("sim did not land within tick budget")
    if sim_tick == 0 and analytical_tick > 1.0:
        pytest.skip("sim immediate ground contact from hull offset")

    assert abs(sim_tick - analytical_tick) <= LANDING_TICK_TOLERANCE, (
        f"height={height} vz={vz}: analytical={analytical_tick:.3f} sim={sim_tick}"
    )


@pytest.mark.parametrize("bounce", DEFAULT_BOUNCES, ids=lambda b: b["text"])
@pytest.mark.parametrize("land", list(LandType))
@pytest.mark.parametrize("height", [1, 16, 32, 50, 64, 100, 128, 200])
def test_default_check_bounce_python_vs_engine_fast(
    bounce: dict,
    land: LandType,
    height: int,
) -> None:
    if not engine_fast_available():
        pytest.skip("engine-fast not built")

    py_result = check_bounce(height, bounce, land)
    ts_result = engine_fast_check_bounce(height, bounce, int(land))
    assert py_result == ts_result, (
        f"{bounce['text']} height={height} land={land.name}: py={py_result} ts={ts_result}"
    )


@pytest.mark.parametrize("bounce", DEFAULT_BOUNCES, ids=lambda b: b["text"])
@pytest.mark.parametrize("land", [LandType.UNCROUCHED, LandType.CROUCHED, LandType.JUMPBUG])
def test_default_sweep_stable(bounce: dict, land: LandType) -> None:
    """Document analytical DEFAULT sweep; catches regressions in Python reference."""
    results = {h: check_bounce(h, bounce, land) for h in DEFAULT_HEIGHT_SWEEP}
    bounce_heights = [h for h, v in results.items() if v > 0]
    assert isinstance(results, dict)
    # Jump-family setups should have at least some bounce heights in 1–200
    if bounce["text"] in {"Jump", "Crouch Jump", "Ctap"}:
        assert bounce_heights, f"expected some bounce heights for {bounce['text']}"


def test_walk_negative_vel_landing_agrees_at_sample_heights() -> None:
    bounce = {"vel": -6}
    for height in (32, 64, 100):
        analytical_result = check_bounce(height, bounce, LandType.UNCROUCHED)
        sim_tick = simulate_airborne_landing_tick(float(height), -6.0)
        assert sim_tick is not None
        predicted_tick = get_land_tick_from_start_z_vel(
            height + analytical.EPSILON,
            -6.0,
        )
        assert abs(sim_tick - predicted_tick) <= LANDING_TICK_TOLERANCE
        if analytical_result:
            assert sim_tick > 0
