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

/**
 * Resolve a material-icon-theme SVG file name for a path.
 * Consumers serve the SVGs (e.g. from `material-icon-theme/icons/` or a
 * static `mit-icons/` dir) and render `<img src="…/{file}">`.
 */
export function iconFileFor(path: string, isDir: boolean): string {
  const base = path.split('/').pop() ?? path;
  const lower = base.toLowerCase();

  if (isDir) {
    const stem = lower.replace(/\/+$/, '');
    const named = map.fd[stem] ?? map.fd[lower];
    if (named) return map.icons[named] ?? `${named}.svg`;
    return 'folder.svg';
  }

  const byName = map.fn[lower];
  if (byName) return map.icons[byName] ?? `${byName}.svg`;

  const parts = lower.split('.');
  for (let i = 1; i < parts.length; i++) {
    const ext = parts.slice(i).join('.');
    const hit = map.fe[ext];
    if (hit) return map.icons[hit] ?? `${hit}.svg`;
  }

  if (NAME_DEFAULTS.has(lower) || lower.startsWith('license')) return 'certificate.svg';
  if (lower === 'dockerfile' || lower.startsWith('dockerfile.')) return 'docker.svg';
  if (lower === 'makefile') return 'makefile.svg';

  return 'file.svg';
}
