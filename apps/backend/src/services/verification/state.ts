// ─── Verification state ───────────────────────────────────────────────────────
// The mobile app opens the provider's authorise page with Linking.openURL, i.e.
// in the SYSTEM browser, which cannot carry an Authorization header. So the
// callback has to identify the user from the state parameter alone.
//
// The state is therefore HMAC-signed: it carries who/what the verification is
// for, is tamper-evident, and expires. No cookie and no server-side lookup are
// required for the user to be identified — which also means the flow still works
// when Redis is unavailable.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const TTL_MS = 10 * 60 * 1000;

export interface VerifyStatePayload {
  userId: string;
  linkId: string;
  platform: string;
  /** Epoch milliseconds. */
  exp: number;
  nonce: string;
}

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET is required to sign verification state');
  return value;
}

function sign(body: string): string {
  return createHmac('sha256', secret()).update(body).digest('base64url');
}

export function signVerifyState(payload: Omit<VerifyStatePayload, 'exp' | 'nonce'>): string {
  const full: VerifyStatePayload = { ...payload, exp: Date.now() + TTL_MS, nonce: randomBytes(16).toString('hex') };
  const body = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifyVerifyState(state: string | undefined | null): VerifyStatePayload | null {
  if (!state) return null;
  const idx = state.lastIndexOf('.');
  if (idx <= 0) return null;

  const body = state.slice(0, idx);
  const mac = state.slice(idx + 1);
  const expected = sign(body);

  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as VerifyStatePayload;
    if (!payload?.userId || !payload?.linkId || !payload?.platform) return null;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
