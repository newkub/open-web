import { useState } from 'react';
import mitMap from './mit-map.json';

interface MitMap {
  fe: Record<string, string>;
  fn: Record<string, string>;
  fd: Record<string, string>;
  icons: Record<string, string>;
}

const map = mitMap as unknown as MitMap;

const NAME_DEFAULTS = new Set([
  'dockerfile', 'makefile', 'gemfile', 'rakefile', 'procfile', 'license',
  'readme', 'changelog', 'authors', 'contributors', 'notice', 'code_of_conduct',
]);

/** Resolve a material-icon-theme icon file name for a VFS path. */
export function iconFileFor(path: string, isDir: boolean): string {
  const base = path.split('/').pop() ?? path;
  const lower = base.toLowerCase();

  if (isDir) {
    const stem = lower.replace(/\/+$/, '');
    const named = map.fd[stem] ?? map.fd[lower];
    if (named) return map.icons[named] ?? `${named}.svg`;
    return 'folder.svg';
  }

  // Exact file names win (package.json, .gitignore, Dockerfile…)
  const byName = map.fn[lower];
  if (byName) return map.icons[byName] ?? `${byName}.svg`;

  // Extension match (ts, vue, lock…) — try progressively shorter suffixes
  // for compound exts like "d.ts", "spec.ts" handled by last segment.
  const parts = lower.split('.');
  for (let i = 1; i < parts.length; i++) {
    const ext = parts.slice(i).join('.');
    const hit = map.fe[ext];
    if (hit) return map.icons[hit] ?? `${hit}.svg`;
  }

  // Well-known extensionless names
  if (NAME_DEFAULTS.has(lower) || lower.startsWith('license')) return 'certificate.svg';
  if (lower === 'dockerfile' || lower.startsWith('dockerfile.')) return 'docker.svg';
  if (lower === 'makefile') return 'makefile.svg';

  return 'file.svg';
}

export function FileIcon({
  path,
  isDir = false,
  size = 15,
  className = '',
}: {
  path: string;
  isDir?: boolean;
  size?: number;
  className?: string;
}) {
  const file = iconFileFor(path, isDir);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className={`fileicon fileicon-fallback ${className}`} style={{ width: size, height: size }} />;
  }
  return (
    <img
      className={`fileicon ${className}`}
      src={`/mit-icons/${file}`}
      width={size}
      height={size}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
