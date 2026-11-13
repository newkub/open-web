interface Env {
  ASSETS: Fetcher;
}

const CODELOAD = 'https://codeload.github.com';
const API = 'https://api.github.com';

// Same-origin proxy so the browser can download repo zipballs without
// hitting codeload's CORS restrictions. Only allows GitHub archive paths.
async function proxyGithub(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  // Authenticated path: api.github.com zipball (supports private repos).
  const auth = request.headers.get('Authorization');
  const mb = url.pathname.match(
    /^\/api\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/zipball\/refs\/heads\/([A-Za-z0-9._/-]+)$/,
  );
  if (mb) {
    const [, owner, repo, ref] = mb;
    const res = await fetch(`${API}/repos/${owner}/${repo}/zipball/refs/heads/${ref}`, {
      headers: {
        'User-Agent': 'open-web',
        Accept: 'application/vnd.github+json',
        ...(auth ? { Authorization: auth } : {}),
      },
      redirect: 'follow',
    });
    const headers = new Headers(res.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'private, max-age=60');
    return new Response(res.body, { status: res.status, headers });
  }
  const m = url.pathname.match(
    /^\/api\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/(zip|tar\.gz)\/refs\/(heads|tags)\/([A-Za-z0-9._/-]+)$/,
  );
  if (!m) {
    return new Response('not found', { status: 404 });
  }
  const [, owner, repo, format, kind, ref] = m;
  const upstream = `${CODELOAD}/${owner}/${repo}/${format}/refs/${kind}/${ref}`;
  const res = await fetch(upstream, {
    headers: { 'User-Agent': 'open-web', Accept: 'application/vnd.github+json' },
    redirect: 'follow',
  });
  if (!res.ok) {
    return new Response(`upstream ${res.status}`, { status: res.status });
  }
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Cache-Control', 'public, max-age=300');
  return new Response(res.body, { status: res.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return proxyGithub(request, env);
    }
    // IDE SPA fallback: extensionless /app/* paths serve the app shell.
    if (url.pathname.startsWith('/app') && !/\.[a-zA-Z0-9]+$/.test(url.pathname)) {
      return env.ASSETS.fetch(new URL('/app/index.html', url.origin).toString());
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
