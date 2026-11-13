import type {
  DiffIndicators,
  DiffStyle,
  HunkSeparators,
  Layout,
  LineDiffType,
  ThemeMode,
  ThemePair,
} from '../types';

export interface ViewerOptions {
  themeMode: ThemeMode;
  themePair: ThemePair;
  diffStyle: DiffStyle;
  indicators: DiffIndicators;
  backgrounds: boolean;
  lineNumbers: boolean;
  wrap: boolean;
  inlineDiff: LineDiffType;
  hunkSeparators: HunkSeparators;
  fontScale: number;
  layout: Layout;
  sidebar: boolean;
  stickyHeaders: boolean;
  lineHover: boolean;
  selection: boolean;
}

export const DEFAULT_OPTIONS: ViewerOptions = {
  themeMode: 'system',
  themePair: 'pierre',
  diffStyle: 'split',
  indicators: 'bars',
  backgrounds: true,
  lineNumbers: true,
  wrap: false,
  inlineDiff: 'word-alt',
  hunkSeparators: 'line-info',
  fontScale: 1,
  layout: 'all',
  sidebar: true,
  stickyHeaders: true,
  lineHover: true,
  selection: false,
};

export const THEME_PAIRS: Record<ThemePair, { label: string; dark: string; light: string }> = {
  pierre: { label: 'Pierre', dark: 'pierre-dark', light: 'pierre-light' },
  github: { label: 'GitHub', dark: 'github-dark', light: 'github-light' },
  one: { label: 'One', dark: 'one-dark-pro', light: 'one-light' },
  vitesse: { label: 'Vitesse', dark: 'vitesse-dark', light: 'vitesse-light' },
  catppuccin: { label: 'Catppuccin', dark: 'catppuccin-mocha', light: 'catppuccin-latte' },
};

const STORAGE_KEY = 'od:options';
const VALID_KEYS = new Set(Object.keys(DEFAULT_OPTIONS));

export function loadOptions(): ViewerOptions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_OPTIONS;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next = { ...DEFAULT_OPTIONS };
    for (const [key, value] of Object.entries(parsed)) {
      if (VALID_KEYS.has(key) && value !== null && typeof value === typeof (DEFAULT_OPTIONS as any)[key]) {
        (next as any)[key] = value;
      }
    }
    return next;
  } catch {
    return DEFAULT_OPTIONS;
  }
}

export function saveOptions(options: ViewerOptions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
  } catch {}
}

export function resolveDark(mode: ThemeMode, systemDark: boolean): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return systemDark;
}
