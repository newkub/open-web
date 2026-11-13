import { unzipSync, strFromU8 } from 'fflate';
import type { VfsLike } from './types';
import { getVfs, resetVfs } from './vfs';
import { setState } from './store';

export interface RepoRef {
  owner: string;
  repo: string;
  branch: string;
  url: string;
}

const GITHUB_RE =
  /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\.git)?(?:\/(?:tree|blob|raw)\/([A-Za-z0-9._/-]+))?/;

export function parseGitHubUrl(input: string): RepoRef | null {
  const m = input.trim().match(GITHUB_RE);
  if (!m) return null;
  const [, owner, repo, ref] = m;
  return { owner, repo, branch: ref?.split('/')[0] ?? '', url: `https://github.com/${owner}/${repo}` };
}

interface GhRepo {
  default_branch: string;
}

async function resolveBranch(owner: string, repo: string, hint: string): Promise<string> {
  if (hint) return hint;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${owner}/${repo}`);
  const data = (await res.json()) as GhRepo;
  return data.default_branch;
}

// The codeload zip endpoint does not send CORS headers for arbitrary
// origins, so downloads go through a same-origin proxy: vite dev proxy in
// development, the /api route on the Cloudflare worker in production.
// Path mirrors codeload: /api/{owner}/{repo}/zip/refs/heads/{branch}
async function fetchZip(owner: string, repo: string, branch: string): Promise<ArrayBuffer> {
  const url = `/api/${owner}/${repo}/zip/refs/heads/${branch}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`zip download failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.arrayBuffer();
}

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const SKIP_DIRS = new Set(['.git', 'node_modules']);

function shouldSkip(path: string): boolean {
  const parts = path.split('/');
  return parts.some((p) => SKIP_DIRS.has(p)) || parts.includes('.github') === false && false;
}

export async function loadRepo(input: string): Promise<void> {
  const ref = parseGitHubUrl(input);
  if (!ref) throw new Error('Not a GitHub URL — expected https://github.com/owner/repo');

  setState({
    status: 'loading-meta',
    statusMessage: `Resolving ${ref.owner}/${ref.repo}…`,
    repoUrl: ref.url,
    owner: ref.owner,
    repo: ref.repo,
    branch: ref.branch,
  });

  const branch = await resolveBranch(ref.owner, ref.repo, ref.branch);
  setState({ branch, status: 'loading-zip', statusMessage: `Downloading ${branch} zipball…` });

  const zip = await fetchZip(ref.owner, ref.repo, branch);
  setState({ status: 'extracting', statusMessage: 'Extracting into virtual FS…' });

  const vfs = await resetVfs();
  const files = unzipSync(new Uint8Array(zip));

  // Zip entries are prefixed with a single top-level "repo-branch/" dir.
  const entries: { path: string; data: Uint8Array }[] = [];
  let totalBytes = 0;
  let skipped = 0;
  for (const [name, data] of Object.entries(files)) {
    if (data === null) continue; // directory entry
    const rel = name.replace(/^[^/]+\//, '');
    if (!rel || rel.endsWith('/')) continue;
    if (shouldSkip(rel)) {
      skipped++;
      continue;
    }
    if (data.length > MAX_FILE_BYTES) {
      skipped++;
      continue;
    }
    totalBytes += data.length;
    entries.push({ path: `/${rel}`, data });
  }

  // Bulk-load into the Rust VFS (single wasm call).
  vfs.load_files(entries);

  const walk = vfs.walk();
  setState({
    status: 'ready',
    statusMessage: `${ref.owner}/${ref.repo}@${branch} — ${entries.length} files${skipped ? ` (${skipped} skipped)` : ''}`,
    fileCount: entries.length,
    totalBytes,
    tree: walk,
    expanded: new Set(['/']),
    tabs: [],
    activeTab: null,
  });
}
