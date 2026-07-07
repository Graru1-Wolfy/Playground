"""Regression tests for TF2Simulator example scenarios."""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

import pytest

from scenarios import SCENARIOS, ScenarioResult

SNAPSHOT_DIR = Path(__file__).parent / "snapshots"
TOLERANCE = 1e-6


def _load_snapshot(name: str) -> dict:
    return json.loads((SNAPSHOT_DIR / f"{name}.json").read_text())


def _assert_close(actual: float, expected: float, label: str) -> None:
    if abs(actual - expected) > TOLERANCE:
        raise AssertionError(f"{label}: expected {expected}, got {actual}")


def _assert_vec_close(actual: list[float], expected: list[float], label: str) -> None:
    assert len(actual) == len(expected), f"{label}: length mismatch"
    for i, (a, e) in enumerate(zip(actual, expected)):
        _assert_close(a, e, f"{label}[{i}]")


def _assert_result(actual: ScenarioResult, expected: dict) -> None:
    _assert_vec_close(actual.pos, expected["pos"], "pos")
    _assert_vec_close(actual.vel, expected["vel"], "vel")
    assert actual.b_ducked == expected["b_ducked"]
    assert actual.b_on_ground == expected["b_on_ground"]
    if expected.get("max_z") is not None:
        assert actual.max_z is not None
        _assert_close(actual.max_z, expected["max_z"], "max_z")
    if "pogo_peak_spread" in expected.get("extra", {}):
        _assert_close(
            actual.extra["pogo_peak_spread"],
            expected["extra"]["pogo_peak_spread"],
            "pogo_peak_spread",
        )
    if expected.get("extra", {}).get("remained_ducked"):
        assert actual.b_ducked is True


@pytest.mark.parametrize("name", sorted(SCENARIOS))
def test_example_snapshot(name: str) -> None:
    expected = _load_snapshot(name)
    actual = SCENARIOS[name]()
    _assert_result(actual, expected)


def test_snapshot_count() -> None:
    assert len(list(SNAPSHOT_DIR.glob("example_*.json"))) == len(SCENARIOS)
