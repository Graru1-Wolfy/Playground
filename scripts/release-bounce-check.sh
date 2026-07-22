#!/usr/bin/env bash
# Build APK + portable EXE and publish a GitHub release with both assets.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GRADLE="${ROOT}/apps/web/android/app/build.gradle"

read_app_version() {
  grep 'versionName "' "${GRADLE}" | head -1 | sed 's/.*versionName "\([^"]*\)".*/\1/'
}

VERSION="$(read_app_version)"
TAG="bounce-check-v${VERSION}"
APK="/opt/cursor/artifacts/bounce-check-v${VERSION}.apk"
EXE="/opt/cursor/artifacts/bounce-check-v${VERSION}.exe"

cd "${ROOT}"

echo "Building Bounce Check v${VERSION} (APK + EXE)…"
npm run build:android
npm run build:windows

if [[ ! -f "${APK}" ]]; then
  echo "Missing APK: ${APK}" >&2
  exit 1
fi
if [[ ! -f "${EXE}" ]]; then
  echo "Missing EXE: ${EXE}" >&2
  exit 1
fi

NOTES_FILE="$(mktemp)"
cat > "${NOTES_FILE}" <<EOF
## Bounce Check v${VERSION}

### Downloads
- **Windows:** \`bounce-check-v${VERSION}.exe\` — portable Electron app (no install)
- **Android:** \`bounce-check-v${VERSION}.apk\` — sideload or install via adb

Both builds bundle sample setups offline (heights 32–96).
EOF

if git rev-parse "${TAG}" >/dev/null 2>&1; then
  echo "Tag ${TAG} exists — updating release assets"
  gh release upload "${TAG}" "${APK}" "${EXE}" --clobber
else
  echo "Creating tag ${TAG} and release"
  git tag "${TAG}"
  git push origin "${TAG}"
  gh release create "${TAG}" \
    --title "Bounce Check v${VERSION}" \
    --notes-file "${NOTES_FILE}" \
    "${APK}" \
    "${EXE}"
fi

rm -f "${NOTES_FILE}"

echo ""
echo "Release ready: https://github.com/Graru1-Wolfy/Playground/releases/tag/${TAG}"
echo "  ${APK}"
echo "  ${EXE}"
