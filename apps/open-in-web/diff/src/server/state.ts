import { parseArgs, sourceToQuery } from '../cli.js';
import type { DiffSource } from '../types.js';

export const cli = parseArgs(process.argv);

export { sourceToQuery };

export function sourceFromQuery(params: URLSearchParams): DiffSource | null {
  const kind = params.get('kind') || params.get('source');
  if (kind === 'pr') {
    const pr = Number.parseInt(params.get('pr') || '', 10);
    if (!Number.isFinite(pr) || pr <= 0) return null;
    const repo = params.get('repo') || undefined;
    return { kind: 'pr', pr, ...(repo ? { repo } : {}) };
  }
  if (kind === 'git') {
    const ref = params.get('ref');
    if (!ref) return null;
    const repo = params.get('repo') || undefined;
    return { kind: 'git', ref, ...(repo ? { repo } : {}) };
  }
  if (kind === 'branch') {
    const base = params.get('base');
    const head = params.get('head');
    if (!base || !head) return null;
    const repo = params.get('repo') || undefined;
    return { kind: 'branch', base, head, ...(repo ? { repo } : {}) };
  }
  if (kind === 'file') {
    const old = params.get('old');
    const next = params.get('new');
    if (!old || !next) return null;
    return { kind: 'file', old, new: next };
  }
  if (kind === 'ui') {
    const before = params.get('before');
    const after = params.get('after');
    if (!before || !after) return null;
    const viewport = params.get('viewport') || undefined;
    const threshold = Number.parseFloat(params.get('threshold') || '');
    const waitMs = Number.parseInt(params.get('waitMs') || '', 10);
    return {
      kind: 'ui',
      before,
      after,
      ...(viewport ? { viewport } : {}),
      ...(params.get('fullPage') === 'true' ? { fullPage: true } : {}),
      ...(Number.isFinite(threshold) ? { threshold } : {}),
      ...(Number.isFinite(waitMs) ? { waitMs } : {}),
    };
  }
  return null;
}

export function isDiffSource(value: unknown): value is DiffSource {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  if (body.kind === 'pr') return typeof body.pr === 'number' && body.pr > 0;
  if (body.kind === 'git') return typeof body.ref === 'string' && body.ref.length > 0;
  if (body.kind === 'branch') {
    return typeof body.base === 'string' && typeof body.head === 'string' && body.base.length > 0 && body.head.length > 0;
  }
  if (body.kind === 'file') return typeof body.old === 'string' && typeof body.new === 'string' && body.old.length > 0 && body.new.length > 0;
  if (body.kind === 'ui') {
    if (typeof body.before !== 'string' || typeof body.after !== 'string' || !body.before || !body.after) return false;
    return /^https?:\/\//i.test(body.before) && /^https?:\/\//i.test(body.after);
  }
  return false;
}
