#!/usr/bin/env bash
# Setup Termux:X11, Cursor Agent CLI, and Android shared-storage file access.
#
# Prerequisites:
#   - Termux from F-Droid (not the outdated Play Store build)
#     https://f-droid.org/en/packages/com.termux/
#   - Install Termux:API from F-Droid if auto-install fails:
#     https://f-droid.org/packages/com.termux.api/
#   - Grant "Install unknown apps" to Termux when prompted (for APK installs)
#   - Android 7+ required for x11-repo / Termux:X11 packages
#   - Allow Termux and Termux:X11 notifications (Android 13+)
#
# The script auto-installs any missing packages, companion APKs, Cursor Agent,
# storage symlinks, and launcher scripts. Safe to re-run.
#
# Usage (inside Termux) — one-liner (no GitHub token; repo is public):
#   curl -fsSL "https://raw.githubusercontent.com/Graru1-Wolfy/Playground/main/scripts/setup-termux-x11-cursor.sh" | bash
# If you see old errors, bust cache: append ?v=$(date +%s) to the URL above
# Verify latest: curl -fsSL ".../setup-termux-x11-cursor.sh" | grep SETUP_SCRIPT_VERSION
# Quick repair only: repair-cursor-agent
# Options:
#   --skip-x11        Skip X11 / desktop packages
#   --skip-cursor     Skip Cursor Agent CLI install
#   --skip-storage    Skip storage permission prompt
#   --force-cursor    Reinstall Cursor Agent even if present
#   --verbose         Show all "already installed" status lines
#   --desktop=xfce    Desktop environment for X11 (default: xfce; use "none" to skip DE)
#   --workspace=PATH  Dev workspace directory (default: ~/workspace)
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
CACHE_DIR="${HOME}/.cache/${SCRIPT_NAME}"
WORKSPACE_DIR="${HOME}/workspace"
INSTALL_X11=1
INSTALL_CURSOR=1
SETUP_STORAGE=1
FORCE_CURSOR=0
REPAIR_CURSOR_ONLY=0
QUIET_OK=1
DESKTOP_ENV="xfce"
TERMUX_X11_DISPLAY=":0"
TERMUX_X11_LEGACY_DRAWING=0
TERMUX_X11_FORCE_BGRA=0

TERMUX_API_APK_URL="https://github.com/termux/termux-api/releases/download/v0.53.0/termux-api-app_v0.53.0+github.debug.apk"
TERMUX_X11_RELEASE_API="https://api.github.com/repos/termux/termux-x11/releases/tags/nightly"
X11_LAUNCHER_VERSION="4"
SETUP_SCRIPT_VERSION="12"
CURSOR_GLIBC_NODE_VERSION="24.17.0"
CURSOR_GLIBC_RUNTIME_VERSION="3"
CURSOR_LAUNCHER_VERSION="4"

log()  { printf '\033[0;34m▸\033[0m %s\n' "$*"; }
ok()   { printf '\033[0;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[0;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

ok_maybe() {
  if [[ "${QUIET_OK}" -eq 0 ]]; then
    ok "$@"
  fi
}

ensure_pkg_mirror() {
  local chosen="${PREFIX}/etc/termux/chosen_mirrors"
  local default="${PREFIX}/etc/termux/mirrors/default"

  if [[ -e "$chosen" || ! -f "$default" ]]; then
    return 0
  fi

  ln -sf "$default" "$chosen"
  ok "Selected default pkg mirror group (silences termux-change-repo hint)."
}

usage() {
  sed -n '3,18p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

parse_args() {
  for arg in "$@"; do
    case "$arg" in
      -h|--help) usage ;;
      --skip-x11) INSTALL_X11=0 ;;
      --skip-cursor) INSTALL_CURSOR=0 ;;
      --skip-storage) SETUP_STORAGE=0 ;;
      --force-cursor) FORCE_CURSOR=1 ;;
      --repair-cursor-only) REPAIR_CURSOR_ONLY=1; INSTALL_X11=0; SETUP_STORAGE=0 ;;
      --verbose) QUIET_OK=0 ;;
      --legacy-drawing) TERMUX_X11_LEGACY_DRAWING=1 ;;
      --force-bgra) TERMUX_X11_FORCE_BGRA=1 ;;
      --desktop=*) DESKTOP_ENV="${arg#*=}" ;;
      --workspace=*) WORKSPACE_DIR="${arg#*=}" ;;
      --display=*) TERMUX_X11_DISPLAY="${arg#*=}" ;;
      *) die "Unknown option: $arg (try --help)" ;;
    esac
  done

  case "${WORKSPACE_DIR}" in
    "~"/*) WORKSPACE_DIR="${HOME}/${WORKSPACE_DIR#\~/}" ;;
    "~") WORKSPACE_DIR="${HOME}" ;;
  esac
}

require_termux() {
  if [[ -z "${PREFIX:-}" ]] || [[ ! -d "${PREFIX}/bin" ]]; then
    die "This script must be run inside Termux (PREFIX not set)."
  fi
  if ! command -v pkg >/dev/null 2>&1; then
    die "Termux package manager (pkg) not found."
  fi
}

apk_installed() {
  local package_id="$1"

  # Reliable on Android 11+ when pm/cmd package queries are restricted.
  if [[ -d "/data/data/${package_id}" ]] || [[ -d "/data/user/0/${package_id}" ]]; then
    return 0
  fi

  if pm path "$package_id" >/dev/null 2>&1; then
    return 0
  fi

  if pm list packages "$package_id" 2>/dev/null | grep -qF "package:${package_id}"; then
    return 0
  fi

  if cmd_exists cmd; then
    cmd package list packages "$package_id" 2>/dev/null | grep -qF "package:${package_id}" && return 0
  fi

  return 1
}

termux_api_pkg_installed() {
  pkg_installed termux-api && return 0
  [[ -x "${PREFIX}/libexec/termux-api" ]] && return 0
  cmd_exists termux-wake-lock && return 0
  return 1
}

termux_api_app_installed() {
  apk_installed "com.termux.api"
}

termux_api_ready() {
  termux_api_pkg_installed && termux_api_app_installed
}

termux_api_latest_apk_url() {
  if cmd_exists jq && cmd_exists curl; then
    local url
    url="$(curl -fsSL "https://api.github.com/repos/termux/termux-api/releases/latest" \
      | jq -r '.assets[] | select(.name | endswith(".apk")) | .browser_download_url' | head -n 1 || true)"
    if [[ -n "$url" && "$url" != "null" ]]; then
      echo "$url"
      return 0
    fi
  fi
  echo "${TERMUX_API_APK_URL}"
}

pkg_installed() {
  dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -q "install ok installed"
}

cmd_exists() {
  command -v "$1" >/dev/null 2>&1
}

cursor_agent_installed() {
  [[ -x "${HOME}/.local/bin/agent" ]] || [[ -x "${HOME}/.local/bin/cursor-agent" ]]
}

desktop_installed() {
  case "${DESKTOP_ENV}" in
    xfce) cmd_exists xfce4-session ;;
    lxqt) cmd_exists startlxqt ;;
    mate) cmd_exists mate-session ;;
    none) return 0 ;;
    *) return 1 ;;
  esac
}

desktop_pkg_name() {
  case "${DESKTOP_ENV}" in
    xfce) echo "xfce4" ;;
    lxqt) echo "lxqt" ;;
    mate) echo "mate-desktop" ;;
    *) echo "" ;;
  esac
}

android_apk_arch_suffix() {
  local abi=""
  if cmd_exists getprop; then
    abi="$(getprop ro.product.cpu.abi 2>/dev/null || true)"
  fi
  [[ -z "$abi" ]] && abi="$(uname -m)"

  case "$abi" in
    arm64-v8a|aarch64) echo "arm64-v8a" ;;
    armeabi-v7a|armv7l) echo "armeabi-v7a" ;;
    x86_64) echo "x86_64" ;;
    x86|i686) echo "x86" ;;
    *) echo "universal" ;;
  esac
}

termux_x11_apk_url() {
  local arch suffix asset
  suffix="$(android_apk_arch_suffix)"
  if [[ "$suffix" == "universal" ]]; then
    asset="app-universal-debug.apk"
  else
    asset="app-${suffix}-debug.apk"
  fi

  if cmd_exists jq && cmd_exists curl; then
    arch="$(curl -fsSL "${TERMUX_X11_RELEASE_API}" | jq -r --arg asset "$asset" '.assets[] | select(.name == $asset) | .browser_download_url' | head -n 1 || true)"
    if [[ -n "$arch" && "$arch" != "null" ]]; then
      echo "$arch"
      return 0
    fi
  fi

  echo "https://github.com/termux/termux-x11/releases/download/nightly/${asset}"
}

ensure_termux_external_apps() {
  mkdir -p "${HOME}/.termux"
  local props="${HOME}/.termux/termux.properties"

  if [[ -f "$props" ]] && grep -qE '^[[:space:]]*allow-external-apps[[:space:]]*=[[:space:]]*true' "$props"; then
    ok_maybe "allow-external-apps already enabled."
    return 0
  fi

  log "Enabling allow-external-apps for APK installs..."
  if [[ -f "$props" ]]; then
    if grep -qE '^[[:space:]]*#?[[:space:]]*allow-external-apps' "$props"; then
      sed -i -E 's/^[[:space:]]*#?[[:space:]]*allow-external-apps.*/allow-external-apps = true/' "$props"
    else
      printf '\nallow-external-apps = true\n' >> "$props"
    fi
  else
    printf 'allow-external-apps = true\n' > "$props"
  fi

  if cmd_exists termux-reload-settings; then
    termux-reload-settings || true
  fi
  ok "Termux can now launch external APK installers."
}

