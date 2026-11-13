import { Show, createMemo } from 'solid-js';
import type { FileDiffMetadata } from '@pierre/diffs';
import type { FileEntry, SortMode, StatusFilter } from '../types';
import { buildFileTree } from '../lib/file-tree';
import { IconButton, Kbd, Select } from './ui';
import FileTree from './FileTree';

interface SidebarProps {
  files: FileEntry[];
  indices: number[];
  metas: (FileDiffMetadata | null)[];
  activeIdx: number | null;
  viewed: Set<number>;
  query: string;
  status: StatusFilter;
  sort: SortMode;
  treeView: boolean;
  hideViewed: boolean;
  total: number;
  onQuery: (value: string) => void;
  onStatus: (value: StatusFilter) => void;
  onSort: (value: SortMode) => void;
  onTreeView: (value: boolean) => void;
  onHideViewed: (value: boolean) => void;
  onSelect: (index: number) => void;
  onToggleViewed: (index: number) => void;
  onMarkAll: (viewed: boolean) => void;
}

export default function Sidebar(props: SidebarProps) {
  const tree = createMemo(() => buildFileTree(props.files, props.indices));
  const seen = () => props.viewed.size;

  return (
    <aside aria-label="Changed files" class="flex w-72 shrink-0 flex-col border-r border-border bg-surface">
      <div class="flex items-center justify-between px-3 pt-3 pb-2">
        <div class="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          Changed files
        </div>
        <span class="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
          {props.indices.length}/{props.total}
        </span>
      </div>

      <div class="relative px-3">
        <span
          class="i-mdi-magnify absolute top-1/2 left-5 -translate-y-1/2 text-sm text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="file-search"
          value={props.query}
          onInput={(event) => props.onQuery(event.currentTarget.value)}
          placeholder="Filter files…"
          aria-label="Filter files"
          spellcheck={false}
          class="h-8 w-full rounded-md border border-border bg-background pr-8 pl-8 text-xs outline-none transition-colors placeholder:text-muted-foreground hover:border-border-hover focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus"
        />
        <Show
          when={props.query}
          fallback={
            <span class="absolute top-1/2 right-4 -translate-y-1/2">
              <Kbd>/</Kbd>
            </span>
          }
        >
          <button
            type="button"
            aria-label="Clear filter"
            onClick={() => props.onQuery('')}
            class="absolute top-1/2 right-3 grid size-5 place-items-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span class="i-mdi-close-circle text-sm" aria-hidden="true" />
          </button>
        </Show>
      </div>

      <div class="mt-2 grid grid-cols-2 gap-1.5 px-3">
        <Select
          value={props.status}
          label="Status filter"
          onChange={(value) => props.onStatus(value as StatusFilter)}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'change', label: 'Modified' },
            { value: 'new', label: 'Added' },
            { value: 'deleted', label: 'Deleted' },
            { value: 'renamed', label: 'Renamed' },
          ]}
        />
        <Select
          value={props.sort}
          label="Sort files"
          onChange={(value) => props.onSort(value as SortMode)}
          options={[
            { value: 'path', label: 'Sort: path' },
            { value: 'changes', label: 'Sort: changes' },
            { value: 'status', label: 'Sort: status' },
          ]}
        />
      </div>

      <div class="mt-2 flex items-center gap-0.5 border-y border-border px-2 py-1">
        <IconButton
          size="sm"
          icon={props.treeView ? 'i-mdi-file-tree' : 'i-mdi-format-list-bulleted'}
          label={props.treeView ? 'Show flat list' : 'Show file tree'}
          onClick={() => props.onTreeView(!props.treeView)}
        />
        <IconButton
          size="sm"
          icon={props.hideViewed ? 'i-mdi-eye-off-outline' : 'i-mdi-eye-outline'}
          label={props.hideViewed ? 'Show viewed files' : 'Hide viewed files'}
          active={props.hideViewed}
          onClick={() => props.onHideViewed(!props.hideViewed)}
        />
        <IconButton
          size="sm"
          icon="i-mdi-check-all"
          label="Mark all viewed"
          onClick={() => props.onMarkAll(true)}
        />
        <IconButton
          size="sm"
          icon="i-mdi-checkbox-blank-outline"
          label="Mark all unviewed"
          onClick={() => props.onMarkAll(false)}
        />
        <span
          class="ml-auto pr-1 font-mono text-[10px] tabular-nums text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {seen()} viewed
        </span>
      </div>

      <FileTree
        files={props.files}
        indices={props.indices}
        metas={props.metas}
        activeIdx={props.activeIdx}
        viewed={props.viewed}
        treeView={props.treeView}
        tree={tree()}
        onSelect={props.onSelect}
        onToggleViewed={props.onToggleViewed}
      />

      <div class="flex items-center justify-between border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
        <span class="flex items-center gap-1.5">
          <span class="i-mdi-mouse-outline text-xs" aria-hidden="true" /> click a file to jump
        </span>
        <span class="flex items-center gap-1">
          <Kbd>n</Kbd>
          <Kbd>p</Kbd>
        </span>
      </div>
    </aside>
  );
}
