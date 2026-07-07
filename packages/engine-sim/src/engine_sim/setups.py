"""92-byte setup binary schema and preference metadata (ported from Fancy-BCheck)."""

from __future__ import annotations

import gzip
import json
import math
import struct
from pathlib import Path

from engine_sim.paths import setup_data_path

# Fixed typo: CONIST → CONSIST, STANDBBOUNCE → STANDBOUNCE (binary field order unchanged)
DATA = {
    "Launcher": [
        "Stock", 0, "STOCK", "Uses the stock rocket launcher.",
        "Original", 0, "ORIG", "Uses the original rocket launcher.",
        "Mangler", 0, "MANG", "Uses the cow mangler rocket launcher.",
    ],
    "Type of bounce": [
        "Bounce", 0, "BOUNCE", "Crouched bounce setup.",
        "Bhop", 0, "BHOP", "Bhop (bounce hop) setup.",
        "Jumpbug", 0, "JB", "Jumpbug setup.",
    ],
    "Complexity": [
        "Simple", 65, "SIMPLE", "Simple setups.",
        "Consistency", 0, "CONSIST", "Consistent setups.",
        "No movement bind required", 0, "NOMOVEMENTBIND", "WASD-only movement.",
        "No action bind required", 0, "NOACTIONBIND", "Jump or fire only.",
    ],
    "Automatic bounce": [
        "Auto bounce", 10, "ABOUNCE", "Bounce by holding m1.",
        "Auto synced bounce", 0, "ASBOUNCE", "Synced bounce holding m1.",
        "Auto standing bounce", 10, "ASTANDBOUNCE", "Standing bounce holding m1.",
        "Auto synced standing bounce", 0, "ASSTANDBOUNCE", "Synced standing bounce holding m1.",
    ],
    "Fully automatic bounce": [
        "Fully auto bounce", 30, "FABOUNCE", "Fully auto bounce looking down.",
        "Fully auto synced bounce", 10, "FASBOUNCE", "Fully auto synced bounce.",
        "Fully auto standing bounce", 20, "FASTANDBOUNCE", "Fully auto standing bounce.",
        "Auto synced standing bounce", 0, "FASSTANDBOUNCE", "Fully auto synced standing bounce.",
    ],
    "Trajectory": [
        "Height", 0, "HEIGHT", "Peak feet height.",
        "Distance", 0, "DIST", "Horizontal distance.",
        "Speed", 0, "SPEED", "Horizontal speed leaving platform.",
        "Compact", 0, "COMPACT", "Distance on initial platform.",
        "Quick", 0, "QUICK", "Time to bounce.",
    ],
    "Advanced bounce": [
        "Standing bounce", 0, "STANDBOUNCE", "Standing bounce window.",
        "Power bounce", 0, "PB", "Power bounce.",
        "Jumpbug power bounce", 0, "JBPB", "Jumpbug power bounce.",
        "Synced bounce", 0, "SBOUNCE", "Synced bounce.",
        "Synced powerbounce", 0, "SPB", "Synced power bounce.",
        "Synced jumpbug powerbounce", 0, "SJBPB", "Synced jumpbug power bounce.",
        "Synced standing bounce", 0, "SSTANDBOUNCE", "Synced standing bounce.",
    ],
    "Movement": [
        "Crouched start", 0, "CROUCHED", "Crouched start.",
        "Non-moving starts", 0, "NOMOVING", "No movement keys.",
        "Diagonal movement", 0, "DIAGONAL", "Diagonal movement.",
        "+moveup", 0, "MOVEUP", "+moveup setups.",
        "+strafe", 0, "STRAFE", "+strafe setups.",
    ],
    "Action": [
        "Quickswap", 0, "SHOTGUN", "Quickswap start.",
        "0 rocket setup", 0, "ZEROROCKET", "No rockets in initial action.",
        "1 rocket setup", 0, "ONEROCKET", "Exactly 1 rocket.",
        "2-3 rocket setup", 0, "TWOTHREEROCKETS", "2 or 3 rockets.",
        "Jump shoot", 0, "JS", "Jump shot start.",
        "Jump duck shoot", 0, "JDS", "Jump duck shot start.",
        "Ctap jump duck shoot", 0, "CTAP_JDS", "CTAP JDS start.",
        "Shoot 1 tick early", -1000, "ONETICK", "CTAP JDS 1 tick early.",
        "Shoot 2 ticks early", -1000, "TWOTICK", "CTAP JDS 2 ticks early.",
    ],
}

RECORD_SIZE = 92

