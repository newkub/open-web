import { For, Show } from 'solid-js';
import type { SourceFields } from '../lib/source';
import { Button, INPUT, Spinner } from './ui';
import { Field } from './ui-layout';

export interface PrItem {
  number: number;
  title: string;
  author?: { login: string };
  state: string;
}

export default function SourcePrPanel(props: {
  fields: SourceFields;
  set: (patch: Partial<SourceFields>) => void;
  prs: PrItem[] | null;
  loading: 'prs' | 'refs' | null;
  onApply: () => void;
}) {
  const onEnter = (event: KeyboardEvent) => event.key === 'Enter' && props.onApply();
  return (
    <div class="space-y-2.5">
      <Field label="Pull request number">
        <input
          class={INPUT}
          type="number"
          min="1"
          value={props.fields.pr}
          placeholder="e.g. 128"
          onInput={(event) => props.set({ pr: event.currentTarget.value })}
          onKeyDown={onEnter}
        />
      </Field>
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <span class="text-[11px] font-medium text-secondary-foreground">Open pull requests</span>
          <span class="text-[10px] text-muted-foreground">{props.prs?.length ?? 0} loaded</span>
        </div>
        <div class="max-h-44 overflow-auto rounded-md border border-border">
          <Show
            when={props.loading !== 'prs'}
            fallback={
              <div class="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                <Spinner /> Loading pull requests…
              </div>
            }
          >
            <Show
              when={props.prs && props.prs.length > 0}
              fallback={
                <div class="px-3 py-5 text-center text-xs text-muted-foreground">
                  No open pull requests found.
                </div>
              }
            >
              <For each={props.prs}>
                {(pr) => (
                  <button
                    type="button"
                    aria-pressed={props.fields.pr === String(pr.number)}
                    onClick={() => props.set({ pr: String(pr.number) })}
                    class={`flex w-full items-center gap-2 border-b border-border px-2.5 py-2 text-left text-xs transition-colors outline-none last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus ${
                      props.fields.pr === String(pr.number)
                        ? 'bg-muted text-foreground'
                        : 'text-secondary-foreground hover:bg-secondary'
                    }`}
                  >
                    <span class="i-mdi-source-pull shrink-0 text-sm text-success" aria-hidden="true" />
                    <span class="shrink-0 font-mono text-[10px] text-muted-foreground">#{pr.number}</span>
                    <span class="min-w-0 flex-1 truncate">{pr.title}</span>
                    <Show when={pr.author}>
                      <span class="shrink-0 text-[10px] text-muted-foreground">{pr.author!.login}</span>
                    </Show>
                  </button>
                )}
              </For>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
}
