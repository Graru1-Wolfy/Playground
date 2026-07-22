#!/usr/bin/env bash
# Prepare a Git checkout for Cursor Cloud Agents and Acode on Android.
#
# This script must run in the native Termux app (pkg), not in Acode's
# built-in Alpine terminal (apk). It does not install Cursor locally.
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
SCRIPT_VERSION="1"

REPO_URL=""
BRANCH=""
AGENT_URL=""
WORKSPACE_ROOT=""
DESTINATION=""
OPEN_AGENT=1
NON_INTERACTIVE=0
VERBOSE=0

log() {
  printf '==> %s\n' "$*"
}

ok() {
  printf '✓ %s\n' "$*"
}

warn() {
  printf '! %s\n' "$*" >&2
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<EOF
Usage:
  ${SCRIPT_NAME} [options]

Prepare or update an Android-visible Git checkout used by:
  Cursor Cloud Agent <-> Git remote <-> Termux checkout <-> Acode

Options:
  --repo URL           Git clone URL. Required for a new checkout; prompted
                       interactively when omitted.
  --branch NAME        Remote Cloud Agent branch to track. Leave empty to keep
                       the repository's current/default branch.
  --agent-url URL      Cursor Cloud Agent URL to open after synchronization.
                       Only https://cursor.com/agents URLs are accepted.
  --workspace PATH     Parent directory for repositories.
                       Default: ~/storage/shared/Cursor_Space
  --destination PATH   Exact checkout directory. For an existing checkout this
                       can be used without --repo; its origin URL is reused.
  --no-open            Do not open --agent-url in Android.
  --non-interactive    Never prompt. --repo is required unless --destination
                       is an existing Git checkout.
  --verbose            Show Git commands and additional status.
  -h, --help           Show this help.

Examples:
  ${SCRIPT_NAME} \\
    --repo git@github.com:OWNER/REPOSITORY.git \\
    --branch cursor/my-agent-branch \\
    --agent-url 'https://cursor.com/agents?selectedBcId=YOUR_AGENT_ID'

  ${SCRIPT_NAME} \\
    --repo https://github.com/OWNER/REPOSITORY.git \\
    --workspace "\$HOME/Cursor_Space" \\
    --no-open

Safety:
  - Existing local changes are never reset, stashed, committed, or overwritten.
  - Updates use git pull --ff-only and never force-push.
  - Keep SSH private keys and secrets in Termux private storage, never in
    Android shared storage.
EOF
}

