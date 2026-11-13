# open-web

In-browser IDE and CLI for opening anything without a server: paste a GitHub URL (public or private) and get a file tree, a real editor, a terminal, and a live preview — backed by a Rust/WASM virtual filesystem. A companion CLI opens local files, directories, URLs, and diffs in the browser.

Live: https://open-web.newkubise.workers.dev — landing at `/`, IDE at `/app/`

## Stack

- **Rust → WASM** (`packages/vfs-rust`, `packages/protocol-rust`, `packages/wasm-rust`): virtual filesystem + shared types + wasm-bindgen bindings — the single source of truth for project files
- **Web IDE** (`apps/web`): Vite + React + TanStack Store + CodeMirror 6 + xterm.js + esbuild-wasm
- **CLI** (`apps/open-in-web`): `open-in-web <file|dir|url>` — static previews, code diffs (`diff pr|git|branch|file`), UI diffs (`diff ui`, Playwright + pixelmatch); aliases `ofw`, `open-files`
- **Shared package** (`packages/open-web`, npm `@wrikka/open-web`): bundler helpers, diff parser, file icons, theme tokens as subpath exports
- **Landing** (`apps/landing`): product page, assembled with the IDE into one Worker deploy
- **Deploy**: Cloudflare Workers static assets + `/api/*` GitHub zipball proxy; previews isolated on `open-web-preview.newkubise.workers.dev`

## Develop

```sh
bun install
bun run wasm        # build packages/wasm-rust -> apps/web/public/wasm
bun run dev         # vite dev server for apps/web (proxies /api -> codeload)
bun run build:site  # landing + IDE -> dist-site/ (what the worker serves)
```

## Build & deploy

```sh
bun run build       # apps/web/dist
bun run deploy      # wrangler deploy (worker/index.ts + dist-site assets)
```

## Repo layout

```
packages/vfs-rust       virtual filesystem (pure Rust, unit-tested)
packages/protocol-rust  serde message types shared across tiers
packages/wasm-rust      wasm-bindgen entry exposing WebVfs to JS
packages/open-web       publishable npm package (@wrikka/open-web)
apps/web                React IDE frontend
apps/landing            product landing page
apps/open-in-web        open-in-web CLI (preview + diff lanes)
worker/                 Cloudflare worker: static assets + /api zip proxy
scripts/build-site.sh   assembles dist-site/ (landing at /, IDE at /app)
```
