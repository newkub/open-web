#!/usr/bin/env bash
# Assemble the single-worker site: landing at /, IDE at /app/.
# Output: dist-site/ — pointed to by wrangler.jsonc assets.directory.
set -euo pipefail
cd "$(dirname "$0")/.."

bun run --cwd apps/landing build
bun run --cwd apps/web build

rm -rf dist-site
mkdir -p dist-site/app
cp -r apps/landing/dist/. dist-site/
cp -r apps/web/dist/. dist-site/app/

echo "dist-site ready: $(find dist-site -type f | wc -l) files"
