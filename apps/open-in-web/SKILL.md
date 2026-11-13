---
name: open-in-web
description: Open files, directories, URLs, and diffs in a web browser — preview CLI plus code/UI diff viewer
argument-hint: "[path-or-url] | preview [path] | diff [pr|git|branch|file|ui|shot] [args]"

---

## Goal

Open anything in a web browser from one CLI: local files and directories render as a self-contained HTML preview (`file://`, no server), URLs open directly, and `diff` launches the diff viewer — code diffs (PR / ref / branch / file pair) and UI diffs between two URLs (Playwright screenshots + pixelmatch)

## Scope

- Works with files, directories, URLs, and diff sources you want to see in a browser
- File/dir preview: SolidJS + TanStack Solid Router previewer with TOC, syntax highlight, Noto Sans Thai
- Diff viewer: `@pierre/diffs` `CodeView` for code; slider/side-by-side/diff-image UI compare for `ui` sources
- Builds into standalone `.exe` files; global commands `open-in-web`, `ofw`, `open-files`, `open-in-open-terminal`
- `diff` requires `bun` on `PATH` (it spawns the bundled or source diff server) and, for `ui`/`shot`, `bunx playwright` with chromium installed
- Not for opening websites plainly — use `/open web`; not for publishing — use `/deploy`

| Argument | Routes to |
|----------|-----------|
| path-or-url | `### 3` — URL opens directly; local file/dir goes through `### 4` |
| `preview <path>` | `### 4` — same static-first flow |
| `diff <source> [args]` | `### 5` — forwards to the diff server (`pr`, `git`, `branch`, `file`, `ui`, `shot`, or none) |
| none | `### 1` — identify the target from context; build first per `### 2` |

## Execute

### 1. Prepare

> Goal: Check the workspace and target

1. Read `AGENTS.md` to learn the project conventions
2. Identify the target: file, directory, URL, or diff source
3. Verify the target exists and is accessible
4. Check that `open-in-web/` has the complete CLI source (`src/`) and the diff app (`diff/`)

### 2. Build

> Goal: Build the CLI, preview, and diff lanes

1. cd into `open-in-web/`
2. Run `bun install` at the root and inside `diff/`
3. Run `bun run build` — produces `dist/preview`, `dist/presentation/cli/cli.js`, `dist/diff-server/serve.js`, `diff/dist/`, and `dist/open-in-web.exe` (+ `ofw.exe`, `open-files.exe`, `open-in-open-terminal.exe` aliases)
4. If the build fails → do `/resolve errors` then retry up to 3 times
5. `bun run verify` runs tests + build; `bun run typecheck:tsrs` typechecks the CLI, `cd diff && bun run typecheck` the diff app
6. First `diff ui`/`shot` use → `bunx playwright install chromium` once (`PLAYWRIGHT_BROWSERS_PATH` honored)

### 3. Open URL Or Local Path

> Goal: Open a URL, local file, or directory in a browser

1. URL (`http://`, `https://`, `file://`) → open directly in a browser
2. Existing file/directory → static HTML preview opened via `file://`
3. Commands:
   - `bun dist/presentation/cli/cli.js <path-or-url>`
   - `dist/open-in-web.exe <path-or-url>`
   - `ofw <path-or-url>` / `open-files <path-or-url>` / `open-in-web <path-or-url>` (global aliases)
4. CLI options: `-b, --browser`, `-s, --static`, `--no-open`

### 4. Preview Local Files (Static-First)

> Goal: Render files as HTML before opening

1. `ofw <path>` or `ofw preview <path>`
2. Default: single self-contained HTML in temp dir, inlined JS/CSS, base64 images/pdfs, opened via `file://` — no HTTP server
3. `--serve` for HTTP server mode (large files, raw access); `--no-open` generates without opening
4. Supports markdown, code, image, pdf, csv, json, html, directories (hash-based child navigation)

### 5. Diff Viewer

> Goal: Show code or UI diffs in the browser

1. `open-in-web diff` — source dialog (PR, commit range, branches, two files, UI diff)
2. Code sources: `diff pr <n> [--repo owner/repo]`, `diff git <ref>`, `diff branch <base>..<head>`, `diff file <old> <new>`
3. UI source: `diff ui <before-url> <after-url> [--viewport 1280x800] [--full-page] [--threshold 0.1] [--wait 1500]` — screenshots both pages, pixelmatch, slider/side-by-side/diff views with mismatch %
4. `diff shot <url> --out shot.png` — single screenshot for debugging captures
5. The diff source lives in the URL query — copy it to share; `OPEN_DIFF_PORT` (4780) and `OPEN_DIFF_NO_OPEN=1` control the server
6. Server resolution order: `dist/diff-server/serve.js` (built) → `diff/src/serve.ts` (source); both need `bun` on `PATH`

### 6. Verify And Report

> Goal: Confirm the open/diff succeeded

1. Check the process exit code; on failure → `/resolve errors`
2. `/report before-after` summarizing the target and the URL opened
3. `/suggest-next-action` for the next step

## Rules

### 1. Build First

- Build before first use or after a pull/clone; `bun install` must pass before `bun run build`

### 2. URL Safety

- Verify the path exists before converting to `file://`; do not open risky system paths without confirmation
- `diff ui` fetches arbitrary URLs — only diff pages the user names; previews may contain auth'd content, treat screenshots as sensitive

### 3. Fallback

- CLI not built or failing → `open`, `start`, `xdg-open`
- File cannot be rendered → open raw with `file://`
- `diff` server missing → run `bun run build`; playwright missing → `bunx playwright install chromium`

### 4. Diff Specifics

- UI diff flake control: pin `--viewport`, raise `--wait` for client-rendered pages, keep `--threshold 0.1`; dynamic content (timestamps, ads, A/B) still diffs — use stabilized builds when it matters
- The viewer is read-only for code diffs; PR actions mutate GitHub state and must be user-triggered

## Expected Outcome

- The browser opens the target as requested (preview, URL, or diff report)
- CLI and `.exe` lanes work; `diff` spawns the viewer on `OPEN_DIFF_PORT`
- No broken references after the build
- A report of the target and the URL used, plus a clear next action
