import { useStore } from '@tanstack/react-store';
import { projectStore, setState } from './store';
import { TopBar } from './components/TopBar';
import { FileTree } from './components/FileTree';
import { EditorPane } from './components/EditorPane';
import { TerminalPane } from './components/TerminalPane';

export function App() {
  const terminalOpen = useStore(projectStore, (s) => s.terminalOpen);
  return (
    <div className="app">
      <TopBar />
      <div className="main">
        <aside className="sidebar">
          <FileTree />
        </aside>
        <section className="workarea">
          <EditorPane />
          <div className="terminal-bar">
            <button onClick={() => setState({ terminalOpen: !terminalOpen })}>
              {terminalOpen ? '▾ Hide terminal' : '▸ Show terminal'}
            </button>
          </div>
          <TerminalPane />
        </section>
      </div>
    </div>
  );
}
