#!/usr/bin/env bash
#
# Generate all bounce setup tables from height 0 up to max fall speed (terminal velocity).
#
# "Max fall speed" is reached at height 6999; heights above that repeat periodically and are
# remapped client-side (see apps/web/src/height.ts, `> 8000` modulo 105). Generating 0-6999
# therefore covers every distinct landing case.
#
# The run is RESUMABLE and safe to interrupt / re-run:
#   - heights whose .bin.gz already exists are skipped (`--skip-existing`), and
#   - the expensive phase-1 path enumeration is cached under data/precompute/.
#
# NOTE: a full 0-6999 first run is a multi-day compute job (~4 min/height single-threaded)
# and produces >1 GB of .bin.gz. The .bin.gz are git-ignored; only the per-bucket
# manifest.json files are committed (see .gitignore).
#
# Usage:
#   scripts/generate-all-heights.sh [START] [END] [WORKERS]
#
# Env overrides:
#   BOUNCE_DATA_ROOT        output root for data buckets (default: <repo>/data/generated)
#   BOUNCE_PRECOMPUTE_ROOT  phase-1 cache root          (default: <repo>/data/precompute)
#
set -euo pipefail

START="${1:-0}"
END="${2:-6999}"
WORKERS="${3:-$(nproc 2>/dev/null || echo 1)}"

cd "$(dirname "$0")/.."
REPO_ROOT="$PWD"
DATA_ROOT="${BOUNCE_DATA_ROOT:-$REPO_ROOT/data/generated}"

if (( START < 0 || END < START )); then
  echo "error: invalid range ${START}-${END}" >&2
  exit 1
fi

LOG="$REPO_ROOT/data/generation-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$LOG")"

echo "==> Generating heights ${START}-${END} with ${WORKERS} worker(s) (resumable)"
echo "    data root: ${DATA_ROOT}"
echo "    log:       ${LOG}"

python3 -m engine_sim.cli \
  --range "${START}-${END}" \
  --workers "${WORKERS}" \
  --skip-existing 2>&1 | tee -a "$LOG"

echo "==> Writing per-bucket manifests for complete buckets"
verify="$REPO_ROOT/packages/engine-sim/scripts/verify_bucket.py"
first_base=$(( (START / 100) * 100 ))
for (( base = first_base; base <= END; base += 100 )); do
  bstart=$base
  bend=$(( base + 99 ))
  (( bstart < START )) && bstart=$START
  (( bend > END )) && bend=$END
  bucket=$(printf "%03dto%03d" "$base" "$(( base + 99 ))")

  complete=1
  for (( h = bstart; h <= bend; h++ )); do
    if [[ ! -f "${DATA_ROOT}/${bucket}/${h}.bin.gz" ]]; then
      complete=0
      break
    fi
  done

  if (( complete )); then
    python3 "$verify" \
      --start "$bstart" --end "$bend" \
      --root "$DATA_ROOT" \
      --manifest "${DATA_ROOT}/${bucket}/manifest.json"
  else
    echo "   skipping incomplete bucket ${bucket}"
  fi
done

echo "==> Done. Heights ${START}-${END}."
