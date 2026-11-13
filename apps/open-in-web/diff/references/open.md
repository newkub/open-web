# Open Workflow

> Referenced from `open-in-web diff` `### 3. Open Diff Viewer`. Launches the diff viewer; never edits the target repo.

## Sources

| Source | Command |
|--------|---------|
| GitHub PR | `pr <number> [--repo owner/repo]` |
| Git ref vs HEAD | `git <ref> [--repo path]` |
| Branch range | `branch <base>..<head> [--repo path]` |
| Two files | `file <old> <new>` |
| UI visual diff | `ui <before-url> <after-url> [--viewport WxH] [--full-page] [--threshold 0..1] [--wait ms]` |
| Screenshot only | `shot <url> --out <path.png>` |

- `--repo` takes `owner/repo` for `gh` and a path for `git`
- Missing `--repo` for `pr` → `gh repo view --json nameWithOwner`
- No subcommand → open the app with no default source; the source dialog takes over

## App

- Location: `diff/` subpackage of `D:\opensource\open-in-web` — merged product `open-in-web`; no copy step, no temporary workspace
- Stack: `@pierre/diffs` ^1.6.1, `solid-js` ^1.9.0, `unocss` ^66.10.2 + `@unocss/preset-wind4` ^66.10.0 + `@iconify-json/mdi`, `vite` ^7.1.0, Bun server
- Server entry: `src/serve.ts` (static `dist/` + `/api/*`); API in `src/server/api.ts`; CLI parsing in `src/cli.ts`; actions in `src/server/actions.ts`
- Theme tokens: `theme.css`; UnoCSS config: `uno.config.ts` (presetWind4, `dark: 'class'`)
- Viewer options and defaults: `src/lib/options.ts`; shared types: `src/types.ts`

## 1. Prepare

1. Resolve the app directory: `D:\opensource\open-in-web\diff` (or the repo root for the merged `open-in-web diff` CLI)
2. `node_modules` missing → `bun install` inside that directory (root install covers it when workspaces are linked)
3. `dist/index.html` missing, or any file under `src/` newer than `dist/` → `bun run build` (root: `bun run build:diff`)
4. Do not copy the app into the project and do not modify the project manifest or lockfile
5. UI sources need Playwright Chromium once: `bunx playwright install chromium`

## 2. Run And Open

1. Run `bun src/serve.ts <subcommand> [args] [--repo ...]` from `diff/` (or `open-in-web diff <subcommand> ...` / `bun run start -- <subcommand> ...` from the repo root)
2. Wait for `open-in-web diff running at http://localhost:<port>`
3. The server opens the browser automatically; if it does not, use `/open web` or the OS opener
4. Env vars: `OPEN_DIFF_PORT` sets the port (default `4780`), `OPEN_DIFF_NO_OPEN=1` suppresses auto-open

## 3. Viewer Options

All options persist to `localStorage` (`od:options`) and apply to `CodeView` without a reload.

| Group | Options |
|-------|---------|
| Appearance | theme mode `system`/`light`/`dark`; theme pair Pierre, GitHub, One, Vitesse, Catppuccin; backgrounds; line numbers |
| Diff | split/unified; indicators `bars`/`classic`/`none`; inline diff `word-alt`/`word-line`/`word`/`char`/`none`; hunk separators `line-info`/`line-info-basic`/`metadata`/`simple` |
| Layout | wrap; layout `all`/`focus`; sticky headers; sidebar |
| Type | font scale 80–150% |
| Interaction | line hover; line selection |

## 4. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `?` | Shortcut help |
| `/` | Focus file search |
| `t` | Cycle theme mode |
| `s` | Toggle sidebar |
| `o` | Open options panel |
| `d` | Toggle split/unified |
| `w` | Toggle wrap |
| `f` | Toggle focus layout |
| `n` / `p` | Next / previous file (also `Shift+↓` / `Shift+↑`) |
| `r` | Reload diff |
| `Esc` | Close overlays or blur the field |

## 5. Source Dialog And Header

- The header source button opens the dialog: PR picker for the repo, branches/tags/commits, branch range, or old/new file compare
- Header shows source label, +/- totals, file count, and (for PRs) state, title, author, checks pill, and an "Open on GitHub" link
- Copy-link button preserves the current query string so the view can be reopened directly
- PR actions in the header: approve, squash/rebase/merge commit, comment, checkout, close — these run real `gh`/`git` commands; click only, and only when the user asks
- Checks poll `gh pr checks` while pending; failing or pending checks do not block viewing

## 6. Close-Tab Behavior

- Frontend pings `/api/ping` every 2 seconds
- Frontend sends `/api/close` via `navigator.sendBeacon` on `beforeunload`
- Tab closed or pings stop for over 5 seconds → terminal prompt:
  - `(r)eopen` → reopen the browser
  - `(q)uit` → shut down the server
  - `(c)ontinue` → keep working
- Not a TTY → the server keeps serving

## 7. Verify

1. Header shows the correct source and +/- totals
2. Sidebar lists the changed files with status icons and sorted/filtered search works
3. Diff area renders line numbers, +/- markers, syntax colors, and word-level inline diff
4. Split/unified, wrap, focus layout, theme mode, and theme pair switch without a reload
5. Options survive a reload; shortcuts (`?`, `/`, `o`) open their surfaces
6. Closing the tab shows the terminal prompt

## 8. Safety

- Dependencies install only inside the skill directory
- Never modify the target repo's `package.json` or lockfile
- Binary files and PR diffs beyond the GitHub API limit are unsupported — report the limitation
- Approve/merge/comment/close/checkout mutate shared state: confirm with the user before running them
