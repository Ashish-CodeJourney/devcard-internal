// ─── Verification providers ───────────────────────────────────────────────────
// Provider adapters used by the platform-link verification flow.
//
// Two strengths of proof:
//   * ownership  — the user authorises their own provider account and we read
//                  the handle back, proving the link belongs to them.
//   * existence  — we ask a provider's PUBLIC api whether the handle exists.
//                  This proves the account exists, NOT that it is theirs, so it
//                  is recorded as a weaker signal (`checkedAt`, never `verified`).

export type ProviderIdentity = {
  /** The comparable handle. null when the provider exposes no username (LinkedIn). */
  handle: string | null;
  /** Immutable provider id — survives renames. */
  providerUserId: string;
  email?: string | null;
};

export type OAuthProviderDef = {
  id: string;
  name: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  authorizeBase: string;
  tokenUrl: string;
  /** Extra params appended to the authorise URL. */
  authorizeParams?: Record<string, string>;
  /** Exchanges an auth code for an access token. */
  exchangeCode: (args: {
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
  }) => Promise<{ accessToken: string }>;
  /** Reads the authenticated identity from the provider. */
  fetchIdentity: (accessToken: string, clientId: string, clientSecret: string) => Promise<ProviderIdentity>;
};

/** Discord rejects requests that do not send a descriptive User-Agent. */
const USER_AGENT = 'DevCard/1.0 (+https://devcard.dev)';

type ProviderResponse = {
  status: number;
  data: Record<string, unknown>;
  raw: string;
};

/** POST form-encoded to a token endpoint. Keeps the raw body for diagnostics. */
async function postForm(url: string, body: Record<string, string>): Promise<ProviderResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams(body).toString(),
  });

  const raw = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Non-JSON body (an HTML error page, an empty 403, …) — kept in `raw`.
  }
  return { status: res.status, data, raw };
}

/**
 * Surface the provider's own reason. Discord uses OAuth's
 * error/error_description for some failures and its own message/code for
 * others, and a non-JSON body has neither — so fall back to the HTTP status and
 * a snippet of the raw response.
 */
function providerError(provider: string, step: string, info: Partial<ProviderResponse>): Error {
  const data = info.data ?? {};

  let reason: string;
  if (typeof data.error === 'string') reason = data.error;
  else if (typeof data.message === 'string') reason = data.message;
  else reason = `HTTP ${info.status ?? '?'}`;

  let suffix = '';
  if (typeof data.error_description === 'string') {
    suffix = ` - ${data.error_description}`;
  } else if (!('error' in data) && !('message' in data) && info.raw) {
    suffix = ` - ${info.raw.replace(/\s+/g, ' ').trim().slice(0, 160)}`;
  }

  return new Error(`${provider} ${step} failed (${reason}${suffix})`);
}

