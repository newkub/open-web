import { useEffect, useState } from 'react';
import { useStore } from '@tanstack/react-store';
import { projectStore, setState, notify } from './store';
import { TopBar } from './components/TopBar';
import { FileTree } from './components/FileTree';
import { EditorPane } from './components/EditorPane';
import { TerminalPane } from './components/TerminalPane';
import { StatusBar } from './components/StatusBar';
import { Welcome } from './components/Welcome';
import { QuickOpen } from './components/QuickOpen';
import { PreviewPane } from './components/PreviewPane';
import { DiffView } from './components/DiffView';
import { FileBrowser } from './components/FileBrowser';
import { detectProject, previewProject, initBundler } from '@wrikka/open-web/runtime';
import { getVfs } from './vfs';
import { termWrite } from './termBus';
import { requestSave } from './editorBus';

export function App() {
  const terminalOpen = useStore(projectStore, (s) => s.terminalOpen);
  const tree = useStore(projectStore, (s) => s.tree);
  const activeTab = useStore(projectStore, (s) => s.activeTab);
  const mode = useStore(projectStore, (s) => s.mode);
  const status = useStore(projectStore, (s) => s.status);
  const autoDev = useStore(projectStore, (s) => s.autoDev);
  const autoDevFor = useStore(projectStore, (s) => s.autoDevFor);
  const repoUrl = useStore(projectStore, (s) => s.repoUrl);
  const notice = useStore(projectStore, (s) => s.notice);
  // Sidebar defaults closed on narrow screens (drawer mode) — otherwise it
  // covers the whole welcome screen on mobile.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => !window.matchMedia('(max-width: 900px)').matches,
  );

  // Toast auto-dismiss.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setState({ notice: null }), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // Global shortcuts: Ctrl+` terminal, Ctrl+S save, Ctrl+P quick open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === '`') {
        e.preventDefault();
        setState({ terminalOpen: !projectStore.state.terminalOpen });
      } else if (key === 's') {
        e.preventDefault();
        requestSave();
      } else if (key === 'p') {
        e.preventDefault();
        setState({ quickOpen: !projectStore.state.quickOpen });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hasProject = tree.length > 0 || mode === 'pr';
  const showWelcome = !hasProject;
  const isPr = mode === 'pr';

  // Warm the esbuild wasm (~13MB) during idle time after a repo loads so
  // auto-dev / manual preview doesn't stall on the download later.
  useEffect(() => {
    if (status !== 'ready' || mode !== 'repo') return;
    const ric = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
    const id = ric(() => void initBundler().catch(() => {}));
    return () => window.cancelIdleCallback?.(id as number);
  }, [status, mode]);

  // Auto-dev: once a repo finishes loading, detect the project and start
  // the preview automatically (once per repoUrl, toggleable via ⚡ auto-dev).
  useEffect(() => {
    if (status !== 'ready' || mode !== 'repo' || !autoDev || autoDevFor === repoUrl) return;
    setState({ autoDevFor: repoUrl });
    void (async () => {
      try {
        const vfs = await getVfs();
        const info = detectProject(vfs);
        const hasDevScript = !!(info.scripts.dev || info.scripts.start);
        if (!info.entry) {
          termWrite('\x1b[2m[auto-dev] no runnable entry found — skipped\x1b[0m\r\n');
          return;
        }
        termWrite(
          `\x1b[2m[auto-dev] ${info.framework} project${hasDevScript ? ` (${info.scripts.dev ?? info.scripts.start})` : ''} — starting preview…\x1b[0m\r\n`,
        );
        const r = await previewProject(vfs, (m) => termWrite(`\x1b[2m${m}\x1b[0m\r\n`));
        setState({ previewUrl: r.url, previewOpen: true, previewTitle: r.title });
        termWrite('\x1b[32m[auto-dev] preview ready →\x1b[0m\r\n');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        termWrite(`\x1b[31m[auto-dev] failed: ${msg.slice(0, 500)}\x1b[0m\r\n`);
        notify(`Auto-dev preview failed: ${msg.split('\n')[0].slice(0, 120)}`);
      }
    })();
  }, [status, mode, autoDev, autoDevFor, repoUrl]);

  return (
    <div className="app">
      <TopBar onMenu={() => setSidebarOpen((v) => !v)} />
      <div className="main">
        {!isPr && (
          <button
            className={`sidebar-toggle ${sidebarOpen ? 'hidden' : ''}`}
            onClick={() => setSidebarOpen(true)}
            aria-label="Show files"
          >
            ☰
          </button>
        )}
        {sidebarOpen && !isPr && (
          <>
            <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
            <aside className="sidebar">
              <div className="sidebar-head">
                <span>EXPLORER</span>
                <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Hide files">
                  ×
                </button>
              </div>
              <FileTree />
            </aside>
          </>
        )}
        <section className="workarea">
          <div className="editor-region">
            {isPr ? (
              <DiffView />
            ) : showWelcome ? (
              <Welcome />
            ) : activeTab ? (
              <EditorPane />
            ) : hasProject ? (
              <FileBrowser />
            ) : (
              <div className="editor-empty">
                Select a file from the explorer
                <span className="editor-hint">or press Ctrl+P to quick-open</span>
              </div>
            )}
            {!isPr && <PreviewPane />}
          </div>
          {!isPr && (
            <>
              <div className="terminal-bar">
                <button onClick={() => setState({ terminalOpen: !terminalOpen })}>
                  {terminalOpen ? '▾ Hide terminal' : '▸ Show terminal'}
                </button>
                <button
                  className={`autodev-btn ${autoDev ? 'on' : ''}`}
                  title="Auto-start preview when a project loads"
                  onClick={() => setState({ autoDev: !autoDev, autoDevFor: null })}
                >
                  ⚡ auto-dev
                </button>
                <button
                  className="preview-btn"
                  disabled={!hasProject}
                  onClick={() =>
                    void getVfs()
                      .then(async (vfs) => {
                        const r = await previewProject(vfs, (m) => console.log(m));
                        setState({ previewUrl: r.url, previewOpen: true, previewTitle: r.title });
                      })
                      .catch((e) => notify(`Preview failed: ${e instanceof Error ? e.message : e}`))
                  }
                >
                  ▶ Preview
                </button>
                <span className="terminal-hint">Ctrl+` · run/preview in terminal</span>
              </div>
              <TerminalPane />
            </>
          )}
        </section>
      </div>
      <StatusBar />
      <QuickOpen />
      {notice && (
        <button
          className="toast"
          role="status"
          onClick={() => setState({ notice: null })}
        >
          {notice}
        </button>
      )}
    </div>
  );
}

