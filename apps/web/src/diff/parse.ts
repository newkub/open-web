export type DiffLineType = 'ctx' | 'add' | 'del' | 'meta';

export interface DiffLine {
  type: DiffLineType;
  /** Line content without the leading +/-/space marker. */
  content: string;
  oldNo: number | null;
  newNo: number | null;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  isNew: boolean;
  isDeleted: boolean;
  isRename: boolean;
  isBinary: boolean;
}

const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;

function cleanPath(p: string): string {
  return p.replace(/^[ab]\//, '').replace(/^"|"$/g, '');
}

/** Parse a unified diff (GitHub `.diff` format) into structured files. */
export function parseDiff(text: string): DiffFile[] {
  const files: DiffFile[] = [];
  let cur: DiffFile | null = null;
  let hunk: DiffHunk | null = null;
  let oldNo = 0;
  let newNo = 0;
  let pendingOld = '';
  let pendingNew = '';

  const flushFile = () => {
    if (cur) files.push(cur);
    cur = null;
    hunk = null;
  };

  for (const raw of text.split('\n')) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;

    if (line.startsWith('diff --git ')) {
      flushFile();
      const m = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      cur = {
        oldPath: m?.[1] ?? '',
        newPath: m?.[2] ?? '',
        hunks: [],
        additions: 0,
        deletions: 0,
        isNew: false,
        isDeleted: false,
        isRename: false,
        isBinary: false,
      };
      pendingOld = pendingNew = '';
      continue;
    }
    if (!cur) continue;

    if (line.startsWith('new file mode')) { cur.isNew = true; continue; }
    if (line.startsWith('deleted file mode')) { cur.isDeleted = true; continue; }
    if (line.startsWith('rename from ')) { cur.isRename = true; cur.oldPath = line.slice(12); continue; }
    if (line.startsWith('rename to ')) { cur.isRename = true; cur.newPath = line.slice(10); continue; }
    if (line.startsWith('Binary files') || line.startsWith('GIT binary patch')) { cur.isBinary = true; continue; }
    if (line === '--- /dev/null') { pendingOld = '/dev/null'; continue; }
    if (line === '+++ /dev/null') { pendingNew = '/dev/null'; continue; }
    if (line.startsWith('--- ')) { pendingOld = cleanPath(line.slice(4)); continue; }
    if (line.startsWith('+++ ')) { pendingNew = cleanPath(line.slice(4)); continue; }
    if (pendingOld && !cur.oldPath.startsWith('/')) {
      // Prefer ---/+++ paths when diff --git names were ambiguous
      if (pendingOld !== '/dev/null') cur.oldPath = pendingOld;
      if (pendingNew !== '/dev/null') cur.newPath = pendingNew;
      pendingOld = pendingNew = '';
    }

    const hm = line.match(HUNK_RE);
    if (hm) {
      hunk = {
        oldStart: parseInt(hm[1], 10),
        oldLines: hm[2] ? parseInt(hm[2], 10) : 1,
        newStart: parseInt(hm[3], 10),
        newLines: hm[4] ? parseInt(hm[4], 10) : 1,
        header: line,
        lines: [],
      };
      cur.hunks.push(hunk);
      oldNo = hunk.oldStart;
      newNo = hunk.newStart;
      continue;
    }
    if (!hunk) continue;

    if (line.startsWith('\\')) {
      hunk.lines.push({ type: 'meta', content: line.slice(1).trim(), oldNo: null, newNo: null });
      continue;
    }
    const c = line[0];
    const content = line.slice(1);
    if (c === '+') {
      hunk.lines.push({ type: 'add', content, oldNo: null, newNo: newNo++ });
      cur.additions++;
    } else if (c === '-') {
      hunk.lines.push({ type: 'del', content, oldNo: oldNo++, newNo: null });
      cur.deletions++;
    } else if (c === ' ') {
      hunk.lines.push({ type: 'ctx', content, oldNo: oldNo++, newNo: newNo++ });
    } else if (c === 'd' && line.startsWith('diff --git') === false) {
      // rare: lines without leading space in some diffs — treat as ctx
      hunk.lines.push({ type: 'ctx', content: line, oldNo: oldNo++, newNo: newNo++ });
    }
  }
  flushFile();
  return files;
}