expand_path() {
  local value="$1"
  case "$value" in
    "~")
      printf '%s\n' "$HOME"
      ;;
    "~/"*)
      printf '%s/%s\n' "$HOME" "${value#\~/}"
      ;;
    *)
      printf '%s\n' "$value"
      ;;
  esac
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --repo)
        [[ $# -ge 2 ]] || die "--repo requires a value."
        REPO_URL="$2"
        shift 2
        ;;
      --repo=*)
        REPO_URL="${1#*=}"
        shift
        ;;
      --branch)
        [[ $# -ge 2 ]] || die "--branch requires a value."
        BRANCH="$2"
        shift 2
        ;;
      --branch=*)
        BRANCH="${1#*=}"
        shift
        ;;
      --agent-url)
        [[ $# -ge 2 ]] || die "--agent-url requires a value."
        AGENT_URL="$2"
        shift 2
        ;;
      --agent-url=*)
        AGENT_URL="${1#*=}"
        shift
        ;;
      --workspace)
        [[ $# -ge 2 ]] || die "--workspace requires a value."
        WORKSPACE_ROOT="$2"
        shift 2
        ;;
      --workspace=*)
        WORKSPACE_ROOT="${1#*=}"
        shift
        ;;
      --destination)
        [[ $# -ge 2 ]] || die "--destination requires a value."
        DESTINATION="$2"
        shift 2
        ;;
      --destination=*)
        DESTINATION="${1#*=}"
        shift
        ;;
      --no-open)
        OPEN_AGENT=0
        shift
        ;;
      --non-interactive)
        NON_INTERACTIVE=1
        shift
        ;;
      --verbose)
        VERBOSE=1
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      --)
        shift
        break
        ;;
      *)
        die "Unknown option: $1 (try --help)."
        ;;
    esac
  done

  [[ $# -eq 0 ]] || die "Unexpected positional argument: $1"
}

require_termux() {
  if [[ -z "${PREFIX:-}" ]] || ! command -v pkg >/dev/null 2>&1; then
    cat >&2 <<'EOF'
Error: this script must run in the native Termux app.

Acode's built-in terminal is Alpine Linux and uses "apk"; it is not Termux.
Open the Termux app (or an AcodeX terminal connected to Termux) and run the
script there.
EOF
    exit 1
  fi

  if [[ -z "${TERMUX_VERSION:-}" && "$PREFIX" != */com.termux/files/usr ]]; then
    die "PREFIX does not look like native Termux: $PREFIX"
  fi
}

prompt_value() {
  local variable_name="$1"
  local prompt="$2"
  local required="${3:-0}"
  local reply=""

  if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
    [[ "$required" -eq 0 ]] && return 0
    die "${prompt%: } is required in --non-interactive mode."
  fi

  if [[ -r /dev/tty && -w /dev/tty ]]; then
    IFS= read -r -p "$prompt" reply </dev/tty
  elif [[ -t 0 ]]; then
    IFS= read -r -p "$prompt" reply
  elif [[ "$required" -eq 1 ]]; then
    die "Interactive input is unavailable. Pass the required value as an option."
  else
    return 0
  fi

  if [[ "$required" -eq 1 && -z "$reply" ]]; then
    die "${prompt%: } cannot be empty."
  fi

  printf -v "$variable_name" '%s' "$reply"
}

is_git_checkout() {
  local directory="$1"
  [[ -d "$directory" ]] &&
    git -C "$directory" rev-parse --is-inside-work-tree >/dev/null 2>&1
}

repo_name_from_url() {
  local value="$1"
  local name

  value="${value%/}"
  name="${value##*/}"
  name="${name%.git}"

  [[ -n "$name" && "$name" != "." && "$name" != ".." ]] ||
    die "Could not derive a repository name from: $1"
  [[ "$name" != *$'\n'* && "$name" != *"/"* ]] ||
    die "Unsafe repository name derived from: $1"

  printf '%s\n' "$name"
}

validate_agent_url() {
  [[ -z "$AGENT_URL" ]] && return 0

  if [[ ! "$AGENT_URL" =~ ^https://(www\.)?cursor\.com/agents([/?#].*)?$ ]]; then
    die "--agent-url must be an https://cursor.com/agents URL."
  fi
}

validate_branch() {
  [[ -z "$BRANCH" ]] && return 0
  git check-ref-format --branch "$BRANCH" >/dev/null 2>&1 ||
    die "Invalid Git branch name: $BRANCH"
}

resolve_inputs() {
  : "${HOME:?HOME is not set.}"

  if [[ -z "$WORKSPACE_ROOT" ]]; then
    WORKSPACE_ROOT="${HOME}/storage/shared/Cursor_Space"
  fi
  WORKSPACE_ROOT="$(expand_path "$WORKSPACE_ROOT")"

  if [[ -n "$DESTINATION" ]]; then
    DESTINATION="$(expand_path "$DESTINATION")"
  fi

  if [[ -z "$REPO_URL" && -n "$DESTINATION" ]] && is_git_checkout "$DESTINATION"; then
    REPO_URL="$(git -C "$DESTINATION" remote get-url origin 2>/dev/null || true)"
    [[ -n "$REPO_URL" ]] ||
      die "Existing checkout has no origin remote: $DESTINATION"
  fi

  if [[ -z "$REPO_URL" ]]; then
    prompt_value REPO_URL "Repository clone URL: " 1
  fi

  if [[ -z "$DESTINATION" ]]; then
    DESTINATION="${WORKSPACE_ROOT}/$(repo_name_from_url "$REPO_URL")"
  fi

  if [[ -z "$BRANCH" ]]; then
    prompt_value BRANCH "Cloud Agent branch (optional; Enter keeps the default): " 0
  fi

  if [[ -z "$AGENT_URL" ]]; then
    prompt_value AGENT_URL "Cursor Cloud Agent URL (optional): " 0
  fi

  validate_agent_url
}

is_ssh_repo_url() {
  case "$REPO_URL" in
    git@*:*|ssh://*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_shared_storage_path() {
  case "$DESTINATION" in
    "${HOME}/storage/"*|/storage/emulated/0/*|/sdcard/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

append_package() {
  local candidate="$1"
  local existing

  for existing in "${MISSING_PACKAGES[@]:-}"; do
    [[ "$existing" == "$candidate" ]] && return 0
  done
  MISSING_PACKAGES+=("$candidate")
}

install_prerequisites() {
  MISSING_PACKAGES=()

  command -v git >/dev/null 2>&1 || append_package git
  if is_ssh_repo_url && ! command -v ssh >/dev/null 2>&1; then
    append_package openssh
  fi
  if is_shared_storage_path && ! command -v termux-setup-storage >/dev/null 2>&1; then
    append_package termux-tools
  fi
  if [[ -n "$AGENT_URL" && "$OPEN_AGENT" -eq 1 ]] &&
    ! command -v termux-open-url >/dev/null 2>&1; then
    append_package termux-tools
  fi

  if [[ ${#MISSING_PACKAGES[@]} -gt 0 ]]; then
    log "Installing missing Termux packages: ${MISSING_PACKAGES[*]}"
    pkg install -y "${MISSING_PACKAGES[@]}"
  fi

  command -v git >/dev/null 2>&1 ||
    die "Git is unavailable after package installation."
}

ensure_shared_storage() {
  if ! is_shared_storage_path; then
    mkdir -p "$(dirname "$DESTINATION")"
    return 0
  fi

  warn "Android shared storage is convenient for Acode but does not provide"
  warn "normal Unix permissions, executable bits, or symlink behavior."
  warn "Keep SSH keys, tokens, .env files, and other secrets under \$HOME."

  if [[ "$DESTINATION" == "${HOME}/storage/"* && ! -d "${HOME}/storage/shared" ]]; then
    command -v termux-setup-storage >/dev/null 2>&1 ||
      die "termux-setup-storage is unavailable."

    log "Requesting Android shared-storage access..."
    warn "Approve the Android storage permission prompt."
    termux-setup-storage

    local attempts=0
    while [[ ! -d "${HOME}/storage/shared" && "$attempts" -lt 20 ]]; do
      sleep 1
      attempts=$((attempts + 1))
    done

    [[ -d "${HOME}/storage/shared" ]] ||
      die "Shared storage is not ready. Grant Termux storage permission, then rerun."
  fi

  mkdir -p "$(dirname "$DESTINATION")" ||
    die "Could not create the workspace parent: $(dirname "$DESTINATION")"
}

show_git_command() {
  [[ "$VERBOSE" -eq 1 ]] || return 0
  printf '+'
  printf ' %q' "$@"
  printf '\n'
}

run_git() {
  show_git_command git "$@"
  git "$@"
}

clone_or_verify_checkout() {
  if is_git_checkout "$DESTINATION"; then
    local existing_origin
    existing_origin="$(git -C "$DESTINATION" remote get-url origin 2>/dev/null || true)"
    [[ -n "$existing_origin" ]] ||
      die "Existing checkout has no origin remote: $DESTINATION"

    if [[ "$existing_origin" != "$REPO_URL" ]]; then
      die "Existing origin does not match --repo.
  checkout: $DESTINATION
  existing: $existing_origin
  requested: $REPO_URL
Use the existing origin URL or choose another --destination."
    fi
    ok "Using existing checkout: $DESTINATION"
    return 0
  fi

  if [[ -e "$DESTINATION" ]]; then
    if [[ ! -d "$DESTINATION" ]]; then
      die "Destination exists and is not a directory: $DESTINATION"
    fi
    if [[ -n "$(ls -A "$DESTINATION" 2>/dev/null)" ]]; then
      die "Destination exists, is not empty, and is not a Git checkout: $DESTINATION"
    fi
  fi

  log "Cloning repository..."
  run_git clone "$REPO_URL" "$DESTINATION"
  ok "Cloned repository into: $DESTINATION"
}

require_clean_worktree() {
  local changes
  changes="$(git -C "$DESTINATION" status --porcelain)"
  if [[ -n "$changes" ]]; then
    printf '%s\n' "$changes" >&2
    die "Local changes are present. Commit or stash them before synchronization.
No files were reset, stashed, committed, or overwritten."
  fi
}

remote_branch_exists() {
  local branch="$1"
  git -C "$DESTINATION" show-ref --verify --quiet "refs/remotes/origin/${branch}"
}

local_branch_exists() {
  local branch="$1"
  git -C "$DESTINATION" show-ref --verify --quiet "refs/heads/${branch}"
}

checkout_requested_branch() {
  [[ -z "$BRANCH" ]] && return 0

  local current_branch
  current_branch="$(git -C "$DESTINATION" symbolic-ref --quiet --short HEAD 2>/dev/null || true)"

  if [[ "$current_branch" == "$BRANCH" ]]; then
    return 0
  fi

  require_clean_worktree

  if local_branch_exists "$BRANCH"; then
    run_git -C "$DESTINATION" switch "$BRANCH"
  elif remote_branch_exists "$BRANCH"; then
    run_git -C "$DESTINATION" switch --track -c "$BRANCH" "origin/$BRANCH"
  else
    die "Branch was not found locally or on origin: $BRANCH
Copy the exact branch name from Cursor Cloud Agents and rerun."
  fi
}

set_upstream_if_available() {
  local current_branch="$1"
  [[ -n "$current_branch" ]] || return 0

  if git -C "$DESTINATION" rev-parse --abbrev-ref --symbolic-full-name \
    '@{upstream}' >/dev/null 2>&1; then
    return 0
  fi

  if remote_branch_exists "$current_branch"; then
    run_git -C "$DESTINATION" branch \
      --set-upstream-to="origin/${current_branch}" "$current_branch"
  fi
}

synchronize_checkout() {
  log "Fetching origin..."
  run_git -C "$DESTINATION" fetch origin --prune

  validate_branch
  checkout_requested_branch

  local current_branch upstream
  current_branch="$(git -C "$DESTINATION" symbolic-ref --quiet --short HEAD 2>/dev/null || true)"
  set_upstream_if_available "$current_branch"
  upstream="$(git -C "$DESTINATION" rev-parse --abbrev-ref --symbolic-full-name \
    '@{upstream}' 2>/dev/null || true)"

  if [[ -z "$upstream" ]]; then
    warn "Current branch has no upstream; fetch completed without pulling."
    return 0
  fi

  require_clean_worktree
  log "Fast-forwarding from ${upstream}..."
  run_git -C "$DESTINATION" pull --ff-only
  ok "Repository synchronized."
}

open_cloud_agent() {
  [[ -n "$AGENT_URL" && "$OPEN_AGENT" -eq 1 ]] || return 0

  if ! command -v termux-open-url >/dev/null 2>&1; then
    warn "termux-open-url is unavailable; open this URL manually:"
    warn "  $AGENT_URL"
    return 0
  fi

  log "Opening Cursor Cloud Agents in Android..."
  termux-open-url "$AGENT_URL"
}

print_summary() {
  local current_branch android_path
  current_branch="$(git -C "$DESTINATION" symbolic-ref --quiet --short HEAD 2>/dev/null || true)"
  android_path="$DESTINATION"
  if [[ "$DESTINATION" == "${HOME}/storage/shared/"* ]]; then
    android_path="Internal storage/${DESTINATION#"${HOME}/storage/shared/"}"
  fi

  cat <<EOF

============================================================
Cursor Cloud Agent + Acode workspace ready
============================================================
Repository:    $DESTINATION
Branch:        ${current_branch:-detached HEAD}
Acode folder:  $android_path

In Acode:
  1. Choose Open folder / Add path.
  2. Select: $android_path
  3. Edit files in Acode. Run Git commands in native Termux.

Daily synchronization:
  cd $(printf '%q' "$DESTINATION")
  git status
  git fetch origin --prune
  git pull --ff-only

Before sending local edits:
  git status
  git diff
  git add <reviewed-files>
  git commit -m "Describe the change"
  git push

Review Cloud Agent diffs and test changes before merging. AcodeX is optional
and is not required for this Git-based workflow.
EOF
}

main() {
  parse_args "$@"
  require_termux
  resolve_inputs
  install_prerequisites
  ensure_shared_storage
  clone_or_verify_checkout
  synchronize_checkout
  open_cloud_agent
  print_summary
}

main "$@"
