import type { DiffSource } from '../types.js';

async function readStream(stream: ReadableStream<Uint8Array>, tag: string): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    buffer += chunk;
    let index: number;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (line.trim()) console.log(`[open-in-web diff:${tag}] ${line}`);
    }
  }
  if (buffer.trim()) console.log(`[open-in-web diff:${tag}] ${buffer}`);
  return full;
}

async function runAction(args: string[]): Promise<string> {
  console.log(`[open-in-web diff] $ ${args.join(' ')}`);
  const proc = Bun.spawn({ cmd: args, stdio: ['ignore', 'pipe', 'pipe'] });
  const [out, code, err] = await Promise.all([
    readStream(proc.stdout, 'out'),
    proc.exited,
    readStream(proc.stderr, 'err'),
  ]);
  if (code !== 0) throw new Error(err || out || 'Action failed');
  return out || 'ok';
}

export interface ActionRequest {
  action: string;
  method?: string;
  body?: string;
  source?: DiffSource;
}

export async function handleAction(
  request: ActionRequest,
  fallback: DiffSource | null | undefined,
): Promise<{ ok: boolean; output?: string; error?: string }> {
  try {
    const source = request.source ?? fallback;
    if (!source) throw new Error('No source configured');
    console.log(`\n[open-in-web diff] Action: ${request.action}${request.method ? ` (${request.method})` : ''}`);

    if (request.action === 'approve') {
      if (source.kind !== 'pr') throw new Error('approve only available for PR source');
      const args = ['gh', 'pr', 'review', String(source.pr), '--approve'];
      if (source.repo) args.push('--repo', source.repo);
      return { ok: true, output: await runAction(args) };
    }

    if (request.action === 'merge') {
      if (source.kind !== 'pr') throw new Error('merge only available for PR source');
      const args = ['gh', 'pr', 'merge', String(source.pr)];
      if (source.repo) args.push('--repo', source.repo);
      if (request.method === 'squash') args.push('--squash');
      if (request.method === 'rebase') args.push('--rebase');
      return { ok: true, output: await runAction(args) };
    }

    if (request.action === 'close') {
      if (source.kind !== 'pr') throw new Error('close only available for PR source');
      const args = ['gh', 'pr', 'close', String(source.pr)];
      if (source.repo) args.push('--repo', source.repo);
      return { ok: true, output: await runAction(args) };
    }

    if (request.action === 'comment') {
      if (source.kind !== 'pr') throw new Error('comment only available for PR source');
      const args = ['gh', 'pr', 'comment', String(source.pr), '--body', request.body ?? ''];
      if (source.repo) args.push('--repo', source.repo);
      return { ok: true, output: await runAction(args) };
    }

    if (request.action === 'checkout') {
      const ref = source.kind === 'pr' ? `refs/pull/${source.pr}/head` : source.kind === 'git' ? source.ref : null;
      if (!ref) throw new Error('checkout only available for pr or git source');
      return { ok: true, output: await runAction(['git', 'checkout', ref]) };
    }

    throw new Error(`Unknown action: ${request.action}`);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
