import {
  clearFileCache,
  fetchChecks,
  fetchDiff,
  fetchFileContents,
  fetchPrMeta,
  fetchPrs,
  fetchRefs,
} from './git.js';
import { handleAction, type ActionRequest } from './actions.js';
import { promptOnClose, recordPing } from './lifecycle.js';
import { cli, isDiffSource, sourceFromQuery, sourceToQuery } from './state.js';
import { runUiDiff } from './ui.js';

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export async function handleApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, '');

  try {
    if (path === 'ping') {
      recordPing();
      return new Response('pong');
    }

    if (path === 'close' && request.method === 'POST') {
      promptOnClose();
      return new Response('ok');
    }

    if (path === 'default') {
      return json(cli?.source ? sourceToQuery(cli.source) : null);
    }

    if (path === 'checks') {
      return json(await fetchChecks(sourceFromQuery(url.searchParams)));
    }

    if (path === 'prs') {
      const repo = url.searchParams.get('repo') || (cli?.source.kind === 'pr' ? cli.source.repo : undefined);
      return json(await fetchPrs(repo || undefined));
    }

    if (path === 'refs') {
      const cliRepo = cli?.source && cli.source.kind !== 'file' && 'repo' in cli.source ? cli.source.repo : undefined;
      const repo = url.searchParams.get('repo') || cliRepo;
      return json(await fetchRefs(repo || undefined));
    }

    if (path === 'diff' && request.method === 'POST') {
      const body: unknown = await request.json();
      if (!isDiffSource(body)) return json({ error: 'Invalid diff source' }, 400);
      clearFileCache();
      if (body.kind === 'ui') {
        const ui = await runUiDiff(body);
        return json({ source: body, raw: '', files: [], ui });
      }
      const raw = await fetchDiff(body);
      const prMeta = body.kind === 'pr' ? await fetchPrMeta(body) : null;
      return json({ source: body, raw, prMeta });
    }

    if (path === 'file' && request.method === 'POST') {
      const body = (await request.json()) as { source?: unknown; name?: unknown; side?: unknown };
      if (!isDiffSource(body.source)) return json({ error: 'Invalid diff source' }, 400);
      if (typeof body.name !== 'string' || body.name.length === 0) return json({ error: 'Invalid file name' }, 400);
      if (body.side !== 'old' && body.side !== 'new') return json({ error: 'Invalid side' }, 400);
      const contents = await fetchFileContents(body.source, body.name, body.side);
      return json({ contents });
    }

    if (path === 'action' && request.method === 'POST') {
      const body = (await request.json()) as ActionRequest;
      if (!body.action) return json({ ok: false, error: 'Missing action' }, 400);
      if (body.source !== undefined && !isDiffSource(body.source)) {
        return json({ ok: false, error: 'Invalid diff source' }, 400);
      }
      const result = await handleAction(body, cli?.source ?? null);
      if (result.ok) console.log(`[open-in-web diff] ${body.action} → ok`);
      else console.log(`[open-in-web diff] ${body.action} failed: ${result.error}`);
      return json(result);
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
}