open_termux_api_install_page() {
  warn "Install the Termux:API Android app (required companion for termux-api commands):"
  warn "  https://f-droid.org/packages/com.termux.api/"
  if cmd_exists termux-open; then
    termux-open "https://f-droid.org/packages/com.termux.api/" 2>/dev/null || true
  fi
}

launch_apk_installer() {
  local apk_file="$1"
  local install_apk="$apk_file"

  if [[ ! -f "$apk_file" ]]; then
    return 1
  fi

  # Package installer reads shared storage more reliably than private app data.
  if [[ -d "${HOME}/storage/downloads" ]]; then
    install_apk="${HOME}/storage/downloads/$(basename "$apk_file")"
    cp -f "$apk_file" "$install_apk"
  elif [[ -d "${HOME}/storage/shared/Download" ]]; then
    install_apk="${HOME}/storage/shared/Download/$(basename "$apk_file")"
    cp -f "$apk_file" "$install_apk"
  fi

  if cmd_exists termux-open; then
    termux-open --content-type 'application/vnd.android.package-archive' "$install_apk" 2>/dev/null && return 0
    termux-open "$install_apk" 2>/dev/null && return 0
  fi

  if cmd_exists am; then
    am start -a android.intent.action.VIEW \
      -d "file://${install_apk}" \
      -t 'application/vnd.android.package-archive' >/dev/null 2>&1 && return 0
  fi

  return 1
}

wait_for_apk_install() {
  local package_id="$1"
  local timeout="${2:-20}"
  local waited=0

  apk_installed "$package_id" && return 0

  while (( waited < timeout )); do
    sleep 2
    waited=$((waited + 2))
    apk_installed "$package_id" && return 0
  done

  return 1
}

install_apk_from_url() {
  local url="$1"
  local package_id="$2"
  local label="$3"

  if apk_installed "$package_id"; then
    ok "${label} app already installed."
    return 0
  fi

  if [[ "$package_id" == "com.termux.api" ]] && termux_api_app_installed; then
    ok "${label} app already installed."
    return 0
  fi

  ensure_termux_external_apps
  pkg_install_missing termux-tools

  local apk_dir="${CACHE_DIR}/apks"
  mkdir -p "$apk_dir"
  local apk_file="${apk_dir}/$(basename "${url%%\?*}")"

  if [[ ! -f "$apk_file" ]]; then
    log "Downloading ${label} APK..."
    if ! curl -fL "$url" -o "$apk_file"; then
      warn "Failed to download ${label} APK from: ${url}"
      return 1
    fi
  else
    ok "Using cached APK: ${apk_file}"
  fi

  log "Launching Android installer for ${label}..."
  warn "Tap Install on the Android prompt, then re-run this script."
  warn "Grant Termux 'Install unknown apps' permission if asked."
  if ! launch_apk_installer "$apk_file"; then
    warn "Could not open APK installer automatically."
    warn "Manual install: ${apk_file}"
    return 1
  fi

  # Brief silent check only — Android often hides package info from Termux.
  if wait_for_apk_install "$package_id" 20; then
    ok "${label} installed."
    return 0
  fi

  if apk_installed "$package_id"; then
    ok "${label} installed."
    return 0
  fi

  warn "${label} install not confirmed on this device."
  warn "If it is already installed, re-run this script — no further action needed."
  return 1
}

install_apk_from_urls() {
  local package_id="$1"
  local label="$2"
  shift 2
  local url

  if apk_installed "$package_id"; then
    ok "${label} app already installed."
    return 0
  fi

  if [[ "$package_id" == "com.termux.api" ]] && termux_api_app_installed; then
    ok "${label} app already installed."
    return 0
  fi

  for url in "$@"; do
    [[ -z "$url" ]] && continue
    if install_apk_from_url "$url" "$package_id" "$label"; then
      return 0
    fi
    # Stop after first installer launch — avoid duplicate prompts/URLs.
    if apk_installed "$package_id"; then
      return 0
    fi
    break
  done

  return 1
}

