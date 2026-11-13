# open-in-web

One CLI to open anything in a web browser: local files and directories as a self-contained HTML preview, URLs directly, and diffs — code diffs (PR / ref / branch / file pair) and UI diffs between two URLs via Playwright screenshots + pixelmatch.

Merged successor of `open-files-in-web` and `open-diff-in-web` (which now lives in `diff/`).

## Commands

| Command | What it does |
|---------|--------------|
| `open-in-web <path-or-url>` | URL → browser; file/dir → static HTML preview via `file://` |
| `open-in-web preview <path>` | Same preview flow, explicit |
| `open-in-web diff` | Diff viewer source dialog |
| `open-in-web diff pr <n> [--repo owner/repo]` | GitHub PR diff |
| `open-in-web diff git <ref> [--repo <path>]` | Ref vs working tree |
| `open-in-web diff branch <base>..<head>` | Branch range |
| `open-in-web diff file <old> <new>` | Two files on disk |
| `open-in-web diff ui <before> <after> [--viewport 1280x800] [--full-page] [--threshold 0.1] [--wait 1500]` | UI diff — screenshots + pixelmatch, slider/side-by-side/diff views |
| `open-in-web diff shot <url> --out shot.png` | Single screenshot |

Aliases: `ofw`, `open-files`, `open-in-open-terminal`. Global shims live in `~/.bun/bin`.

## Layout

| Path | Purpose |
|------|---------|
| `src/` | CLI (commander) + open-url library + preview pipeline |
| `preview/` | File-preview SPA → `dist/preview` |
| `diff/` | Nested package `open-in-web-diff` — Bun server + SolidJS/UnoCSS diff SPA |
| `dist/` | `cli.js`, `diff-server/serve.js`, `preview/`, `*.exe` |

## Build

```bash
bun install        # root
bun --cwd diff install
bun run build      # preview + diff + cli + compile → dist/
```

Outputs: `dist/open-in-web.exe` (+ `ofw.exe`, `open-files.exe`, `open-in-open-terminal.exe`), `dist/presentation/cli/cli.js`, `dist/diff-server/serve.js`, `diff/dist/`.

## Diff viewer

- Server: `bun src/presentation/cli/cli.ts diff …` resolves `dist/diff-server/serve.js` → `diff/src/serve.ts`, spawns `bun`; port `OPEN_DIFF_PORT` (4780), `OPEN_DIFF_NO_OPEN=1` suppresses auto-open.
- UI diff needs `bunx playwright` + chromium: `bunx playwright install chromium` once; `PLAYWRIGHT_BROWSERS_PATH` is honored.
- The diff source lives in the URL query string — copy the URL to share a diff.

See `SKILL.md` for the agent-facing workflow and `diff/README.md` for diff-viewer details.
