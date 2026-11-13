import type { DiffSource, SourceKind } from '../types';

export interface SourceFields {
  source: SourceKind | '';
  pr: string;
  ref: string;
  base: string;
  head: string;
  old: string;
  new: string;
  repo: string;
  before: string;
  after: string;
  viewport: string;
}

export const EMPTY_FIELDS: SourceFields = {
  source: '',
  pr: '',
  ref: '',
  base: '',
  head: '',
  old: '',
  new: '',
  repo: '',
  before: '',
  after: '',
  viewport: '',
};

const KINDS: SourceKind[] = ['pr', 'git', 'branch', 'file', 'ui'];

export function readFields(search = window.location.search): SourceFields {
  const params = new URLSearchParams(search);
  const kind = params.get('source');
  return {
    source: KINDS.includes(kind as SourceKind) ? (kind as SourceKind) : '',
    pr: params.get('pr') || '',
    ref: params.get('ref') || '',
    base: params.get('base') || '',
    head: params.get('head') || '',
    old: params.get('old') || '',
    new: params.get('new') || '',
    repo: params.get('repo') || '',
    before: params.get('before') || '',
    after: params.get('after') || '',
    viewport: params.get('viewport') || '',
  };
}

export function fieldsToSource(fields: SourceFields): DiffSource | null {
  if (fields.source === 'pr') {
    const pr = Number.parseInt(fields.pr, 10);
    if (!Number.isFinite(pr) || pr <= 0) return null;
    return { kind: 'pr', pr, ...(fields.repo.trim() ? { repo: fields.repo.trim() } : {}) };
  }
  if (fields.source === 'git') {
    if (!fields.ref.trim()) return null;
    return { kind: 'git', ref: fields.ref.trim(), ...(fields.repo.trim() ? { repo: fields.repo.trim() } : {}) };
  }
  if (fields.source === 'branch') {
    if (!fields.base.trim() || !fields.head.trim()) return null;
    return {
      kind: 'branch',
      base: fields.base.trim(),
      head: fields.head.trim(),
      ...(fields.repo.trim() ? { repo: fields.repo.trim() } : {}),
    };
  }
  if (fields.source === 'file') {
    if (!fields.old.trim() || !fields.new.trim()) return null;
    return { kind: 'file', old: fields.old.trim(), new: fields.new.trim() };
  }
  if (fields.source === 'ui') {
    if (!fields.before.trim() || !fields.after.trim()) return null;
    return {
      kind: 'ui',
      before: fields.before.trim(),
      after: fields.after.trim(),
      ...(fields.viewport.trim() ? { viewport: fields.viewport.trim() } : {}),
    };
  }
  return null;
}

export function sourceToFields(source: DiffSource): SourceFields {
  const base: SourceFields = { ...EMPTY_FIELDS, source: source.kind };
  if (source.kind === 'pr') return { ...base, pr: String(source.pr), repo: source.repo || '' };
  if (source.kind === 'git') return { ...base, ref: source.ref, repo: source.repo || '' };
  if (source.kind === 'branch') return { ...base, base: source.base, head: source.head, repo: source.repo || '' };
  if (source.kind === 'ui') {
    return { ...base, before: source.before, after: source.after, viewport: source.viewport || '' };
  }
  return { ...base, old: source.old, new: source.new };
}

export function sourceQuery(source: DiffSource): Record<string, string> {
  const out: Record<string, string> = { source: source.kind };
  for (const [key, value] of Object.entries(source)) {
    if (key === 'kind' || value === undefined || value === null) continue;
    out[key] = String(value);
  }
  return out;
}

export function sourceParams(source: DiffSource): string {
  return new URLSearchParams(sourceQuery(source)).toString();
}

export function applySourceToUrl(source: DiffSource | null) {
  const query = source ? `?${sourceParams(source)}` : '';
  window.history.replaceState(null, '', `${window.location.pathname}${query}`);
}

export function sourceLabel(source: DiffSource): string {
  if (source.kind === 'pr') return `PR #${source.pr}`;
  if (source.kind === 'git') return `${source.ref}..HEAD`;
  if (source.kind === 'branch') return `${source.base}..${source.head}`;
  if (source.kind === 'ui') return 'UI diff';
  return 'File pair';
}

export function sourceContext(source: DiffSource): string {
  if (source.kind === 'file') return `${source.old} → ${source.new}`;
  if (source.kind === 'ui') return `${source.before} → ${source.after}`;
  return source.repo || 'current repository';
}
