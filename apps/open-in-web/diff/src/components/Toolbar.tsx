import { Show } from 'solid-js';
import type { FileEntry, ThemeMode } from '../types';
import type { ViewerOptions } from '../lib/options';
import { fileIcon } from '../lib/file-icons';
import { IconButton, Segmented } from './ui';

export default function Toolbar(props: {
  options: ViewerOptions;
  activeFile: FileEntry | null;
  activeIdx: number | null;
  visible: number;
  total: number;
  onUpdate: (patch: Partial<ViewerOptions>) => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenOptions: () => void;
}) {
  const percent = () => `${Math.round(props.options.fontScale * 100)}%`;
  const changeScale = (delta: number) => {
    const next = Math.min(1.5, Math.max(0.8, Math.round((props.options.fontScale + delta) * 100) / 100));
    props.onUpdate({ fontScale: next });
  };

  return (
    <div
      role="toolbar"
      aria-label="Diff viewer controls"
      class="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-background px-3"
    >
      <Show
        when={props.options.layout === 'focus'}
        fallback={
          <div class="flex min-w-0 items-center gap-2 text-xs text-muted-foreground" role="status" aria-live="polite" aria-atomic="true">
            <span class="font-medium text-foreground">{props.visible}</span>
            <span>{props.visible === 1 ? 'file' : 'files'} in view</span>
            <Show when={props.visible !== props.total}>
              <span class="text-[10px]">of {props.total}</span>
            </Show>
          </div>
        }
      >
        <div class="flex min-w-0 items-center gap-1">
          <IconButton size="sm" icon="i-mdi-chevron-left" label="Previous file (p)" onClick={props.onPrev} />
          <IconButton size="sm" icon="i-mdi-chevron-right" label="Next file (n)" onClick={props.onNext} />
          <Show when={props.activeFile}>
            {(file) => (
              <div class="ml-1 flex min-w-0 items-center gap-1.5">
                <span class={`${fileIcon(file().name).icon} text-sm ${fileIcon(file().name).tone}`} aria-hidden="true" />
                <span class="truncate font-mono text-xs">{file().name}</span>
                <span class="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {props.activeIdx !== null ? `${props.activeIdx + 1}/${props.total}` : ''}
                </span>
              </div>
            )}
          </Show>
        </div>
      </Show>

      <div class="ml-auto flex items-center gap-0.5">
        <Segmented
          label="Diff style"
          value={props.options.diffStyle}
          onChange={(value) => props.onUpdate({ diffStyle: value })}
          options={[
            { value: 'split', label: 'Split' },
            { value: 'unified', label: 'Unified' },
          ]}
        />
        <IconButton
          size="sm"
          icon="i-mdi-format-list-numbered"
          label="Toggle line numbers"
          active={props.options.lineNumbers}
          onClick={() => props.onUpdate({ lineNumbers: !props.options.lineNumbers })}
        />
        <IconButton
          size="sm"
          icon="i-mdi-wrap"
          label="Toggle line wrapping (w)"
          active={props.options.wrap}
          onClick={() => props.onUpdate({ wrap: !props.options.wrap })}
        />
        <IconButton
          size="sm"
          icon={props.options.layout === 'focus' ? 'i-mdi-file-outline' : 'i-mdi-view-agenda-outline'}
          label="Toggle focus layout (f)"
          active={props.options.layout === 'focus'}
          onClick={() => props.onUpdate({ layout: props.options.layout === 'focus' ? 'all' : 'focus' })}
        />

        <div class="mx-1.5 h-5 w-px bg-border" />

        <div role="group" aria-label="Code font size" class="flex items-center rounded-md border border-border bg-surface">
          <button
            type="button"
            aria-label="Decrease font size"
            onClick={() => changeScale(-0.05)}
            class="grid size-7 place-items-center rounded-l-md text-muted-foreground transition-colors outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span class="i-mdi-minus text-sm" aria-hidden="true" />
          </button>
          <span class="w-10 text-center font-mono text-[10px] tabular-nums text-muted-foreground" aria-live="polite">
            {percent()}
          </span>
          <button
            type="button"
            aria-label="Increase font size"
            onClick={() => changeScale(0.05)}
            class="grid size-7 place-items-center rounded-r-md text-muted-foreground transition-colors outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span class="i-mdi-plus text-sm" aria-hidden="true" />
          </button>
        </div>

        <IconButton
          size="sm"
          icon="i-mdi-tune-variant"
          label="All viewer options (o)"
          onClick={props.onOpenOptions}
        />
      </div>
    </div>
  );
}

export const THEME_MODE_ICON: Record<ThemeMode, string> = {
  system: 'i-mdi-theme-light-dark',
  light: 'i-mdi-weather-sunny',
  dark: 'i-mdi-weather-night',
};