ensure_termux_api_app() {
  if termux_api_app_installed; then
    pkg_install_missing termux-api termux-tools
    return 0
  fi

  log "Setting up Termux:API (Android app + termux-api package)..."
  pkg_install_missing termux-api termux-tools

  if termux_api_app_installed; then
    return 0
  fi

  # Storage helps the system package installer read the APK.
  if [[ ! -d "${HOME}/storage/downloads" ]] && cmd_exists termux-setup-storage; then
    warn "Grant storage permission if prompted (helps APK installation)."
    termux-setup-storage || true
  fi

  if install_apk_from_urls "com.termux.api" "Termux:API" "$(termux_api_latest_apk_url)"; then
    return 0
  fi

  if termux_api_app_installed; then
    return 0
  fi

  warn "Could not verify Termux:API automatically on this device."
  open_termux_api_install_page
  warn "If Termux:API is already installed from F-Droid, re-run this script."
  return 1
}

ensure_termux_api_ready() {
  if ! termux_api_pkg_installed; then
    log "Installing missing termux-api package..."
    pkg_install_missing termux-api
  fi

  if ! termux_api_app_installed; then
    ensure_termux_api_app || true
  fi

  if termux_api_ready || { termux_api_pkg_installed && termux_api_app_installed; }; then
    ok "Termux:API ready."
    return 0
  fi

  if termux_api_pkg_installed && [[ -d /data/data/com.termux.api || -d /data/user/0/com.termux.api ]]; then
    ok "Termux:API ready."
    return 0
  fi

  warn "Termux:API is not fully set up."
  warn "Install the Android app from F-Droid if needed: https://f-droid.org/packages/com.termux.api/"
  warn "Then run: pkg install termux-api"
  return 1
}

ensure_termux_x11_app() {
  if [[ "${INSTALL_X11}" -eq 0 ]]; then
    return 0
  fi

  if ! install_apk_from_url "$(termux_x11_apk_url)" "com.termux.x11" "Termux:X11"; then
    warn "Install Termux:X11 manually: https://github.com/termux/termux-x11/releases/tag/nightly"
    return 1
  fi
}

