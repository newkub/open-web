import { For, Show, type JSX } from 'solid-js';
import { Spinner } from './ui';

export interface RefsResult {
  branches: string[];
  tags: string[];
  commits: { sha: string; subject: string }[];
}

export function RefList(props: {
  loading: boolean;
  refs: RefsResult | null;
  onPick: (value: string) => void;
}) {
  return (
    <div class="max-h-52 overflow-auto rounded-md border border-border">
      <Show
        when={!props.loading}
        fallback={
          <div class="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
            <Spinner /> Loading refs…
          </div>
        }
      >
        <Show when={props.refs}>
          <div>
            <RefGroup label="Branches" icon="i-mdi-source-branch">
              <For each={props.refs!.branches}>
                {(ref) => <RefChip value={ref} onPick={props.onPick} />}
              </For>
            </RefGroup>
            <RefGroup label="Tags" icon="i-mdi-tag-outline">
              <For each={props.refs!.tags}>
                {(ref) => <RefChip value={ref} onPick={props.onPick} />}
              </For>
            </RefGroup>
            <RefGroup label="Recent commits" icon="i-mdi-source-commit">
              <For each={props.refs!.commits}>
                {(commit) => (
                  <RefChip value={commit.sha} label={`${commit.sha.slice(0, 7)} ${commit.subject}`} onPick={props.onPick} />
                )}
              </For>
            </RefGroup>
          </div>
        </Show>
      </Show>
    </div>
  );
}

function RefGroup(props: { label: string; icon: string; children: JSX.Element }) {
  return (
    <div class="border-b border-border last:border-b-0">
      <div class="flex items-center gap-1.5 bg-muted px-2.5 py-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        <span class={`${props.icon} text-xs`} aria-hidden="true" /> {props.label}
      </div>
      <div class="flex flex-wrap gap-1 p-2">{props.children}</div>
    </div>
  );
}

function RefChip(props: { value: string; label?: string; onPick: (value: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => props.onPick(props.value)}
      aria-label={`Use ${props.label ?? props.value} as the diff ref`}
      class="max-w-full truncate rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-secondary-foreground transition-colors outline-none hover:border-border-hover hover:bg-secondary focus-visible:ring-2 focus-visible:ring-focus"
      title={props.value}
    >
      {props.label ?? props.value}
    </button>
  );
}
