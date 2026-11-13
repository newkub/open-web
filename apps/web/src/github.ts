import { unzipSync } from 'fflate';
import { getVfs, resetVfs } from './vfs';
import { cacheGet, cacheSet } from './zipCache';
import { setState } from './store';
import type { PrInfo } from './store';
import { parseDiff, type DiffFile } from './diff/parse';
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

export interface PrRef {
  owner: string;
  repo: string;
  number: number;
  url: string;
}

const PR_RE =
  /github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d+)/;

export function parsePrUrl(input: string): PrRef | null {
  const m = input.trim().match(PR_RE);
  if (!m) return null;
  const [, owner, repo, num] = m;
  return {
    owner,
    repo,
    number: parseInt(num, 10),
    url: `https://github.com/${owner}/${repo}/pull/${num}`,
  };
}

interface GhPr {
  number: number;
  title: string;
  state: string;
  additions: number;
  deletions: number;
  changed_files: number;
  user: { login: string };
  base: { ref: string };
  head: { ref: string };
  html_url: string;
}

export interface PrResult {
  info: PrInfo;
  files: DiffFile[];
}

/** Load a pull request: metadata + unified diff, parsed for the diff viewer. */
export async function loadPr(input: string): Promise<PrResult> {
  const ref = parsePrUrl(input);
  if (!ref) throw new Error('Not a GitHub pull request URL — expected https://github.com/owner/repo/pull/N');

  setState({
    mode: 'pr',
    prStatus: 'loading-meta',
    prMessage: `Fetching PR ${ref.owner}/${ref.repo}#${ref.number}…`,
    repoUrl: ref.url,
    owner: ref.owner,
    repo: ref.repo,
    branch: `PR #${ref.number}`,
    pr: null,
    prDiff: null,
    tree: [],
    tabs: [],
    activeTab: null,
  });

  const headers = { Accept: 'application/vnd.github+json' };
  const metaRes = await fetch(
    `https://api.github.com/repos/${ref.owner}/${ref.repo}/pulls/${ref.number}`,
    { headers },
  );
  if (!metaRes.ok) throw new Error(`GitHub API ${metaRes.status} for PR #${ref.number}`);
  const meta = (await metaRes.json()) as GhPr;

  setState({ prStatus: 'loading-zip', prMessage: 'Fetching diff…' });
  const diffRes = await fetch(
    `https://api.github.com/repos/${ref.owner}/${ref.repo}/pulls/${ref.number}`,
    { headers: { Accept: 'application/vnd.github.v3.diff' } },
  );
  if (!diffRes.ok) throw new Error(`Diff fetch failed (${diffRes.status})`);
  const diffText = await diffRes.text();

  const info: PrInfo = {
    owner: ref.owner,
    repo: ref.repo,
    number: ref.number,
    title: meta.title,
    author: meta.user?.login ?? '',
    url: meta.html_url || ref.url,
    additions: meta.additions,
    deletions: meta.deletions,
    changedFiles: meta.changed_files,
    baseRef: meta.base?.ref ?? '',
    headRef: meta.head?.ref ?? '',
    state: meta.state,
  };
  const files = parseDiff(diffText);

  setState({
    pr: info,
    prDiff: files,
    prStatus: 'ready',
    prMessage: `PR #${ref.number} — ${files.length} files, +${info.additions} −${info.deletions}`,
    status: 'ready',
    statusMessage: info.title,
    fileCount: files.length,
  });
  return { info, files };
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

function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// The codeload zip endpoint does not send CORS headers for arbitrary
// origins, so downloads go through a same-origin proxy: vite dev proxy in
// development, the /api route on the Cloudflare worker in production.
// Path mirrors codeload: /api/{owner}/{repo}/zip/refs/heads/{branch}
// Zips are cached in IndexedDB — repeat loads of the same ref skip
// the network entirely.
async function fetchZip(
  owner: string,
  repo: string,
  branch: string,
): Promise<ArrayBuffer> {
  const cacheKey = `zip:${owner}/${repo}@${branch}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    setState({ loadBytes: cached.byteLength, loadTotal: cached.byteLength });
    return cached;
  }

  const url = `/api/${owner}/${repo}/zip/refs/heads/${branch}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`zip download failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const total = Number(res.headers.get('content-length') ?? 0);
  if (!res.body) return res.arrayBuffer();

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) {
      setState({
        loadBytes: received,
        loadTotal: total,
        statusMessage: `Downloading zipball — ${formatMB(received)} / ${formatMB(total)}`,
      });
    } else {
      setState({
        loadBytes: received,
        loadTotal: 0,
        statusMessage: `Downloading zipball — ${formatMB(received)}`,
      });
    }
  }

  const buf = new Uint8Array(received);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.length;
  }
  const ab = buf.buffer as ArrayBuffer;
  void cacheSet(cacheKey, ab);
  return ab;
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
    loadBytes: 0,
    loadTotal: 0,
    autoDevFor: null,
  });

  const branch = await resolveBranch(ref.owner, ref.repo, ref.branch);
  setState({
    branch,
    status: 'loading-zip',
    statusMessage: `Downloading ${branch}${ref.subdir ? `/${ref.subdir}` : ''} zipball…`,
    loadBytes: 0,
    loadTotal: 0,
  });

  const zip = await fetchZip(ref.owner, ref.repo, branch);
  setState({ status: 'extracting', statusMessage: 'Extracting into virtual FS…' });

  const vfs = await resetVfs();

  // Zip entries are prefixed with a single top-level "repo-branch/" dir,
  // then optionally the requested subdirectory. The filter runs before
  // decompression, so skipped dirs and oversized files cost ~nothing.
  const subPrefix = ref.subdir ? `${ref.subdir}/` : '';
  let skipped = 0;
  const files = unzipSync(new Uint8Array(zip), {
    filter: (f) => {
      let rel = f.name.replace(/^[^/]+\//, '');
      if (subPrefix) {
        if (!rel.startsWith(subPrefix)) return false;
        rel = rel.slice(subPrefix.length);
      }
      if (!rel || rel.endsWith('/')) return false;
      if (shouldSkip(rel) || f.originalSize > MAX_FILE_BYTES) {
        skipped++;
        return false;
      }
      return true;
    },
  });

  const entries: { path: string; data: Uint8Array }[] = [];
  let totalBytes = 0;
  for (const [name, data] of Object.entries(files)) {
    if (data === null) continue; // directory entry
    let rel = name.replace(/^[^/]+\//, '');
    if (subPrefix) {
      if (!rel.startsWith(subPrefix)) continue;
      rel = rel.slice(subPrefix.length);
    }
    if (!rel || rel.endsWith('/')) continue;
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
    mode: 'repo',
    pr: null,
    prDiff: null,
  });

  return { vfs, fileCount: entries.length, totalBytes, skipped };
}

export async function loadRepo(input: string): Promise<void> {
  await loadRepoFiles(input);
}