pkg_install_missing() {
  local missing=()
  local pkg

  for pkg in "$@"; do
    if ! pkg_installed "$pkg"; then
      missing+=("$pkg")
    fi
  done

  if [[ ${#missing[@]} -eq 0 ]]; then
    return 0
  fi

  log "Installing missing packages: ${missing[*]}"
  pkg install -y "${missing[@]}"
  ok "Installed: ${missing[*]}"
}

bootstrap_pkg() {
  log "Bootstrapping package manager..."
  ensure_pkg_mirror
  pkg update -y
  pkg upgrade -y
  pkg_install_missing curl wget jq termux-tools
}

enable_x11_repo() {
  if [[ "${INSTALL_X11}" -eq 0 ]]; then
    return 0
  fi

  if pkg_installed x11-repo; then
    return 0
  fi

  log "Enabling x11-repo (required for Termux:X11 and desktop packages)..."
  pkg install -y x11-repo
  log "Refreshing package lists for x11-repo..."
  pkg update -y
  ok "x11-repo enabled."
}

install_x11_packages() {
  if [[ "${INSTALL_X11}" -eq 0 ]]; then
    return 0
  fi

  enable_x11_repo

  local packages=(
    termux-x11-nightly
    pulseaudio
    dbus
    xfce4-terminal
    thunar
    mousepad
  )

  pkg_install_missing "${packages[@]}"
}

install_base_packages() {
  local packages=(
    bash
    git
    openssh
    tmux
    termux-api
    ripgrep
    nodejs-lts
    python
    clang
    make
    pkg-config
  )

  if [[ "${INSTALL_CURSOR}" -eq 1 ]]; then
    packages+=(sqlite)
  fi

  pkg_install_missing "${packages[@]}"
  install_x11_packages
}

install_desktop() {
  if [[ "${INSTALL_X11}" -eq 0 ]] || [[ "${DESKTOP_ENV}" == "none" ]]; then
    return 0
  fi

  if desktop_installed; then
    return 0
  fi

  local pkg_name
  pkg_name="$(desktop_pkg_name)"
  [[ -n "$pkg_name" ]] || die "Unsupported desktop '${DESKTOP_ENV}'. Use xfce, lxqt, mate, or none."

  log "Installing ${DESKTOP_ENV} desktop..."
  enable_x11_repo
  pkg_install_missing "$pkg_name"
}

setup_file_access() {
  log "Configuring Android file access..."

  mkdir -p "${WORKSPACE_DIR}" "${HOME}/bin"
  ok "Workspace directory: ${WORKSPACE_DIR}"

  if [[ "${SETUP_STORAGE}" -eq 1 ]]; then
    pkg_install_missing termux-tools

    if [[ ! -d "${HOME}/storage/shared" ]]; then
      if cmd_exists termux-setup-storage; then
        log "Requesting Android storage access..."
        warn "Grant storage permission when Android prompts you."
        termux-setup-storage || warn "termux-setup-storage failed or was cancelled."
      else
        warn "termux-setup-storage not found after installing termux-tools."
      fi
    fi

    if [[ -d "${HOME}/storage/shared" ]]; then
      ok "Storage symlinks present at ~/storage/."
    else
      warn "Storage not linked yet. Re-run after granting permission."
    fi
  else
    warn "Skipping storage setup (--skip-storage)."
  fi

  mkdir -p "${HOME}/storage" 2>/dev/null || true

  cat > "${HOME}/.termux-file-access" <<EOF
# Generated by ${SCRIPT_NAME}
# Native Linux workspace (use for git repos, node_modules, agents):
export CURSOR_WORKSPACE="${WORKSPACE_DIR}"

# Android shared storage (use for import/export with other apps):
#   ~/storage/shared      -> /storage/emulated/0
#   ~/storage/downloads   -> Downloads
#   ~/storage/documents   -> Documents
#   ~/storage/dcim        -> Camera roll
export TERMUX_STORAGE_ROOT="${HOME}/storage"
export TERMUX_SHARED="${HOME}/storage/shared"
export TERMUX_DOWNLOADS="${HOME}/storage/downloads"
export TERMUX_DOCUMENTS="${HOME}/storage/documents"
EOF

  mkdir -p "${HOME}/storage/documents" "${HOME}/storage/downloads" 2>/dev/null || true
  ln -sfn "${WORKSPACE_DIR}" "${HOME}/storage/documents/cursor-workspace" 2>/dev/null || true

  cat > "${HOME}/bin/termux-sync-to-downloads" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
SRC="${1:-${CURSOR_WORKSPACE:-$HOME/workspace}}"
DEST="${HOME}/storage/downloads/termux-export"
mkdir -p "$DEST"
ts="$(date +%Y%m%d-%H%M%S)"
tar -C "$(dirname "$SRC")" -czf "${DEST}/$(basename "$SRC")-${ts}.tar.gz" "$(basename "$SRC")"
echo "Exported to ${DEST}/$(basename "$SRC")-${ts}.tar.gz"
EOF
  chmod +x "${HOME}/bin/termux-sync-to-downloads"

  cat > "${HOME}/bin/termux-import-downloads" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
ARCHIVE="${1:-}"
DEST="${CURSOR_WORKSPACE:-$HOME/workspace}"
if [[ -z "$ARCHIVE" ]]; then
  echo "Usage: termux-import-downloads <archive-in-~/storage/downloads>" >&2
  exit 1
fi
[[ "$ARCHIVE" != /* ]] && ARCHIVE="${HOME}/storage/downloads/$ARCHIVE"
mkdir -p "$DEST"
tar -xzf "$ARCHIVE" -C "$DEST"
echo "Imported into $DEST"
EOF
  chmod +x "${HOME}/bin/termux-import-downloads"

  ok "File access helpers ready (see ~/.termux-file-access)."
}

cursor_agent_latest_dir() {
  local versions_dir="${HOME}/.local/share/cursor-agent/versions"
  local dir

  [[ -d "$versions_dir" ]] || return 1
  dir="$(ls -1d "${versions_dir}"/*/ 2>/dev/null | grep -v '/\.tmp-' | sort | tail -n 1 || true)"
  dir="${dir%/}"
  [[ -d "$dir" && -f "${dir}/index.js" ]] || return 1
  echo "$dir"
}

restore_cursor_bundled_glibc_node() {
  local final_dir="$1"
  local dest="$2"
  local ver arch tarball tmpdir node_path
  ver="$(basename "$final_dir")"
  arch="arm64"
  case "$(uname -m)" in
    x86_64|amd64) arch="x64" ;;
  esac

  tarball="${CACHE_DIR}/cursor-agent-${ver}-linux-${arch}.tar.gz"
  tmpdir="$(mktemp -d)"

  log "Downloading Cursor Agent package to restore bundled glibc Node (${ver})..."
  rm -f "$tarball"
  curl -fsSL "https://downloads.cursor.com/lab/${ver}/linux/${arch}/agent-cli-package.tar.gz" -o "$tarball"

  if ! tar -xzf "$tarball" -C "$tmpdir" 2>/dev/null; then
    rm -rf "$tmpdir"
    die "Failed to extract Cursor Agent package for ${ver}."
  fi

  for node_path in \
    "${tmpdir}/dist-package/node" \
    "${tmpdir}/node"; do
    if cursor_glibc_node_valid "$node_path"; then
      install -m0755 "$node_path" "$dest"
      rm -rf "$tmpdir"
      cursor_glibc_node_valid "$dest" || die "Downloaded Cursor Node binary is invalid for ${ver}."
      ok "Restored bundled glibc Node for ${ver}"
      return 0
    fi
  done

  node_path="$(find "$tmpdir" -type f -name node 2>/dev/null | head -n 1)"
  rm -rf "$tmpdir"

  if [[ -n "$node_path" ]] && cursor_glibc_node_valid "$node_path"; then
    install -m0755 "$node_path" "$dest"
    cursor_glibc_node_valid "$dest" || die "Downloaded Cursor Node binary is invalid for ${ver}."
    ok "Restored bundled glibc Node for ${ver}"
    return 0
  fi

  die "Could not find node binary inside Cursor Agent package for ${ver}."
}

ensure_cursor_glibc_node() {
  local final_dir="$1"
  local real_node="${final_dir}/node.glibc"

  if cursor_glibc_node_valid "$real_node"; then
    return 0
  fi

  rm -f "$real_node"
  if [[ -x "${final_dir}/node.real" ]]; then
    mv -f "${final_dir}/node.real" "$real_node"
  fi

  if cursor_glibc_node_valid "$real_node"; then
    return 0
  fi

  if restore_cursor_bundled_glibc_node "$final_dir" "$real_node"; then
    return 0
  fi

  ensure_official_glibc_node "$real_node"
  cursor_glibc_node_valid "$real_node" || die "Could not install a valid glibc Node at ${real_node}"
}

write_cursor_glibc_node_wrapper() {
  local final_dir="$1"
  local ld_so real_node node_wrapper glibc_prefix

  ld_so="$(cursor_glibc_ld_so)" || die "glibc dynamic linker not found. Run: pkg install glibc-repo && pkg update && pkg install glibc-runner"
  glibc_prefix="${PREFIX}/glibc"
  real_node="${final_dir}/node.glibc"
  node_wrapper="${final_dir}/node"

  ensure_cursor_glibc_node "$final_dir"

  if cmd_exists patchelf; then
    patchelf --set-interpreter "$ld_so" --set-rpath "${glibc_prefix}/lib" "$real_node" 2>/dev/null || true
  fi

  cat > "$node_wrapper" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
# CURSOR_GLIBC_NODE_WRAPPER=v${CURSOR_GLIBC_RUNTIME_VERSION}
GLIBC_PREFIX="${glibc_prefix}"
LD_SO="${ld_so}"
REAL_NODE="${real_node}"
export PATH="\${GLIBC_PREFIX}/bin:\${PATH}"
export LD_LIBRARY_PATH="\${GLIBC_PREFIX}/lib"
export SSL_CERT_FILE="${PREFIX}/etc/tls/cert.pem"
export SSL_CERT_DIR="${PREFIX}/etc/tls/certs"
export NODE_EXTRA_CA_CERTS="${PREFIX}/etc/tls/cert.pem"
export TMPDIR="\${TMPDIR:-${PREFIX}/tmp}"
unset LD_PRELOAD
if [[ ! -f "\$REAL_NODE" ]]; then
  echo "Missing glibc Node binary: \$REAL_NODE" >&2
  echo "Re-run setup: curl -fsSL https://raw.githubusercontent.com/Graru1-Wolfy/Playground/main/scripts/setup-termux-x11-cursor.sh | bash" >&2
  exit 1
fi
if command -v grun >/dev/null 2>&1; then
  exec grun "\$REAL_NODE" "\$@"
fi
exec "\$LD_SO" --library-path "\${GLIBC_PREFIX}/lib" "\$REAL_NODE" "\$@"
EOF
  chmod +x "$node_wrapper"
}

verify_cursor_agent_runtime() {
  local final_dir="$1"
  local node_wrapper="${final_dir}/node"

  cursor_node_wrapper_valid "$node_wrapper" || return 1
  cursor_glibc_node_valid "${final_dir}/node.glibc" || return 1

  (
    cd "$final_dir"
    "$node_wrapper" -e "
      const fs = require('fs');
      const sqlite = ['./node_sqlite3.node', './build/node_sqlite3.node'].find((p) => fs.existsSync(p));
      if (sqlite) require(sqlite);
    " >/dev/null 2>&1
    "$node_wrapper" --use-system-ca "${final_dir}/index.js" --version >/dev/null 2>&1
  )
}

write_cursor_agent_bin_wrappers() {
  local agent_dir marker_file
  agent_dir="$(cursor_agent_latest_dir)" || return 0

  mkdir -p "${HOME}/.local/bin"
  marker_file="${HOME}/.local/bin/.cursor-agent-wrapper-version"

  if [[ -f "$marker_file" ]] && [[ "$(cat "$marker_file")" == "${CURSOR_LAUNCHER_VERSION}" ]] \
    && [[ -x "${HOME}/.local/bin/agent" ]] \
    && grep -q "CURSOR_AGENT_WRAPPER=v${CURSOR_LAUNCHER_VERSION}" "${HOME}/.local/bin/agent" 2>/dev/null \
    && verify_cursor_agent_runtime "$agent_dir"; then
    ok_maybe "Cursor Agent launchers already up to date."
    return 0
  fi

  log "Writing Cursor Agent launchers (agent, cursor-agent)..."

  for bin_name in agent cursor-agent; do
    cat > "${HOME}/.local/bin/${bin_name}" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
# CURSOR_AGENT_WRAPPER=v${CURSOR_LAUNCHER_VERSION}
set -euo pipefail
AGENT_DIR="${agent_dir}"
unset LD_PRELOAD
export PATH="${HOME}/bin:${HOME}/.local/bin:${PREFIX}/bin:${PREFIX}/glibc/bin:\${PATH}"
export SSL_CERT_FILE="${PREFIX}/etc/tls/cert.pem"
export SSL_CERT_DIR="${PREFIX}/etc/tls/certs"
export NODE_EXTRA_CA_CERTS="${PREFIX}/etc/tls/cert.pem"
export TMPDIR="\${TMPDIR:-${PREFIX}/tmp}"
exec "\${AGENT_DIR}/node" --use-system-ca "\${AGENT_DIR}/index.js" "\$@"
EOF
    chmod +x "${HOME}/.local/bin/${bin_name}"
  done

  echo "${CURSOR_LAUNCHER_VERSION}" > "$marker_file"
  ok "Cursor Agent launchers: ~/.local/bin/agent and ~/.local/bin/cursor-agent"
}

cursor_node_platform() {
  case "$(uname -m)" in
    aarch64|arm64) echo "linux-arm64" ;;
    x86_64|amd64) echo "linux-x64" ;;
    *) die "Unsupported CPU for Cursor Agent glibc runtime: $(uname -m)" ;;
  esac
}