export const OAUTH_PROVIDERS: Record<string, OAuthProviderDef> = {
  gitlab: {
    id: 'gitlab',
    name: 'GitLab',
    scopes: ['read_user'],
    clientIdEnv: 'GITLAB_CLIENT_ID',
    clientSecretEnv: 'GITLAB_CLIENT_SECRET',
    authorizeBase: 'https://gitlab.com/oauth/authorize',
    tokenUrl: 'https://gitlab.com/oauth/token',
    exchangeCode: async ({ code, redirectUri, clientId, clientSecret }) => {
      const res = await postForm('https://gitlab.com/oauth/token', {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });
      if (typeof res.data.access_token !== 'string') throw providerError('gitlab', 'token exchange', res);
      return { accessToken: res.data.access_token };
    },
    fetchIdentity: async accessToken => {
      const res = await fetch('https://gitlab.com/api/v4/user', {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': USER_AGENT },
      });
      if (!res.ok) throw providerError('gitlab', 'user fetch', { status: res.status });
      const u = (await res.json()) as { id?: number; username?: string; email?: string | null };
      if (u.id === undefined) throw new Error('gitlab_user_malformed');
      return { handle: u.username ?? null, providerUserId: String(u.id), email: u.email ?? null };
    },
  },

  discord: {
    id: 'discord',
    name: 'Discord',
    scopes: ['identify'],
    clientIdEnv: 'DISCORD_CLIENT_ID',
    clientSecretEnv: 'DISCORD_CLIENT_SECRET',
    authorizeBase: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    authorizeParams: { response_type: 'code', prompt: 'consent' },
    exchangeCode: async ({ code, redirectUri, clientId, clientSecret }) => {
      const res = await postForm('https://discord.com/api/oauth2/token', {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });
      if (typeof res.data.access_token !== 'string') throw providerError('discord', 'token exchange', res);
      return { accessToken: res.data.access_token };
    },
    fetchIdentity: async accessToken => {
      const res = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': USER_AGENT },
      });
      if (!res.ok) throw providerError('discord', 'user fetch', { status: res.status });
      const u = (await res.json()) as { id?: string; username?: string; email?: string | null };
      if (!u.id) throw new Error('discord_user_malformed');
      return { handle: u.username ?? null, providerUserId: u.id, email: u.email ?? null };
    },
  },

  // LinkedIn's OIDC userinfo returns no handle (only sub/email/name), so it can
  // only ever confirm by email. Kept here so it works the moment LinkedIn app
  // review lands; it stays hidden while the credentials are unset.
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    scopes: ['openid', 'profile', 'email'],
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    authorizeBase: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    exchangeCode: async ({ code, redirectUri, clientId, clientSecret }) => {
      const res = await postForm('https://www.linkedin.com/oauth/v2/accessToken', {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      });
      if (typeof res.data.access_token !== 'string') throw providerError('linkedin', 'token exchange', res);
      return { accessToken: res.data.access_token };
    },
    fetchIdentity: async accessToken => {
      const res = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': USER_AGENT },
      });
      if (!res.ok) throw providerError('linkedin', 'user fetch', { status: res.status });
      const u = (await res.json()) as { sub?: string; email?: string | null; name?: string | null };
      if (!u.sub) throw new Error('linkedin_user_malformed');
      return { handle: null, providerUserId: u.sub, email: u.email ?? null };
    },
  },
};

// ─── Existence checks ─────────────────────────────────────────────────────────
// Public endpoints only. A positive result is recorded as CHECKED, never as a
// verified ownership claim.

export type ExistenceChecker = (username: string) => Promise<boolean>;

async function okOr404(url: string, init?: RequestInit): Promise<boolean> {
  try {
    const res = await fetch(url, init);
    return res.ok;
  } catch {
    return false;
  }
}

export const EXISTENCE_CHECKERS: Record<string, ExistenceChecker> = {
  devto: username => okOr404(`https://dev.to/api/users/by_username?url=${encodeURIComponent(username)}`),

  npm: username => okOr404(`https://registry.npmjs.org/${encodeURIComponent(username)}`),

  stackoverflow: async username => {
    try {
      const res = await fetch(
        `https://api.stackexchange.com/2.3/users?inname=${encodeURIComponent(username)}&site=stackoverflow&filter=default`,
      );
      if (!res.ok) return false;
      const data = (await res.json()) as { items?: Array<{ display_name?: string }> };
      const needle = username.toLowerCase();
      return (data.items ?? []).some(u => (u.display_name ?? '').toLowerCase() === needle);
    } catch {
      return false;
    }
  },

  gitlab: async username => {
    try {
      const res = await fetch(`https://gitlab.com/api/v4/users?username=${encodeURIComponent(username)}`);
      if (!res.ok) return false;
      const data = (await res.json()) as Array<{ username?: string }>;
      const needle = username.toLowerCase();
      return data.some(u => (u.username ?? '').toLowerCase() === needle);
    } catch {
      return false;
    }
  },
};
