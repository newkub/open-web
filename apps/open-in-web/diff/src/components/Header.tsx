import { Show } from 'solid-js';
import type { DiffResult, DiffSource } from '../types';
import type { ChecksResult } from '../lib/use-checks';
import { sourceContext, sourceLabel } from '../lib/source';
import { Badge, Button, IconButton, Spinner } from './ui';
import PrActionsMenu from './PrActionsMenu';

const KIND_ICON: Record<DiffSource['kind'], string> = {
  pr: 'i-mdi-source-pull',
  git: 'i-mdi-source-commit',
  branch: 'i-mdi-source-branch',
  file: 'i-mdi-file-compare',
  ui: 'i-mdi-web',
};

const STATE_TONE: Record<string, 'success' | 'primary' | 'neutral' | 'danger'> = {
  OPEN: 'success',
  MERGED: 'primary',
  CLOSED: 'danger',
  DRAFT: 'neutral',
};

function checksView(checks: ChecksResult | null) {
  if (!checks?.available || checks.summary === 'none' || checks.summary === 'error') return null;
  if (checks.summary === 'pass') {
    return { icon: 'i-mdi-check-circle', text: 'Checks passed', tone: 'text-success' };
  }
  if (checks.summary === 'fail') {
    const count = checks.failing?.length ?? 0;
    return {
      icon: 'i-mdi-alert-circle',
      text: count > 1 ? `${count} checks failing` : 'Check failing',
      tone: 'text-destructive',
    };
  }
  return { icon: 'i-mdi-clock-outline', text: `${checks.pending ?? 1} checks pending`, tone: 'text-warning' };
}

export default function Header(props: {
  source: DiffSource | null;
  data: DiffResult | null;
  checks: ChecksResult | null;
  busy: string | null;
  themeMode: string;
  themeIcon: string;
  onOpenSource: () => void;
  onOpenOptions: () => void;
  onOpenHelp: () => void;
  onCycleTheme: () => void;
  onRefresh: () => void;
  onCopy: () => void;
  onAction: (action: string, extra?: { method?: string }) => void;
  onComment: () => void;
}) {
  const meta = () => props.data?.prMeta ?? null;
  const stats = () =>
    (props.data?.files ?? []).reduce(
      (acc, file) => {
        acc.add += file.additions;
        acc.del += file.deletions;
        return acc;
      },
      { add: 0, del: 0 },
    );
  const prUrl = () => {
    if (meta()?.url) return meta()!.url;
    const source = props.source;
    if (source?.kind === 'pr' && source.repo) return `https://github.com/${source.repo}/pull/${source.pr}`;
    return null;
  };

  return (
    <header class="relative z-30 shrink-0 border-b border-border bg-surface">
      <div class="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <div class="flex min-w-0 items-center gap-2.5">
          <div class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <span class="i-mdi-file-compare text-lg" aria-hidden="true" />
          </div>
          <div class="hidden leading-tight sm:block">
            <div class="text-sm font-semibold tracking-tight">Diff Studio</div>
            <div class="text-[9px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
              open-in-web diff
            </div>
          </div>
        </div>

        <div class="mx-1 hidden h-6 w-px bg-border sm:block" />

        <button
          type="button"
          onClick={props.onOpenSource}
          title="Change diff source"
          class="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs transition-colors outline-none hover:border-border-hover hover:bg-secondary focus-visible:ring-2 focus-visible:ring-focus"
        >
          <span
            aria-hidden="true"
            class={`${props.source ? KIND_ICON[props.source.kind] : 'i-mdi-source-commit'} shrink-0 text-sm text-accent`}
          />
          <span class="truncate font-medium">
            {props.source ? sourceLabel(props.source) : 'Select a source'}
          </span>
          <span class="hidden max-w-56 truncate text-muted-foreground md:inline">
            {props.source ? sourceContext(props.source) : 'PR · ref · branch · files'}
          </span>
          <span class="i-mdi-chevron-down shrink-0 text-sm text-muted-foreground" aria-hidden="true" />
        </button>

        <Show when={props.data && props.data.files.length > 0}>
          <div class="hidden items-center gap-2 text-[11px] sm:flex">
            <span class="font-mono tabular-nums text-success">+{stats().add}</span>
            <span class="font-mono tabular-nums text-destructive">−{stats().del}</span>
            <span class="text-muted-foreground">
              {props.data!.files.length} {props.data!.files.length === 1 ? 'file' : 'files'}
            </span>
          </div>
        </Show>

        <div class="ml-auto flex items-center gap-0.5">
          <Show when={props.source?.kind === 'pr'}>
            <PrActionsMenu busy={props.busy} onAction={props.onAction} onComment={props.onComment} />
          </Show>

          <Show when={props.source && props.source.kind !== 'pr'}>
            <Button size="sm" onClick={() => props.onAction('checkout')} title="Checkout this ref">
              <span class="i-mdi-source-branch text-sm" aria-hidden="true" />
              <span class="hidden sm:inline">Checkout</span>
            </Button>
          </Show>

          <Show when={props.busy}>
            <span
              role="status"
              aria-live="polite"
              class="flex items-center gap-1.5 px-2 text-[11px] text-muted-foreground"
            >
              <Spinner class="text-sm" /> {props.busy}
            </span>
          </Show>

          <IconButton icon="i-mdi-refresh" label="Reload diff (r)" onClick={props.onRefresh} />
          <IconButton icon="i-mdi-link-variant" label="Copy link to this view" onClick={props.onCopy} />
          <IconButton icon="i-mdi-tune-variant" label="Viewer options (o)" onClick={props.onOpenOptions} />
          <IconButton icon="i-mdi-keyboard-outline" label="Keyboard shortcuts (?)" onClick={props.onOpenHelp} />
          <IconButton
            icon={props.themeIcon}
            label={`Theme: ${props.themeMode} (t)`}
            onClick={props.onCycleTheme}
          />
        </div>
      </div>

      <Show when={meta()}>
        <div class="flex h-9 items-center gap-2 border-t border-border px-3 text-xs sm:gap-3 sm:px-4">
          <Badge tone={STATE_TONE[meta()!.state] ?? 'neutral'}>{meta()!.state}</Badge>
          <span class="min-w-0 truncate font-medium">{meta()!.title}</span>
          <Show when={meta()!.author}>
            <span class="hidden shrink-0 text-muted-foreground sm:inline">
              by {meta()!.author!.login}
            </span>
          </Show>
          <Show when={checksView(props.checks)}>
            {(view) => (
              <span class={`hidden shrink-0 items-center gap-1 md:flex ${view().tone}`}>
                <span class={`${view().icon} text-sm`} aria-hidden="true" />
                {view().text}
              </span>
            )}
          </Show>
          <Show when={prUrl()}>
            {(url) => (
              <a
                href={url()}
                target="_blank"
                rel="noreferrer"
                class="ml-auto flex shrink-0 items-center gap-1 rounded-sm text-[11px] font-medium text-accent transition-colors outline-none hover:text-accent-hover focus-visible:ring-2 focus-visible:ring-focus"
              >
                Open on GitHub <span class="i-mdi-open-in-new text-xs" aria-hidden="true" />
              </a>
            )}
          </Show>
        </div>
      </Show>
    </header>
  );
}