preferences: list[dict] = []
item_ids: list[str] = []
for group_name in DATA:
    items = DATA[group_name]
    num_items = len(items) // 4
    group_items: list[dict] = []
    for i in range(num_items):
        item_name, item_default_weight, item_id, item_description = items[4 * i : 4 * i + 4]
        group_items.append(
            {
                "id": item_id,
                "label": item_name,
                "defaultWeight": item_default_weight,
                "description": item_description,
            }
        )
        item_ids.append(item_id)
    preferences.append({"name": group_name, "preferences": group_items})

preferences_json = {"groups": preferences}

# Alias for JS decoder compatibility with legacy Fancy-BCheck property names
LEGACY_FLAG_ALIASES = {"CONSIST": "CONIST", "STANDBOUNCE": "STANDBBOUNCE"}


class Setup:
    my_hash: tuple = ()

    ID = -1
    launcher = -1
    start_moving = -1
    start_action = -1
    num_rockets = -1
    tick_delay_auto_bounce = -1
    tick_delay_auto_synced_bounce = -1
    tick_delay_auto_standing_bounce = -1
    tick_delay_auto_synced_standing_bounce = -1
    bounce_flag = 0
    standing_bounce_flag = 0
    rocket_fired_crouched_flag = 0
    rocket_hit_crouched_flag = 0

    def __init__(self) -> None:
        self.speeds: list[float] = []
        for item_id in item_ids:
            self.__dict__[item_id] = 0

    def pack(self) -> bytes:
        while len(self.speeds) < 7:
            self.speeds.append(float("nan"))
        assert len(self.speeds) == 7

        mask8 = 2**8 - 1
        mask32 = 2**32 - 1
        mask64 = 2**64 - 1

        data: list[int] = [
            self.ID & mask64,
            self.launcher & mask8,
            self.start_moving & mask8,
            self.start_action & mask8,
            self.num_rockets & mask8,
            self.tick_delay_auto_bounce & mask8,
            self.tick_delay_auto_synced_bounce & mask8,
            self.tick_delay_auto_standing_bounce & mask8,
            self.tick_delay_auto_synced_standing_bounce & mask8,
            self.bounce_flag & mask8,
            self.standing_bounce_flag & mask8,
            self.rocket_fired_crouched_flag & mask8,
            self.rocket_hit_crouched_flag & mask8,
        ]
        data += [self.__dict__[item_id] & mask8 for item_id in item_ids]
        data += [round(100 * v) & mask32 if not math.isnan(v) else 0 for v in self.speeds]

        record = struct.pack(f"<Q{12 + len(item_ids)}B7I", *data)
        assert len(record) == RECORD_SIZE
        return record

    @classmethod
    def unpack(cls, record: bytes, offset: int = 0) -> Setup:
        if len(record) - offset < RECORD_SIZE:
            raise ValueError("record too short")
        chunk = record[offset : offset + RECORD_SIZE]
        fmt = f"<Q{12 + len(item_ids)}B7I"
        values = struct.unpack(fmt, chunk)
        setup = cls()
        setup.ID = values[0]
        setup.launcher = values[1]
        setup.start_moving = values[2]
        setup.start_action = values[3]
        setup.num_rockets = values[4]
        setup.tick_delay_auto_bounce = values[5]
        setup.tick_delay_auto_synced_bounce = values[6]
        setup.tick_delay_auto_standing_bounce = values[7]
        setup.tick_delay_auto_synced_standing_bounce = values[8]
        setup.bounce_flag = values[9]
        setup.standing_bounce_flag = values[10]
        setup.rocket_fired_crouched_flag = values[11]
        setup.rocket_hit_crouched_flag = values[12]
        base = 13
        for i, item_id in enumerate(item_ids):
            setup.__dict__[item_id] = values[base + i]
        speed_base = base + len(item_ids)
        setup.speeds = []
        for i in range(7):
            raw = values[speed_base + i]
            setup.speeds.append(raw / 100.0 if raw else float("nan"))
        setup.speeds = setup.speeds[: setup.num_rockets + 1]
        return setup


def export_setups(setups: list[Setup], height: int, root: Path | None = None) -> Path:
    file_path = setup_data_path(height, root)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(file_path, "wb") as f:
        for setup in setups:
            f.write(setup.pack())
    return file_path


def load_setups(height: int, root: Path | None = None) -> list[Setup]:
    file_path = setup_data_path(height, root)
    setups: list[Setup] = []
    with gzip.open(file_path, "rb") as f:
        data = f.read()
    for offset in range(0, len(data), RECORD_SIZE):
        setups.append(Setup.unpack(data, offset))
    return setups


if __name__ == "__main__":
    print(json.dumps(preferences_json, indent=2))
