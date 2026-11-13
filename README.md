# stackbox

In-browser IDE: paste a GitHub URL, browse the repo in a virtual filesystem, edit code, and use a built-in terminal — no server required.

## Stack

- **Rust → WASM** (`crates/`): `vfs` virtual filesystem, `protocol` shared types, `wasm` bindings — the single source of truth for project files
- **Web app** (`apps/web`): Vite + React + TanStack Store + CodeMirror 6 + xterm.js + fflate
- **Runtime tiers** (planned): edge-js (Bun.wasm toolchain + node:* shims) → WASIX → full VM (CheerpX/WebVM)
- **Deploy**: Cloudflare Worker (static assets + `/api/*` GitHub zipball proxy, needed because codeload sends no CORS headers)

## Develop

```sh
bun install
bun run wasm      # build crates/wasm -> apps/web/public/wasm
bun run dev       # vite dev server (proxies /api -> codeload)
```

## Build & deploy

```sh
bun run build     # apps/web/dist
bun run deploy    # wrangler deploy (worker/index.ts + assets)
```

## Repo layout

```
crates/vfs       virtual filesystem (pure Rust, unit-tested)
crates/protocol  serde message types shared across tiers
crates/wasm      wasm-bindgen entry exposing WebVfs to JS
apps/web         React IDE frontend
worker/          Cloudflare worker: static assets + /api zip proxy
```
