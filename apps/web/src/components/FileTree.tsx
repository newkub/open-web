import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@tanstack/react-store';
import { projectStore, toggleExpanded, openFile, setState, closeTab } from '../store';
import { FileIcon } from '../icons';
import { getVfs } from '../vfs';
import type { FileEntry } from '../types';

interface Node {
  entry: FileEntry;
  depth: number;
}

interface MenuState {
  x: number;
  y: number;
  entry: FileEntry;
}

async function refreshTree() {
  const vfs = await getVfs();
  setState({ tree: vfs.walk(), fileCount: vfs.file_count(), totalBytes: vfs.total_bytes() });
}

export function FileTree() {
  const tree = useStore(projectStore, (s) => s.tree);
  const expanded = useStore(projectStore, (s) => s.expanded);
  const activeTab = useStore(projectStore, (s) => s.activeTab);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const nodes = useMemo(() => flattenTree(tree, expanded), [tree, expanded]);

  // File count badge per directory (descendant files).
  const dirCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const parentsOf = (p: string): string[] => {
      const out: string[] = [];
      let cur = p.slice(0, p.lastIndexOf('/')) || '/';
      while (cur !== '/') {
        out.push(cur);
        cur = cur.slice(0, cur.lastIndexOf('/')) || '/';
      }
      return out;
    };
    for (const e of tree) {
      if (e.is_dir) continue;
      for (const d of parentsOf(e.path)) counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return counts;
  }, [tree]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  const act = async (action: string, entry: FileEntry) => {
    setMenu(null);
    const vfs = await getVfs();
    if (action === 'open') {
      if (entry.is_dir) toggleExpanded(entry.path);
      else openFile(entry.path);
    } else if (action === 'copy') {
      void navigator.clipboard?.writeText(entry.path).catch(() => {});
    } else if (action === 'download' && !entry.is_dir) {
      const data = vfs.read_file(entry.path);
      if (data) {
        const blob = new Blob([data.slice().buffer as ArrayBuffer]);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = entry.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } else if (action === 'rename') {
      const next = prompt('Rename to:', entry.name);
      if (!next || next === entry.name) return;
      const dir = entry.path.slice(0, entry.path.lastIndexOf('/')) || '/';
      const to = `${dir === '/' ? '' : dir}/${next}`;
      if (!vfs.rename(entry.path, to)) {
        alert('Rename failed — name may already exist');
        return;
      }
      // Remap open tabs pointing at the old path.
      projectStore.setState((s) => ({
        ...s,
        tabs: s.tabs.map((t) => (t.path === entry.path ? { ...t, path: to } : t)),
        activeTab: s.activeTab === entry.path ? to : s.activeTab,
      }));
      await refreshTree();
    } else if (action === 'newfile') {
      const dir = entry.is_dir ? entry.path : entry.path.slice(0, entry.path.lastIndexOf('/')) || '/';
      const name = prompt('New file name:', 'untitled.txt');
      if (!name) return;
      const to = `${dir === '/' ? '' : dir}/${name}`;
      if (vfs.exists(to)) {
        alert('A file with that name already exists');
        return;
      }
      vfs.write_file(to, new TextEncoder().encode(''));
      await refreshTree();
      openFile(to);
    } else if (action === 'delete') {
      if (!confirm(`Delete ${entry.path}${entry.is_dir ? ' (and contents)' : ''}?`)) return;
      vfs.delete_file(entry.path);
      closeTab(entry.path);
      await refreshTree();
    }
  };

  return (
    <div
      className="filetree"
      onContextMenu={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        setMenu({
          x: e.clientX,
          y: e.clientY,
          entry: { path: '/', name: '(root)', is_dir: true, size: 0 },
        });
      }}
    >
      {nodes.length === 0 && <div className="tree-empty">No project loaded</div>}
      {nodes.map(({ entry, depth }, i) => (
        <div
          key={entry.path}
          className={`tree-row ${entry.is_dir ? 'dir' : 'file'} ${activeTab === entry.path ? 'active' : ''}`}
          style={{ paddingLeft: 8 + depth * 14, animationDelay: `${Math.min(i * 8, 300)}ms` }}
          onClick={() => {
            if (entry.is_dir) toggleExpanded(entry.path);
            else openFile(entry.path);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenu({ x: e.clientX, y: e.clientY, entry });
          }}
          title={entry.path}
        >
          <span className="twisty">{entry.is_dir ? (expanded.has(entry.path) ? '▾' : '▸') : ''}</span>
          <FileIcon path={entry.path} isDir={entry.is_dir} size={entry.is_dir ? 14 : 15} />
          <span className="name">{entry.name}</span>
          {entry.is_dir && (dirCounts.get(entry.path) ?? 0) > 0 && (
            <span className="count-badge">{dirCounts.get(entry.path)}</span>
          )}
          {!entry.is_dir && entry.size > 0 && <span className="size">{formatSize(entry.size)}</span>}
        </div>
      ))}
      {menu && (
        <div
          ref={menuRef}
          className="ctx-menu"
          style={{
            left: Math.min(menu.x, window.innerWidth - 190),
            top: Math.min(menu.y, window.innerHeight - 210),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {[
            ['open', menu.entry.is_dir ? 'Expand / collapse' : 'Open'],
            ['copy', 'Copy path'],
            ['download', 'Download'],
            ['rename', 'Rename…'],
            ['newfile', 'New file…'],
            ['delete', 'Delete'],
          ].map(([action, label]) => (
            <button
              key={action}
              className={`ctx-item ${action === 'delete' ? 'danger' : ''}`}
              disabled={action === 'download' && menu.entry.is_dir}
              onClick={() => void act(action, menu.entry)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
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
