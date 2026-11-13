import { createSignal } from 'solid-js';
import { sourceParams } from './source';
import type { DiffSource } from '../types';

export interface ChecksResult {
  available: boolean;
  checks: { name: string; state: string; bucket: string }[];
  summary: 'pass' | 'fail' | 'pending' | 'none' | 'error';
  failing?: string[];
  pending?: number;
  error?: string;
}

export function useChecks() {
  const [checks, setChecks] = createSignal<ChecksResult | null>(null);
  const [loading, setLoading] = createSignal(false);

  async function load(source: DiffSource | null) {
    if (!source || source.kind !== 'pr') {
      setChecks(null);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/checks?${sourceParams(source)}`);
      setChecks((await response.json()) as ChecksResult);
    } catch {
      setChecks(null);
    } finally {
      setLoading(false);
    }
  }

  const clear = () => setChecks(null);

  return { checks, loading, load, clear };
}
