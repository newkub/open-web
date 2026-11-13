
## 2026-11-13
- devin - stackbox MVP: monorepo (cargo vfs/protocol/wasm + Vite/React/TanStack Store/CodeMirror/xterm), GitHub zip loader via CF worker /api proxy, pushed to github.com/newkub/stackbox, deployed https://stackbox.newkubise.workers.dev

- devin - open-web: monorepo restructure (packages/*-rust + *-bun, apps/{web,landing,open-in-web}), GitHub device-flow auth, file viewers, PR diff, file browser UX; fixed Vue preview end-to-end (empty bundle, SFC render, blob URL/router, module namespace marker, duplicate Vue runtime via ?deps pin); deployed stackbox v31245434 + open-web-preview worker; verified Vue app renders in browser
- devin - packages: merged *-bun libs into @wrikka/open-web (subpath exports), publish-ready dist; Rust crates got path-dep versions for crates.io; open-in-web verified (typecheck/test/smoke preview server) + dev script fixed; npm publish still blocked on user OTP
