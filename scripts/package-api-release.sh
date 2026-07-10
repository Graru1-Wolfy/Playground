#!/usr/bin/env bash
# Package @playground/api for offline deploy / GitHub release download.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('${ROOT}/apps/api/package.json').version")"
STAGING="${ROOT}/dist-release/bounce-api-v${VERSION}"
ARCHIVE="${ROOT}/dist-release/bounce-api-v${VERSION}.tar.gz"
ARTIFACT="/opt/cursor/artifacts/bounce-api-v${VERSION}.tar.gz"

cd "${ROOT}"
npm run build:packages
npm run build:api

rm -rf "${STAGING}" "${ARCHIVE}"
mkdir -p "${STAGING}"

cp apps/api/package.json "${STAGING}/"
cp apps/api/README.md "${STAGING}/"
cp -r apps/api/dist "${STAGING}/dist"

# Production deps only (workspace packages must be built alongside)
mkdir -p "${STAGING}/node_modules/@playground"
cp -r packages/engine-fast/dist "${STAGING}/node_modules/@playground/engine-fast-dist" 2>/dev/null || true

cat > "${STAGING}/start.sh" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
export NODE_PATH="${DIR}/../../packages/engine-fast/dist:${DIR}/../../packages/schema/dist:${NODE_PATH:-}"
cd "${DIR}/../.."
node apps/api/dist/index.js
EOF
chmod +x "${STAGING}/start.sh"

# Simpler: run from repo after extract — include RUN.md
cat > "${STAGING}/INSTALL.md" << EOF
# Bounce Check API v${VERSION}

## Quick start (from monorepo root after extracting)

\`\`\`bash
npm ci
npm run build:packages
npm run start -w @playground/api
\`\`\`

Server: http://localhost:8787

## Contents

- \`dist/\` — compiled API server
- \`package.json\` — package metadata

Extract this tarball into \`apps/api/\` of the Playground repo, or run \`node dist/index.js\` with
\`@playground/engine-fast\` and \`@playground/schema\` available in node_modules.
EOF

tar -czf "${ARCHIVE}" -C "${ROOT}/dist-release" "bounce-api-v${VERSION}"
mkdir -p /opt/cursor/artifacts "$(dirname "${ARTIFACT}")"
cp "${ARCHIVE}" "${ARTIFACT}"

echo "API release package:"
echo "  ${ARCHIVE}"
echo "  ${ARTIFACT}"
