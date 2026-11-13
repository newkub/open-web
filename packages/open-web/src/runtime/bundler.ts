import * as esbuild from 'esbuild-wasm';
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';
import type { Plugin, Loader } from 'esbuild-wasm';
import type { VfsLike } from '../types';
import { detectProject } from './detect';
import { esmUrl } from './esm';
import { shimSource } from './shims';
import { compileVueFile } from './vueSfc';

let ready: Promise<typeof esbuild> | null = null;

export function initBundler(): Promise<typeof esbuild> {
  if (!ready) {
    ready = esbuild.initialize({ wasmURL: wasmUrl }).then(() => esbuild);
  }
  return ready;
}

const EXTS = ['', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', '.json', '.css', '.vue'];
const INDEX_EXTS = EXTS.slice(1);
// Static assets — resolved by exact filename (no extension probing needed
// since the import specifier already carries the extension).
const ASSET_EXTS = new Set([
  '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.bmp',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp3', '.mp4', '.webm', '.wav', '.ogg', '.flac',
  '.pdf', '.txt', '.md', '.glb', '.gltf', '.wasm',
]);

function extOf(path: string): string {
  const i = path.lastIndexOf('.');
  return i > path.lastIndexOf('/') ? path.slice(i).toLowerCase() : '';
}

function dirOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i <= 0 ? '/' : path.slice(0, i);
}

function loaderFor(ext: string): Loader {
  switch (ext) {
    case '.ts': return 'ts';
    case '.tsx': return 'tsx';
    case '.jsx': return 'jsx';
    case '.js': case '.mjs': case '.cjs': return 'js';
    case '.json': return 'json';
    case '.css': return 'css';
    case '.html': return 'text';
    case '.txt': case '.md': return 'text';
    default:
      // Images/fonts/media/pdf → inline as data URL so the preview is
      // self-contained (esbuild 'file' loader would emit a separate
      // asset we never serve).
      return ASSET_EXTS.has(ext) ? 'dataurl' : 'js';
  }
}

/** True when `path` exists in the VFS as a file (not a directory). */
function isFile(vfs: VfsLike, path: string): boolean {
  const dir = dirOf(path);
  const base = path.slice(dir === '/' ? 1 : dir.length + 1);
  return vfs.list(dir).some((e) => e.name === base && !e.is_dir);
}

