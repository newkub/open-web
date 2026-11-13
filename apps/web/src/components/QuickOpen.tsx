import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@tanstack/react-store';
import { projectStore, openFile, setState } from '../store';
import { FileIcon } from '../icons';
import { getVfs } from '../vfs';
import type { FileEntry } from '../types';

export function QuickOpen() {
  const open = useStore(projectStore, (s) => s.quickOpen);
  const tree = useStore(projectStore, (s) => s.tree);
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setIndex(0);
    inputRef.current?.focus();
    void getVfs().then((vfs) => setFiles(vfs.walk().filter((e) => !e.is_dir)));
  }, [open]);

  const results = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return files.slice(0, 50);
    return files
      .filter((f) => f.path.toLowerCase().includes(q) || f.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [files, query]);

  useEffect(() => setIndex(0), [query]);

  if (!open) return null;

  const pick = (path: string) => {
    openFile(path);
    setState({ quickOpen: false });
  };

  return (
    <div className="quickopen-backdrop" onClick={() => setState({ quickOpen: false })}>
      <div className="quickopen" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={query}
          placeholder="Go to file…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setState({ quickOpen: false });
            else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
            else if (e.key === 'Enter' && results[index]) pick(results[index].path);
          }}
        />
        <div className="qo-list">
          {results.map((f, i) => (
            <button
              key={f.path}
              className={`qo-row ${i === index ? 'active' : ''}`}
              onMouseEnter={() => setIndex(i)}
              onClick={() => pick(f.path)}
            >
              <FileIcon path={f.path} size={14} />
              <span className="qo-name">{f.name}</span>
              <span className="qo-path">{f.path}</span>
            </button>
          ))}
          {results.length === 0 && <div className="qo-empty">No matching files</div>}
        </div>
      </div>
    </div>
  );
}
