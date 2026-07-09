#!/usr/bin/env bash
# Print URLs to open the dev server from an Android device on the same Wi‑Fi network.
set -euo pipefail

PORT="${1:-5173}"
BASE="${VITE_BASE_PATH:-/Playground/}"

ips=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+\.' | grep -v '^127\.' || true)

if [ -z "$ips" ]; then
  ip=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' || true)
  [ -n "$ip" ] && ips="$ip"
fi

echo "Start the dev server (LAN): npm run dev:web:android"
echo ""
echo "On Android Chrome, open one of:"
for ip in $ips; do
  echo "  http://${ip}:${PORT}${BASE}"
done
echo ""
echo "Install: Chrome menu → Add to Home screen / Install app"
