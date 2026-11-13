import { Store } from '@tanstack/store';
import type { FileEntry } from './types';

export type LoadStatus = 'idle' | 'loading-meta' | 'loading-zip' | 'extracting' | 'ready' | 'error';

export interface OpenTab {
  path: string;
  dirty: boolean;
}

export interface ProjectState {
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string;
  status: LoadStatus;
  statusMessage: string;
  fileCount: number;
  totalBytes: number;
  tree: FileEntry[];
  expanded: Set<string>;
  tabs: OpenTab[];
  activeTab: string | null;
  terminalOpen: boolean;
  quickOpen: boolean;
}

const initial: ProjectState = {
  repoUrl: '',
  owner: '',
  repo: '',
  branch: '',
  status: 'idle',
  statusMessage: 'Paste a GitHub URL to load a project',
  fileCount: 0,
  totalBytes: 0,
  tree: [],
  expanded: new Set<string>(['/']),
  tabs: [],
  activeTab: null,
  terminalOpen: true,
  quickOpen: false,
};

export const projectStore = new Store<ProjectState>(initial);

export function setState(patch: Partial<ProjectState>) {
  projectStore.setState((s) => ({ ...s, ...patch }));
}

export function toggleExpanded(path: string) {
  projectStore.setState((s) => {
    const next = new Set(s.expanded);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    return { ...s, expanded: next };
  });
}

export function openFile(path: string) {
  projectStore.setState((s) => {
    if (s.tabs.some((t) => t.path === path)) {
      return { ...s, activeTab: path };
    }
    return { ...s, tabs: [...s.tabs, { path, dirty: false }], activeTab: path };
  });
}

export function closeTab(path: string) {
  projectStore.setState((s) => {
    const tabs = s.tabs.filter((t) => t.path !== path);
    const activeTab = s.activeTab === path ? (tabs[tabs.length - 1]?.path ?? null) : s.activeTab;
    return { ...s, tabs, activeTab };
  });
}

export function markDirty(path: string, dirty: boolean) {
  projectStore.setState((s) => ({
    ...s,
    tabs: s.tabs.map((t) => (t.path === path ? { ...t, dirty } : t)),
  }));
}
