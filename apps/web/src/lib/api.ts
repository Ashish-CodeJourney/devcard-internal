// ─── API client ───────────────────────────────────────────────────────────────
// The site is served from a different origin to the API, so the login cookies
// (SameSite=Lax, and third-party cookies are being phased out anyway) are not a
// viable session. Instead we hold a bearer token, exactly like the mobile app:
// OAuth finishes by redirecting to /auth/callback?code=… which we exchange for
// tokens.

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'https://devcard-internal-backend.onrender.com';

const ACCESS_KEY = 'devcard.accessToken';
const REFRESH_KEY = 'devcard.refreshToken';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function storeTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function apiBaseUrl(): string {
  return API_BASE_URL;
}

/** Starts the OAuth flow for a provider and returns to /auth/callback. */
export function oauthStartUrl(provider: 'github' | 'google'): string {
  return `${API_BASE_URL}/auth/${provider}?state=web_${provider}`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Set false for public endpoints (skips the Authorization header). */
  auth?: boolean;
};

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
    if (!data.accessToken) return null;
    storeTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestOptions, retry: boolean): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  // A stale access token is expected (15 min TTL) — refresh once and replay.
  if (res.status === 401 && retry && options.auth !== false) {
    const fresh = await refreshAccessToken();
    if (fresh) return request<T>(endpoint, options, false);
    clearTokens();
  }

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new ApiError(payload.error ?? payload.message ?? `Request failed: ${res.status}`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(endpoint, options, true);
}
