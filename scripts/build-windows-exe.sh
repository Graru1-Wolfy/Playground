#!/usr/bin/env bash
# Build portable Windows .exe for TF2 Bounce Checker (Electron).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GRADLE="${ROOT}/apps/web/android/app/build.gradle"
OUT_DIR="/opt/cursor/artifacts"

read_app_version() {
  local version_name
  version_name="$(grep 'versionName "' "${GRADLE}" | head -1 | sed 's/.*versionName "\([^"]*\)".*/\1/')"
  echo "${version_name}"
}

VERSION="$(read_app_version)"

cd "${ROOT}"
npm run build:packages
npm run android:icons

if command -v python3 >/dev/null 2>&1; then
  PYTHONPATH="${ROOT}/packages/engine-sim/src" python3 "${ROOT}/scripts/write-web-sample-data.py" || true
fi

npm run build:electron -w @playground/web
npm run electron:pack -w @playground/web -- --config.extraMetadata.version="${VERSION}"

EXE="${ROOT}/apps/web/release/bounce-check-v${VERSION}.exe"
if [[ -f "${EXE}" ]]; then
  mkdir -p "${OUT_DIR}"
  cp "${EXE}" "${OUT_DIR}/bounce-check-v${VERSION}.exe"
  echo ""
  echo "Windows portable EXE ready (v${VERSION}):"
  echo "  ${EXE}"
  echo "  ${OUT_DIR}/bounce-check-v${VERSION}.exe"
fi
