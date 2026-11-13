import { diffWordsWithSpace } from 'diff';
import type { DiffHunk, DiffLine } from './parse';

export interface TokenPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface LinePair {
  del: DiffLine;
  add: DiffLine;
  delParts: TokenPart[];
  addParts: TokenPart[];
}

/**
 * Pair consecutive removed/added lines inside a hunk and compute
 * word-level diffs for inline token highlighting.
 */
export function pairChangedLines(hunk: DiffHunk): LinePair[] {
  const pairs: LinePair[] = [];
  const lines = hunk.lines;
  let i = 0;
  while (i < lines.length) {
    if (lines[i].type !== 'del') { i++; continue; }
    const dels: DiffLine[] = [];
    while (i < lines.length && lines[i].type === 'del') dels.push(lines[i++]);
    const adds: DiffLine[] = [];
    while (i < lines.length && lines[i].type === 'add') adds.push(lines[i++]);
    const n = Math.min(dels.length, adds.length);
    for (let k = 0; k < n; k++) {
      const parts = diffWordsWithSpace(dels[k].content, adds[k].content);
      const delParts: TokenPart[] = [];
      const addParts: TokenPart[] = [];
      for (const p of parts) {
        if (!p.added) delParts.push({ value: p.value, removed: p.removed });
        if (!p.removed) addParts.push({ value: p.value, added: p.added });
      }
      pairs.push({ del: dels[k], add: adds[k], delParts, addParts });
    }
  }
  return pairs;
}
