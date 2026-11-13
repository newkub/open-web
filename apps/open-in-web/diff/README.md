# open-in-web diff

Local, read-only diff viewer for pull requests, commit ranges, branch comparisons, file pairs, and UI (visual) diffs between two URLs. Code diffs render with `@pierre/diffs` `CodeView` on a SolidJS + UnoCSS frontend; UI diffs screenshot both pages with Playwright and compare pixels with `pixelmatch`. Served by a Bun server that shells out to `git`, `gh`, and `bunx playwright`.

## Features

- Five diff sources: GitHub pull request, ref vs working tree, branch range, two files on disk, two URLs (UI diff)
- UI diff: Playwright screenshots at a pinned viewport, pixelmatch comparison, slider / side-by-side / diff-image views, mismatch percentage
- 5 theme pairs (Pierre, GitHub, One, Vitesse, Catppuccin) x system/light/dark mode
- Split or unified view, indicator styles, inline word diff, hunk separators, backgrounds, line numbers
- Wrap, font scale 80-150%, all/focus layout, sticky file headers, line hover and line selection
- Sidebar file tree with search, status, +/- counts, per-file viewed toggles, and keyboard navigation
- PR metadata in the header: state, title, author, check status, and an open-on-GitHub link
- Header PR actions (approve, merge variants, comment, checkout, close) that run real `gh`/`git` commands
- Options and viewed-file state persist to `localStorage`
- Shareable URLs: the diff source lives in the query string
- Accessibility: real button semantics, labelled controls, focus-trapped dialogs with focus return, skip link, live regions, and full keyboard operation

## Requirements

- Bun 1.2+
- `git` on `PATH`
- `gh` on `PATH` and authenticated (pull request sources and PR actions only)
- `bunx playwright` with the chromium headless shell for `ui` sources and `shot` — run `bunx playwright install chromium` once; `PLAYWRIGHT_BROWSERS_PATH` is honored when the default location is read-only or low on disk

## Quick Start

Run from this skill directory:

```bash
bun install
bun run build
bun src/serve.ts pr 128 --repo owner/repo
```

The server prints `open-in-web diff running at http://localhost:<port>` and opens the browser. Use `bun run start -- <args>` as an equivalent entry point.

Run with no arguments to open the app with the source dialog, which can pick a PR, a ref, a branch range, two files, or a UI diff.

## Sources

| Source | Command |
|--------|---------|
| GitHub PR | `bun src/serve.ts pr <number> [--repo owner/repo]` |
| Git ref vs HEAD | `bun src/serve.ts git <ref> [--repo <path>]` |
| Branch range | `bun src/serve.ts branch <base>..<head> [--repo <path>]` |
| Two files | `bun src/serve.ts file <old> <new>` |
| UI diff | `bun src/serve.ts ui <before-url> <after-url> [--viewport 1280x800] [--full-page] [--threshold 0.1] [--wait 1500]` |
| Single screenshot | `bun src/serve.ts shot <url> --out shot.png [--viewport 1280x800] [--full-page] [--wait 1500]` |
| Source dialog | `bun src/serve.ts` |

