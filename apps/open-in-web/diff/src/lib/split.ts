import type { FileEntry } from '../types';

function fileName(chunk: string): string {
  const renameTo = chunk.match(/^rename to (.+)$/m);
  if (renameTo) return renameTo[1].trim();
  const plus = chunk.match(/^\+\+\+ b\/(.+)$/m) || chunk.match(/^\+\+\+ "?(.+?)"?$/m);
  if (plus && plus[1] !== '/dev/null') return plus[1];
  const header = chunk.match(/^diff --git (?:a\/)?(.+?) (?:b\/)?(.+)$/m);
  if (header) return header[2].replace(/^"|"$/g, '');
  return 'unknown';
}

function fileType(chunk: string): string {
  if (/^new file mode/m.test(chunk)) return 'new';
  if (/^deleted file mode/m.test(chunk)) return 'deleted';
  if (/^rename (from|to)/m.test(chunk)) return /^@@/m.test(chunk) ? 'rename-changed' : 'rename-pure';
  return 'change';
}

function countChanges(chunk: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of chunk.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) additions++;
    else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
  }
  return { additions, deletions };
}

export function splitPatch(raw: string): FileEntry[] {
  const chunks: string[] = [];
  let current: string[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('diff --git ')) {
      if (current.length) chunks.push(current.join('\n'));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) chunks.push(current.join('\n'));

  return chunks
    .filter((c) => c.trim().length > 0)
    .map((chunk) => ({
      name: fileName(chunk),
      type: fileType(chunk),
      chunk,
      ...countChanges(chunk),
    }));
}
