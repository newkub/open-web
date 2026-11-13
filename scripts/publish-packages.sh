#!/usr/bin/env bash
# Publish @wrikka/open-web to npm.
# Bun workspace → `bun publish` (per ship/release rules). Requires npm auth
# (`npm login` or NPM_TOKEN) and `bun run packages:build` first.
set -euo pipefail
cd "$(dirname "$0")/.."

bun run packages:build

(cd packages/open-web && bun publish --access public)

echo "Done — verify with: bun pm view @wrikka/open-web  (or npm view)"
