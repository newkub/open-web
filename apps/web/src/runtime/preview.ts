import { getVfs } from '../vfs';
import { bundleProject } from './bundler';
import { detectProject } from './detect';
import { setState } from '../store';

/**
 * "Vite dev server in a tab": bundle the detected app entry with esbuild
 * (deps resolved from esm.sh, .vue SFCs compiled, JSX transformed), wrap
 * the output in an HTML shell, and show it in the preview iframe.
 */
export async function previewProject(onStatus?: (msg: string) => void): Promise<string> {
  const vfs = await getVfs();
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
</head><body><div id="root"></div>
<script type="module">${safeCode}</script></body></html>`;

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  setState({ previewUrl: url, previewOpen: true, previewTitle: `${info.framework} preview` });
  return url;
}
