import { randomBytes } from 'node:crypto';

export function generateState(): string {
  return randomBytes(32).toString('hex');
}

export function buildOAuthState(clientState: string, mobileRedirectUri: string): string {
  if (!clientState) {
    return generateState();
  }
  if (clientState.startsWith('mobile_') && mobileRedirectUri) {
    const encodedRedirect = Buffer.from(mobileRedirectUri, 'utf8').toString('base64url');
    return `${clientState}.${encodedRedirect}.${generateState()}`;
  }
  return `${clientState}.${generateState()}`;
}

export function getMobileRedirectUri(state?: string): string | null {
  if (!state?.startsWith('mobile_')) {
    return null;
  }
  const encodedRedirect = state.split('.')[1];
  if (!encodedRedirect) {
    return null;
  }
  try {
    return Buffer.from(encodedRedirect, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

/**
 * States that finish out-of-band — the mobile app (`mobile_`) or the website
 * (`web_`). Neither can rely on the oauth_state cookie, because the flow returns
 * through a browser that does not carry our cookies (and, for the website, a
 * cross-site request where SameSite=Lax cookies are not sent at all). For these
 * the nonce is kept server-side in Redis instead.
 */
export function isOutOfBandState(state?: string): boolean {
  return Boolean(state && (state.startsWith('mobile_') || state.startsWith('web_')));
}
