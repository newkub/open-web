import type { VfsLike } from '@open-web/types-bun';
import { bundleProject } from './bundler';
import { detectProject } from './detect';

export interface PreviewResult {
  url: string;
  title: string;
  framework: string;
  entry: string;
}

/**
 * "Vite dev server in a tab": bundle the detected app entry with esbuild
 * (deps resolved from esm.sh, .vue SFCs compiled, JSX transformed), wrap
 * the output in an HTML shell, and return a blob URL for an iframe.
 * The caller owns UI state — this package has no store dependency.
 */
export async function previewProject(
  vfs: VfsLike,
  onStatus?: (msg: string) => void,
): Promise<PreviewResult> {
  const info = detectProject(vfs);
  if (!info.entry) {
    throw new Error('No app entry found — expected index.html or src/main.*');
  }
  onStatus?.(`Bundling ${info.entry} (${info.framework})…`);

  const { code, css } = await bundleProject(vfs, info.entry, {
    format: 'esm',
    platform: 'browser',
  });

  const safeCode = code.replace(/<\/script/gi, '<\\/script');
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${css ? `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>` : ''}
</head><body><div id="root"></div><div id="app"></div>
<script type="module">${safeCode}</script></body></html>`;

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  return { url, title: `${info.framework} preview`, framework: info.framework, entry: info.entry };
}
