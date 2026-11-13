import '@wrikka/open-web/theme/tokens.css';
import './style.css';

const APP_URL = 'https://open-web.newkubise.workers.dev';
const LANDING_URL = 'https://open-web-landing.newkubise.workers.dev';
const REPO_URL = 'https://github.com/newkub/open-web';

const features = [
  ['⬒', 'GitHub in, IDE out', 'Paste any public repo URL — file tree, editor, and terminal appear instantly. Rust/WASM virtual filesystem is the single source of truth.'],
  ['▶', 'Run it in the browser', 'esbuild-wasm bundles your app in-browser; React, Vue, and Solid starters preview live. No install, no server.'],
  ['⌥', 'PR diffs, interactive', 'Paste a …/pull/N URL for an animated diff view — token-level highlights, expand/collapse, line-by-line transitions.'],
  ['⌘', 'Real terminal', 'xterm.js shell with a virtual FS — run commands, install nothing, everything stays in the tab.'],
  ['⇄', 'UI diffs', 'Compare two URLs visually — Playwright screenshots + pixelmatch, with slider and side-by-side views.'],
  ['⚡', 'Zero backend', 'Static build on Cloudflare Workers; previews run on an isolated origin so repo code never touches your tokens.'],
];

const examples = [
  'micahlt/vite-vue3-simple-starter',
  'newkub/open-web',
  'withastro/astro',
  'vitejs/vite',
];

document.getElementById('app')!.innerHTML = `
<header class="nav">
  <div class="brand">⬒ open-web</div>
  <nav>
    <a href="#products">Products</a>
    <a href="#features">Features</a>
    <a href="#stack">Stack</a>
    <a href="${REPO_URL}" class="nav-gh">GitHub</a>
    <a href="${APP_URL}" class="cta">Open the IDE →</a>
  </nav>
</header>

<section class="hero">
  <div class="hero-badge">browser IDE + CLI · Rust/WASM · no server</div>
  <h1>Open anything<br/><span class="accent">in your browser</span></h1>
  <p class="sub">Paste a GitHub URL and get a file tree, a real editor, a terminal,
  and a live preview — or open local files straight from your terminal.
  No clone, no install, no server.</p>
  <div class="cta-row">
    <a class="btn primary" href="${APP_URL}">Launch the IDE</a>
    <a class="btn ghost" href="#cli">See the CLI</a>
    <a class="btn ghost" href="${REPO_URL}">View on GitHub</a>
  </div>
  <p class="hint">Try: github.com/micahlt/vite-vue3-simple-starter · …/pull/N for PR diffs</p>
</section>

<section class="products" id="products">
  <h2 class="section-title">Two ways in</h2>
  <p class="section-sub">Same runtime, two surfaces — pick where you live.</p>
  <div class="products-grid">
    <article class="product-card featured">
      <div class="product-tag">web · zero install</div>
      <h3>open-web IDE</h3>
      <p>Paste a public or private GitHub URL — the repo loads into a Rust/WASM
      virtual filesystem. Edit in CodeMirror, run commands in xterm.js, preview
      React/Vue/Solid apps with esbuild-wasm, and review PR diffs inline.</p>
      <ul class="product-list">
        <li>File tree + quick-open + context menus</li>
        <li>Auto-dev preview for framework starters</li>
        <li>GitHub device-flow sign-in for private repos</li>
        <li>IndexedDB zip cache — reloads are instant</li>
      </ul>
      <a class="btn primary" href="${APP_URL}">Open ${APP_URL.replace('https://','')}</a>
    </article>
    <article class="product-card" id="cli">
      <div class="product-tag">cli · your machine</div>
      <h3>open-in-web</h3>
      <p>A terminal tool that opens anything in a browser tab — local files and
      directories as self-contained previews, URLs directly, and diffs between
      PRs, refs, branches, file pairs, or whole pages.</p>
      <pre class="cli-block"><code>open-in-web &lt;file|dir|url&gt;
open-in-web diff pr 123 --repo owner/repo
open-in-web diff ui https://a.dev https://b.dev</code></pre>
      <ul class="product-list">
        <li>Static single-file HTML preview — no server</li>
        <li>Code diffs: pr / git / branch / file</li>
        <li>UI diffs: screenshots + pixelmatch slider</li>
        <li>Aliases: <code>ofw</code>, <code>open-files</code></li>
      </ul>
      <a class="btn ghost" href="${REPO_URL}/tree/main/apps/open-in-web">CLI source →</a>
    </article>
  </div>
</section>

<section class="grid" id="features">
  <h2 class="section-title wide">What the IDE does</h2>
  ${features.map(([icon, title, body]) => `
    <article class="card">
      <div class="icon">${icon}</div>
      <h3>${title}</h3>
      <p>${body}</p>
    </article>`).join('')}
</section>

<section class="examples">
  <h3>Try a repo</h3>
  <div class="chips">
    ${examples.map((e) => `<a class="chip" href="${APP_URL}">${e}</a>`).join('')}
  </div>
  <p class="hint">Paste one of these (or any GitHub URL) into the IDE's URL bar.</p>
</section>

<section class="strip" id="stack">
  <div>
    <strong>Rust core</strong>
    <span>Cargo workspace — <code>vfs-rust</code> virtual filesystem, <code>protocol-rust</code> message types, <code>wasm-rust</code> bindings compiled to wasm-bindgen.</span>
  </div>
  <div>
    <strong>TS runtime</strong>
    <span><code>@wrikka/open-web</code> on npm — bundler, diff parser, file icons, theme tokens as subpath exports.</span>
  </div>
  <div>
    <strong>Edge deploy</strong>
    <span>Cloudflare Workers + static assets; previews isolated on a dedicated origin.</span>
  </div>
</section>

<footer>
  <span>open-web · MIT · <a href="${REPO_URL}">newkub/open-web</a> ·
  <a href="${LANDING_URL}">landing</a> ·
  <a href="${APP_URL}">app</a></span>
</footer>
`;
