import type { VfsLike } from '@open-web/types-bun';
import { bundleProject } from './bundler';
import { detectProject } from './detect';

export interface RunEvent {
  stream: 'stdout' | 'stderr';
  data: string;
}

const BANNER = `
(() => {
  const __fmt = (a) => a.map((x) => (typeof x === 'string' ? x : (() => { try { return JSON.stringify(x) } catch { return String(x) } })())).join(' ');
  const emit = (stream, s) => { try { postMessage({ __sb: stream, data: s }) } catch (e) {} };
  const origLog = console.log.bind(console);
  console.log = (...a) => emit('stdout', __fmt(a) + '\\n');
  console.info = console.log;
  console.warn = (...a) => emit('stderr', __fmt(a) + '\\n');
  console.error = (...a) => emit('stderr', __fmt(a) + '\\n');
  console.debug = console.log;
})();
`;

export interface RunHandle {
  done: Promise<number>;
  kill: () => void;
}

/**
 * Bundle a project file with esbuild (VFS-backed, node shims, esm.sh deps)
 * and execute it inside a module Web Worker. Output streams back as events.
 */
export async function runFile(
  vfs: VfsLike,
  entry: string,
  onEvent: (e: RunEvent) => void,
): Promise<RunHandle> {
  const info = detectProject(vfs);

  const { code } = await bundleProject(vfs, entry, {
    format: 'esm',
    platform: 'neutral',
    jsxImportSource: info.framework === 'solid' ? 'solid-js' : 'react',
    banner: BANNER,
  });

  const blob = new Blob([code], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url, { type: 'module' });

  let settled = false;
  const done = new Promise<number>((resolve) => {
    worker.onmessage = (ev: MessageEvent) => {
      const d = ev.data;
      if (d && d.__sb === 'out') onEvent({ stream: 'stdout', data: d.data });
      else if (d && d.__sb === 'exit') {
        settled = true;
        resolve(d.code ?? 0);
      }
    };
    worker.onerror = (e) => {
      onEvent({ stream: 'stderr', data: `\n[worker error] ${e.message}\n` });
      if (!settled) {
        settled = true;
        resolve(1);
      }
    };
  });

  return {
    done,
    kill: () => {
      worker.terminate();
      URL.revokeObjectURL(url);
      if (!settled) {
        settled = true;
      }
    },
  };
}
