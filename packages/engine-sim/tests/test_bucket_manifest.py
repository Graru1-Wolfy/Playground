"""Verify generated data bucket using committed manifest."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from engine_sim.setups import RECORD_SIZE, Setup

REPO_ROOT = Path(__file__).resolve().parents[3]
MANIFEST = REPO_ROOT / "data" / "generated" / "000to099" / "manifest.json"


@pytest.mark.skipif(not MANIFEST.is_file(), reason="manifest not generated")
def test_manifest_matches_files() -> None:
    import gzip

    report = json.loads(MANIFEST.read_text())
    root = MANIFEST.parent
    assert report["heights"] == 100
    for entry in report["files"]:
        path = root / f"{entry['height']}.bin.gz"
        if not path.is_file():
            pytest.skip(f"{path.name} not present (data is gitignored)")
        raw = gzip.open(path, "rb").read()
        assert len(raw) // RECORD_SIZE == entry["setups"]
        Setup.unpack(raw, 0)
