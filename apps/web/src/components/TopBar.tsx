import { useState } from 'react';
import { useStore } from '@tanstack/react-store';
import { projectStore, setState } from '../store';
import { loadRepo } from '../github';
import { loadPr, parsePrUrl } from '../githubPr';
import { getClientId, setClientId, getAuth, setAuth, deviceFlow } from '../githubAuth';
import type { DeviceFlowStep } from '../githubAuth';

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
  const [authOpen, setAuthOpen] = useState(false);
  const [clientId, setClientIdInput] = useState(getClientId());
  const [authMsg, setAuthMsg] = useState('');
  const [auth, setAuthState] = useState(getAuth());

  const signIn = async () => {
    setClientId(clientId);
    setAuthMsg('Requesting device code…');
    try {
      await deviceFlow(clientId, (s: DeviceFlowStep) => {
        if (s.step === 'code') {
          setAuthMsg(`Code: ${s.userCode} — enter at ${s.verificationUri}`);
          window.open(s.verificationUri, '_blank', 'noopener');
        } else if (s.step === 'done') {
          setAuthState(getAuth());
          setAuthMsg(`Signed in as ${s.login}`);
        } else if (s.step === 'slow_down') {
          setAuthMsg('Waiting for authorization… (slower polling)');
        } else {
          setAuthMsg(s.step === 'expired' ? 'Code expired — try again' : `Error: ${s.message ?? s.step}`);
        }
      });
    } catch (e) {
      setAuthMsg(e instanceof Error ? e.message : String(e));
    }
  };

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
      <div className="gh-auth">
        <button
          className={`gh-btn ${auth ? 'gh-on' : ''}`}
          title={auth ? `GitHub: ${auth.login}` : 'Sign in with GitHub (device flow)'}
          onClick={() => setAuthOpen((o) => !o)}
        >
          {auth ? `◉ ${auth.login || 'GH'}` : 'Sign in'}
        </button>
        {authOpen && (
          <div className="gh-panel">
            {auth ? (
              <>
                <div className="gh-row">Signed in as <b>{auth.login}</b></div>
                <button className="gh-btn" onClick={() => { setAuth(null); setAuthState(null); setAuthMsg('Signed out'); }}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <input
                  placeholder="OAuth App client ID"
                  value={clientId}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  spellCheck={false}
                />
                <button className="gh-btn gh-primary" onClick={() => void signIn()} disabled={!clientId.trim()}>
                  Device sign-in
                </button>
                <p className="gh-hint">
                  Create an OAuth App at github.com/settings/developers with
                  "Device Flow" enabled, paste its client ID. Token stays in
                  this browser only.
                </p>
              </>
            )}
            {authMsg && <div className="gh-msg">{authMsg}</div>}
          </div>
        )}
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
