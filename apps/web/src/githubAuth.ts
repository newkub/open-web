// GitHub Device Flow auth — user supplies their own OAuth App client ID
// (github.com/settings/developers → enable "Device Flow"). No client
// secret or callback URL needed; the token stays in localStorage.

const LS_CLIENT = 'open-web:gh-client-id';
const LS_TOKEN = 'open-web:gh-token';
const LS_LOGIN = 'open-web:gh-login';
const SCOPE = 'repo read:org';

export interface GhAuth {
  token: string;
  login: string;
}

export function getClientId(): string {
  return localStorage.getItem(LS_CLIENT) ?? '';
}
export function setClientId(id: string) {
  localStorage.setItem(LS_CLIENT, id.trim());
}
export function getAuth(): GhAuth | null {
  const token = localStorage.getItem(LS_TOKEN);
  const login = localStorage.getItem(LS_LOGIN);
  return token ? { token, login: login ?? '' } : null;
}
export function setAuth(a: GhAuth | null) {
  if (a) {
    localStorage.setItem(LS_TOKEN, a.token);
    localStorage.setItem(LS_LOGIN, a.login);
  } else {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_LOGIN);
  }
}

/** Authorization header value for api.github.com / proxy requests. */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const a = getAuth();
  return { ...(extra ?? {}), ...(a ? { Authorization: `Bearer ${a.token}` } : {}) };
}

export type DeviceFlowStep =
  | { step: 'code'; userCode: string; verificationUri: string; expiresIn: number }
  | { step: 'done'; login: string }
  | { step: 'slow_down' }
  | { step: 'expired' | 'denied' | 'error'; message?: string };

/**
 * Run the device flow. `onStep` reports the user code so the UI can show
 * it; resolves when the user authorizes (or expires/denies).
 */
export async function deviceFlow(
  clientId: string,
  onStep: (s: DeviceFlowStep) => void,
): Promise<GhAuth> {
  const codeRes = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, scope: SCOPE }),
  });
  const code = (await codeRes.json()) as {
    device_code?: string; user_code?: string; verification_uri?: string;
    expires_in?: number; error?: string; error_description?: string;
  };
  if (!code.device_code) {
    throw new Error(code.error_description ?? code.error ?? 'device code request failed');
  }
  onStep({
    step: 'code',
    userCode: code.user_code!,
    verificationUri: code.verification_uri ?? 'https://github.com/login/device',
    expiresIn: code.expires_in ?? 900,
  });

  const deadline = Date.now() + (code.expires_in ?? 900) * 1000;
  let interval = 5;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval * 1000));
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        device_code: code.device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });
    const tok = (await res.json()) as { access_token?: string; error?: string };
    if (tok.access_token) {
      const me = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tok.access_token}`, Accept: 'application/vnd.github+json' },
      }).then((r) => r.json()) as { login?: string };
      const login = me.login ?? '';
      const auth = { token: tok.access_token, login };
      setAuth(auth);
      onStep({ step: 'done', login });
      return auth;
    }
    if (tok.error === 'slow_down') { interval += 5; onStep({ step: 'slow_down' }); }
    else if (tok.error === 'authorization_pending') continue;
    else if (tok.error === 'expired_token') { onStep({ step: 'expired' }); throw new Error('device code expired'); }
    else if (tok.error === 'access_denied') { onStep({ step: 'denied' }); throw new Error('access denied'); }
    else { onStep({ step: 'error', message: tok.error }); throw new Error(tok.error ?? 'oauth error'); }
  }
  onStep({ step: 'expired' });
  throw new Error('device code expired');
}
