import type { VfsLike } from '../types';

export type Framework = 'react' | 'vue' | 'solid' | 'svelte' | 'vanilla' | 'unknown';

export interface ProjectInfo {
  framework: Framework;
  /** VFS path of the app entry (e.g. /src/main.jsx). */
  entry: string | null;
  hasPackageJson: boolean;
  deps: Record<string, string>;
  scripts: Record<string, string>;
}

const ENTRY_CANDIDATES = [
  '/src/main.tsx', '/src/main.jsx', '/src/main.ts', '/src/main.js',
  '/src/index.tsx', '/src/index.jsx', '/src/index.ts', '/src/index.js',
  '/index.js', '/index.ts', '/main.js', '/main.ts',
  '/app.js', '/app.ts', '/app.jsx', '/app.tsx',
];

function readJson(vfs: VfsLike, path: string): Record<string, unknown> | null {
  const data = vfs.read_file(path);
  if (!data) return null;
  try {
    return JSON.parse(new TextDecoder().decode(data)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function detectProject(vfs: VfsLike): ProjectInfo {
  const pkg = readJson(vfs, '/package.json');
  const deps: Record<string, string> = {
    ...((pkg?.dependencies as Record<string, string>) ?? {}),
    ...((pkg?.devDependencies as Record<string, string>) ?? {}),
  };
  const scripts = (pkg?.scripts as Record<string, string>) ?? {};

  let framework: Framework = 'unknown';
  if (deps['solid-js'] || deps['solid-js/web']) framework = 'solid';
  else if (deps.vue) framework = 'vue';
  else if (deps.react || deps['react-dom']) framework = 'react';
  else if (deps.svelte || deps['@sveltejs/kit']) framework = 'svelte';
  else if (Object.keys(deps).length === 0) framework = 'vanilla';

  // Prefer the script tag in index.html when present — module scripts
  // first, then any classic script with a JS/TS src.
  let entry: string | null = null;
  const html = vfs.read_file('/index.html');
  if (html) {
    const text = new TextDecoder().decode(html);
    const m = text.match(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i)
      ?? text.match(/<script[^>]+src=["']([^"']+)["'][^>]*type=["']module["']/i)
      ?? text.match(/<script[^>]+src=["']([^"']+\.(?:jsx?|tsx?|mjs|cjs))["']/i);
    if (m) {
      const src = m[1];
      entry = src.startsWith('/') ? src : `/${src.replace(/^\.\//, '')}`;
    }
  }
  if (!entry) {
    for (const cand of ENTRY_CANDIDATES) {
      if (vfs.exists(cand)) {
        entry = cand;
        break;
      }
    }
  }

  return {
    framework,
    entry,
    hasPackageJson: !!pkg,
    deps,
    scripts,
  };
}
