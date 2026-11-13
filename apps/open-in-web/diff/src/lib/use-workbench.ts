import { createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import type { CodeViewItem } from '@pierre/diffs';
import type { DiffSource, SortMode, StatusFilter } from '../types';
import { applySourceToUrl, fieldsToSource, readFields } from './source';
import { statusRank } from './viewer';
import type { useChecks } from './use-checks';
import type { useDiff } from './use-diff';

function sourceFromDefault(value: unknown): DiffSource | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const repo = typeof record.repo === 'string' && record.repo ? record.repo : undefined;
  if (record.source === 'pr') {
    const pr = Number.parseInt(String(record.pr ?? ''), 10);
    return Number.isFinite(pr) && pr > 0 ? { kind: 'pr', pr, ...(repo ? { repo } : {}) } : null;
  }
  if (record.source === 'git' && typeof record.ref === 'string') {
    return { kind: 'git', ref: record.ref, ...(repo ? { repo } : {}) };
  }
  if (record.source === 'branch' && typeof record.base === 'string' && typeof record.head === 'string') {
    return { kind: 'branch', base: record.base, head: record.head, ...(repo ? { repo } : {}) };
  }
  if (record.source === 'file' && typeof record.old === 'string' && typeof record.new === 'string') {
    return { kind: 'file', old: record.old, new: record.new };
  }
  if (record.source === 'ui' && typeof record.before === 'string' && typeof record.after === 'string') {
    return {
      kind: 'ui',
      before: record.before,
      after: record.after,
      ...(typeof record.viewport === 'string' ? { viewport: record.viewport } : {}),
      ...(record.fullPage === true || record.fullPage === 'true' ? { fullPage: true } : {}),
      ...(typeof record.threshold === 'number' || typeof record.threshold === 'string'
        ? { threshold: Number(record.threshold) }
        : {}),
      ...(typeof record.waitMs === 'number' || typeof record.waitMs === 'string'
        ? { waitMs: Number(record.waitMs) }
        : {}),
    };
  }
  return null;
}

export function useWorkbench(
  diff: ReturnType<typeof useDiff>,
  checks: ReturnType<typeof useChecks>,
  scrollTo: (id: string) => void,
  layout: () => 'all' | 'focus',
) {
  const [source, setSource] = createSignal<DiffSource | null>(null);
  const [activeIdx, setActiveIdx] = createSignal<number | null>(null);
  const [viewed, setViewed] = createSignal<Set<number>>(new Set());
  const [query, setQuery] = createSignal('');
  const [status, setStatus] = createSignal<StatusFilter>('all');
  const [sort, setSort] = createSignal<SortMode>('path');
  const [treeView, setTreeView] = createSignal(true);
  const [hideViewed, setHideViewed] = createSignal(false);
  const [scrollTarget, setScrollTarget] = createSignal<{ id: string; nonce: number } | null>(null);
  let scrollNonce = 0;

  const open = (next: DiffSource, syncUrl = true) => {
    if (syncUrl) applySourceToUrl(next);
    setViewed(new Set<number>());
    setActiveIdx(null);
    setSource(next);
    diff.clear();
    checks.clear();
    void diff.load(next);
    void checks.load(next);
  };

  const reload = () => {
    const current = source();
    if (!current) return;
    void diff.load(current);
    void checks.load(current);
  };

  onMount(() => {
    const initial = fieldsToSource(readFields());
    if (initial) {
      open(initial, false);
    } else {
      void fetch('/api/default')
        .then((response) => (response.ok ? response.json() : null))
        .then((value) => {
          const fallback = sourceFromDefault(value);
          if (fallback) open(fallback);
        })
        .catch(() => {});
    }

    const onPopState = () => {
      const next = fieldsToSource(readFields());
      if (next) open(next, false);
    };
    window.addEventListener('popstate', onPopState);
    onCleanup(() => window.removeEventListener('popstate', onPopState));
  });

  const sourceKey = () => (source() ? JSON.stringify(source()) : '');
  const cacheKey = () => `${sourceKey()}:${diff.version()}`;

  const indices = createMemo(() => {
    const list = diff.fileList();
    const needle = query().trim().toLowerCase();
    const filter = status();
    const viewedSet = viewed();
    const hide = hideViewed();
    const rows = list
      .map((file, idx) => ({ file, idx }))
      .filter(({ file, idx }) => {
        if (needle && !file.name.toLowerCase().includes(needle)) return false;
        if (filter !== 'all') {
          const matches = filter === 'renamed' ? file.type.startsWith('rename') : file.type === filter;
          if (!matches) return false;
        }
        if (hide && viewedSet.has(idx)) return false;
        return true;
      });

    const mode = sort();
    rows.sort((a, b) => {
      if (mode === 'changes') {
        const delta = b.file.additions + b.file.deletions - (a.file.additions + a.file.deletions);
        if (delta !== 0) return delta;
      } else if (mode === 'status') {
        const delta = statusRank(a.file.type) - statusRank(b.file.type);
        if (delta !== 0) return delta;
      }
      return a.file.name.localeCompare(b.file.name);
    });
    return rows.map(({ idx }) => idx);
  });

  const allItems = createMemo<CodeViewItem<undefined>[]>(() => {
    const metas = diff.metas();
    const version = diff.version();
    return indices().flatMap((idx) => {
      const meta = metas[idx];
      if (!meta) return [];
      return [{ id: `f:${idx}`, type: 'diff' as const, fileDiff: meta, version }];
    });
  });

  const viewerItems = createMemo(() => {
    const items = allItems();
    if (layout() !== 'focus') return items;
    const active = activeIdx();
    return active === null ? [] : items.filter((item) => item.id === `f:${active}`);
  });

  const activeFile = createMemo(() => {
    const idx = activeIdx();
    return idx === null ? null : (diff.fileList()[idx] ?? null);
  });

  const activeVisible = createMemo(() => {
    const idx = activeIdx();
    return idx !== null && indices().includes(idx);
  });

  return {
    source,
    activeIdx,
    viewed,
    query,
    status,
    sort,
    treeView,
    hideViewed,
    scrollTarget,
    sourceKey,
    cacheKey,
    indices,
    allItems,
    viewerItems,
    activeFile,
    activeVisible,
    open,
    reload,
    selectFile,
    stepFile,
    toggleViewed,
    markAllViewed,
    setQuery,
    setStatus,
    setSort,
    setTreeView,
    setHideViewed,
  };

  function selectFile(idx: number) {
    setActiveIdx(idx);
    if (layout() === 'focus') return;
    scrollNonce += 1;
    const id = `f:${idx}`;
    setScrollTarget({ id, nonce: scrollNonce });
    scrollTo(id);
  }

  function stepFile(delta: number) {
    const list = indices();
    if (list.length === 0) return;
    const current = activeIdx();
    const position = current === null ? -1 : list.indexOf(current);
    const next = position === -1 ? 0 : (position + delta + list.length) % list.length;
    selectFile(list[next]);
  }

  function toggleViewed(idx: number, value?: boolean) {
    setViewed((previous) => {
      const next = new Set(previous);
      const shouldView = value ?? !next.has(idx);
      if (shouldView) next.add(idx);
      else next.delete(idx);
      return next;
    });
  }

  function markAllViewed(value: boolean) {
    setViewed(value ? new Set(indices()) : new Set<number>());
  }
}
