#!/usr/bin/env bash
# Build signed Android release APK for TF2 Bounce Checker.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GRADLE="${ROOT}/apps/web/android/app/build.gradle"
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
export PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}"
VARIANT="${1:-release}"

read_apk_version() {
  local version_name
  version_name="$(grep 'versionName "' "${GRADLE}" | head -1 | sed 's/.*versionName "\([^"]*\)".*/\1/')"
  echo "${version_name}"
}

if [ ! -x "${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" ]; then
  echo "Android SDK not found. Run: bash scripts/setup-android-sdk.sh"
  exit 1
fi

if [ ! -f "${ROOT}/apps/web/android/keystore.properties" ]; then
  echo "Missing apps/web/android/keystore.properties"
  exit 1
fi

VERSION="$(read_apk_version)"

cd "${ROOT}"
npm run build:packages
npm run android:icons

if [ "${VARIANT}" = "debug" ]; then
  npm run android:apk -w @playground/web
  APK="${ROOT}/apps/web/android/app/build/outputs/apk/debug/app-debug.apk"
  OUT="/opt/cursor/artifacts/bounce-check-debug.apk"
else
  npm run android:apk:release -w @playground/web
  APK="${ROOT}/apps/web/android/app/build/outputs/apk/release/app-release.apk"
  OUT="/opt/cursor/artifacts/bounce-check-v${VERSION}.apk"
fi

if [ -f "${APK}" ]; then
  mkdir -p /opt/cursor/artifacts
  cp "${APK}" "${OUT}"
  echo ""
  echo "APK ready (v${VERSION}):"
  echo "  ${APK}"
  echo "  ${OUT}"
  echo ""
  echo "Install on a connected device:"
  echo "  adb install -r \"${APK}\""
fi
