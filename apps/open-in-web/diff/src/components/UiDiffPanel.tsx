import { createSignal, For, Show } from 'solid-js';
import type { DiffSource, UiDiffPayload } from '../types';

type ViewMode = 'slider' | 'side' | 'diff';

const MODES: { id: ViewMode; label: string }[] = [
  { id: 'slider', label: 'Slider' },
  { id: 'side', label: 'Side by side' },
  { id: 'diff', label: 'Diff' },
];

interface Props {
  source: Extract<DiffSource, { kind: 'ui' }>;
  ui: UiDiffPayload | null | undefined;
  loading: boolean;
}

export default function UiDiffPanel(props: Props) {
  const [mode, setMode] = createSignal<ViewMode>('slider');
  const [position, setPosition] = createSignal(50);

  const pct = () => (props.ui ? (props.ui.mismatch * 100).toFixed(2) : '0.00');
  const tone = () => {
    const value = props.ui?.mismatch ?? 0;
    if (value === 0) return 'text-emerald-500';
    if (value < 0.02) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2">
        <div class="flex rounded-md border border-border p-0.5" role="tablist" aria-label="Compare mode">
          <For each={MODES}>
            {(item) => (
              <button
                type="button"
                role="tab"
                aria-selected={mode() === item.id}
                class={`rounded px-2.5 py-1 text-xs transition-colors ${
                  mode() === item.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setMode(item.id)}
              >
                {item.label}
              </button>
            )}
          </For>
        </div>

        <Show when={props.ui}>
          <span class={`font-mono text-sm font-semibold ${tone()}`}>{pct()}% pixels differ</span>
          <span class="text-xs text-muted-foreground">
            {props.ui!.width}×{props.ui!.height} · {props.ui!.viewport}
            {props.source.fullPage ? ' · full page' : ''} · {(props.ui!.elapsedMs / 1000).toFixed(1)}s
          </span>
        </Show>

        <div class="ml-auto flex min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground">
          <span class="max-w-55 truncate" title={props.source.before}>
            before: {props.source.before}
          </span>
          <span>→</span>
          <span class="max-w-55 truncate" title={props.source.after}>
            after: {props.source.after}
          </span>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-auto bg-neutral-950 p-4">
        <Show
          when={!props.loading}
          fallback={
            <div class="flex h-full items-center justify-center text-sm text-muted-foreground">
              Capturing screenshots and comparing…
            </div>
          }
        >
          <Show
            when={props.ui}
            fallback={
              <div class="flex h-full items-center justify-center text-sm text-muted-foreground">
                No result yet — the diff loads automatically.
              </div>
            }
          >
            <Show when={mode() === 'slider'}>
              <div class="relative mx-auto w-fit select-none overflow-hidden rounded-lg border border-border">
                <img src={props.ui!.after} alt="After screenshot" class="block max-w-full" draggable={false} />
                <div
                  class="absolute inset-0 overflow-hidden"
                  style={{ 'clip-path': `inset(0 ${100 - position()}% 0 0)` }}
                >
                  <img src={props.ui!.before} alt="Before screenshot" class="block max-w-full" draggable={false} />
                </div>
                <div class="absolute inset-y-0 w-0.5 bg-white/90 shadow" style={{ left: `${position()}%` }} />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={position()}
                  aria-label="Comparison position"
                  class="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
                  onInput={(event) => setPosition(Number(event.currentTarget.value))}
                />
                <span class="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                  Before
                </span>
                <span class="pointer-events-none absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                  After
                </span>
              </div>
            </Show>

            <Show when={mode() === 'side'}>
              <div class="mx-auto grid w-fit gap-4 md:grid-cols-2">
                <figure>
                  <figcaption class="mb-1 text-xs font-semibold uppercase text-muted-foreground">Before</figcaption>
                  <img src={props.ui!.before} alt="Before screenshot" class="block max-w-full rounded-lg border border-border" draggable={false} />
                </figure>
                <figure>
                  <figcaption class="mb-1 text-xs font-semibold uppercase text-muted-foreground">After</figcaption>
                  <img src={props.ui!.after} alt="After screenshot" class="block max-w-full rounded-lg border border-border" draggable={false} />
                </figure>
              </div>
            </Show>

            <Show when={mode() === 'diff'}>
              <div class="mx-auto w-fit">
                <img src={props.ui!.diff} alt="Pixel diff" class="block max-w-full rounded-lg border border-border" draggable={false} />
                <p class="mt-2 text-center text-xs text-muted-foreground">
                  Red pixels mark differences — anti-aliased edges are ignored.
                </p>
              </div>
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  );
}
