#!/usr/bin/env bash
# Build installable Android debug APK for TF2 Bounce Checker.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
export PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}"

if [ ! -x "${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" ]; then
  echo "Android SDK not found. Run: bash scripts/setup-android-sdk.sh"
  exit 1
fi

cd "${ROOT}"
npm run build:packages
npm run android:icons
npm run android:apk -w @playground/web

APK="${ROOT}/apps/web/android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "${APK}" ]; then
  mkdir -p /opt/cursor/artifacts
  cp "${APK}" /opt/cursor/artifacts/bounce-check-debug.apk
  echo ""
  echo "APK ready:"
  echo "  ${APK}"
  echo "  /opt/cursor/artifacts/bounce-check-debug.apk"
  echo ""
  echo "Install on a connected device:"
  echo "  adb install -r \"${APK}\""
fi
