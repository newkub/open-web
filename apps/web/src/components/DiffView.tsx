import { useMemo, useState } from 'react';
import { useStore } from '@tanstack/react-store';
import { pairChangedLines, type DiffFile, type DiffHunk, type DiffLine, type TokenPart } from '@open-web/diff-bun';
import { projectStore } from '../store';
import { FileIcon } from '../icons';

function renderTokens(parts: TokenPart[], side: 'del' | 'add') {
  return parts.map((p, i) => {
    const cls = side === 'del' ? (p.removed ? 'tk-del' : '') : p.added ? 'tk-add' : '';
    return (
      <span key={i} className={cls || undefined}>
        {p.value}
      </span>
    );
  });
}

function HunkView({ hunk }: { hunk: DiffHunk }) {
  const pairs = useMemo(() => pairChangedLines(hunk), [hunk]);
  const delMap = new Map(pairs.map((p) => [p.del.oldNo, p]));
  const addMap = new Map(pairs.map((p) => [p.add.newNo, p]));

  let rowIndex = 0;
  return (
    <div className="diff-hunk">
      <div className="diff-hunk-header">{hunk.header}</div>
      <div className="diff-lines">
        {hunk.lines.map((l, i) => {
          const pair = l.type === 'del' ? delMap.get(l.oldNo ?? -1) : l.type === 'add' ? addMap.get(l.newNo ?? -1) : undefined;
          const delay = Math.min(rowIndex++ * 14, 280);
          const style = { animationDelay: `${delay}ms` } as const;

          if (l.type === 'meta') {
            return <div key={i} className="dl dl-meta" style={style}>{l.content}</div>;
          }
          return (
            <div key={i} className={`dl dl-${l.type}`} style={style}>
              <span className="dl-no dl-old">{l.oldNo ?? ''}</span>
              <span className="dl-no dl-new">{l.newNo ?? ''}</span>
              <span className="dl-sign">{l.type === 'add' ? '+' : l.type === 'del' ? '−' : ' '}</span>
              <span className="dl-code">
                {pair ? renderTokens(l.type === 'del' ? pair.delParts : pair.addParts, l.type as 'del' | 'add') : l.content}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function autoOpen(file: DiffFile): boolean {
  return file.hunks.length > 0 && file.additions + file.deletions < 250;
}

function DiffFileCard({ file, expandEpoch }: { file: DiffFile; expandEpoch: number }) {
  const [open, setOpen] = useState(() => (expandEpoch === 0 ? autoOpen(file) : expandEpoch === 1));
  const path = file.newPath || file.oldPath;
  const display = file.isRename ? `${file.oldPath} → ${file.newPath}` : path;

  return (
    <div className={`diff-file ${open ? 'open' : ''}`}>
      <button className="diff-file-head" onClick={() => setOpen((v) => !v)}>
        <span className="diff-chev">{open ? '▾' : '▸'}</span>
        <FileIcon path={path} size={15} />
        <span className="diff-path" title={display}>{display}</span>
        {file.isNew && <span className="diff-tag tag-new">new</span>}
        {file.isDeleted && <span className="diff-tag tag-del">deleted</span>}
        {file.isRename && <span className="diff-tag">renamed</span>}
        {file.isBinary && <span className="diff-tag">binary</span>}
        <span className="diff-stats">
          {file.additions > 0 && <span className="adds">+{file.additions}</span>}
          {file.deletions > 0 && <span className="dels">−{file.deletions}</span>}
        </span>
      </button>
      <div className={`diff-body ${open ? 'open' : ''}`}>
        <div className="diff-body-inner">
          {file.isBinary ? (
            <div className="diff-binary">Binary file changed</div>
          ) : file.hunks.length === 0 ? (
            <div className="diff-binary">No textual changes</div>
          ) : (
            file.hunks.map((h, i) => <HunkView key={i} hunk={h} />)
          )}
        </div>
      </div>
    </div>
  );
}

export function DiffView() {
  const pr = useStore(projectStore, (s) => s.pr);
  const files = useStore(projectStore, (s) => s.prDiff);
  const status = useStore(projectStore, (s) => s.prStatus);
  const message = useStore(projectStore, (s) => s.prMessage);
  // 0 = auto, 1 = expand all, 2 = collapse all — bumping remounts cards.
  const [expandEpoch, setExpandEpoch] = useState(0);

  if (!pr) {
    return (
      <div className="diff-view">
        <div className="diff-loading">{message || 'Loading…'}</div>
      </div>
    );
  }

  const shown = files ?? [];
  return (
    <div className="diff-view">
      <div className="diff-pr-head">
        <div className="diff-pr-title">
          <span className={`pr-state st-${pr.state}`}>{pr.state}</span>
          <a href={pr.url} target="_blank" rel="noreferrer">
            {pr.owner}/{pr.repo}#{pr.number} — {pr.title}
          </a>
        </div>
        <div className="diff-pr-meta">
          {pr.author && <span>by {pr.author}</span>}
          <span>{pr.baseRef} ← {pr.headRef}</span>
          <span className="diff-stats">
            <span className="adds">+{pr.additions}</span>{' '}
            <span className="dels">−{pr.deletions}</span>{' '}
            <span>{pr.changedFiles} files</span>
          </span>
        </div>
      </div>
      <div className="diff-controls">
        <span>{shown.length} changed files</span>
        <button onClick={() => setExpandEpoch((e) => (e === 1 ? 0 : 1))}>Expand all</button>
        <button onClick={() => setExpandEpoch(2)}>Collapse all</button>
      </div>
      <div className="diff-files">
        {shown.map((f, i) => (
          <DiffFileCard key={`${expandEpoch}-${i}`} file={f} expandEpoch={expandEpoch} />
        ))}
        {shown.length === 0 && status === 'ready' && <div className="diff-loading">No diff content</div>}
      </div>
    </div>
  );
}
