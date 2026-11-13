import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import type { DiffSource, UiDiffPayload, UiOptions } from '../types.js';

type UiSource = Extract<DiffSource, { kind: 'ui' }>;

const VIEWPORT_RE = /^(\d{2,5})x(\d{2,5})$/;

function toViewportArg(viewport: string): string {
  return /^\d{2,5}x\d{2,5}$/.test(viewport) ? viewport.replace('x', ',') : '1280,800';
}

function screenshot(url: string, out: string, opts: Required<UiOptions>): Promise<Buffer> {
  const args = [
    'x',
    'playwright',
    'screenshot',
    '--browser',
    'chromium',
    '--viewport-size',
    toViewportArg(opts.viewport),
    '--wait-for-timeout',
    String(opts.waitMs),
    '--timeout',
    '45000',
  ];
  if (opts.fullPage) args.push('--full-page');
  args.push(url, out);
  return new Promise((resolvePromise, reject) => {
    const proc = Bun.spawn({ cmd: ['bun', ...args], stdio: ['ignore', 'ignore', 'pipe'] });
    new Response(proc.stderr).text().then((err) => {
      void proc.exited.then((code) => {
        if (code !== 0) {
          reject(new Error(`playwright screenshot failed for ${url}: ${err.trim() || `exit ${code}`}`));
          return;
        }
        try {
          resolvePromise(readFileSync(out));
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    });
  });
}

function padToSize(png: PNG, width: number, height: number): PNG {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height, fill: true });
  out.data.fill(0xff);
  PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
  return out;
}

function toDataUrl(png: PNG): string {
  return `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
}

export async function runUiDiff(source: UiSource): Promise<UiDiffPayload> {
  const started = Date.now();
  const opts: Required<UiOptions> = {
    viewport: source.viewport && VIEWPORT_RE.test(source.viewport) ? source.viewport : '1280x800',
    fullPage: source.fullPage === true,
    threshold: typeof source.threshold === 'number' && source.threshold >= 0 && source.threshold <= 1 ? source.threshold : 0.1,
    waitMs: typeof source.waitMs === 'number' && source.waitMs >= 0 ? Math.min(source.waitMs, 30000) : 1500,
  };

  const dir = mkdtempSync(join(tmpdir(), 'open-diff-'));
  const beforePath = join(dir, 'before.png');
  const afterPath = join(dir, 'after.png');
  try {
    const [beforeBuf, afterBuf] = await Promise.all([
      screenshot(source.before, beforePath, opts),
      screenshot(source.after, afterPath, opts),
    ]);

    const beforePng = PNG.sync.read(beforeBuf);
    const afterPng = PNG.sync.read(afterBuf);
    const width = Math.max(beforePng.width, afterPng.width);
    const height = Math.max(beforePng.height, afterPng.height);
    const before = padToSize(beforePng, width, height);
    const after = padToSize(afterPng, width, height);
    const diff = new PNG({ width, height });
    const mismatched = pixelmatch(before.data, after.data, diff.data, width, height, {
      threshold: opts.threshold,
      includeAA: false,
    });

    return {
      before: toDataUrl(before),
      after: toDataUrl(after),
      diff: toDataUrl(diff),
      mismatch: mismatched / (width * height),
      width,
      height,
      viewport: opts.viewport,
      elapsedMs: Date.now() - started,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
