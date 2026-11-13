import { For } from 'solid-js';
import { Kbd } from './ui';

const SOURCES = [
  { icon: 'i-mdi-source-pull', label: 'Pull request', hint: 'gh pr diff · merge-base aware' },
  { icon: 'i-mdi-source-commit', label: 'Commit range', hint: 'git diff <ref>..HEAD' },
  { icon: 'i-mdi-source-branch', label: 'Branches', hint: 'git diff <base>..<head>' },
  { icon: 'i-mdi-file-compare', label: 'Two files', hint: 'git diff --no-index' },
];

const FEATURES = [
  { icon: 'i-mdi-view-column-outline', label: 'Split, unified, and focus layouts' },
  { icon: 'i-mdi-palette-outline', label: 'Five diff themes with light/dark sync' },
  { icon: 'i-mdi-file-tree', label: 'Tree navigation, filters, and viewed marks' },
  { icon: 'i-mdi-check-decagram-outline', label: 'Approve, comment, merge, and checkout PRs' },
];

export default function EmptyState(props: { onOpen: () => void; onOpenHelp: () => void }) {
  return (
    <div class="app-backdrop relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
      <div class="grid-texture pointer-events-none absolute inset-0 opacity-60" />

      <div class="relative flex w-full max-w-3xl flex-col items-center gap-7 py-10 text-center">
        <div class="flex flex-col items-center gap-3">
          <div class="grid size-14 place-items-center rounded-2xl border border-border bg-surface text-accent shadow-md">
            <span class="i-mdi-file-compare text-3xl" aria-hidden="true" />
          </div>
          <div class="space-y-1.5">
            <h1 class="text-xl font-semibold tracking-tight">Diff Studio</h1>
            <p class="max-w-md text-xs leading-relaxed text-muted-foreground">
              A local viewer for pull requests, commit ranges, branch comparisons, and file pairs — powered by
              the same diff engine behind diffs.com.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={props.onOpen}
          class="inline-flex items-center gap-2 rounded-lg border border-transparent bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md transition-colors outline-none hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus"
        >
          <span class="i-mdi-folder-open-outline text-base" aria-hidden="true" /> Open a diff
        </button>

        <div class="grid w-full gap-2 sm:grid-cols-2">
          <For each={SOURCES}>
            {(source) => (
              <button
                type="button"
                onClick={props.onOpen}
                class="flex items-center gap-3 rounded-lg border border-border bg-surface/80 px-3.5 py-3 text-left transition-colors outline-none hover:border-border-hover hover:bg-surface focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span class={`${source.icon} shrink-0 text-lg text-accent`} aria-hidden="true" />
                <span class="min-w-0">
                  <span class="block text-xs font-medium">{source.label}</span>
                  <span class="block truncate font-mono text-[10px] text-muted-foreground">{source.hint}</span>
                </span>
                <span class="i-mdi-chevron-right ml-auto shrink-0 text-sm text-muted-foreground" aria-hidden="true" />
              </button>
            )}
          </For>
        </div>

        <div class="grid w-full gap-x-6 gap-y-2 rounded-lg border border-border bg-surface/60 px-4 py-3 text-left sm:grid-cols-2">
          <For each={FEATURES}>
            {(feature) => (
              <div class="flex items-center gap-2 text-[11px] text-secondary-foreground">
                <span class={`${feature.icon} shrink-0 text-sm text-success`} aria-hidden="true" />
                {feature.label}
              </div>
            )}
          </For>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-2 text-[10px] text-muted-foreground">
          <span class="flex items-center gap-1">
            <Kbd>?</Kbd> shortcuts
          </span>
          <span class="flex items-center gap-1">
            <Kbd>o</Kbd> options
          </span>
          <button
            type="button"
            onClick={props.onOpenHelp}
            aria-label="View all keyboard shortcuts"
            class="rounded-sm text-accent outline-none transition-colors hover:text-accent-hover focus-visible:ring-2 focus-visible:ring-focus"
          >
            view all
          </button>
        </div>
      </div>
    </div>
  );
}
