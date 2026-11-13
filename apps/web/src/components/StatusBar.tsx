import { useStore } from '@tanstack/react-store';
import { projectStore } from '../store';

export function StatusBar() {
  const status = useStore(projectStore, (s) => s.status);
  const fileCount = useStore(projectStore, (s) => s.fileCount);
  const totalBytes = useStore(projectStore, (s) => s.totalBytes);
  const activeTab = useStore(projectStore, (s) => s.activeTab);
  const tabs = useStore(projectStore, (s) => s.tabs);

  const dirty = tabs.filter((t) => t.dirty).length;

  return (
    <footer className="statusbar">
      <span className={`sb-item sb-status sb-${status}`}>{status}</span>
      {fileCount > 0 && (
        <>
          <span className="sb-item">{fileCount} files</span>
          <span className="sb-item">{formatBytes(totalBytes)}</span>
        </>
      )}
      <span className="sb-spacer" />
      {dirty > 0 && <span className="sb-item sb-dirty">{dirty} unsaved</span>}
      {activeTab && <span className="sb-item sb-path" title={activeTab}>{activeTab}</span>}
      <span className="sb-item">UTF-8</span>
      <span className="sb-item">open-web-sh</span>
    </footer>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
