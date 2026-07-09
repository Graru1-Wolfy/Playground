#!/usr/bin/env bash
# Install Android SDK command-line tools for building Capacitor debug APKs.
set -euo pipefail

ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
CMDLINE_VERSION="11076708"
ARCHIVE="commandlinetools-linux-${CMDLINE_VERSION}_latest.zip"
URL="https://dl.google.com/android/repository/${ARCHIVE}"

if [ -x "${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" ]; then
  echo "Android SDK already installed at ${ANDROID_HOME}"
  exit 0
fi

echo "Installing Android SDK to ${ANDROID_HOME}..."
sudo mkdir -p "${ANDROID_HOME}/cmdline-tools"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

curl -fsSL "${URL}" -o "${tmp}/${ARCHIVE}"
unzip -q "${tmp}/${ARCHIVE}" -d "${tmp}/cmdline-tools"
sudo mv "${tmp}/cmdline-tools/cmdline-tools" "${ANDROID_HOME}/cmdline-tools/latest"
sudo chown -R "$(whoami)" "${ANDROID_HOME}"

export ANDROID_HOME
export PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}"

yes | sdkmanager --licenses >/dev/null || true
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"

echo "export ANDROID_HOME=${ANDROID_HOME}" | sudo tee /etc/profile.d/android-sdk.sh >/dev/null
echo "Android SDK ready."
