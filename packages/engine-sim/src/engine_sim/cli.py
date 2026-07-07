#!/usr/bin/env python3
"""Generate precomputed bounce setup tables from simulation."""

from __future__ import annotations

import argparse
from concurrent.futures import ProcessPoolExecutor

from engine_sim.generate_setups import find_bounce_setups_for_height
from engine_sim.paths import DEFAULT_DATA_ROOT, DEFAULT_PRECOMPUTE_ROOT


def _parse_range(text: str) -> tuple[int, int]:
    if ":" in text:
        start_s, end_s = text.split(":", 1)
        return int(start_s), int(end_s)
    if "-" in text:
        start_s, end_s = text.split("-", 1)
        return int(start_s), int(end_s)
    h = int(text)
    return h, h


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate bounce setup .bin.gz tables")
    parser.add_argument(
        "--height",
        type=int,
        help="Single height to generate",
    )
    parser.add_argument(
        "--range",
        type=str,
        default="0-99",
        help="Height range inclusive, e.g. 0-99 or 100:199",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Parallel worker processes (ProcessPoolExecutor)",
    )
    parser.add_argument(
        "--data-root",
        type=type(DEFAULT_DATA_ROOT),
        default=DEFAULT_DATA_ROOT,
        help="Output root for data/generated buckets",
    )
    parser.add_argument(
        "--precompute-root",
        type=type(DEFAULT_PRECOMPUTE_ROOT),
        default=DEFAULT_PRECOMPUTE_ROOT,
        help="Cache root for path-id precompute files",
    )
    args = parser.parse_args(argv)

    if args.height is not None:
        start = end = args.height
    else:
        start, end = _parse_range(args.range)

    heights = list(range(start, end + 1))
    if not heights:
        parser.error("empty height range")

    def run(height: int) -> None:
        find_bounce_setups_for_height(
            float(height),
            data_root=args.data_root,
            precompute_root=args.precompute_root,
        )

    if args.workers <= 1 or len(heights) == 1:
        for h in heights:
            run(h)
    else:
        with ProcessPoolExecutor(max_workers=args.workers) as pool:
            list(pool.map(run, heights))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
