export interface FileEntry {
  name: string;
  type: string;
  additions: number;
  deletions: number;
  chunk: string;
}

export interface PrMeta {
  title: string;
  author?: { login: string; avatarUrl?: string };
  state: string;
  url: string;
  number: number;
}

export interface UiDiffPayload {
  before: string;
  after: string;
  diff: string;
  mismatch: number;
  width: number;
  height: number;
  viewport: string;
  elapsedMs: number;
}

export interface DiffResult {
  source: DiffSource;
  files: FileEntry[];
  raw: string;
  prMeta?: PrMeta | null;
  ui?: UiDiffPayload | null;
}

export interface UiOptions {
  viewport?: string;
  fullPage?: boolean;
  threshold?: number;
  waitMs?: number;
}

export type DiffSource =
  | { kind: 'pr'; pr: number; repo?: string }
  | { kind: 'git'; ref: string; repo?: string }
  | { kind: 'branch'; base: string; head: string; repo?: string }
  | { kind: 'file'; old: string; new: string }
  | ({ kind: 'ui'; before: string; after: string } & UiOptions);

export type SourceKind = DiffSource['kind'];

export type ThemeMode = 'system' | 'light' | 'dark';
export type ThemePair = 'pierre' | 'github' | 'one' | 'vitesse' | 'catppuccin';
export type DiffStyle = 'split' | 'unified';
export type DiffIndicators = 'bars' | 'classic' | 'none';
export type LineDiffType = 'word-alt' | 'word-line' | 'word' | 'char' | 'none';
export type HunkSeparators = 'line-info' | 'line-info-basic' | 'metadata' | 'simple';
export type Layout = 'all' | 'focus';
export type SortMode = 'path' | 'changes' | 'status';
export type StatusFilter = 'all' | 'change' | 'new' | 'deleted' | 'renamed';
