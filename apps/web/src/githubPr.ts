import { setState } from './store';
import type { PrInfo } from './store';
import { parseDiff, type DiffFile } from '@wrikka/open-web/diff';
import { authHeaders } from './githubAuth';

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

  const metaRes = await fetch(
    `https://api.github.com/repos/${ref.owner}/${ref.repo}/pulls/${ref.number}`,
    { headers: authHeaders({ Accept: 'application/vnd.github+json' }) },
  );
  if (!metaRes.ok) throw new Error(`GitHub API ${metaRes.status} for PR #${ref.number}`);
  const meta = (await metaRes.json()) as GhPr;

  setState({ prStatus: 'loading-zip', prMessage: 'Fetching diff…' });
  const diffRes = await fetch(
    `https://api.github.com/repos/${ref.owner}/${ref.repo}/pulls/${ref.number}`,
    { headers: authHeaders({ Accept: 'application/vnd.github.v3.diff' }) },
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
