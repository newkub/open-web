import * as esbuild from 'esbuild-wasm';
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';
import { parse, compileScript, compileTemplate, compileStyle } from '@vue/compiler-sfc';
import type { Plugin, Loader } from 'esbuild-wasm';
import type { VfsLike } from '@open-web/types-bun';
import { detectProject } from './detect';
import { esmUrl } from './esm';
import { shimSource } from './shims';

let ready: Promise<typeof esbuild> | null = null;

export function initBundler(): Promise<typeof esbuild> {
  if (!ready) {
    ready = esbuild.initialize({ wasmURL: wasmUrl }).then(() => esbuild);
  }
  return ready;
}

const EXTS = ['', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', '.json', '.css', '.vue'];
const INDEX_EXTS = EXTS.slice(1);

function extOf(path: string): string {
  const i = path.lastIndexOf('.');
  return i > path.lastIndexOf('/') ? path.slice(i) : '';
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
    default: return 'js';
  }
}

function resolveVfsImport(vfs: VfsLike, resolveDir: string, spec: string): string {
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
  for (const ext of EXTS) {
    if (vfs.exists(clean + ext)) return clean + ext;
  }
  for (const ext of INDEX_EXTS) {
    if (vfs.exists(`${clean}/index${ext}`)) return `${clean}/index${ext}`;
  }
  return clean; // let onLoad report not-found
}

function compileVueFile(source: string, filename: string) {
  const { descriptor, errors } = parse(source, { filename });
  if (errors.length) {
    return { errors: errors.map((e) => ({ text: String(e) })) };
  }
  let js = '';
  const hasScript = !!(descriptor.script || descriptor.scriptSetup);
  const id = `data-v-${filename.replace(/[^a-zA-Z0-9]/g, '')}`;

  if (hasScript) {
    try {
      const r = compileScript(descriptor, { id, inlineTemplate: !!descriptor.template });
      js += r.content + '\n';
    } catch (e) {
      return { errors: [{ text: `vue compileScript: ${e}` }] };
    }
  }
  if (!hasScript && descriptor.template) {
    try {
      const t = compileTemplate({
        source: descriptor.template.content,
        filename,
        id,
        compilerOptions: {},
      });
      js += t.code.replace('export function render', 'function render') + '\nexport default { render };\n';
    } catch (e) {
      return { errors: [{ text: `vue compileTemplate: ${e}` }] };
    }
  }
  // Inject <style> blocks so SFC styles actually apply.
  for (const style of descriptor.styles) {
    try {
      const css = compileStyle({
        source: style.content,
        filename,
        id,
        scoped: style.scoped,
      }).code;
      js += `;(() => { const el = document.createElement('style'); el.textContent = ${JSON.stringify(css)}; document.head.appendChild(el); })();\n`;
    } catch {
      /* style compile failure is non-fatal */
    }
  }
  return { contents: js, loader: 'js' as Loader, resolveDir: dirOf(filename) };
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
    format: opts.format ?? 'esm',
    platform: opts.platform ?? 'browser',
    target: 'es2020',
    jsx: 'automatic',
    jsxImportSource: opts.jsxImportSource ?? framework ?? 'react',
    define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env.DEV': 'true' },
    banner: opts.banner ? { js: opts.banner } : undefined,
    plugins: [vfsPlugin],
    logLevel: 'silent',
  });

  const js = result.outputFiles?.find((f) => f.path.endsWith('.js'))?.text ?? '';
  const css = result.outputFiles?.find((f) => f.path.endsWith('.css'))?.text ?? '';
  return { code: js, css };
}
