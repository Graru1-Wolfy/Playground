#!/usr/bin/env python3
"""Generate regression snapshots from scenario runners."""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from scenarios import SCENARIOS

SNAPSHOT_DIR = Path(__file__).resolve().parent.parent / "tests" / "snapshots"


def main() -> None:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    for name, run in SCENARIOS.items():
        result = run()
        path = SNAPSHOT_DIR / f"{name}.json"
        path.write_text(json.dumps(asdict(result), indent=2) + "\n")
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