- `--repo` takes `owner/repo` for `gh` and a filesystem path for `git`
- A PR without `--repo` resolves the current directory with `gh repo view --json nameWithOwner`
- The in-app source dialog can switch sources without restarting the server
- `ui` accepts the same options as URL query params: `?source=ui&before=…&after=…&viewport=1280x800&fullPage=true&threshold=0.1&waitMs=3000`
- UI diff tips: pin `viewport` across environments, pass `--wait` for client-rendered pages, keep `threshold` at `0.1` unless you need sensitivity to anti-aliasing; dynamic content (timestamps, ads, A/B) still flakes — diff a masked or stabilized build when possible

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPEN_DIFF_PORT` | `4780` | HTTP port |
| `OPEN_DIFF_NO_OPEN` | unset | `1` suppresses the automatic browser launch |
| `PLAYWRIGHT_BROWSERS_PATH` | playwright default | Browser download location for `ui`/`shot` captures |

## Keyboard Shortcuts

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
| `n` / `p` | Next / previous file |
| `Shift+Down` / `Shift+Up` | Next / previous file |
| `r` | Reload diff |
| `Esc` | Close overlays or blur the focused field |

Shortcuts are suppressed while a dialog is open and while typing in an input, textarea, or select.

## Viewer Options

All options apply to `CodeView` immediately and persist to `localStorage` under `od:options`.

| Group | Options |
|-------|---------|
| Appearance | Theme mode `system`/`light`/`dark`; theme pair Pierre, GitHub, One, Vitesse, Catppuccin; backgrounds; line numbers |
| Diff | Split/unified; indicators `bars`/`classic`/`none`; inline diff `word-alt`/`word-line`/`word`/`char`/`none`; hunk separators `line-info`/`line-info-basic`/`metadata`/`simple` |
| Layout | Wrap; layout `all`/`focus`; sticky headers; sidebar |
| Type | Font scale 80-150% |
| Interaction | Line hover; line selection |

Defaults live in `src/lib/options.ts`.

## Accessibility

- Every clickable surface is a native `<button>` (or is wrapped in one) with `type="button"`
- Icon-only controls have `aria-label`; toggles expose `aria-pressed`, the PR actions menu exposes `aria-haspopup`/`aria-expanded`/`aria-controls` with `role="menu"` and `role="menuitem"` children
- Dialogs use `role="dialog"`, `aria-modal`, unique `aria-labelledby`/`aria-describedby`, a Tab focus trap, Escape to close, and focus return to the opener
- Background content is `inert` while a modal is open, so Tab stays inside the dialog
- A skip link jumps to the diff region; the diff area is a labelled, focusable `section`
- Status, toast, and PR action feedback use `role="status"`/`role="alert"` with `aria-live`; the loading bar is a `progressbar`
- Decorative icons are `aria-hidden`, form fields are wrapped in labels or labelled explicitly, and every interactive element has a visible `:focus-visible` ring
- `prefers-reduced-motion` disables non-essential animation

## Architecture

| Path | Purpose |
|------|---------|
| `src/serve.ts` | Bun HTTP server: static `dist/` + `/api/*` |
| `src/cli.ts` | Parses `pr`/`git`/`branch`/`file`/`ui`/`shot` arguments into a source and query string |
| `src/server/api.ts` | API routes for diff, refs, PRs, checks, and PR actions |
| `src/server/ui.ts` | Playwright screenshot capture + pixelmatch comparison for `ui` sources |
| `src/server/actions.ts` | `git`/`gh` command execution |
| `src/components/App.tsx` | App shell, source state, overlay coordination, shortcuts |
| `src/components/DiffPanel.tsx` | `CodeView` host and diff loading |
| `src/components/ui.tsx`, `ui-layout.tsx` | Design-system primitives, modal, dialog focus hook |
| `src/types.ts` | Shared source, option, and diff types |
| `uno.config.ts`, `theme.css` | UnoCSS config and theme tokens |

The browser pings `/api/ping` every 2 seconds; closing the tab prompts `(r)eopen`, `(q)uit`, or `(c)ontinue` in the terminal. Non-TTY sessions keep serving.

## Limitations

- Binary files are not rendered
- PR diffs that exceed the GitHub API limit are unsupported; the viewer reports the limitation instead of showing a partial diff
- PR actions mutate shared state and must be triggered explicitly by the user
- The viewer never modifies the inspected repository and never stages or commits anything

## Development

```bash
bun run dev        # Vite dev server
bun run build      # Production build into dist/
bun run typecheck  # tsrs --noEmit
bun run start -- git HEAD~1
```

Rebuild after changing `src/`; otherwise the browser serves stale assets.
