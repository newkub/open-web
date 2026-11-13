import { Show } from 'solid-js';
import { THEME_PAIRS, type ViewerOptions } from '../lib/options';
import { Kbd } from './ui';

export default function StatusBar(props: {
  options: ViewerOptions;
  status: { label: string; tone: 'success' | 'warning' | 'danger' | 'accent' };
  onOpenHelp: () => void;
}) {
  const dot = () => {
    if (props.status.tone === 'danger') return 'bg-destructive';
    if (props.status.tone === 'warning') return 'bg-warning';
    if (props.status.tone === 'accent') return 'bg-accent';
    return 'bg-success';
  };

  return (
    <footer class="flex h-7 shrink-0 items-center gap-3 border-t border-border bg-surface px-3 text-[10px] text-muted-foreground">
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        class="flex shrink-0 items-center gap-1.5"
      >
        <span class={`size-1.5 rounded-full ${dot()}`} aria-hidden="true" />
        {props.status.label}
      </span>
      <span class="hidden h-3 w-px bg-border md:block" />
      <button
        type="button"
        onClick={props.onOpenHelp}
        class="hidden items-center gap-1.5 rounded-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus md:flex"
      >
        <Kbd>?</Kbd> shortcuts
      </button>
      <span class="hidden items-center gap-1 lg:flex">
        <Kbd>o</Kbd> options
      </span>
      <span class="hidden items-center gap-1 xl:flex">
        <Kbd>d</Kbd> split / unified
      </span>
      <div class="ml-auto flex shrink-0 items-center gap-3">
        <span class="hidden sm:inline">{THEME_PAIRS[props.options.themePair].label}</span>
        <span class="hidden sm:inline">{props.options.diffStyle}</span>
        <span class="hidden md:inline">
          {props.options.layout === 'focus' ? 'focus' : 'all files'}
        </span>
        <span class="font-mono">{Math.round(props.options.fontScale * 100)}%</span>
        <Show when={props.options.selection}>
          <span class="text-accent">selection</span>
        </Show>
        <a
          href="https://diffs.com"
          target="_blank"
          rel="noreferrer"
          class="hidden items-center gap-0.5 rounded-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus sm:flex"
        >
          @pierre/diffs <span class="i-mdi-open-in-new text-[9px]" aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}
