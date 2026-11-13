// Maps bare package specifiers to esm.sh URLs so the in-browser bundler
// can resolve npm dependencies without a node_modules install.

const SKIP_VERSION = new Set(['vite', 'typescript', 'eslint', 'prettier']);

// Packages whose esm.sh-resolved peer deps must match the project's own
// versions — otherwise the preview ends up with two copies of the framework
// runtime (e.g. app imports vue@3.2.37 while vue-router pulls vue@3.5.x),
// which breaks inject/provide and reactivity.
const FRAMEWORK_PEERS: Record<string, string[]> = {
  'vue-router': ['vue'],
  'react-router': ['react', 'react-dom'],
  'react-router-dom': ['react', 'react-dom'],
  'solid-router': ['solid-js'],
  'solid-start': ['solid-js'],
};

function peerPinQuery(pkgName: string, deps: Record<string, string>): string {
  const peers =
    FRAMEWORK_PEERS[pkgName] ??
    (pkgName.includes('react') ? ['react', 'react-dom'] : pkgName.includes('solid') ? ['solid-js'] : []);
  const pins = peers
    .map((p) => {
      const v = deps[p]?.replace(/^[\^~>=\s]*/, '').split(' ')[0];
      return v && /^\d/.test(v) ? `${p}@${v}` : null;
    })
    .filter((x): x is string => !!x);
  return pins.length ? `?deps=${pins.join(',')}` : '';
}

export function esmUrl(spec: string, deps: Record<string, string>): string | null {
  // Skip vite-isms and node builtins — they are handled elsewhere.
  if (spec.startsWith('node:') || ['fs', 'path', 'os', 'crypto', 'util', 'events', 'stream', 'buffer', 'process', 'child_process', 'http', 'https', 'net', 'tls', 'zlib', 'assert', 'url', 'querystring', 'module', 'vm'].includes(spec)) {
    return null;
  }

  // Split "pkg", "@scope/pkg", "pkg/sub", "@scope/pkg/sub"
  const parts = spec.split('/');
  const pkgName = spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  const subpath = parts.slice(spec.startsWith('@') ? 2 : 1).join('/');

  const bare = pkgName.startsWith('@') ? pkgName : pkgName;
  if (SKIP_VERSION.has(bare)) return null;

  const version = deps[pkgName] ?? deps[bare];
  const cleanVersion = version?.replace(/^[\^~>=\s]*/, '').split(' ')[0];
  const ver = cleanVersion && /^\d/.test(cleanVersion) ? `@${cleanVersion}` : '';

  const sub = subpath ? `/${subpath}` : '';
  return `https://esm.sh/${pkgName}${ver}${sub}${peerPinQuery(pkgName, deps)}`;
}
