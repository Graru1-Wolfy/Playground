#!/usr/bin/env python3
"""Write packages/schema/tests/fixtures/sample_setup.bin from Python Setup.pack()."""

from pathlib import Path

from engine_sim.setups import Setup

fixture_dir = Path(__file__).resolve().parents[2] / "schema" / "tests" / "fixtures"
fixture_dir.mkdir(parents=True, exist_ok=True)

obj = Setup()
obj.ID = 1234
obj.launcher = 2
obj.start_moving = 3
obj.start_action = 4
obj.num_rockets = 1
obj.MANG = 128
obj.STANDBOUNCE = 64
obj.speeds = [float("nan"), 591.28, float("nan"), float("nan"), float("nan"), float("nan"), float("nan")]

(fixture_dir / "sample_setup.bin").write_bytes(obj.pack())
print("wrote", fixture_dir / "sample_setup.bin")