cursor_glibc_ld_so() {
  local candidate
  for candidate in \
    "${PREFIX}/glibc/lib/ld-linux-aarch64.so.1" \
    "${PREFIX}/glibc/lib/ld-linux-x86-64.so.2" \
    "${PREFIX}/glibc/bin/ld.so"; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

cursor_elf_valid() {
  local file="$1"
  local magic
  [[ -f "$file" && -s "$file" ]] || return 1
  magic="$(od -An -tx1 -N4 "$file" 2>/dev/null | tr -d ' \n' || true)"
  [[ "$magic" == "7f454c46" ]]
}

cursor_glibc_node_valid() {
  cursor_elf_valid "$1"
}

cursor_node_wrapper_valid() {
  local file="$1"
  [[ -f "$file" ]] || return 1
  head -n 1 "$file" 2>/dev/null | grep -q '^#!' || return 1
  grep -q "CURSOR_GLIBC_NODE_WRAPPER=v${CURSOR_GLIBC_RUNTIME_VERSION}" "$file" 2>/dev/null
}

glibc_runtime_ready() {
  cursor_glibc_ld_so >/dev/null
}

configure_glibc_dns() {
  local nss="${PREFIX}/glibc/etc/nsswitch.conf"
  local glibc_resolv="${PREFIX}/glibc/etc/resolv.conf"

  mkdir -p "${PREFIX}/glibc/etc"

  if [[ ! -f "$nss" ]]; then
    cat > "$nss" <<'EOF'
passwd: files
group: files
shadow: files
hosts: files dns
networks: files
protocols: files
services: files
EOF
    ok "Configured glibc nsswitch.conf (DNS for Cursor Agent)."
  fi

  if [[ ! -f "$glibc_resolv" ]]; then
    if [[ -f "${PREFIX}/etc/resolv.conf" ]]; then
      cp "${PREFIX}/etc/resolv.conf" "$glibc_resolv"
    else
      printf 'nameserver 8.8.8.8\nnameserver 1.1.1.1\n' > "$glibc_resolv"
    fi
  fi
}

enable_glibc_repo() {
  if pkg_installed glibc-repo; then
    return 0
  fi

  log "Enabling glibc-repo (required for Cursor Agent glibc native modules)..."
  if ! pkg install -y glibc-repo; then
    warn "Could not install glibc-repo from Termux mirrors."
    warn "Update Termux from GitHub releases (F-Droid builds can be too old):"
    warn "  https://github.com/termux/termux-app/releases"
    return 1
  fi

  log "Refreshing package lists for glibc-repo..."
  pkg update -y
  ok "glibc-repo enabled."
}

ensure_glibc_runner() {
  if glibc_runtime_ready; then
    configure_glibc_dns
    return 0
  fi

  enable_glibc_repo || die "glibc-repo is required for Cursor Agent on Termux."

  if ! pkg_installed glibc-runner; then
    log "Installing glibc-runner..."
    if ! pkg install -y glibc-runner; then
      warn "glibc-runner not found after enabling glibc-repo."
      warn "Try manually: pkg install glibc-repo && pkg update && pkg install glibc-runner"
      warn "If that fails, install the latest Termux APK from GitHub (not Play Store / old F-Droid)."
      die "glibc-runner is required for Cursor Agent native modules."
    fi
    ok "glibc-runner installed."
  fi

  if ! glibc_runtime_ready; then
    die "glibc dynamic linker not found at $(cursor_glibc_ld_so) after installing glibc-runner."
  fi

  configure_glibc_dns
}

ensure_official_glibc_node() {
  local dest="$1"
  local platform cache_dir tarball extract_dir cached_node
  platform="$(cursor_node_platform)"
  cache_dir="${HOME}/.cache/cursor-agent-glibc-node/v${CURSOR_GLIBC_NODE_VERSION}-${platform}"
  cached_node="${cache_dir}/bin/node"
  tarball="${HOME}/.cache/cursor-agent-glibc-node/node-v${CURSOR_GLIBC_NODE_VERSION}-${platform}.tar.xz"
  extract_dir="${HOME}/.cache/cursor-agent-glibc-node/node-v${CURSOR_GLIBC_NODE_VERSION}-${platform}"

  if [[ -x "$cached_node" ]]; then
    install -m0755 "$cached_node" "$dest"
    return 0
  fi

  mkdir -p "$(dirname "$dest")" "${HOME}/.cache/cursor-agent-glibc-node"
  log "Downloading official Node.js v${CURSOR_GLIBC_NODE_VERSION} (${platform}) for glibc runtime..."
  curl -fsSL "https://nodejs.org/dist/v${CURSOR_GLIBC_NODE_VERSION}/node-v${CURSOR_GLIBC_NODE_VERSION}-${platform}.tar.xz" -o "$tarball"
  rm -rf "$extract_dir" "$cache_dir"
  mkdir -p "$cache_dir"
  tar -xJf "$tarball" -C "${HOME}/.cache/cursor-agent-glibc-node"
  mv "$extract_dir" "$cache_dir"
  install -m0755 "$cached_node" "$dest"
  ok "Cached glibc Node.js at ${cached_node}"
}

patch_cursor_agent_glibc_runtime() {
  local final_dir="$1"
  local node_wrapper

  [[ -d "$final_dir" ]] || return 0

  ensure_glibc_runner
  pkg_install_missing patchelf 2>/dev/null || true

  node_wrapper="${final_dir}/node"

  if [[ -L "$node_wrapper" ]]; then
    rm -f "$node_wrapper"
  elif [[ -f "$node_wrapper" ]] && cursor_elf_valid "$node_wrapper"; then
    mv -f "$node_wrapper" "${final_dir}/node.glibc"
  elif [[ -f "$node_wrapper" ]] && ! cursor_node_wrapper_valid "$node_wrapper"; then
    rm -f "$node_wrapper"
  fi

  if verify_cursor_agent_runtime "$final_dir"; then
    ok_maybe "Cursor glibc runtime already OK for $(basename "$final_dir")."
    return 0
  fi

  log "Repairing Cursor Agent glibc runtime for $(basename "$final_dir")..."
  write_cursor_glibc_node_wrapper "$final_dir"

  if [[ -e "${final_dir}/rg" ]] && cmd_exists rg; then
    rm -f "${final_dir}/rg"
    ln -sf "$(command -v rg)" "${final_dir}/rg"
  fi

  if verify_cursor_agent_runtime "$final_dir"; then
    ok "Cursor Agent glibc runtime ready for $(basename "$final_dir")."
  else
    warn "Cursor Agent self-test failed for $(basename "$final_dir")."
    warn "Check: ls -la ${final_dir}/node ${final_dir}/node.glibc"
    warn "Then re-run setup or: pkg install glibc-repo && pkg update && pkg install glibc-runner"
  fi
}

patch_installed_cursor_agents() {
  local versions_dir="${HOME}/.local/share/cursor-agent/versions"
  [[ -d "$versions_dir" ]] || return 0

  local ver_dir
  for ver_dir in "$versions_dir"/*/; do
    [[ -d "$ver_dir" ]] || continue
    patch_cursor_agent_glibc_runtime "${ver_dir%/}"
  done
}

install_cursor_agent_termux() {
  if [[ "${INSTALL_CURSOR}" -eq 0 ]]; then
    return 0
  fi

  ensure_glibc_runner

  if cursor_agent_installed && [[ "${FORCE_CURSOR}" -eq 0 ]]; then
    patch_installed_cursor_agents
    write_cursor_agent_bin_wrappers
    return 0
  fi

  pkg_install_missing ripgrep curl wget

  log "Installing Cursor Agent CLI (Termux glibc-compatible)..."

  local installer android_detect_file dynamic_download_file
  installer="$(mktemp)"
  android_detect_file="$(mktemp)"
  dynamic_download_file="$(mktemp)"
  trap 'rm -f "$installer" "$android_detect_file" "$dynamic_download_file"' RETURN

  cat > "${android_detect_file}" <<'EOF'
# Android/Termux detection
IS_ANDROID=false
if command -v getprop > /dev/null 2>&1 || [[ "${ANDROID_ROOT-}" ]] || [[ "${PREFIX-}" == /data/data/* ]]; then
  IS_ANDROID=true
fi
EOF

  cat > "${dynamic_download_file}" <<'EOF'
# Prefer android build if vendor provides it
DOWNLOAD_OS="$OS"
if $IS_ANDROID; then
  if curl -sfI "https://downloads.cursor.com/lab/${VER}/android/${ARCH}/agent-cli-package.tar.gz" > /dev/null; then
    DOWNLOAD_OS="android"
  else
    DOWNLOAD_OS="linux"
  fi
fi
DOWNLOAD_URL="https://downloads.cursor.com/lab/${VER}/${DOWNLOAD_OS}/${ARCH}/agent-cli-package.tar.gz"
EOF

  curl -fsSL "https://cursor.com/install" -o "$installer" || die "Failed to download Cursor installer."

  local ver_string
  ver_string="$(grep -E -o '[0-9]{4}\.[0-9]{2}\.[0-9]{2}-[a-f0-9]{7,}' "$installer" | head -n 1 || true)"
  [[ -n "$ver_string" ]] || die "Could not detect Cursor CLI version from installer."

  log "Detected Cursor CLI version: ${ver_string}"

  sed -i \
    -e "/^ARCH=.*$/r ${android_detect_file}" \
    -e "/print_success \"Detected/c\print_success \"Detected \${OS}/\${ARCH}\$([ \${IS_ANDROID} = true ] && echo ' (Android/Termux)')\"" \
    -e "s/${ver_string}/\${VER}/g" \
    -e "/# Installation steps/i VER=\"${ver_string}\"" \
    -e "/DOWNLOAD_URL=.*/r ${dynamic_download_file}" \
    -e "/DOWNLOAD_URL=.*/d" \
    -e "/^print_step \"Creating symlink/a BIN_DIR=\$HOME/.local/bin\nBIN_LINK=\$BIN_DIR/cursor-agent\nFINAL_DIR=\$HOME/.local/share/cursor-agent/versions/\${VER}" \
    -e "s|~/.local/bin/cursor-agent|\$BIN_LINK|g" \
    -e "s|~/.local/share/cursor-agent/versions/\${VER}/cursor-agent|\$FINAL_DIR/cursor-agent|g" \
    -e "/Start using Cursor Agent:/c\echo -e \"\${BOLD}2.\${NC} Start using Cursor Agent:\"\necho -e \" \${BOLD}cursor-agent --help\${NC}\"" \
    "$installer"

  bash "$installer"

  patch_cursor_agent_glibc_runtime "${HOME}/.local/share/cursor-agent/versions/${ver_string}"
  write_cursor_agent_bin_wrappers

  ok "Cursor Agent CLI installed."
}

write_x11_launchers() {
  local version_file="${HOME}/bin/.termux-x11-launcher-version"
  if [[ -x "${HOME}/bin/start-termux-x11" ]] && [[ -x "${HOME}/bin/stop-termux-x11" ]] \
    && [[ -f "$version_file" ]] && [[ "$(cat "$version_file")" == "${X11_LAUNCHER_VERSION}" ]]; then
    return 0
  fi

  log "Writing Termux:X11 launcher scripts..."

  mkdir -p "${HOME}/bin"

  local x11_flags=""
  [[ "${TERMUX_X11_LEGACY_DRAWING}" -eq 1 ]] && x11_flags="-legacy-drawing"
  [[ "${TERMUX_X11_FORCE_BGRA}" -eq 1 ]] && x11_flags="${x11_flags} -force-bgra"
  x11_flags="${x11_flags# }"

  local session_cmd="xfce4-session"
  case "${DESKTOP_ENV}" in
    lxqt) session_cmd="startlxqt" ;;
    mate) session_cmd="mate-session" ;;
    xfce|*) session_cmd="xfce4-session" ;;
  esac

  cat > "${HOME}/.termux-x11.env" <<EOF
