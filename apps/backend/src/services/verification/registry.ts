// ─── Verification capability registry ─────────────────────────────────────────
// Single source of truth for which platforms can be verified and how.
// Exposed via GET /api/verify/platforms so the client never keeps its own copy.

import { OAUTH_PROVIDERS, EXISTENCE_CHECKERS, type OAuthProviderDef } from './providers.js';

export type VerificationKind =
  /** Ownership proven with the user's own provider account (OAuth). */
  | 'oauth'
  /** Already proven at sign-in, because we hold the login identity. */
  | 'auto'
  /** Handle confirmed to exist via a public API. Weaker: not proof of ownership. */
  | 'existence'
  /** No viable path. */
  | 'unavailable';

export interface VerificationCapability {
  platform: string;
  kind: VerificationKind;
  label: string;
  /** Present when kind === 'unavailable'. */
  reason?: string;
  /** Implemented, but the provider credentials are not configured yet. */
  needsSetup?: boolean;
  /**
   * The client can run the token exchange itself (PKCE, no client secret), which
   * is how verification keeps working when our egress IP is blocked.
   */
  pkce?: boolean;
}

/** Platforms already verified as a side effect of signing in. */
const AUTO: Record<string, string> = {
  github: 'Verified automatically when you sign in with GitHub',
  google: 'Verified by matching the email on your Google account',
};

/** Platforms with no workable account API. */
const UNAVAILABLE: Record<string, string> = {
  twitter: 'X requires a paid API tier for account access',
  instagram: 'Instagram requires Meta app review',
  behance: 'Behance requires partner approval',
  dribbble: 'Dribbble requires app approval',
  medium: 'Medium offers no account API',
  hashnode: 'Hashnode offers no account API',
  leetcode: 'LeetCode offers no official account API',
  hackerrank: 'HackerRank offers no account API',
  telegram: 'Telegram offers no account lookup API',
  email: 'Email has no separate account to verify',
  portfolio: 'A personal site has no account to verify',
  custom: 'Custom links cannot be verified',
  youtube: 'YouTube requires Google verification for channel access',
  figma: 'Figma verification is not configured',
};

const LABELS: Record<string, string> = {
  oauth: 'Verify with {name}',
  existence: 'Check this account exists',
  auto: 'Verified at sign-in',
  unavailable: 'Not verifiable',
};

function envHas(clientIdEnv: string, clientSecretEnv: string): boolean {
  return Boolean(process.env[clientIdEnv]) && Boolean(process.env[clientSecretEnv]);
}

export function getOAuthProvider(platformId: string): OAuthProviderDef | null {
  return OAUTH_PROVIDERS[platformId] ?? null;
}

export function getExistenceChecker(platformId: string): ((u: string) => Promise<boolean>) | null {
  return EXISTENCE_CHECKERS[platformId] ?? null;
}

export function getCapability(platformId: string, displayName: string): VerificationCapability {
  const provider = OAUTH_PROVIDERS[platformId];
  if (provider) {
    // A PKCE provider only needs the client id: with a public client there is no
    // secret to exchange, because the token request never reaches this server.
    const configured = provider.pkce
      ? Boolean(process.env[provider.clientIdEnv])
      : envHas(provider.clientIdEnv, provider.clientSecretEnv);
    return {
      platform: platformId,
      kind: configured ? 'oauth' : 'unavailable',
      label: LABELS.oauth.replace('{name}', displayName),
      ...(provider.pkce ? { pkce: true } : {}),
      ...(configured ? {} : { needsSetup: true, reason: `Waiting for ${provider.name} app credentials` }),
    };
  }

  if (EXISTENCE_CHECKERS[platformId]) {
    return { platform: platformId, kind: 'existence', label: LABELS.existence };
  }

  if (AUTO[platformId]) {
    return { platform: platformId, kind: 'auto', label: LABELS.auto, reason: AUTO[platformId] };
  }

  return {
    platform: platformId,
    kind: 'unavailable',
    label: LABELS.unavailable,
    reason: UNAVAILABLE[platformId] ?? 'This platform has no account API',
  };
}

/** Every platform we know about, for the client to render affordances from. */
export function listCapabilityIds(): string[] {
  return Array.from(
    new Set([
      ...Object.keys(OAUTH_PROVIDERS),
      ...Object.keys(EXISTENCE_CHECKERS),
      ...Object.keys(AUTO),
      ...Object.keys(UNAVAILABLE),
    ]),
  );
}

export { OAUTH_PROVIDERS, EXISTENCE_CHECKERS };
