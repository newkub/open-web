import '@open-web/theme-bun/tokens.css';
import './style.css';

const APP_URL = 'https://stackbox.newkubise.workers.dev';

const features = [
  ['⬒', 'GitHub in, IDE out', 'Paste any public repo URL — file tree, editor, and terminal appear instantly. Rust/WASM virtual filesystem is the single source of truth.'],
  ['▶', 'Run it in the browser', 'esbuild-wasm bundles your app in-browser; React, Vue, and Solid starters preview live. No install, no server.'],
  ['⌥', 'PR diffs, interactive', 'Paste a …/pull/N URL for an animated diff view — token-level highlights, expand/collapse, line-by-line transitions.'],
  ['⚡', 'CLI + desktop parity', 'Same runtime powers the open-in-web CLI — open files, diffs, and URLs from your terminal.'],
];

document.getElementById('app')!.innerHTML = `
<header class="nav">
  <div class="brand">⬒ open-web</div>
  <nav>
    <a href="#features">Features</a>
    <a href="${APP_URL}" class="cta">Open the IDE →</a>
  </nav>
</header>

<section class="hero">
  <h1>A browser IDE for<br/><span class="accent">GitHub</span></h1>
  <p class="sub">Paste a repo URL. Get a file tree, a real editor, a terminal,
  and a live preview — powered by a Rust/WASM virtual filesystem and an
  in-browser bundler. No clone, no install, no server.</p>
  <div class="cta-row">
    <a class="btn primary" href="${APP_URL}">Launch open-web</a>
    <a class="btn ghost" href="https://github.com/newkub/open-web">View on GitHub</a>
  </div>
  <p class="hint">Try: github.com/lzm0x219/template-vite-react · …/pull/N for diffs</p>
</section>

<section class="grid" id="features">
  ${features.map(([icon, title, body]) => `
    <article class="card">
      <div class="icon">${icon}</div>
      <h3>${title}</h3>
      <p>${body}</p>
    </article>`).join('')}
</section>

<section class="strip">
  <div>
    <strong>Monorepo</strong>
    <span>Cargo crates (<code>*-rust</code>) + Bun/TS packages (<code>*-bun</code>) — flat, single-responsibility, publishable to npm.</span>
  </div>
  <div>
    <strong>Runs anywhere</strong>
    <span>Static build deploys to Cloudflare Workers; the CLI ships as a compiled binary.</span>
  </div>
</section>

<footer>
  <span>open-web · MIT · <a href="https://github.com/newkub/open-web">newkub/open-web</a></span>
</footer>
`;
