#!/usr/bin/env bash
set -euo pipefail

HEIGHT_RANGE="${1:-${HEIGHT_RANGE:-0-99}}"
WORKERS="${WORKERS:-2}"
MAX_HEIGHTS="${MAX_HEIGHTS:-100}"
PUBLISH_RELEASE="${PUBLISH_RELEASE:-false}"
OUT_DIR="${OUT_DIR:-artifacts/generated-setups}"
DATA_ROOT="${DATA_ROOT:-data/generated}"
PRECOMPUTE_ROOT="${PRECOMPUTE_ROOT:-data/precompute}"

usage() {
  cat <<'EOF'
Generate ranked simulation setup data locally.

Usage:
  npm run generate:ranked-setups -- 64
  npm run generate:ranked-setups -- 0-99

Environment:
  WORKERS=2                 Parallel engine-sim workers
  MAX_HEIGHTS=100           Safety limit for requested height count
  OUT_DIR=artifacts/generated-setups
  DATA_ROOT=data/generated
  PRECOMPUTE_ROOT=data/precompute
  PUBLISH_RELEASE=false     Local runner cannot publish release assets
  SKIP_INSTALL=false         Set true to skip editable Python package install

Output:
  <OUT_DIR>/ranked-simulation-setups-<start>to<end>.tar.gz
EOF
}

if [[ "${HEIGHT_RANGE}" == "-h" || "${HEIGHT_RANGE}" == "--help" ]]; then
  usage
  exit 0
fi

if ! [[ "${HEIGHT_RANGE}" =~ ^[0-9]+([:-][0-9]+)?$ ]]; then
  echo "height range must be a number or inclusive range like 64, 0-99, or 100:199" >&2
  exit 1
fi
if ! [[ "${WORKERS}" =~ ^[0-9]+$ ]] || [[ "${WORKERS}" -lt 1 ]]; then
  echo "WORKERS must be a positive integer" >&2
  exit 1
fi
if ! [[ "${MAX_HEIGHTS}" =~ ^[0-9]+$ ]] || [[ "${MAX_HEIGHTS}" -lt 1 ]]; then
  echo "MAX_HEIGHTS must be a positive integer" >&2
  exit 1
fi
if [[ "${PUBLISH_RELEASE}" == "true" ]]; then
  echo "Local generation does not publish releases. Upload the generated archive manually if a release asset is needed." >&2
  exit 1
fi

NORMALIZED="${HEIGHT_RANGE/:/-}"
if [[ "${NORMALIZED}" == *-* ]]; then
  START="${NORMALIZED%-*}"
  END="${NORMALIZED#*-}"
else
  START="${NORMALIZED}"
  END="${NORMALIZED}"
fi

if [[ "${END}" -lt "${START}" ]]; then
  echo "height range end must be >= start" >&2
  exit 1
fi

COUNT=$((END - START + 1))
if [[ "${COUNT}" -gt "${MAX_HEIGHTS}" ]]; then
  echo "requested ${COUNT} heights, above MAX_HEIGHTS=${MAX_HEIGHTS}" >&2
  exit 1
fi

RANGE_SLUG="${START}to${END}"
ARCHIVE_NAME="ranked-simulation-setups-${RANGE_SLUG}.tar.gz"
ARCHIVE_PATH="${OUT_DIR}/${ARCHIVE_NAME}"

ENGINE_SIM_CMD=(python3 -m engine_sim.cli)

if ! python3 -c "import engine_sim.cli" >/dev/null 2>&1; then
  if [[ "${SKIP_INSTALL:-false}" == "true" ]]; then
    echo "engine_sim is not importable and SKIP_INSTALL=true" >&2
    exit 1
  fi
  echo "Installing local Python generators..."
  python3 -m pip install -e packages/tf2sim
  python3 -m pip install -e packages/engine-sim
fi

mkdir -p "${OUT_DIR}" "${DATA_ROOT}" "${PRECOMPUTE_ROOT}"

echo "Generating ranked simulation setup data for ${COUNT} height(s): ${START}-${END}"
"${ENGINE_SIM_CMD[@]}" \
  --range "${HEIGHT_RANGE}" \
  --workers "${WORKERS}" \
  --data-root "${DATA_ROOT}" \
  --precompute-root "${PRECOMPUTE_ROOT}"

echo "Packaging ${DATA_ROOT} into ${ARCHIVE_PATH}"
tar -czf "${ARCHIVE_PATH}" -C "$(dirname "${DATA_ROOT}")" "$(basename "${DATA_ROOT}")"

echo "Done: ${ARCHIVE_PATH}"
