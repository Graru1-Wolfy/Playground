#!/usr/bin/env python3
"""Write small precomputed setup samples for web dev / screenshots."""

from pathlib import Path

from engine_sim.setups import Setup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps" / "web" / "public" / "sample-data"

PRESET_HEIGHTS = [32, 48, 64, 80, 96]


def make_setup(
    *,
    sid: int,
    launcher: int,
    rockets: int,
    speeds: list[float],
    bounce_flag: int = 0,
    standing_bounce_flag: int = 0,
    **flags: int,
) -> Setup:
    s = Setup()
    s.ID = sid
    s.launcher = launcher
    s.num_rockets = rockets
    s.bounce_flag = bounce_flag
    s.standing_bounce_flag = standing_bounce_flag
    s.speeds = speeds
    for key, val in flags.items():
        setattr(s, key, val)
    return s


def scale_speeds(speeds: list[float], height: int) -> list[float]:
    """Scale rocket speeds slightly per height so presets are not identical copies."""
    factor = 1.0 + (height - 64) * 0.004
    return [speed if not (speed == speed) else speed * factor for speed in speeds]


BASE_SETUPS = [
    dict(sid=100001, launcher=0, rockets=1, speeds=[float("nan"), 1240.0], bounce_flag=3, BOUNCE=128, SIMPLE=90, ABOUNCE=64, STOCK=128),
    dict(sid=100002, launcher=0, rockets=2, speeds=[float("nan"), 1180.0, 980.0], bounce_flag=1, BOUNCE=128, BHOP=64, SIMPLE=85, STOCK=128),
    dict(sid=100003, launcher=1, rockets=1, speeds=[float("nan"), 1310.0], bounce_flag=5, BOUNCE=128, FABOUNCE=80, SIMPLE=70, ORIG=128),
    dict(sid=100004, launcher=2, rockets=1, speeds=[float("nan"), 1150.0], bounce_flag=9, standing_bounce_flag=8, BOUNCE=128, STANDBOUNCE=64, MANG=128, SIMPLE=75),
    dict(sid=100005, launcher=0, rockets=3, speeds=[float("nan"), 1100.0, 920.0, 780.0], bounce_flag=17, BOUNCE=128, SBOUNCE=64, SIMPLE=60, STOCK=128),
    dict(sid=100006, launcher=0, rockets=1, speeds=[float("nan"), 1285.0], bounce_flag=1, JB=128, SIMPLE=88, STOCK=128),
    dict(sid=100007, launcher=0, rockets=2, speeds=[float("nan"), 1050.0, 890.0], bounce_flag=10, standing_bounce_flag=2, BOUNCE=128, ASTANDBOUNCE=64, FASTANDBOUNCE=40, STOCK=128),
    dict(sid=100008, launcher=1, rockets=2, speeds=[float("nan"), 1200.0, 1010.0], bounce_flag=18, BOUNCE=128, ASBOUNCE=32, ORIG=128, SIMPLE=82),
    dict(sid=100009, launcher=0, rockets=1, speeds=[float("nan"), 990.0], bounce_flag=1, BOUNCE=128, NOMOVEMENTBIND=64, NOACTIONBIND=32, STOCK=128),
    dict(sid=100010, launcher=2, rockets=2, speeds=[float("nan"), 1080.0, 940.0], bounce_flag=3, BOUNCE=128, PB=64, MANG=128, SIMPLE=78),
    dict(sid=100011, launcher=0, rockets=1, speeds=[float("nan"), 1420.0], bounce_flag=1, BOUNCE=128, CTAP_JDS=64, SIMPLE=55, STOCK=128),
    dict(sid=100012, launcher=0, rockets=2, speeds=[float("nan"), 990.0, 850.0], bounce_flag=7, BOUNCE=128, FASBOUNCE=48, STOCK=128, SIMPLE=80),
    dict(sid=100013, launcher=1, rockets=1, speeds=[float("nan"), 1175.0], bounce_flag=1, standing_bounce_flag=1, BOUNCE=128, SSTANDBOUNCE=64, ORIG=128),
    dict(sid=100014, launcher=0, rockets=3, speeds=[float("nan"), 1020.0, 880.0, 760.0], bounce_flag=1, BOUNCE=128, SPB=32, STOCK=128, SIMPLE=65),
    dict(sid=100015, launcher=0, rockets=1, speeds=[float("nan"), 1340.0], bounce_flag=3, BOUNCE=128, JS=64, HEIGHT=40, STOCK=128),
    dict(sid=100016, launcher=2, rockets=1, speeds=[float("nan"), 1210.0], bounce_flag=1, BOUNCE=128, JBPB=48, MANG=128, SIMPLE=72),
    dict(sid=100017, launcher=0, rockets=2, speeds=[float("nan"), 1125.0, 960.0], bounce_flag=1, BOUNCE=128, DIAGONAL=32, STOCK=128, SIMPLE=84),
    dict(sid=100018, launcher=0, rockets=1, speeds=[float("nan"), 1088.0], bounce_flag=3, BOUNCE=128, CROUCHED=64, STOCK=128, SIMPLE=86),
    dict(sid=100019, launcher=1, rockets=3, speeds=[float("nan"), 1005.0, 870.0, 740.0], bounce_flag=1, BOUNCE=128, ONEROCKET=64, ORIG=128),
    dict(sid=100020, launcher=0, rockets=2, speeds=[float("nan"), 1160.0, 995.0], bounce_flag=5, BOUNCE=128, QUICK=48, SPEED=32, STOCK=128),
]


def setups_for_height(height: int) -> list[Setup]:
    setups: list[Setup] = []
    for index, spec in enumerate(BASE_SETUPS):
        kwargs = dict(spec)
        sid = height * 1000 + index + 1
        kwargs["sid"] = sid
        kwargs["speeds"] = scale_speeds(spec["speeds"], height)
        setups.append(make_setup(**kwargs))
    return setups


def main() -> None:
    for height in PRESET_HEIGHTS:
        setups = setups_for_height(height)
        bucket = f"{height // 100 * 100:03d}to{height // 100 * 100 + 99:03d}"
        dest_dir = OUT / bucket
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / f"{height}.bin"
        raw = b"".join(setup.pack() for setup in setups)
        dest.write_bytes(raw)
        print(f"wrote {dest} ({len(setups)} setups, {len(raw)} bytes)")


if __name__ == "__main__":
    main()
