import { useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { useStore } from '@tanstack/react-store';
import { projectStore, closeTab, markDirty } from '../store';
import { FileIcon } from '../icons';
import { getVfs } from '../vfs';
import { registerSaver } from '../editorBus';
import { FilePreview } from './FilePreview';
import type { Extension } from '@codemirror/state';

function langFor(path: string): Extension[] {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'js': case 'mjs': case 'cjs': return [javascript()];
    case 'jsx': return [javascript({ jsx: true })];
    case 'ts': return [javascript({ typescript: true })];
    case 'tsx': return [javascript({ typescript: true, jsx: true })];
    case 'css': case 'scss': case 'less': return [css()];
    case 'html': case 'htm': case 'vue': case 'svelte': return [html()];
    case 'json': case 'jsonc': return [json()];
    case 'md': case 'mdx': return [markdown()];
    case 'py': return [python()];
    case 'rs': return [rust()];
    case 'java': return [java()];
    case 'c': case 'h': case 'cpp': case 'hpp': case 'cc': return [cpp()];
    case 'sql': return [sql()];
    case 'xml': case 'svg': return [xml()];
    case 'yml': case 'yaml': return [yaml()];
    default: return [];
  }
}

function isText(path: string, data: Uint8Array): boolean {
  // cheap binary sniff: NUL byte in first 8k
  const n = Math.min(data.length, 8192);
  for (let i = 0; i < n; i++) if (data[i] === 0) return false;
  void path;
  return true;
}

export function EditorPane() {
  const tabs = useStore(projectStore, (s) => s.tabs);
  const activeTab = useStore(projectStore, (s) => s.activeTab);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [binary, setBinary] = useState<Record<string, boolean>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const contentsRef = useRef<Record<string, string>>({});
  const activeRef = useRef<string | null>(null);
  contentsRef.current = contents;
  activeRef.current = activeTab;

  // Load file contents when tabs change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const vfs = await getVfs();
      for (const tab of tabs) {
        if (tab.path in contents || binary[tab.path]) continue;
        const data = vfs.read_file(tab.path);
        if (!data) continue;
        if (!isText(tab.path, data)) {
          if (!cancelled) setBinary((b) => ({ ...b, [tab.path]: true }));
          continue;
        }
        const text = new TextDecoder('utf-8', { fatal: false }).decode(data);
        if (!cancelled) setContents((c) => ({ ...c, [tab.path]: text }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs]);

  const active = tabs.find((t) => t.path === activeTab) ?? null;
  const extensions = useMemo(() => (active ? langFor(active.path) : []), [active?.path]);

  // Register Ctrl+S handler: flush pending saves immediately.
  useEffect(() => {
    registerSaver(() => {
      const path = activeRef.current;
      const value = path ? contentsRef.current[path] : undefined;
      if (!path || value === undefined) return;
      clearTimeout(saveTimers.current[path]);
      void getVfs().then((vfs) => {
        vfs.write_file(path, new TextEncoder().encode(value));
        markDirty(path, false);
      });
    });
    return () => registerSaver(null);
  }, []);

  const onChange = (value: string) => {
    if (!active) return;
    setContents((c) => ({ ...c, [active.path]: value }));
    markDirty(active.path, true);
    const vfs = getVfs();
    clearTimeout(saveTimers.current[active.path]);
    saveTimers.current[active.path] = setTimeout(async () => {
      const v = await vfs;
      v.write_file(active.path, new TextEncoder().encode(value));
      markDirty(active.path, false);
    }, 400);
  };

  if (tabs.length === 0) {
    return <div className="editor-empty">Open a file from the explorer</div>;
  }

  return (
    <div className="editor-pane">
      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.path}
            className={`tab ${t.path === activeTab ? 'active' : ''}`}
            onClick={() => projectStore.setState((s) => ({ ...s, activeTab: t.path }))}
            title={t.path}
          >
            <FileIcon path={t.path} size={13} />
            {t.path.split('/').pop()}
            {t.dirty && <span className="dirty">●</span>}
            <span
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(t.path);
              }}
            >
              ×
            </span>
          </button>
        ))}
      </div>
      {active && binary[active.path] ? (
        <FilePreview path={active.path} />
      ) : active ? (
        <CodeMirror
          key={active.path}
          value={contents[active.path] ?? ''}
          height="100%"
          theme="dark"
          extensions={extensions}
          onChange={onChange}
          basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
        />
      ) : null}
    </div>
  );
}
