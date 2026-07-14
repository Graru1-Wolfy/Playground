"""Tests for engine_sim.cli height selection (range / to-max-fallspeed / skip-existing).

These mock the (slow) per-height generator so they run instantly.
"""

from __future__ import annotations

import engine_sim.cli as cli
from engine_sim.cli import MAX_FALLSPEED_HEIGHT
from engine_sim.paths import setup_data_path


def _record_heights(monkeypatch) -> list[int]:
    generated: list[int] = []

    def fake_generate(args) -> None:
        generated.append(args[0])

    monkeypatch.setattr(cli, "_generate_height", fake_generate)
    return generated


def test_range_selects_inclusive(monkeypatch) -> None:
    generated = _record_heights(monkeypatch)
    assert cli.main(["--range", "0-4"]) == 0
    assert generated == [0, 1, 2, 3, 4]


def test_to_max_fallspeed_covers_full_range(monkeypatch) -> None:
    generated = _record_heights(monkeypatch)
    assert cli.main(["--to-max-fallspeed"]) == 0
    assert generated[0] == 0
    assert generated[-1] == MAX_FALLSPEED_HEIGHT
    assert len(generated) == MAX_FALLSPEED_HEIGHT + 1


def test_skip_existing_filters_generated(monkeypatch, tmp_path) -> None:
    generated = _record_heights(monkeypatch)
    # Pre-create outputs for heights 0-2 only.
    for h in range(3):
        p = setup_data_path(h, tmp_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(b"")
    assert cli.main(["--range", "0-4", "--data-root", str(tmp_path), "--skip-existing"]) == 0
    assert generated == [3, 4]


def test_skip_existing_all_present_is_noop(monkeypatch, tmp_path) -> None:
    generated = _record_heights(monkeypatch)
    for h in range(3):
        p = setup_data_path(h, tmp_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(b"")
    assert cli.main(["--range", "0-2", "--data-root", str(tmp_path), "--skip-existing"]) == 0
    assert generated == []
