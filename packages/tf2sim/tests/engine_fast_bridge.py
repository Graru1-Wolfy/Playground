"""Call built engine-fast from Python for golden comparisons."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

ENGINE_FAST_ROOT = Path(__file__).resolve().parents[2] / "engine-fast"
ENGINE_FAST_DIST = ENGINE_FAST_ROOT / "dist" / "index.js"


def engine_fast_available() -> bool:
    return shutil.which("node") is not None and ENGINE_FAST_DIST.is_file()


def engine_fast_check_bounce(
    height: float,
    bounce: dict,
    land: int,
    teleheight: float = 1.0,
) -> int:
    if not engine_fast_available():
        raise RuntimeError("engine-fast is not built; run: cd packages/engine-fast && npm install && npm run build")

    bounce_json = json.dumps(bounce)
    script = f"""
import {{ checkBounce }} from {json.dumps(ENGINE_FAST_DIST.as_posix())};
const result = checkBounce({height}, {bounce_json}, {land}, {teleheight});
console.log(result);
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        check=True,
        capture_output=True,
        text=True,
    )
    return int(proc.stdout.strip())
