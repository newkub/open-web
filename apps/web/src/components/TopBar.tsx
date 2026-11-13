import { useState } from 'react';
import { useStore } from '@tanstack/react-store';
import { projectStore, setState } from '../store';
import { loadRepo } from '../github';

export function TopBar() {
  const status = useStore(projectStore, (s) => s.status);
  const message = useStore(projectStore, (s) => s.statusMessage);
  const fileCount = useStore(projectStore, (s) => s.fileCount);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const open = async () => {
    setError('');
    try {
      await loadRepo(url || 'https://github.com/oven-sh/bun');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState({ status: 'error', statusMessage: 'Failed to load repo' });
    }
  };

  return (
    <header className="topbar">
      <div className="brand">⬒ stackbox</div>
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
          placeholder="https://github.com/owner/repo"
          spellCheck={false}
        />
        <button type="submit" disabled={status === 'loading-meta' || status === 'loading-zip' || status === 'extracting'}>
          {status === 'idle' || status === 'error' ? 'Open' : '…'}
        </button>
      </form>
      <div className={`status status-${status}`} title={message}>
        <span className="status-dot" />
        <span className="status-text">
          {message}
          {fileCount > 0 && status === 'ready' ? ` · ${fileCount} files` : ''}
        </span>
        {error && <span className="error">{error}</span>}
      </div>
    </header>
  );
}
