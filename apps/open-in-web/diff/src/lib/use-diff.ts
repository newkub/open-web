import { createSignal } from 'solid-js';
import { parsePatchFiles, type FileDiffMetadata } from '@pierre/diffs';
import { splitPatch } from './split';
import type { DiffResult, DiffSource, FileEntry } from '../types';

export function useDiff() {
  const [data, setData] = createSignal<DiffResult | null>(null);
  const [metas, setMetas] = createSignal<(FileDiffMetadata | null)[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [version, setVersion] = createSignal(0);
  let controller: AbortController | null = null;

  async function load(source: DiffSource) {
    controller?.abort();
    controller = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/diff', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(source),
        signal: controller.signal,
      });
      const json = (await response.json()) as {
        source?: DiffSource;
        raw?: string;
        prMeta?: DiffResult['prMeta'];
        ui?: DiffResult['ui'];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error || 'Failed to load diff');

      const raw = json.raw || '';
      const files = raw ? splitPatch(raw) : [];
      const parsed = files.map((file) => {
        try {
          return parsePatchFiles(file.chunk)[0]?.files?.[0] ?? null;
        } catch {
          return null;
        }
      });

      setMetas(parsed);
      setData({ source: json.source || source, files, raw, prMeta: json.prMeta ?? null, ui: json.ui ?? null });
      setVersion((value) => value + 1);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
      setError(loadError instanceof Error ? loadError.message : String(loadError));
      setData(null);
      setMetas([]);
      setVersion((value) => value + 1);
    } finally {
      setLoading(false);
    }
  }

  const clear = () => {
    controller?.abort();
    setData(null);
    setMetas([]);
    setError(null);
  };

  const files = (): FileEntry[] => data()?.files ?? [];
  const totals = () =>
    files().reduce(
      (acc, file) => {
        acc.add += file.additions;
        acc.del += file.deletions;
        return acc;
      },
      { add: 0, del: 0 },
    );

  return { data, metas, loading, error, version, fileList: files, totals, load, clear, setError };
}
