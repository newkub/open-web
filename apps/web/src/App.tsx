import { useEffect, useState } from 'react';
import { useStore } from '@tanstack/react-store';
import { projectStore, setState } from './store';
import { TopBar } from './components/TopBar';
import { FileTree } from './components/FileTree';
import { EditorPane } from './components/EditorPane';
import { TerminalPane } from './components/TerminalPane';
import { StatusBar } from './components/StatusBar';
import { Welcome } from './components/Welcome';
import { QuickOpen } from './components/QuickOpen';
import { PreviewPane } from './components/PreviewPane';
import { previewProject } from './runtime/preview';
import { requestSave } from './editorBus';

export function App() {
  const terminalOpen = useStore(projectStore, (s) => s.terminalOpen);
  const tree = useStore(projectStore, (s) => s.tree);
  const activeTab = useStore(projectStore, (s) => s.activeTab);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const hasProject = tree.length > 0;
  const showWelcome = !hasProject;

  return (
    <div className="app">
      <TopBar onMenu={() => setSidebarOpen((v) => !v)} />
      <div className="main">
        <button
          className={`sidebar-toggle ${sidebarOpen ? 'hidden' : ''}`}
          onClick={() => setSidebarOpen(true)}
          aria-label="Show files"
        >
          ☰
        </button>
        {sidebarOpen && (
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
          {showWelcome ? (
            <Welcome />
          ) : activeTab ? (
            <EditorPane />
          ) : (
            <div className="editor-empty">
              Select a file from the explorer
              <span className="editor-hint">or press Ctrl+P to quick-open</span>
            </div>
          )}
          <div className="terminal-bar">
            <button onClick={() => setState({ terminalOpen: !terminalOpen })}>
              {terminalOpen ? '▾ Hide terminal' : '▸ Show terminal'}
            </button>
            <button
              className="preview-btn"
              disabled={!hasProject}
              onClick={() => void previewProject((m) => console.log(m)).catch((e) => alert(e.message))}
            >
              ▶ Preview
            </button>
            <span className="terminal-hint">Ctrl+` · run/preview in terminal</span>
          </div>
          <TerminalPane />
          <PreviewPane />
        </section>
      </div>
      <StatusBar />
      <QuickOpen />
    </div>
  );
}

