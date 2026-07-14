#!/usr/bin/env python3
"""Generate precomputed bounce setup tables from simulation."""

from __future__ import annotations

import argparse
from concurrent.futures import ProcessPoolExecutor

from engine_sim.generate_setups import find_bounce_setups_for_height
from engine_sim.paths import DEFAULT_DATA_ROOT, DEFAULT_PRECOMPUTE_ROOT, setup_data_path

# Height at which a fall from rest first reaches max fall speed (terminal velocity).
# Max fall speed is the Source vertical-velocity clamp sv_maxvelocity = 3500 u/s
# (tf2sim.max_vel). Under sv_gravity = 800 (12 u/s per 0.015 s tick) the clamp is first
# hit at tick 292 after dropping ~7673.8 u. Heights above this land at max fall speed and
# repeat periodically, so generating 0..MAX_FALLSPEED_HEIGHT covers every distinct landing
# case. Cross-checked against tf2sim physics in tests/test_cli_range.py.
MAX_FALLSPEED_HEIGHT = 7674


def _generate_height(args: tuple[int, str, str]) -> None:
    """Module-level worker for ProcessPoolExecutor (must be picklable)."""
    height, data_root_s, precompute_root_s = args
    find_bounce_setups_for_height(
        float(height),
        data_root=type(DEFAULT_DATA_ROOT)(data_root_s),
        precompute_root=type(DEFAULT_PRECOMPUTE_ROOT)(precompute_root_s),
    )


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
        "--to-max-fallspeed",
        action="store_true",
        help=(
            "Generate all heights up to max fall speed (0-%d), overriding "
            "--height/--range" % MAX_FALLSPEED_HEIGHT
        ),
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip heights whose output .bin.gz already exists (resumable runs)",
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

    if args.to_max_fallspeed:
        start, end = 0, MAX_FALLSPEED_HEIGHT
    elif args.height is not None:
        start = end = args.height
    else:
        start, end = _parse_range(args.range)

    heights = list(range(start, end + 1))
    if not heights:
        parser.error("empty height range")

    if args.skip_existing:
        pending = [h for h in heights if not setup_data_path(h, args.data_root).is_file()]
        skipped = len(heights) - len(pending)
        if skipped:
            print(f"Skipping {skipped} already-generated height(s)")
        heights = pending
        if not heights:
            print("All heights in range already generated; nothing to do.")
            return 0

    data_root_s = str(args.data_root)
    precompute_root_s = str(args.precompute_root)

    if args.workers <= 1 or len(heights) == 1:
        for h in heights:
            _generate_height((h, data_root_s, precompute_root_s))
    else:
        jobs = [(h, data_root_s, precompute_root_s) for h in heights]
        with ProcessPoolExecutor(max_workers=args.workers) as pool:
            list(pool.map(_generate_height, jobs))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
