---
name: open-in-web
description: Standalone skill for opening files, URLs, and diffs in a web browser
---

## Goal

Agent guidance for the `open-in-web` skill workspace — the merged successor of `open-files-in-web` and `open-diff-in-web`.

## Scope

This workspace is a standalone Bun/TypeScript package that provides the `open-in-web` CLI. It opens URLs, local files, and directories in the browser (static-first SolidJS + TanStack Solid Router preview), and its `diff` subcommand launches the diff viewer in `diff/` — code diffs (`@pierre/diffs`) plus UI diffs between two URLs (Playwright screenshots + `pixelmatch`).

## Execute

Run the following scripts from the workspace root:

| Script | Command |
|---|---|
| `dev` | `bun run src/index.ts` |
| `build` | `bun run build` (build:preview + build:diff + build:cli + build:compile) |
| `build:preview` | `bunx vite build --config preview/vite.config.ts` |
| `build:diff` | `bun --cwd diff run build && bun build diff/src/serve.ts --outdir dist/diff-server --target bun` |
| `build:cli` | `bun build src/index.ts src/presentation/cli/cli.ts --outdir dist --target bun --external open && tsc --emitDeclarationOnly` |
| `build:compile` | `bun build --compile src/presentation/cli/cli.ts --outfile dist/open-in-web.exe` (+ `ofw`/`open-files`/`open-in-open-terminal` copies) |
| `build:watch` | `bunup --watch` |
| `typecheck` | `bun run typecheck:tsrs` (`bun check` script is stale) |
| `typecheck:tsrs` | `tsrs --noEmit` |
| `test` | `bun test` |
| `verify` | `bun run typecheck && bun run test && bun run build` |
| `deps:analyze` | `bunx depcheck` |
| `clean` | `bunx rimraf node_modules dist` |

Diff lane (run inside `diff/`): `bun install`, `bun run build` (vite → `diff/dist`), `bun run typecheck` (`tsrs --noEmit`), `bun src/serve.ts [pr|git|branch|file|ui|shot]`.

### Architecture

| Tech | Skill |
|---|---|
| typescript | `tech: /follow-lang typescript` |
| bun | `tech: /use-scripts bun` |
| vite | `tech: /use-cli vite` |
| solidjs | `tech: /follow-solidjs` |
| playwright | `tech: /browser` (capture via `bunx playwright screenshot`) |

- `src/` — CLI + preview library (commander, clean-ish modules/adapters/presentation)
- `preview/` — the file-preview SPA built to `dist/preview`
- `diff/` — nested package `open-in-web-diff`: Bun server (`diff/src/serve.ts`) + SolidJS/UnoCSS diff SPA; `ui` sources spawn `bunx playwright screenshot` and compare with `pixelmatch`
- `open-in-web diff …` resolves the server as `dist/diff-server/serve.js` → `diff/src/serve.ts` and spawns `bun` — requires `bun` on `PATH`

## Rules

- Keep `SKILL.md` under 250 lines.
- Map tech stack with `tech: /follow-<skill>`.
- Do not duplicate root conventions.
- Default preview mode is static single-file HTML (no HTTP server); use `--serve` to start a server.
- Image/PDF resources are embedded as base64 data URLs in static mode.
- Directory navigation uses hash-based client routing in static mode.
- The compiled `.exe` expects `dist/preview` and `dist/diff` assets next to it; `diff` also needs `bun` + playwright browsers.
- `diff/` is a nested package with its own `package.json`/`tsconfig` — do not merge its deps into the root manifest.
- Global Windows command shims live in `~/.bun/bin`: `open-in-web.cmd`, `ofw.cmd`, `open-files.cmd`, `open-in-open-terminal.cmd`.

## Expected Outcome

- `open-in-web` AGENTS.md is accurate and committed.
