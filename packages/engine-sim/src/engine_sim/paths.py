"""Output paths for generated setup data and precompute cache."""

from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_DATA_ROOT = Path(os.environ.get("BOUNCE_DATA_ROOT", REPO_ROOT / "data" / "generated"))
DEFAULT_PRECOMPUTE_ROOT = Path(
    os.environ.get("BOUNCE_PRECOMPUTE_ROOT", REPO_ROOT / "data" / "precompute")
)


def height_bucket(height: int) -> str:
    base = (height // 100) * 100
    return f"{base:03d}to{base + 99:03d}"


def setup_data_path(height: int, root: Path | None = None) -> Path:
    root = root or DEFAULT_DATA_ROOT
    return root / height_bucket(height) / f"{height}.bin.gz"


def precompute_path(height: int, root: Path | None = None) -> Path:
    root = root or DEFAULT_PRECOMPUTE_ROOT
    return root / height_bucket(height) / f"{height}.bin"
