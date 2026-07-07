"""Tests for engine-sim setup schema and generation."""

from __future__ import annotations

import gzip
import struct
from pathlib import Path

import pytest

from engine_sim.setups import RECORD_SIZE, Setup, export_setups, item_ids, load_setups


def test_setup_pack_roundtrip() -> None:
    obj = Setup()
    obj.ID = 999
    obj.launcher = 1
    obj.start_moving = 5
    obj.start_action = 3
    obj.num_rockets = 2
    obj.bounce_flag = 0b11
    obj.STOCK = 0
    obj.ORIG = 128
    obj.BOUNCE = 200
    obj.STANDBOUNCE = 77
    obj.CONSIST = 55
    obj.speeds = [float("nan"), 412.5, 591.28, float("nan"), float("nan"), float("nan"), float("nan")]

    packed = obj.pack()
    assert len(packed) == RECORD_SIZE
    decoded = Setup.unpack(packed)
    assert decoded.ID == obj.ID
    assert decoded.launcher == obj.launcher
    assert decoded.STANDBOUNCE == 77
    assert decoded.CONSIST == 55
    assert decoded.speeds[1] == pytest.approx(412.5)
    assert decoded.speeds[2] == pytest.approx(591.28)


def test_export_and_load_setups(tmp_path: Path) -> None:
    a = Setup()
    a.ID = 1
    a.num_rockets = 0
    a.launcher = 0
    b = Setup()
    b.ID = 2
    b.num_rockets = 1
    b.launcher = 2
    b.speeds = [float("nan"), 100.0, float("nan"), float("nan"), float("nan"), float("nan"), float("nan")]

    path = export_setups([a, b], 42, tmp_path)
    assert path.exists()
    loaded = load_setups(42, tmp_path)
    assert len(loaded) == 2
    assert loaded[0].ID == 1
    assert loaded[1].launcher == 2


def test_item_ids_match_schema_record_size() -> None:
    # 8 + 12 header bytes + 44 preference bytes + 28 speed bytes = 92
    assert len(item_ids) == 44
    assert RECORD_SIZE == 92


@pytest.mark.slow
def test_generate_height_zero(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Full path enumeration for height 0 (~1 min)."""
    monkeypatch.setenv("BOUNCE_DATA_ROOT", str(tmp_path / "data"))
    monkeypatch.setenv("BOUNCE_PRECOMPUTE_ROOT", str(tmp_path / "precompute"))

    from engine_sim.generate_setups import find_bounce_setups_for_height

    setups = find_bounce_setups_for_height(0.0)
    assert len(setups) > 0
    out = tmp_path / "data" / "000to099" / "0.bin.gz"
    assert out.is_file()
    with gzip.open(out, "rb") as f:
        data = f.read()
    assert len(data) % RECORD_SIZE == 0
    assert len(data) // RECORD_SIZE == len(setups)
