import { createEffect, createSignal, onCleanup } from 'solid-js';
import { DEFAULT_OPTIONS, loadOptions, saveOptions, resolveDark, type ViewerOptions } from './options';
import type { ThemeMode } from '../types';

export function useOptions() {
  const [options, setOptions] = createSignal<ViewerOptions>(loadOptions());
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const [systemDark, setSystemDark] = createSignal(media.matches);

  const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
  media.addEventListener('change', onChange);
  onCleanup(() => media.removeEventListener('change', onChange));

  const isDark = () => resolveDark(options().themeMode, systemDark());

  createEffect(() => {
    const next = options();
    const dark = isDark();
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('light', !dark);
    try {
      localStorage.setItem('od:theme-mode', next.themeMode);
    } catch {}
    saveOptions(next);
  });

  const update = (patch: Partial<ViewerOptions>) => setOptions((previous) => ({ ...previous, ...patch }));
  const reset = () => setOptions({ ...DEFAULT_OPTIONS });
  const cycleTheme = () => {
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    const current = options().themeMode;
    update({ themeMode: order[(order.indexOf(current) + 1) % order.length] });
  };

  return { options, update, reset, isDark, systemDark, cycleTheme };
}