# Generated by ${SCRIPT_NAME}
DISPLAY="${TERMUX_X11_DISPLAY}"
X11_FLAGS="${x11_flags}"
DESKTOP_SESSION="${session_cmd}"
EOF

  cat > "${HOME}/bin/termux-x11-xstartup" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# XFCE/desktop session starter for Termux:X11 (includes agent PATH for GUI terminals).

export PATH="${HOME}/bin:${HOME}/.local/bin:${PREFIX}/bin:${PATH}"
export TMPDIR="${TMPDIR:-/data/data/com.termux/files/usr/tmp}"

DESKTOP_SESSION="xfce4-session"
if [[ -f "${HOME}/.termux-x11.env" ]]; then
  # shellcheck source=/dev/null
  source "${HOME}/.termux-x11.env"
fi

if command -v dbus-launch >/dev/null 2>&1; then
  exec dbus-launch --exit-with-session "${DESKTOP_SESSION}"
fi

exec "${DESKTOP_SESSION}"
EOF
  chmod +x "${HOME}/bin/termux-x11-xstartup"

  cat > "${HOME}/bin/start-termux-x11" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# Do not use set -euo here: unset TMPDIR or benign pkill failures must not abort startup.

LOG="${HOME}/termux-x11.log"
DISPLAY="${TERMUX_X11_DISPLAY:-:0}"
X11_FLAGS=""
DESKTOP_SESSION="xfce4-session"

