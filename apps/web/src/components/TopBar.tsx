import { useState } from 'react';
import { useStore } from '@tanstack/react-store';
import { projectStore, setState } from '../store';
import { loadRepo, loadPr, parsePrUrl } from '../github';

const LS_KEY = 'stackbox:last-url';

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const status = useStore(projectStore, (s) => s.status);
  const message = useStore(projectStore, (s) => s.statusMessage);
  const loadBytes = useStore(projectStore, (s) => s.loadBytes);
  const loadTotal = useStore(projectStore, (s) => s.loadTotal);
  const fileCount = useStore(projectStore, (s) => s.fileCount);
  const owner = useStore(projectStore, (s) => s.owner);
  const repo = useStore(projectStore, (s) => s.repo);
  const branch = useStore(projectStore, (s) => s.branch);
  const [url, setUrl] = useState(() => localStorage.getItem(LS_KEY) ?? '');
  const [error, setError] = useState('');

  const busy = status === 'loading-meta' || status === 'loading-zip' || status === 'extracting';

  const open = async (target?: string) => {
    const value = (target ?? url).trim();
    if (!value) return;
    setError('');
    localStorage.setItem(LS_KEY, value);
    setUrl(value);
    try {
      if (parsePrUrl(value)) await loadPr(value);
      else await loadRepo(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState({ status: 'error', statusMessage: 'Failed to load repo' });
    }
  };

  return (
    <header className="topbar">
      <button className="menu-btn" onClick={onMenu} aria-label="Toggle files">
        ☰
      </button>
      <div className="brand">⬒ stackbox</div>
      {owner && repo && (
        <div className="repo-chip" title={`${owner}/${repo}@${branch}`}>
          {owner}/{repo}
          <span className="repo-branch">{branch}</span>
        </div>
      )}
      <form
        className="urlbar"
        onSubmit={(e) => {
          e.preventDefault();
          void open();
        }}
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo or …/pull/N"
          spellCheck={false}
          aria-label="GitHub repository URL"
        />
        <button type="submit" disabled={busy}>
          {busy ? '…' : status === 'ready' ? 'Reload' : 'Open'}
        </button>
      </form>
      <div className={`status status-${status}`} title={message}>
        <span className="status-dot" />
        <span className="status-text">
          {busy ? message : fileCount > 0 && status === 'ready' ? `${fileCount} files` : message}
        </span>
        {error && <span className="error">{error}</span>}
      </div>
      {(status === 'loading-zip' || status === 'extracting') && (
        <div className={`load-progress ${status === 'extracting' ? 'extracting' : ''}`} title={message}>
          <div
            className="load-progress-fill"
            style={{ width: loadTotal > 0 ? `${Math.min(100, (loadBytes / loadTotal) * 100)}%` : '100%' }}
          />
        </div>
      )}
    </header>
  );
}
