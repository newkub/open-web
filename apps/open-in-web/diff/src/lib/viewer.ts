import type { CodeViewOptions, FileContents, FileDiffLoadedFiles, FileDiffMetadata } from '@pierre/diffs';
import { THEME_PAIRS, type ViewerOptions } from './options';
import type { DiffSource } from '../types';

async function requestContents(
  source: DiffSource,
  name: string,
  side: 'old' | 'new',
): Promise<string | null> {
  try {
    const response = await fetch('/api/file', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source, name, side }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { contents?: string | null };
    return typeof payload.contents === 'string' ? payload.contents : null;
  } catch {
    return null;
  }
}

export function buildCodeViewOptions(
  options: ViewerOptions,
  isDark: boolean,
  source: DiffSource | null,
  cacheKey: string,
): CodeViewOptions<undefined, undefined> {
  const pair = THEME_PAIRS[options.themePair];
  const cache = new Map<string, Promise<string | null>>();

  const loadSide = (name: string, side: 'old' | 'new') => {
    const key = `${cacheKey}:${side}:${name}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const task = requestContents(source!, name, side);
    cache.set(key, task);
    return task;
  };

  const loadDiffFiles = async (fileDiff: FileDiffMetadata): Promise<FileDiffLoadedFiles> => {
    if (!source) throw new Error('No source available');
    const oldName = fileDiff.prevName || fileDiff.name;
    const [oldText, newText] = await Promise.all([
      loadSide(oldName, 'old'),
      loadSide(fileDiff.name, 'new'),
    ]);

    const newFile: FileContents = { name: fileDiff.name, contents: newText ?? '' };
    if (oldText === null) return { oldFile: null, newFile };
    return { oldFile: { name: oldName, contents: oldText }, newFile };
  };

  return {
    theme: { dark: pair.dark, light: pair.light },
    themeType: isDark ? 'dark' : 'light',
    diffStyle: options.diffStyle,
    diffIndicators: options.indicators,
    disableBackground: !options.backgrounds,
    disableLineNumbers: !options.lineNumbers,
    overflow: options.wrap ? 'wrap' : 'scroll',
    lineDiffType: options.inlineDiff,
    hunkSeparators: options.hunkSeparators,
    stickyHeaders: options.stickyHeaders,
    lineHoverHighlight: options.lineHover ? 'both' : 'disabled',
    enableLineSelection: options.selection,
    layout: { paddingTop: 10, paddingBottom: 24, gap: 12 },
    itemMetrics: { lineHeight: Math.round(20 * options.fontScale) },
    loadDiffFiles: source ? loadDiffFiles : undefined,
  };
}

export function statusLabel(type: string): string {
  if (type === 'new') return 'Added';
  if (type === 'deleted') return 'Deleted';
  if (type.startsWith('rename')) return 'Renamed';
  return 'Modified';
}

export function statusRank(type: string): number {
  if (type === 'new') return 0;
  if (type === 'change') return 1;
  if (type.startsWith('rename')) return 2;
  return 3;
}