if [[ -f "${HOME}/.termux-x11.env" ]]; then
  # shellcheck source=/dev/null
  source "${HOME}/.termux-x11.env"
fi

case "${1:-}" in
  --legacy-drawing) X11_FLAGS="${X11_FLAGS} -legacy-drawing" ;;
  --force-bgra) X11_FLAGS="${X11_FLAGS} -force-bgra" ;;
esac
X11_FLAGS="${X11_FLAGS# }"

{
  echo "==== $(date) start-termux-x11 ===="
  echo "DISPLAY=${DISPLAY} SESSION=${DESKTOP_SESSION} FLAGS=${X11_FLAGS:-none}"

  command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock || true

  am broadcast -a com.termux.x11.ACTION_STOP -p com.termux.x11 >/dev/null 2>&1 || true
  sleep 1
  pkill -f 'com.termux.x11.CmdEntryPoint' 2>/dev/null || true
  sleep 1

  pulseaudio --kill 2>/dev/null || true
  pulseaudio --start \
    --load="module-native-protocol-tcp auth-ip-acl=127.0.0.1 auth-anonymous=1" \
    --exit-idle-time=-1 2>/dev/null || true

  export XDG_RUNTIME_DIR="${TMPDIR:-/data/data/com.termux/files/usr/tmp}"
  export DISPLAY
  export PULSE_SERVER=127.0.0.1

  startup="${HOME}/bin/termux-x11-xstartup"

  # Official Termux:X11 flow: server stays up; session starts on client connect.
  # shellcheck disable=SC2086
  termux-x11 "${DISPLAY}" ${X11_FLAGS} -xstartup "${startup}" &
  srv_pid=$!
  sleep 3

  if ! kill -0 "${srv_pid}" 2>/dev/null; then
    echo "ERROR: termux-x11 exited immediately (pid ${srv_pid})."
    echo "Try: start-termux-x11 --legacy-drawing"
    exit 1
  fi

  am start --user 0 -n com.termux.x11/com.termux.x11.MainActivity >/dev/null 2>&1 || true

  echo "Termux:X11 running (pid ${srv_pid}) on DISPLAY=${DISPLAY}"
  echo "Open the Termux:X11 app if the desktop is not visible."
  echo "Log: ${LOG}"
} >>"${LOG}" 2>&1

tail -n 8 "${LOG}"
EOF
  chmod +x "${HOME}/bin/start-termux-x11"

  cat > "${HOME}/bin/stop-termux-x11" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash

am broadcast -a com.termux.x11.ACTION_STOP -p com.termux.x11 >/dev/null 2>&1 || true
pkill -f 'com.termux.x11.CmdEntryPoint' 2>/dev/null || true
pkill -f 'xfce4-session' 2>/dev/null || true
pkill -f 'xfce4-panel' 2>/dev/null || true
pkill -f 'xfwm4' 2>/dev/null || true
pulseaudio --kill 2>/dev/null || true

if command -v termux-wake-unlock >/dev/null 2>&1; then
  termux-wake-unlock || true
fi

echo "Termux:X11 stopped."
EOF
  chmod +x "${HOME}/bin/stop-termux-x11"
  echo "${X11_LAUNCHER_VERSION}" > "${version_file}"

  ok "Launchers: start-termux-x11, stop-termux-x11, termux-x11-xstartup (v${X11_LAUNCHER_VERSION})"
}

