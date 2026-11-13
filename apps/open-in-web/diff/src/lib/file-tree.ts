import type { FileEntry } from '../types';

export interface TreeFile {
  idx: number;
  name: string;
  path: string;
  type: string;
  additions: number;
  deletions: number;
}

export interface TreeDir {
  name: string;
  path: string;
  dirs: TreeDir[];
  files: TreeFile[];
}

export interface FileTree {
  dirs: TreeDir[];
  files: TreeFile[];
}

function basename(path: string) {
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i >= 0 ? path.slice(i + 1) : path;
}

function collapseDir(dir: TreeDir): TreeDir {
  let cur = dir;
  while (cur.dirs.length === 1 && cur.files.length === 0) {
    const child = cur.dirs[0];
    cur = {
      name: `${cur.name}/${child.name}`,
      path: child.path,
      dirs: child.dirs,
      files: child.files,
    };
  }
  return { ...cur, dirs: cur.dirs.map(collapseDir) };
}

export function buildFileTree(files: FileEntry[], indices: number[]): FileTree {
  const root: TreeDir = { name: '', path: '', dirs: [], files: [] };
  const dirMap = new Map<string, TreeDir>();
  dirMap.set('', root);

  const ensureDir = (path: string): TreeDir => {
    const cached = dirMap.get(path);
    if (cached) return cached;
    const sep = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
    const parent = ensureDir(sep > 0 ? path.slice(0, sep) : '');
    const dir: TreeDir = { name: path.slice(sep + 1), path, dirs: [], files: [] };
    parent.dirs.push(dir);
    dirMap.set(path, dir);
    return dir;
  };

  for (const idx of indices) {
    const file = files[idx];
    if (!file) continue;
    const sep = Math.max(file.name.lastIndexOf('/'), file.name.lastIndexOf('\\'));
    const dirPath = sep > 0 ? file.name.slice(0, sep) : '';
    ensureDir(dirPath).files.push({
      idx,
      name: basename(file.name),
      path: file.name,
      type: file.type,
      additions: file.additions,
      deletions: file.deletions,
    });
  }

  const sortDir = (dir: TreeDir) => {
    dir.dirs.sort((a, b) => a.name.localeCompare(b.name));
    dir.files.sort((a, b) => a.name.localeCompare(b.name));
    dir.dirs.forEach(sortDir);
  };
  sortDir(root);

  return { dirs: root.dirs.map(collapseDir), files: root.files };
}

export function allDirPaths(tree: FileTree): string[] {
  const out: string[] = [];
  const walk = (dir: TreeDir) => {
    out.push(dir.path);
    dir.dirs.forEach(walk);
  };
  tree.dirs.forEach(walk);
  return out;
}
