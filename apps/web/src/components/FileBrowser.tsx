import { useMemo, useState } from 'react';
import { useStore } from '@tanstack/react-store';
import { projectStore, openFile } from '../store';
import { FileIcon } from '../icons';
import type { FileEntry } from '../types';

interface Group {
  name: string;
  path: string;
  files: FileEntry[];
}

/** Empty-state browser: every file grouped by top-level folder + search. */
export function FileBrowser() {
  const tree = useStore(projectStore, (s) => s.tree);
  const fileCount = useStore(projectStore, (s) => s.fileCount);
  const totalBytes = useStore(projectStore, (s) => s.totalBytes);
  const [q, setQ] = useState('');

  const groups = useMemo(() => {
    const files = tree.filter((e) => !e.is_dir);
    const query = q.trim().toLowerCase();
    const filtered = query
      ? files.filter((f) => f.path.toLowerCase().includes(query) || f.name.toLowerCase().includes(query))
      : files;
    const map = new Map<string, Group>();
    for (const f of filtered) {
      const seg = f.path.split('/').filter(Boolean);
      const top = seg.length > 1 ? seg[0] : '(root)';
      const dirPath = top === '(root)' ? '/' : `/${top}`;
      if (!map.has(top)) map.set(top, { name: top, path: dirPath, files: [] });
      map.get(top)!.files.push(f);
    }
    return [...map.values()].sort((a, b) =>
      a.name === '(root)' ? -1 : b.name === '(root)' ? 1 : a.name.localeCompare(b.name),
    );
  }, [tree, q]);

  const shown = groups.reduce((n, g) => n + g.files.length, 0);

  return (
    <div className="file-browser">
      <div className="fb-head">
        <input
          className="fb-search"
          placeholder={`Search ${fileCount} files…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <span className="fb-meta">
          {fileCount} files · {(totalBytes / 1024).toFixed(0)} KB
        </span>
      </div>
      <div className="fb-groups">
        {groups.map((g, gi) => (
          <section key={g.name} className="fb-group" style={{ animationDelay: `${Math.min(gi * 40, 400)}ms` }}>
            <header className="fb-group-head">
              <FileIcon path={g.path + (g.name === '(root)' ? '' : '/')} isDir size={15} />
              <span className="fb-group-name">{g.name === '(root)' ? 'root' : g.name}</span>
              <span className="fb-count">{g.files.length}</span>
            </header>
            <div className="fb-files">
              {g.files.map((f) => (
                <button key={f.path} className="fb-file" onClick={() => openFile(f.path)} title={f.path}>
                  <FileIcon path={f.path} size={14} />
                  <span className="fb-file-name">{f.name}</span>
                  <span className="fb-file-path">{f.path}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
        {groups.length === 0 && (
          <div className="fb-empty">{q ? `No files match "${q}"` : 'No files'}</div>
        )}
      </div>
      {q && <div className="fb-foot">{shown} of {fileCount} files</div>}
    </div>
  );
}
