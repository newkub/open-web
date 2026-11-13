import type { DiffSource } from './types.js';

export interface CliConfig {
  source: DiffSource;
  openQuery: string;
}

export interface ShotConfig {
  url: string;
  out: string;
  viewport: string;
  fullPage: boolean;
  waitMs: number;
}

function takeValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx < 0) return undefined;
  const value = args[idx + 1];
  args.splice(idx, 2);
  return value;
}

function parseUiOptions(args: string[]): { opts: Record<string, string | boolean | number>; rest: string[] } {
  const opts: Record<string, string | boolean | number> = {};
  const viewport = takeValue(args, '--viewport');
  if (viewport) opts.viewport = viewport;
  const threshold = takeValue(args, '--threshold');
  if (threshold) opts.threshold = Number.parseFloat(threshold);
  const wait = takeValue(args, '--wait');
  if (wait) opts.waitMs = Number.parseInt(wait, 10);
  if (args.includes('--full-page')) {
    args.splice(args.indexOf('--full-page'), 1);
    opts.fullPage = true;
  }
  return { opts, rest: args };
}

function buildQuery(source: DiffSource): string {
  return `?${new URLSearchParams(sourceToQuery(source)).toString()}`;
}

export function parseShotArgs(argv: string[]): ShotConfig | null {
  const args = argv.slice(2);
  if (args[0] !== 'shot' || !args[1]) return null;
  const rest = args.slice(1);
  const out = takeValue(rest, '--out') || 'shot.png';
  const { opts } = parseUiOptions(rest);
  const url = rest.find((arg) => /^https?:\/\//i.test(arg));
  if (!url) return null;
  return {
    url,
    out,
    viewport: typeof opts.viewport === 'string' ? opts.viewport : '1280x800',
    fullPage: opts.fullPage === true,
    waitMs: typeof opts.waitMs === 'number' ? opts.waitMs : 1500,
  };
}

export function parseArgs(argv: string[]): CliConfig | null {
  const args = argv.slice(2);
  if (args.length === 0) return null;

  const kind = args[0];
  const repoIndex = args.indexOf('--repo');
  const repo = repoIndex >= 0 ? args[repoIndex + 1] : undefined;
  if (repoIndex >= 0) args.splice(repoIndex, 2);

  if (kind === 'pr') {
    const pr = Number.parseInt(args[1] || '', 10);
    if (!Number.isFinite(pr) || pr <= 0) return null;
    const source: DiffSource = { kind: 'pr', pr, ...(repo ? { repo } : {}) };
    return { source, openQuery: buildQuery(source) };
  }

  if (kind === 'git') {
    if (!args[1]) return null;
    const source: DiffSource = { kind: 'git', ref: args[1], ...(repo ? { repo } : {}) };
    return { source, openQuery: buildQuery(source) };
  }

  if (kind === 'branch') {
    const [base, head] = (args[1] || '').split('..');
    if (!base || !head) return null;
    const source: DiffSource = { kind: 'branch', base, head, ...(repo ? { repo } : {}) };
    return { source, openQuery: buildQuery(source) };
  }

  if (kind === 'file') {
    if (!args[1] || !args[2]) return null;
    const source: DiffSource = { kind: 'file', old: args[1], new: args[2] };
    return { source, openQuery: buildQuery(source) };
  }

  if (kind === 'ui') {
    const rest = args.slice(1);
    const urls = rest.filter((arg) => /^https?:\/\//i.test(arg));
    if (urls.length < 2) return null;
    const { opts } = parseUiOptions(rest);
    const source = {
      kind: 'ui' as const,
      before: urls[0],
      after: urls[1],
      ...(typeof opts.viewport === 'string' ? { viewport: opts.viewport } : {}),
      ...(opts.fullPage === true ? { fullPage: true } : {}),
      ...(typeof opts.threshold === 'number' ? { threshold: opts.threshold } : {}),
      ...(typeof opts.waitMs === 'number' ? { waitMs: opts.waitMs } : {}),
    };
    return { source, openQuery: buildQuery(source) };
  }

  return null;
}

export function sourceToQuery(source: DiffSource): Record<string, string> {
  const out: Record<string, string> = { source: source.kind };
  for (const [key, value] of Object.entries(source)) {
    if (key === 'kind' || value === undefined || value === null) continue;
    out[key] = String(value);
  }
  return out;
}
