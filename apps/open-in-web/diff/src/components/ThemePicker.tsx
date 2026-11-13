import { For, Show } from 'solid-js';
import { THEME_PAIRS, type ViewerOptions } from '../lib/options';
import type { ThemeMode, ThemePair } from '../types';
import { Segmented } from './ui';

const SWATCHES: Record<ThemePair, { dark: string; light: string }> = {
  pierre: { dark: '#171717', light: '#f6f4f0' },
  github: { dark: '#0d1117', light: '#ffffff' },
  one: { dark: '#282c34', light: '#fafafa' },
  vitesse: { dark: '#121212', light: '#ffffff' },
  catppuccin: { dark: '#1e1e2e', light: '#eff1f5' },
};

export default function ThemePicker(props: {
  themeMode: ThemeMode;
  themePair: ThemePair;
  update: (patch: Partial<ViewerOptions>) => void;
}) {
  return (
    <>
      <Segmented
        value={props.themeMode}
        label="Theme mode"
        onChange={(value) => props.update({ themeMode: value })}
        options={[
          { value: 'system' as ThemeMode, label: 'System', icon: 'i-mdi-monitor' },
          { value: 'light' as ThemeMode, label: 'Light', icon: 'i-mdi-weather-sunny' },
          { value: 'dark' as ThemeMode, label: 'Dark', icon: 'i-mdi-weather-night' },
        ]}
      />
      <div class="grid grid-cols-2 gap-1.5 pt-1">
        <For each={Object.entries(THEME_PAIRS)}>
          {([key, pair]) => (
            <button
              type="button"
              aria-pressed={props.themePair === key}
              onClick={() => props.update({ themePair: key as ThemePair })}
              class={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                props.themePair === key
                  ? 'border-accent bg-muted text-foreground'
                  : 'border-border text-muted-foreground hover:border-border-hover hover:text-foreground'
              }`}
            >
              <span
                class="flex shrink-0 overflow-hidden rounded-sm border border-border"
                aria-hidden="true"
              >
                <span
                  class="size-3"
                  style={{ background: SWATCHES[key as ThemePair].light }}
                />
                <span
                  class="size-3"
                  style={{ background: SWATCHES[key as ThemePair].dark }}
                />
              </span>
              <span class="truncate font-medium">{pair.label}</span>
              <Show when={props.themePair === key}>
                <span class="i-mdi-check ml-auto text-sm text-accent" aria-hidden="true" />
              </Show>
            </button>
          )}
        </For>
      </div>
    </>
  );
}
