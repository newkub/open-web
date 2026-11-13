import { Show, createEffect, on, onCleanup, onMount } from 'solid-js';
import { CodeView, type CodeViewItem } from '@pierre/diffs';
import type { FileEntry, DiffSource } from '../types';
import type { ViewerOptions } from '../lib/options';
import { buildCodeViewOptions } from '../lib/viewer';
import { EmptyHint } from './ui-layout';

export interface ViewerApi {
  scrollTo: (id: string) => void;
}

export default function DiffPanel(props: {
  items: CodeViewItem<undefined>[];
  options: ViewerOptions;
  isDark: boolean;
  source: DiffSource | null;
  sourceKey: string;
  cacheKey: string;
  loading: boolean;
  scrollTarget: { id: string; nonce: number } | null;
  activeFile: FileEntry | null;
  activeVisible: boolean;
  focus: boolean;
  onApi: (api: ViewerApi) => void;
}) {
  let host!: HTMLDivElement;
  let viewer: CodeView<undefined, undefined> | null = null;
  let mounted = false;

  const viewerOptions = () =>
    buildCodeViewOptions(props.options, props.isDark, props.source, props.cacheKey);

  const applyOptions = () => {
    if (!viewer) return;
    viewer.setOptions(viewerOptions());
    viewer.onThemeChange();
  };

  const createViewer = () => {
    viewer?.cleanUp();
    viewer = new CodeView<undefined, undefined>(viewerOptions());
    viewer.setup(host);
    viewer.setItems(props.items);
    props.onApi({
      scrollTo: (id) => viewer?.scrollTo({ type: 'item', id, align: 'start' }),
    });
  };

  onMount(() => {
    mounted = true;
    createViewer();
    onCleanup(() => {
      viewer?.cleanUp();
      viewer = null;
    });
  });

  createEffect(
    on(
      () => props.sourceKey,
      () => {
        if (mounted) createViewer();
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => props.items,
      (items) => {
        viewer?.setItems(items);
        if (props.scrollTarget) {
          viewer?.scrollTo({ type: 'item', id: props.scrollTarget.id, align: 'start' });
        }
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => props.options,
      () => applyOptions(),
    ),
  );

  createEffect(
    on(
      () => props.isDark,
      () => applyOptions(),
    ),
  );

  createEffect(
    on(
      () => props.scrollTarget?.nonce,
      () => {
        const target = props.scrollTarget;
        if (target) viewer?.scrollTo({ type: 'item', id: target.id, align: 'start' });
      },
      { defer: true },
    ),
  );

  createEffect(() => {
    const scale = props.options.fontScale;
    host.style.setProperty('--diff-font-scale', String(scale));
    host.style.setProperty('--diffs-font-size', `${13 * scale}px`);
    host.style.setProperty('--diffs-line-height', `${20 * scale}px`);
  });

  return (
    <div class="relative min-h-0 flex-1 overflow-hidden bg-background">
      <Show when={props.loading}>
        <div
          role="progressbar"
          aria-label="Loading diff"
          class="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-muted"
        >
          <div class="h-full w-1/3 animate-pulse bg-accent" />
        </div>
      </Show>

      <div
        ref={host}
        aria-busy={props.loading}
        class="diff-host absolute inset-0 overflow-x-hidden overflow-y-auto"
      />

      <Show when={props.items.length === 0 && !props.loading}>
        <div class="absolute inset-0 z-10 bg-background">
          <Show
            when={props.activeFile}
            fallback={
              <Show
                when={props.focus}
                fallback={
                  <EmptyHint icon="i-mdi-check-circle-outline" title="No changes to display">
                    This source has no file changes, or every change was filtered out by the sidebar.
                  </EmptyHint>
                }
              >
                <EmptyHint icon="i-mdi-file-search-outline" title="Select a file to preview">
                  Pick a file from the sidebar to preview its diff in focus mode.
                </EmptyHint>
              </Show>
            }
          >
            <Show
              when={props.activeVisible}
              fallback={
                <EmptyHint icon="i-mdi-filter-remove-outline" title="File hidden by filters">
                  <span class="font-mono">{props.activeFile!.name}</span> is excluded by the current
                  search, status filter, or viewed-files toggle. Clear the filters to preview it again.
                </EmptyHint>
              }
            >
              <EmptyHint icon="i-mdi-file-question-outline" title="No preview for this file">
                <span class="font-mono">{props.activeFile!.name}</span> is binary or its patch could not be
                parsed. Use the sidebar to pick another file.
              </EmptyHint>
            </Show>
          </Show>
        </div>
      </Show>
    </div>
  );
}
