#!/usr/bin/env bash
# Setup Termux:X11, Cursor Agent CLI, and Android shared-storage file access.
#
# Prerequisites:
#   - Termux from F-Droid (not the outdated Play Store build)
#     https://f-droid.org/en/packages/com.termux/
#   - Grant "Install unknown apps" to Termux when prompted (for APK installs)
#   - Allow Termux and Termux:X11 notifications (Android 13+)
#
# The script auto-installs any missing packages, companion APKs, Cursor Agent,
# storage symlinks, and launcher scripts. Safe to re-run.
#
# Usage (inside Termux):
#   curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/main/scripts/setup-termux-x11-cursor.sh -o setup-termux-x11-cursor.sh
#   bash setup-termux-x11-cursor.sh
#
# Options:
#   --skip-x11        Skip X11 / desktop packages
#   --skip-cursor     Skip Cursor Agent CLI install
#   --skip-storage    Skip storage permission prompt
#   --force-cursor    Reinstall Cursor Agent even if present
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
DESKTOP_ENV="xfce"
TERMUX_X11_DISPLAY=":0"
TERMUX_X11_LEGACY_DRAWING=0
TERMUX_X11_FORCE_BGRA=0

TERMUX_API_APK_URL="https://github.com/termux/termux-api/releases/download/v0.53.0/termux-api-app_v0.53.0+github.debug.apk"
TERMUX_X11_RELEASE_API="https://api.github.com/repos/termux/termux-x11/releases/tags/nightly"

