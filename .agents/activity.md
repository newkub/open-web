
## 2026-11-13
- devin - stackbox MVP: monorepo (cargo vfs/protocol/wasm + Vite/React/TanStack Store/CodeMirror/xterm), GitHub zip loader via CF worker /api proxy, pushed to github.com/newkub/stackbox, deployed https://stackbox.newkubise.workers.dev

- devin - open-web: monorepo restructure (packages/*-rust + *-bun, apps/{web,landing,open-in-web}), GitHub device-flow auth, file viewers, PR diff, file browser UX; fixed Vue preview end-to-end (empty bundle, SFC render, blob URL/router, module namespace marker, duplicate Vue runtime via ?deps pin); deployed stackbox v31245434 + open-web-preview worker; verified Vue app renders in browser
- devin - packages: merged *-bun libs into @wrikka/open-web (subpath exports), publish-ready dist; Rust crates got path-dep versions for crates.io; open-in-web verified (typecheck/test/smoke preview server) + dev script fixed; npm publish still blocked on user OTP
- devin - published @wrikka/open-web@0.1.0 to npm (verified dist-tag latest); UX pass: file browser sort/size/reveal-in-tree, tree root context menu + new-file, viewport-clamped menus, quick-open match ranking, styles.css split into styles/{core,views,browser}.css; deployed stackbox v1251207f
- devin - verified open-in-web diff lane: tsrs typecheck + vite build + serve smoke (ping/default/diff API returns real unified diff, SPA assets 200)
