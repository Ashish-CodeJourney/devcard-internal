// ─── Platform-link verification (client side) ─────────────────────────────────
// Discord rate-limits this server's egress IP, so its OAuth token exchange is
// performed on the device instead: the request leaves from the phone's own
// address, which is never blocked. PKCE (no client secret) makes that safe.
//
// The flow is:
//   startVerification()  -> POST /start, remember the verifier, open the browser
//   (provider redirects to devcard://verify/callback)
//   completeVerification() -> exchange the code here, then tell our server

import AsyncStorage from '@react-native-async-storage/async-storage';
import { post } from './api';
import { createCodeChallenge, createCodeVerifier } from './pkce';
import { VERIFY_REDIRECT_URI } from '../config';

const PENDING_KEY = 'devcard.verify.pending';
/** Matches the TTL the server applies to its signed state. */
const PENDING_TTL_MS = 10 * 60 * 1000;

export type StartResponse = {
  kind: 'oauth' | 'existence' | 'auto' | 'unavailable';
  url?: string;
  label?: string;
  /** Present when the client must run the exchange itself. */
  pkce?: boolean;
  clientId?: string;
  tokenUrl?: string;
  identityUrl?: string;
  redirectUri?: string;
  state?: string;
};

type VerificationListener = () => void;

const verificationListeners = new Set<VerificationListener>();

/**
 * Subscribe to successful verifications (either the on-device PKCE flow or
 * the server-side OAuth flow). Screens holding their own copy of the links
 * use this to refetch after the server has committed the change — the
 * AppState foreground refetch otherwise races the exchange and reloads
 * stale data.
 */
export function onVerificationCompleted(listener: VerificationListener): () => void {
  verificationListeners.add(listener);
  return () => {
    verificationListeners.delete(listener);
  };
}

function emitVerificationCompleted(): void {
  verificationListeners.forEach(listener => {
    try {
      listener();
    } catch {
      // A failing listener must not break the verification flow.
    }
  });
}

/**
 * Fires the completed event for flows that finish outside
 * completeVerification (the server-side OAuth callback).
 */
export function notifyVerificationCompleted(): void {
  emitVerificationCompleted();
}

type PendingPkce = {
  state: string;
  linkId: string;
  verifier: string;
  clientId: string;
  tokenUrl: string;
  identityUrl: string;
  redirectUri: string;
  createdAt: number;
};

async function rememberPending(pending: PendingPkce): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

/**
 * Begins verification for a link. Returns the server's response so the caller
 * can render the right affordance (browser flow vs. existence check).
 */
export async function startVerification(linkId: string, token: string | null): Promise<StartResponse> {
  const verifier = createCodeVerifier();

  const res = await post<StartResponse>(
    `/api/verify/links/${linkId}/start`,
    {
      codeChallenge: createCodeChallenge(verifier),
      codeChallengeMethod: 'S256',
      redirectUri: VERIFY_REDIRECT_URI,
    },
    token,
  );

  console.log(
    '[verify] start kind=',
    res?.kind,
    'pkce=',
    Boolean(res?.pkce),
    'redirect=',
    (() => {
      try {
        return res?.url ? new URL(res.url).searchParams.get('redirect_uri') : null;
      } catch {
        return 'unparseable';
      }
    })(),
  );

  if (
    res?.pkce &&
    res.state &&
    res.clientId &&
    res.tokenUrl &&
    res.identityUrl &&
    res.redirectUri
  ) {
    await rememberPending({
      state: res.state,
      linkId,
      verifier,
      clientId: res.clientId,
      tokenUrl: res.tokenUrl,
      identityUrl: res.identityUrl,
      redirectUri: res.redirectUri,
      createdAt: Date.now(),
    });
  }

  return res;
}

function formEncode(pairs: Array<[string, string]>): string {
  // Built by hand rather than with URLSearchParams, whose RN implementation has
  // historically differed from the spec.
  return pairs
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

/**
 * Finishes a device-side PKCE verification. `code` and `state` come straight
 * from the provider's redirect; the verifier never leaves this device.
 */
export async function completeVerification(
  code: string,
  state: string,
  token: string | null,
): Promise<string> {
  const raw = await AsyncStorage.getItem(PENDING_KEY);
  if (!raw) throw new Error('That verification is no longer pending. Please start again.');

  let pending: PendingPkce;
  try {
    pending = JSON.parse(raw) as PendingPkce;
  } catch {
    await AsyncStorage.removeItem(PENDING_KEY);
    throw new Error('That verification could not be read. Please start again.');
  }

  if (pending.state !== state) {
    throw new Error('That verification does not belong to this device.');
  }
  if (Date.now() - pending.createdAt > PENDING_TTL_MS) {
    await AsyncStorage.removeItem(PENDING_KEY);
    throw new Error('That verification expired. Please try again.');
  }

  // Single-use: clear before the network calls so a retry cannot replay it.
  await AsyncStorage.removeItem(PENDING_KEY);

  const tokenRes = await fetch(pending.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: formEncode([
      ['client_id', pending.clientId],
      ['grant_type', 'authorization_code'],
      ['code', code],
      ['redirect_uri', pending.redirectUri],
      ['code_verifier', pending.verifier],
    ]),
  });

  console.log('[verify] token exchange status=', tokenRes.status);

  const tokenJson = (await tokenRes.json().catch(() => null)) as
    | { access_token?: string; error?: string; error_description?: string }
    | null;

  if (!tokenJson?.access_token) {
    const reason =
      tokenJson?.error_description || tokenJson?.error || `HTTP ${tokenRes.status}`;
    throw new Error(`The provider rejected the sign-in (${reason}).`);
  }

  const meRes = await fetch(pending.identityUrl, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}`, Accept: 'application/json' },
  });
  const me = (await meRes.json().catch(() => null)) as
    | { id?: string; username?: string }
    | null;

  if (!me?.id) throw new Error('The provider did not return an account.');

  const handle = String(me.username ?? '');

  await post(
    `/api/verify/links/${pending.linkId}/complete`,
    { state, providerUserId: String(me.id), handle },
    token,
  );

  console.log('[verify] complete posted ok');

  // The server returns 409 here when the provider account does not match the
  // handle on the link, which surfaces to the caller as a thrown error.
  emitVerificationCompleted();

  return handle;
}