write_repair_cursor_agent() {
  mkdir -p "${HOME}/bin"
  cat > "${HOME}/bin/repair-cursor-agent" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
SCRIPT_URL="https://raw.githubusercontent.com/Graru1-Wolfy/Playground/main/scripts/setup-termux-x11-cursor.sh"
tmp="$(mktemp)"
curl -fsSL "${SCRIPT_URL}?v=$(date +%s)" -o "$tmp"
bash "$tmp" --repair-cursor-only "$@"
EOF
  chmod +x "${HOME}/bin/repair-cursor-agent"
  ok "Quick repair command: repair-cursor-agent"
}

repair_cursor_agent_only() {
  log "Repairing Cursor Agent only (SETUP_SCRIPT_VERSION=${SETUP_SCRIPT_VERSION})..."
  pkg_install_missing curl wget patchelf 2>/dev/null || pkg_install_missing curl wget
  ensure_glibc_runner
  patch_installed_cursor_agents
  write_cursor_agent_bin_wrappers
  if verify_cursor_agent_runtime "$(cursor_agent_latest_dir)"; then
    ok "Cursor Agent repair complete. Try: agent --version"
  else
    warn "Repair finished but self-test failed. Run: agent --version"
  fi
}

write_cursor_launchers() {
  local version_file="${HOME}/bin/.cursor-agent-launcher-version"
  if [[ -x "${HOME}/bin/cursor-agent-tmux" ]] && [[ -f "$version_file" ]] \
    && [[ "$(cat "$version_file")" == "${CURSOR_LAUNCHER_VERSION}" ]]; then
    return 0
  fi

  log "Writing Cursor Agent launcher scripts..."

  mkdir -p "${HOME}/bin"

  cat > "${HOME}/bin/cursor-agent-tmux" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

SESSION="cursor-agent"
WORKDIR="${CURSOR_WORKSPACE:-$HOME/workspace}"
AGENT_BIN="${AGENT_BIN:-$HOME/.local/bin/agent}"

if [[ ! -x "$AGENT_BIN" ]] && [[ -x "$HOME/.local/bin/cursor-agent" ]]; then
  AGENT_BIN="$HOME/.local/bin/cursor-agent"
fi

command -v tmux >/dev/null 2>&1 || { echo "tmux not installed (pkg install tmux)" >&2; exit 1; }
[[ -x "$AGENT_BIN" ]] || { echo "Cursor agent not found. Re-run setup with cursor install enabled." >&2; exit 1; }

mkdir -p "$WORKDIR"
cd "$WORKDIR"

if tmux has-session -t "$SESSION" 2>/dev/null; then
  exec tmux attach -t "$SESSION"
fi

if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock || true
fi

unset LD_PRELOAD
exec tmux new-session -s "$SESSION" "$AGENT_BIN" "$@"
EOF
  chmod +x "${HOME}/bin/cursor-agent-tmux"
  echo "${CURSOR_LAUNCHER_VERSION}" > "${version_file}"

  ok "Launcher: cursor-agent-tmux (v${CURSOR_LAUNCHER_VERSION})"
}

write_shell_profile() {
  log "Updating shell profile..."

  local profile="${HOME}/.bashrc"
  local marker="# >>> termux-x11-cursor setup >>>"
  local end_marker="# <<< termux-x11-cursor setup <<<"

  if [[ -f "$profile" ]] && grep -qF "$marker" "$profile"; then
    return 0
  fi

  cat >> "$profile" <<EOF

${marker}
[[ -f "\${HOME}/.termux-file-access" ]] && source "\${HOME}/.termux-file-access"
export PATH="\${HOME}/bin:\${HOME}/.local/bin:\${PATH}"
export DISPLAY="${TERMUX_X11_DISPLAY}"
export EDITOR="\${EDITOR:-micro}"
${end_marker}
EOF

  ok "Added setup block to ${profile}"
}

print_summary() {
  local ws_display="${WORKSPACE_DIR}"
  [[ "${WORKSPACE_DIR}" == "${HOME}/workspace" ]] && ws_display="~/workspace"

  cat <<EOF

============================================================
Termux X11 + Cursor Agent setup complete
============================================================

Workspace (native, for git/agents):
  ${ws_display}

Next steps:
  start-termux-x11          # graphical desktop
  cursor-agent-tmux         # Cursor Agent in tmux
  agent login               # first-time auth

Android shared storage:
  ~/storage/shared
  ~/storage/downloads
  ~/storage/documents/cursor-workspace  -> symlink to workspace

Export / import workspace:
  termux-sync-to-downloads
  termux-import-downloads <archive>.tar.gz

Stop X11 session:
  stop-termux-x11
EOF

  if ! termux_api_ready && ! termux_api_app_installed; then
    cat <<'EOF'

Termux:API still needed:
  pkg install termux-api
  https://f-droid.org/packages/com.termux.api/
EOF
  fi

  cat <<EOF

Tips:
  - Re-run this script anytime to install anything still missing.
  - Keep repos under ${ws_display}, not on ~/storage/* (FAT limitations).
  - Use --verbose to show all "already installed" checks.
  - X11 logs: tail -f ~/termux-x11.log
  - Desktop closes instantly: start-termux-x11 --legacy-drawing
  - Android 12+: disable phantom process killer / battery optimization for Termux
  - If the X11 screen is black: re-run with --legacy-drawing
  - If colors look wrong: re-run with --force-bgra
  - X11 dbus/ConsoleKit warnings in the log are harmless on Termux
  - agent node.glibc error: re-run setup (repairs node wrapper + re-downloads Node)
  - glibc-runner not found: pkg install glibc-repo && pkg update && pkg install glibc-runner
  - Run agent from Termux or XFCE terminal after setup (PATH includes ~/.local/bin)

EOF
}

main() {
  parse_args "$@"
  require_termux

  log "setup-termux-x11-cursor.sh SETUP_SCRIPT_VERSION=${SETUP_SCRIPT_VERSION}"
  mkdir -p "${HOME}/bin" "${CACHE_DIR}"

  if [[ "${REPAIR_CURSOR_ONLY}" -eq 1 ]]; then
    require_termux
    repair_cursor_agent_only
    write_repair_cursor_agent
    exit 0
  fi

  bootstrap_pkg
  ensure_termux_external_apps
  pkg_install_missing termux-api termux-tools

  install_base_packages

  if [[ "${INSTALL_X11}" -eq 1 ]]; then
    ensure_termux_x11_app
    install_desktop
  fi

  setup_file_access

  if [[ "${INSTALL_CURSOR}" -eq 1 ]]; then
    install_cursor_agent_termux
  fi

  if [[ "${INSTALL_X11}" -eq 1 ]]; then
    write_x11_launchers
  fi

  if [[ "${INSTALL_CURSOR}" -eq 1 ]]; then
    write_cursor_launchers
    write_repair_cursor_agent
  fi

  write_shell_profile
  ensure_termux_api_ready || warn "Termux:API not detected; install from F-Droid if commands fail."
  print_summary
}

main "$@"
