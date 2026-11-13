import type { DiffSource } from '../types.js';

async function exists(cmd: string): Promise<boolean> {
  try {
    const proc = Bun.spawn({
      cmd: process.platform === 'win32' ? ['where', cmd] : ['which', cmd],
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return (await proc.exited) === 0;
  } catch {
    return false;
  }
}

async function run(args: string[], cwd?: string, retries = 2): Promise<string> {
  let proc;
  try {
    proc = Bun.spawn({ cmd: args, cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (retries > 0 && /spawn|EUNKNOWN/i.test(message)) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return run(args, cwd, retries - 1);
    }
    throw error;
  }
  const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
  if (code !== 0) {
    const err = await new Response(proc.stderr).text();
    if (code === 1 && !err && out) return out;
    throw new Error(`${args.slice(0, 3).join(' ')} failed: ${err || out}`);
  }
  return out;
}

export async function fetchDiff(source: DiffSource): Promise<string> {
  if (source.kind === 'ui') throw new Error('ui sources produce screenshots, not code diffs');
  if (source.kind === 'pr') {
    if (!(await exists('gh'))) throw new Error('gh CLI not found in PATH');
    const args = ['pr', 'diff', String(source.pr)];
    if (source.repo) args.push('--repo', source.repo);
    return run(['gh', ...args]);
  }

  if (!(await exists('git'))) throw new Error('git not found in PATH');
  if (source.kind === 'git') return run(['git', 'diff', `${source.ref}..HEAD`], source.repo);
  if (source.kind === 'branch') return run(['git', 'diff', `${source.base}..${source.head}`], source.repo);
  return run(['git', 'diff', '--no-index', '--', source.old, source.new]);
}

export interface PrListItem {
  number: number;
  title: string;
  author?: { login: string };
  state: string;
}

export async function fetchPrs(repo?: string): Promise<PrListItem[]> {
  if (!(await exists('gh'))) return [];
  const args = ['pr', 'list', '--json', 'number,title,author,state', '--limit', '30', '--state', 'open'];
  if (repo) args.push('--repo', repo);
  try {
    return JSON.parse((await run(['gh', ...args])) || '[]');
  } catch {
    return [];
  }
}

export interface RefsResult {
  branches: string[];
  tags: string[];
  commits: { sha: string; subject: string }[];
}

export async function fetchRefs(repoPath?: string): Promise<RefsResult> {
  if (!(await exists('git'))) return { branches: [], tags: [], commits: [] };
  try {
    const [branches, tags, log] = await Promise.all([
      run(['git', 'for-each-ref', '--format=%(refname:short)', 'refs/heads', 'refs/remotes'], repoPath).catch(() => ''),
      run(['git', 'tag', '-l', '--sort=-creatordate'], repoPath).catch(() => ''),
      run(['git', 'log', '--oneline', '-15', '--all'], repoPath).catch(() => ''),
    ]);
    return {
      branches: branches.split('\n').map((s) => s.trim()).filter((s) => s && !s.endsWith('/HEAD')).slice(0, 50),
      tags: tags.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 30),
      commits: log
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const space = line.indexOf(' ');
          return { sha: line.slice(0, space), subject: line.slice(space + 1).trim() };
        }),
    };
  } catch {
    return { branches: [], tags: [], commits: [] };
  }
}

export async function fetchPrMeta(source: Extract<DiffSource, { kind: 'pr' }>) {
  if (!(await exists('gh'))) return null;
  const args = ['pr', 'view', String(source.pr), '--json', 'title,author,state,url,number'];
  if (source.repo) args.push('--repo', source.repo);
  try {
    return JSON.parse(await run(['gh', ...args]));
  } catch {
    return null;
  }
}

export interface ChecksResult {
  available: boolean;
  checks: { name: string; state: string; bucket: string }[];
  summary: 'pass' | 'fail' | 'pending' | 'none' | 'error';
  failing?: string[];
  pending?: number;
  error?: string;
}