function resolveVfsImport(vfs: VfsLike, resolveDir: string, spec: string): string {
  spec = spec.split('?')[0].split('#')[0]; // vite-isms like ?url/?raw
  const base = spec.startsWith('/')
    ? spec
    : spec.startsWith('.')
      ? `${resolveDir}/${spec}`
      : `/${spec}`;
  // normalize .. and .
  const parts: string[] = [];
  for (const seg of base.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  const clean = '/' + parts.join('/');
  const cleanExt = extOf(clean);

  if (cleanExt) {
    // Explicit extension (./foo.js, ./logo.svg) — must be a real file,
    // not a directory that happens to share the name.
    return isFile(vfs, clean) ? clean : clean; // onLoad reports if missing
  }
  for (const ext of EXTS.slice(1)) {
    if (vfs.exists(clean + ext)) return clean + ext;
  }
  for (const ext of INDEX_EXTS) {
    if (vfs.exists(`${clean}/index${ext}`)) return `${clean}/index${ext}`;
  }
  // Extensionless file with no extension at all (rare) — accept only
  // real files so directory imports fall through to index resolution.
  return isFile(vfs, clean) ? clean : clean; // onLoad reports if missing
}

export interface BundleOptions {
  /** 'browser' for app preview, 'neutral' for node-ish scripts. */
  platform?: 'browser' | 'neutral';
  format?: 'esm' | 'iife';
  jsxImportSource?: string;
  banner?: string;
}

export async function bundleProject(
  vfs: VfsLike,
  entry: string,
  opts: BundleOptions = {},
): Promise<{ code: string; css: string }> {
  const esbuildApi = await initBundler();
  const info = detectProject(vfs);
  const framework = opts.jsxImportSource
    ? null
    : info.framework === 'solid'
      ? 'solid-js'
      : info.framework === 'vue'
        ? null
        : 'react';

  const vfsPlugin: Plugin = {
    name: 'stackbox-vfs',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.namespace === 'shim') return null;
        const p = args.path;
        if (p.startsWith('.') || p.startsWith('/') || p.startsWith('@/')) {
          const aliased = p.startsWith('@/') ? `/src/${p.slice(2)}` : p;
          return { path: resolveVfsImport(vfs, args.resolveDir || '/', aliased), namespace: 'vfs' };
        }
        const url = esmUrl(p, info.deps);
        if (url) return { path: url, external: true };
        const shim = shimSource(p);
        if (shim !== null) return { path: p, namespace: 'shim' };
        // Unknown bare specifier — try esm.sh anyway so deep deps resolve.
        return { path: `https://esm.sh/${p}`, external: true };
      });
      build.onLoad({ filter: /.*/, namespace: 'vfs' }, async (args) => {
        const data = vfs.read_file(args.path);
        if (!data) {
          return { errors: [{ text: `module not found in project: ${args.path}` }] };
        }
        if (extOf(args.path) === '.vue') {
          const out = compileVueFile(new TextDecoder().decode(data), args.path);
          if ('errors' in out) return { errors: out.errors };
          return { contents: out.contents, loader: out.loader, resolveDir: out.resolveDir };
        }
        return {
          contents: new TextDecoder().decode(data),
          loader: loaderFor(extOf(args.path)),
          resolveDir: dirOf(args.path),
        };
      });
      build.onLoad({ filter: /.*/, namespace: 'shim' }, (args) => {
        const src = shimSource(args.path);
        if (src === null) {
          return { errors: [{ text: `unsupported builtin: ${args.path}` }] };
        }
        return { contents: src, loader: 'js' };
      });
    },
  };

  const result = await esbuildApi.build({
    absWorkingDir: '/',
    entryPoints: [entry],
    bundle: true,
    write: false,
    // Named output so outputFiles paths are deterministic — the default
    // "<stdout>" path does not end with .js and silently produced empty
    // previews when looked up by extension.
    outfile: 'bundle.js',
    format: opts.format ?? 'esm',
    platform: opts.platform ?? 'browser',
    target: 'es2020',
    jsx: 'automatic',
    jsxImportSource: opts.jsxImportSource ?? framework ?? 'react',
    define: {
      'process.env.NODE_ENV': '"development"',
      'import.meta.env.DEV': 'true',
      'import.meta.env.PROD': 'false',
      'import.meta.env.MODE': '"development"',
      'import.meta.env.BASE_URL': '"/"',
      'import.meta.env.SSR': 'false',
    },
    banner: opts.banner ? { js: opts.banner } : undefined,
    plugins: [vfsPlugin],
    logLevel: 'silent',
  });

  const js =
    result.outputFiles?.find((f) => f.path.endsWith('.js'))?.text ??
    result.outputFiles?.find((f) => !f.path.endsWith('.css'))?.text ??
    '';
  const css = result.outputFiles?.find((f) => f.path.endsWith('.css'))?.text ?? '';
  // esbuild's __export helper creates plain objects for module namespaces,
  // but consumers like vue-router detect ES modules via
  // `__esModule || Symbol.toStringTag === 'Module'` to unwrap `.default`
  // (lazy route components). Stamp the marker so namespaces behave like
  // real ESM namespaces.
  const code = js.replace(
    '__defProp(target, name, { get: all[name], enumerable: true });\n};',
    '__defProp(target, name, { get: all[name], enumerable: true });\n  __defProp(target, Symbol.toStringTag, { value: "Module" });\n};',
  );
  return { code, css };
}
