#!/usr/bin/env python3
"""Verify a generated height bucket and write manifest.json."""

from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path

from engine_sim.paths import setup_data_path
from engine_sim.setups import RECORD_SIZE, Setup


def verify_bucket(start: int, end: int, root: Path | None = None) -> dict:
    entries = []
    total_setups = 0
    for height in range(start, end + 1):
        path = setup_data_path(height, root)
        if not path.is_file():
            raise FileNotFoundError(path)
        raw = gzip.open(path, "rb").read()
        if len(raw) % RECORD_SIZE != 0:
            raise ValueError(f"{path}: size {len(raw)} not multiple of {RECORD_SIZE}")
        count = len(raw) // RECORD_SIZE
        Setup.unpack(raw, 0)
        size = path.stat().st_size
        entries.append({"height": height, "setups": count, "bytes": size})
        total_setups += count
    return {
        "range": [start, end],
        "heights": len(entries),
        "total_setups": total_setups,
        "total_bytes": sum(e["bytes"] for e in entries),
        "files": entries,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify generated bounce data bucket")
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--end", type=int, default=99)
    parser.add_argument("--root", type=Path, default=None)
    parser.add_argument("--manifest", type=Path, default=Path("data/generated/000to099/manifest.json"))
    args = parser.parse_args()
    report = verify_bucket(args.start, args.end, args.root)
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({k: report[k] for k in ("range", "heights", "total_setups", "total_bytes")}, indent=2))
    print("wrote", args.manifest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
