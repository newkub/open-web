#!/usr/bin/env bash
# Publish @open-web/* packages to npm in dependency order.
# Bun workspace → `bun publish` (per ship/release rules). Requires `bun publish`
# auth (npm-compatible token/login) and `bun run packages:build` first.
set -euo pipefail
cd "$(dirname "$0")/.."

bun run packages:build

# types-bun is a dependency of diff-bun/runtime-bun — publish it first.
for pkg in types-bun diff-bun icons-bun runtime-bun theme-bun; do
  echo "==> publishing @open-web/$pkg"
  (cd "packages/$pkg" && bun publish --access public)
done

echo "Done — verify with: bun pm view @open-web/runtime-bun  (or npm view)"
