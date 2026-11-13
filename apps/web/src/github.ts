import { unzipSync } from 'fflate';
import { getVfs, resetVfs } from './vfs';
import { setState } from './store';
import type { VfsLike } from './types';

export interface RepoRef {
  owner: string;
  repo: string;
  branch: string;
  /** Optional path inside the repo (e.g. monorepo subdirectory). */
  subdir: string;
  url: string;
}

const GITHUB_RE =
  /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\.git)?(?:\/(?:tree|blob|raw)\/([A-Za-z0-9._/-]+))?/;

export function parseGitHubUrl(input: string): RepoRef | null {
  const m = input.trim().match(GITHUB_RE);
  if (!m) return null;
  const [, owner, repo, refPath] = m;
  const segments = (refPath ?? '').split('/').filter(Boolean);
  const branch = segments[0] ?? '';
  const subdir = segments.slice(1).join('/');
  const url = `https://github.com/${owner}/${repo}` + (subdir ? `/tree/${branch}/${subdir}` : '');
  return { owner, repo, branch, subdir, url };
}

interface GhRepo {
  default_branch: string;
}

export async function resolveBranch(owner: string, repo: string, hint: string): Promise<string> {
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
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.nuxt', 'coverage']);

function shouldSkip(path: string): boolean {
  return path.split('/').some((p) => SKIP_DIRS.has(p));
}

export interface LoadResult {
  vfs: VfsLike;
  fileCount: number;
  totalBytes: number;
  skipped: number;
}

export async function loadRepoFiles(input: string): Promise<LoadResult> {
  const ref = parseGitHubUrl(input);
  if (!ref) throw new Error('Not a GitHub URL — expected https://github.com/owner/repo[/tree/branch/path]');

  setState({
    status: 'loading-meta',
    statusMessage: `Resolving ${ref.owner}/${ref.repo}…`,
    repoUrl: ref.url,
    owner: ref.owner,
    repo: ref.repo,
    branch: ref.branch,
  });

  const branch = await resolveBranch(ref.owner, ref.repo, ref.branch);
  setState({
    branch,
    status: 'loading-zip',
    statusMessage: `Downloading ${branch}${ref.subdir ? `/${ref.subdir}` : ''} zipball…`,
  });

  const zip = await fetchZip(ref.owner, ref.repo, branch);
  setState({ status: 'extracting', statusMessage: 'Extracting into virtual FS…' });

  const vfs = await resetVfs();
  const files = unzipSync(new Uint8Array(zip));

  // Zip entries are prefixed with a single top-level "repo-branch/" dir,
  // then optionally the requested subdirectory.
  const subPrefix = ref.subdir ? `${ref.subdir}/` : '';
  const entries: { path: string; data: Uint8Array }[] = [];
  let totalBytes = 0;
  let skipped = 0;
  for (const [name, data] of Object.entries(files)) {
    if (data === null) continue; // directory entry
    let rel = name.replace(/^[^/]+\//, '');
    if (subPrefix) {
      if (!rel.startsWith(subPrefix)) continue;
      rel = rel.slice(subPrefix.length);
    }
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

  if (entries.length === 0) {
    throw new Error(
      ref.subdir
        ? `No files found under ${ref.subdir} — check the path or branch`
        : 'Repository zipball contained no usable files',
    );
  }

  // Bulk-load into the Rust VFS (single wasm call).
  vfs.load_files(entries);

  const walk = vfs.walk();
  setState({
    status: 'ready',
    statusMessage: `${ref.owner}/${ref.repo}${ref.subdir ? `/${ref.subdir}` : ''}@${branch} — ${entries.length} files${skipped ? ` (${skipped} skipped)` : ''}`,
    fileCount: entries.length,
    totalBytes,
    tree: walk,
    expanded: new Set(['/']),
    tabs: [],
    activeTab: null,
    previewUrl: null,
    previewOpen: false,
  });

  return { vfs, fileCount: entries.length, totalBytes, skipped };
}

export async function loadRepo(input: string): Promise<void> {
  await loadRepoFiles(input);
}
