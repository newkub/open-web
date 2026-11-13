import { useStore } from '@tanstack/react-store';
import { projectStore, toggleExpanded, openFile } from '../store';
import { FileIcon } from '../icons';
import type { FileEntry } from '../types';

interface Node {
  entry: FileEntry;
  depth: number;
}

export function FileTree() {
  const tree = useStore(projectStore, (s) => s.tree);
  const expanded = useStore(projectStore, (s) => s.expanded);
  const activeTab = useStore(projectStore, (s) => s.activeTab);

  const nodes = flattenTree(tree, expanded);

  return (
    <div className="filetree">
      {nodes.length === 0 && <div className="tree-empty">No project loaded</div>}
      {nodes.map(({ entry, depth }) => (
        <div
          key={entry.path}
          className={`tree-row ${entry.is_dir ? 'dir' : 'file'} ${activeTab === entry.path ? 'active' : ''}`}
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => {
            if (entry.is_dir) toggleExpanded(entry.path);
            else openFile(entry.path);
          }}
          title={entry.path}
        >
          <span className="twisty">{entry.is_dir ? (expanded.has(entry.path) ? '▾' : '▸') : ''}</span>
          <FileIcon path={entry.path} isDir={entry.is_dir} size={entry.is_dir ? 14 : 15} />
          <span className="name">{entry.name}</span>
          {!entry.is_dir && entry.size > 0 && <span className="size">{formatSize(entry.size)}</span>}
        </div>
      ))}
    </div>
  );
}

function flattenTree(entries: FileEntry[], expanded: Set<string>): Node[] {
  const byParent = new Map<string, FileEntry[]>();
  for (const e of entries) {
    const idx = e.path.lastIndexOf('/');
    const parent = idx <= 0 ? '/' : e.path.slice(0, idx);
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent)!.push(e);
  }
  const out: Node[] = [];
  const walk = (dir: string, depth: number) => {
    const kids = byParent.get(dir) ?? [];
    kids.sort((a, b) => Number(b.is_dir) - Number(a.is_dir) || a.name.localeCompare(b.name));
    for (const k of kids) {
      out.push({ entry: k, depth });
      if (k.is_dir && expanded.has(k.path)) walk(k.path, depth + 1);
    }
  };
  walk('/', 0);
  return out;
}

function formatSize(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}K`;
  return `${(n / 1024 / 1024).toFixed(1)}M`;
}