export async function fetchChecks(source: DiffSource | null | undefined): Promise<ChecksResult> {
  if (!source || source.kind !== 'pr') return { available: false, checks: [], summary: 'none' };
  try {
    const args = ['gh', 'pr', 'checks', String(source.pr), '--json', 'name,state,bucket'];
    if (source.repo) args.push('--repo', source.repo);
    const proc = Bun.spawn({ cmd: args, stdio: ['ignore', 'pipe', 'pipe'] });
    const out = await new Response(proc.stdout).text();
    await proc.exited;
    const checks = JSON.parse(out || '[]') as { name: string; state: string; bucket: string }[];
    const failing = checks.filter((check) => check.bucket === 'fail' || check.bucket === 'cancel');
    const pending = checks.filter((check) => check.bucket === 'pending');
    const summary = checks.length === 0 ? 'none' : failing.length ? 'fail' : pending.length ? 'pending' : 'pass';
    return { available: true, checks, summary, failing: failing.map((check) => check.name), pending: pending.length };
  } catch (error) {
    return { available: false, checks: [], summary: 'error', error: error instanceof Error ? error.message : String(error) };
  }
}

export async function resolveRepoName(source: Extract<DiffSource, { kind: 'pr' }>): Promise<string | null> {
  if (source.repo) return source.repo;
  try {
    const name = (await run(['gh', 'repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'])).trim();
    return name || null;
  } catch {
    return null;
  }
}

interface PrRefs {
  repo: string;
  oldRef: string;
  newRef: string;
}

const prRefsCache = new Map<string, Promise<PrRefs>>();

function loadPrRefs(source: Extract<DiffSource, { kind: 'pr' }>): Promise<PrRefs> {
  const key = `${source.repo || ''}#${source.pr}`;
  const cached = prRefsCache.get(key);
  if (cached) return cached;
  const task = (async () => {
    const repo = await resolveRepoName(source);
    if (!repo) throw new Error('Cannot resolve repository — pass --repo owner/repo');
    const raw = await run(['gh', 'pr', 'view', String(source.pr), '--repo', repo, '--json', 'baseRefOid,headRefOid']);
    const meta = JSON.parse(raw) as { baseRefOid: string; headRefOid: string };
    let oldRef = meta.baseRefOid;
    try {
      const mergeBase = (
        await run(['gh', 'api', `repos/${repo}/compare/${meta.baseRefOid}...${meta.headRefOid}`, '--jq', '.merge_base_commit.sha'])
      ).trim();
      if (mergeBase) oldRef = mergeBase;
    } catch {}
    return { repo, oldRef, newRef: meta.headRefOid };
  })();
  prRefsCache.set(key, task);
  task.catch(() => prRefsCache.delete(key));
  return task;
}

const fileCache = new Map<string, string | null>();
const FILE_CACHE_LIMIT = 200;

function sourceCacheKey(source: DiffSource): string {
  return JSON.stringify(source);
}

export function clearFileCache(): void {
  fileCache.clear();
}

async function githubContents(repo: string, path: string, ref: string): Promise<string> {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return run(['gh', 'api', `repos/${repo}/contents/${encoded}?ref=${ref}`, '-H', 'Accept: application/vnd.github.raw']);
}

export async function fetchFileContents(
  source: DiffSource,
  name: string,
  side: 'old' | 'new',
): Promise<string | null> {
  const key = `${sourceCacheKey(source)}:${side}:${name}`;
  if (fileCache.has(key)) return fileCache.get(key) ?? null;
  if (source.kind === 'ui') return null;

  let contents: string | null = null;
  try {
    if (source.kind === 'file') {
      contents = await Bun.file(side === 'old' ? source.old : source.new).text();
    } else if (source.kind === 'pr') {
      const refs = await loadPrRefs(source);
      contents = await githubContents(refs.repo, name, side === 'old' ? refs.oldRef : refs.newRef);
    } else {
      const ref = source.kind === 'git' ? (side === 'old' ? source.ref : 'HEAD') : side === 'old' ? source.base : source.head;
      contents = await run(['git', 'show', `${ref}:${name}`], source.repo);
    }
  } catch {
    contents = null;
  }

  if (fileCache.size >= FILE_CACHE_LIMIT) {
    const oldest = fileCache.keys().next().value;
    if (oldest) fileCache.delete(oldest);
  }
  fileCache.set(key, contents);
  return contents;
}
