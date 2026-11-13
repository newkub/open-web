import { useStore } from '@tanstack/react-store';
import { projectStore, setState } from '../store';

export function PreviewPane() {
  const open = useStore(projectStore, (s) => s.previewOpen);
  const url = useStore(projectStore, (s) => s.previewUrl);
  const title = useStore(projectStore, (s) => s.previewTitle);

  if (!open || !url) return null;

  return (
    <div className="preview-overlay">
      <div className="preview-bar">
        <span className="preview-title">{title || 'preview'}</span>
        <div className="preview-actions">
          <button onClick={() => window.open(url, '_blank')}>↗ open</button>
          <button onClick={() => { URL.revokeObjectURL(url); setState({ previewOpen: false, previewUrl: null }); }}>
            ✕ close
          </button>
        </div>
      </div>
      <iframe className="preview-frame" src={url} title="app preview" sandbox="allow-scripts allow-same-origin allow-forms" />
    </div>
  );
}