log()  { printf '\033[0;34m▸\033[0m %s\n' "$*"; }
ok()   { printf '\033[0;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[0;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

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
  pm path "$1" >/dev/null 2>&1
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
    ok "allow-external-apps already enabled."
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

wait_for_apk_install() {
  local package_id="$1"
  local timeout="${2:-180}"
  local waited=0

  while ! apk_installed "$package_id"; do
    sleep 2
    waited=$((waited + 2))
    if (( waited >= timeout )); then
      return 1
    fi
    if (( waited % 10 == 0 )); then
      log "Still waiting for ${package_id}... (${waited}s)"
    fi
  done
  return 0
}

install_apk_from_url() {
  local url="$1"
  local package_id="$2"
  local label="$3"

  if apk_installed "$package_id"; then
    ok "${label} app already installed."
    return 0
  fi

  ensure_termux_external_apps

  local apk_dir="${CACHE_DIR}/apks"
  mkdir -p "$apk_dir"
  local apk_file="${apk_dir}/$(basename "$url")"

  if [[ ! -f "$apk_file" ]]; then
    log "Downloading ${label} APK..."
    curl -fL "$url" -o "$apk_file"
  else
    ok "Using cached APK: ${apk_file}"
  fi

  log "Launching Android installer for ${label}..."
  warn "Tap Install on the Android prompt (grant unknown-app install if asked)."
  if cmd_exists termux-open; then
    termux-open "$apk_file"
  else
    am start -a android.intent.action.VIEW \
      -d "file://${apk_file}" \
      -t application/vnd.android.package-archive >/dev/null 2>&1 || true
  fi

  log "Waiting for ${label} installation (up to 3 minutes)..."
  if wait_for_apk_install "$package_id" 180; then
    ok "${label} installed."
  else
    die "${label} not detected after waiting. Install manually: ${url}"
  fi
}

ensure_termux_api_app() {
  install_apk_from_url \
    "${TERMUX_API_APK_URL}" \
    "com.termux.api" \
    "Termux:API"
}

ensure_termux_x11_app() {
  if [[ "${INSTALL_X11}" -eq 0 ]]; then
    return 0
  fi

  install_apk_from_url \
    "$(termux_x11_apk_url)" \
    "com.termux.x11" \
    "Termux:X11"
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
    ok "All requested packages already installed."
    return 0
  fi

  log "Installing missing packages: ${missing[*]}"
  pkg install -y "${missing[@]}"
  ok "Installed: ${missing[*]}"
}

bootstrap_pkg() {
  log "Bootstrapping package manager..."
  pkg update -y
  pkg upgrade -y
  pkg_install_missing curl wget jq termux-tools
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

  if [[ "${INSTALL_X11}" -eq 1 ]]; then
    packages+=(
      x11-repo
      termux-x11-nightly
      pulseaudio
      dbus
      xfce4-terminal
      thunar
      mousepad
    )
  fi

  if [[ "${INSTALL_CURSOR}" -eq 1 ]]; then
    packages+=(sqlite)
  fi

  pkg_install_missing "${packages[@]}"
}

install_desktop() {
  if [[ "${INSTALL_X11}" -eq 0 ]] || [[ "${DESKTOP_ENV}" == "none" ]]; then
    return 0
  fi

  if desktop_installed; then
    ok "Desktop '${DESKTOP_ENV}' already installed."
    return 0
  fi

  local pkg_name
  pkg_name="$(desktop_pkg_name)"
  [[ -n "$pkg_name" ]] || die "Unsupported desktop '${DESKTOP_ENV}'. Use xfce, lxqt, mate, or none."

  log "Installing ${DESKTOP_ENV} desktop..."
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

install_cursor_agent_termux() {
  if cursor_agent_installed && [[ "${FORCE_CURSOR}" -eq 0 ]]; then
    ok "Cursor Agent CLI already installed."
    if [[ ! -x "${HOME}/.local/bin/agent" ]] && [[ -x "${HOME}/.local/bin/cursor-agent" ]]; then
      ln -sf "${HOME}/.local/bin/cursor-agent" "${HOME}/.local/bin/agent"
    fi
    return 0
  fi

  pkg_install_missing nodejs-lts ripgrep sqlite clang make pkg-config python

  log "Installing Cursor Agent CLI (Termux-compatible)..."

  local installer android_detect_file dynamic_download_file android_fixes_file
  installer="$(mktemp)"
  android_detect_file="$(mktemp)"
  dynamic_download_file="$(mktemp)"
  android_fixes_file="$(mktemp)"
  trap 'rm -f "$installer" "$android_detect_file" "$dynamic_download_file" "$android_fixes_file"' RETURN

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

  cat > "${android_fixes_file}" <<'EOF'

# ============ Android/Termux post-install fixes ============
if $IS_ANDROID; then
  echo
  echo -e "${BOLD}Android/Termux post-install fixes${NC}"

  print_step "Patching Node runtime..."
  if ! command -v node > /dev/null 2>&1; then
    print_error "Node.js not found in PATH. Install it (e.g. pkg install nodejs-lts)."
    exit 1
  fi
  SYS_NODE="$(command -v node)"
  rm -f "$FINAL_DIR/node"
  ln -s "$SYS_NODE" "$FINAL_DIR/node"
  print_success "node → $SYS_NODE"

  if [[ -e "$FINAL_DIR/rg" ]]; then
    print_step "Replacing bundled rg (ripgrep)..."
    if command -v rg > /dev/null 2>&1; then
      rm -f "$FINAL_DIR/rg"
      ln -s "$(command -v rg)" "$FINAL_DIR/rg"
      print_success "rg → $(command -v rg)"
    else
      print_error "ripgrep (rg) not found. Install it (e.g. pkg install ripgrep)."
    fi
  fi

  echo
  print_step "Rebuilding sqlite3 native addon for Android/bionic..."

  need_bins=(clang make python pkg-config npm)
  missing=()
  for b in "${need_bins[@]}"; do command -v "$b" > /dev/null 2>&1 || missing+=("$b"); done
  if [[ ${#missing[@]} -gt 0 ]]; then
    print_error "Missing build tools: ${missing[*]}"
    exit 1
  fi

  cd "$FINAL_DIR" || { print_error "Could not enter directory '$FINAL_DIR'"; exit 1; }

  unset LINK || true
  J=$(($(getconf _NPROCESSORS_ONLN 2> /dev/null || echo 1)))
  rm -f build/node_sqlite3.node || true
  npm ci --ignore-scripts > /dev/null 2>&1 || true
  npm i sqlite3 --ignore-scripts

  if [[ -d node_modules/sqlite3 ]]; then
    print_step "Patching gyp files..."
    find node_modules/sqlite3 -type f \( -name '*.gyp' -o -name '*.gypi' \) -print0 | xargs -0 sed -i -E \
      -e 's/\bOS\s*==\s*"android"/OS=="never"/g' \
      -e 's/\btarget_os\s*==\s*"android"/target_os=="never"/g' \
      -e '/android_ndk_path/d' \
      -e '/ANDROID_/d'
    print_success "Patched gyp"
  else
    print_error "sqlite3 sources not found under node_modules."
    exit 1
  fi

  print_step "Building sqlite3 addon (this can take a minute)..."
  npx node-gyp configure -C node_modules/sqlite3 -- -DOS=linux -Dtarget_os=linux -Dandroid_ndk_path=/nonexistent
  make -C node_modules/sqlite3/build -j "$J" V=1 LINK=clang++

  if [[ -f node_modules/sqlite3/build/Release/node_sqlite3.node ]]; then
    install -m0755 node_modules/sqlite3/build/Release/node_sqlite3.node build/node_sqlite3.node
    print_success "sqlite3 addon rebuilt"
  else
    print_error "Failed to produce node_sqlite3.node"
    exit 1
  fi

  node -e "require('$FINAL_DIR/build/node_sqlite3.node');"
  print_success "sqlite3 addon loads under Termux Node"

  cd - > /dev/null
fi
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
    -e "/^print_success \"Symlink created\"/r ${android_fixes_file}" \
    -e "/Start using Cursor Agent:/c\echo -e \"\${BOLD}2.\${NC} Start using Cursor Agent:\"\necho -e \" \${BOLD}cursor-agent --help\${NC}\"" \
    "$installer"

  bash "$installer"

  mkdir -p "${HOME}/bin"
  if [[ ! -x "${HOME}/.local/bin/agent" ]] && [[ -x "${HOME}/.local/bin/cursor-agent" ]]; then
    ln -sf "${HOME}/.local/bin/cursor-agent" "${HOME}/.local/bin/agent"
  fi

  ok "Cursor Agent CLI installed."
}

write_x11_launchers() {
  if [[ -x "${HOME}/bin/start-termux-x11" ]] && [[ -x "${HOME}/bin/stop-termux-x11" ]]; then
    ok "Termux:X11 launchers already present."
    return 0
  fi

  log "Writing Termux:X11 launcher scripts..."

  mkdir -p "${HOME}/bin"

  local x11_flags=""
  [[ "${TERMUX_X11_LEGACY_DRAWING}" -eq 1 ]] && x11_flags+=" -legacy-drawing"
  [[ "${TERMUX_X11_FORCE_BGRA}" -eq 1 ]] && x11_flags+=" -force-bgra"

  local session_cmd="xfce4-session"
  case "${DESKTOP_ENV}" in
    lxqt) session_cmd="startlxqt" ;;
    mate) session_cmd="mate-session" ;;
    xfce|*) session_cmd="xfce4-session" ;;
  esac

  cat > "${HOME}/bin/start-termux-x11" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

# Prevent Android from killing long-running GUI sessions (Android 12+).
if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock || true
fi

pkill -f "termux.x11" 2>/dev/null || true
pkill -f "termux-x11" 2>/dev/null || true

pulseaudio --start --load="module-native-protocol-tcp auth-ip-acl=127.0.0.1 auth-anonymous=1" --exit-idle-time=-1 2>/dev/null || true

export XDG_RUNTIME_DIR="\${TMPDIR}"
export DISPLAY="${TERMUX_X11_DISPLAY}"
export PULSE_SERVER=127.0.0.1

termux-x11 ${TERMUX_X11_DISPLAY}${x11_flags} >/dev/null 2>&1 &
sleep 3

am start --user 0 -n com.termux.x11/com.termux.x11.MainActivity >/dev/null 2>&1 || true
sleep 1

if command -v dbus-launch >/dev/null 2>&1; then
  dbus-launch --exit-with-session ${session_cmd} >/dev/null 2>&1 &
else
  ${session_cmd} >/dev/null 2>&1 &
fi

echo "Termux:X11 started on DISPLAY=${TERMUX_X11_DISPLAY}"
echo "Open the Termux:X11 app if the desktop is not visible."
EOF
  chmod +x "${HOME}/bin/start-termux-x11"

  cat > "${HOME}/bin/stop-termux-x11" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
am broadcast -a com.termux.x11.ACTION_STOP -p com.termux.x11 >/dev/null 2>&1 || true
pkill -f "termux.x11" 2>/dev/null || true
pkill -f "termux-x11" 2>/dev/null || true
pkill -f "xfce4-session" 2>/dev/null || true
if command -v termux-wake-unlock >/dev/null 2>&1; then
  termux-wake-unlock || true
fi
echo "Termux:X11 stopped."
EOF
  chmod +x "${HOME}/bin/stop-termux-x11"

  ok "Launchers: start-termux-x11, stop-termux-x11"
}

write_cursor_launchers() {
  if [[ -x "${HOME}/bin/cursor-agent-tmux" ]]; then
    ok "Cursor Agent launcher already present."
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

exec tmux new-session -s "$SESSION" "$AGENT_BIN" "$@"
EOF
  chmod +x "${HOME}/bin/cursor-agent-tmux"

  ok "Launcher: cursor-agent-tmux"
}

write_shell_profile() {
  log "Updating shell profile..."

  local profile="${HOME}/.bashrc"
  local marker="# >>> termux-x11-cursor setup >>>"
  local end_marker="# <<< termux-x11-cursor setup <<<"

  if [[ -f "$profile" ]] && grep -qF "$marker" "$profile"; then
    ok "Shell profile already configured."
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
  cat <<EOF

============================================================
Termux X11 + Cursor Agent setup complete
============================================================

Workspace (native, for git/agents):
  ${WORKSPACE_DIR}

Android shared storage:
  ~/storage/shared
  ~/storage/downloads
  ~/storage/documents/cursor-workspace  -> symlink to workspace

Start graphical desktop:
  start-termux-x11
  (then open the Termux:X11 Android app)

Run Cursor Agent in tmux (recommended on phone):
  cursor-agent-tmux
  # or: cd ${WORKSPACE_DIR} && agent

Authenticate Cursor (first run):
  agent login

Export workspace to Downloads:
  termux-sync-to-downloads

Import an archive from Downloads:
  termux-import-downloads my-project.tar.gz

Stop X11 session:
  stop-termux-x11

Tips:
  - Re-run this script anytime to install anything still missing.
  - Keep repos under ${WORKSPACE_DIR}, not on ~/storage/* (FAT limitations).
  - Use tmux so agents survive app backgrounding.
  - Disable battery optimization for Termux and Termux:X11 on Android 12+.
  - If the X11 screen is black, re-run setup with --legacy-drawing.
  - If colors look wrong, re-run with --force-bgra.

EOF
}

main() {
  parse_args "$@"
  require_termux

  mkdir -p "${HOME}/bin" "${CACHE_DIR}"

  bootstrap_pkg
  ensure_termux_external_apps
  ensure_termux_api_app

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
  fi

  write_shell_profile
  print_summary
}

main "$@"
