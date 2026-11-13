import { createSignal } from 'solid-js';
import type { DiffSource } from '../types';

export interface ActionResult {
  ok: boolean;
  output?: string;
  error?: string;
}

export function useActions(getSource: () => DiffSource | null) {
  const [busy, setBusy] = createSignal<string | null>(null);
  const [output, setOutput] = createSignal<ActionResult | null>(null);

  async function run(action: string, extra: { method?: string; body?: string } = {}) {
    setBusy(action);
    setOutput(null);
    try {
      const response = await fetch('/api/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...extra, source: getSource() }),
      });
      const result = (await response.json()) as ActionResult;
      setOutput(result);
      return result;
    } catch (error) {
      const result = { ok: false, error: error instanceof Error ? error.message : String(error) };
      setOutput(result);
      return result;
    } finally {
      setBusy(null);
    }
  }

  const clearOutput = () => setOutput(null);

  return { busy, output, run, clearOutput };
}
