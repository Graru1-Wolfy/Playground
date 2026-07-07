#!/usr/bin/env bash
# Copy generated bounce data into Vite dist for GitHub Pages.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/data/generated"
DEST="${1:-$ROOT/apps/web/dist/data}"

if [[ ! -d "$SRC" ]]; then
  echo "No data at $SRC — skipping"
  exit 0
fi

mkdir -p "$DEST"
cp -a "$SRC/." "$DEST/"
echo "Copied generated data to $DEST"
