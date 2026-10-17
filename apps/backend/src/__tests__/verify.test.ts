import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

import { verifyRoutes } from '../routes/verify.js';
import { signVerifyState, verifyVerifyState } from '../services/verification/state.js';
import { getCapability } from '../services/verification/registry.js';

import type { PrismaClient } from '@prisma/client';

const mockPrisma = {
  platformLink: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

function link(overrides: Record<string, unknown> = {}) {
  return {
    id: 'link-1',
    userId: 'user-123',
    platform: 'gitlab',
    username: 'octo-dev',
    url: 'https://gitlab.com/octo-dev',
    displayOrder: 0,
    verified: false,
    verifiedAt: null,
    ...overrides,
  };
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify();
  app.decorate('prisma', mockPrisma as unknown as PrismaClient);
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: 'user-123' };
  });
  app.register(verifyRoutes, { prefix: '/api/verify' });
  await app.ready();
  return app;
}

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-for-verification-state';
  process.env.BACKEND_URL = 'https://backend.test';
  process.env.MOBILE_REDIRECT_URI = 'devcard://oauth/callback';
});

// ─── Signed state ─────────────────────────────────────────────────────────────

describe('verification state', () => {
  it('round-trips a signed payload', () => {
    const state = signVerifyState({ userId: 'u1', linkId: 'l1', platform: 'gitlab' });
    const parsed = verifyVerifyState(state);
    expect(parsed).toMatchObject({ userId: 'u1', linkId: 'l1', platform: 'gitlab' });
  });

  it('rejects a tampered payload', () => {
    const state = signVerifyState({ userId: 'u1', linkId: 'l1', platform: 'gitlab' });
    const [body, mac] = state.split('.');
    const forged = Buffer.from(JSON.stringify({ userId: 'attacker', linkId: 'l1', platform: 'gitlab', exp: Date.now() + 1e6, nonce: 'x' })).toString('base64url');
    expect(verifyVerifyState(`${forged}.${mac}`)).toBeNull();
  });

  it('rejects a malformed state', () => {
    expect(verifyVerifyState('not-a-state')).toBeNull();
    expect(verifyVerifyState('')).toBeNull();
    expect(verifyVerifyState(undefined)).toBeNull();
  });
});

// ─── Capability registry ──────────────────────────────────────────────────────

describe('capability registry', () => {
  it('marks github as verified at sign-in', () => {
    expect(getCapability('github', 'GitHub').kind).toBe('auto');
  });

  it('marks npm as an existence check', () => {
    expect(getCapability('npm', 'npm').kind).toBe('existence');
  });

  it('reports oauth providers as unavailable until their credentials exist', () => {
    const previous = process.env.GITLAB_CLIENT_ID;
    delete process.env.GITLAB_CLIENT_ID;
    const cap = getCapability('gitlab', 'GitLab');
    expect(cap.kind).toBe('unavailable');
    expect(cap.needsSetup).toBe(true);
    process.env.GITLAB_CLIENT_ID = previous;
  });

  it('explains why a platform cannot be verified', () => {
    const cap = getCapability('twitter', 'X');
    expect(cap.kind).toBe('unavailable');
    expect(cap.reason).toMatch(/paid API/i);
  });
});

// ─── GET /platforms ───────────────────────────────────────────────────────────

describe('GET /api/verify/platforms', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists capabilities with display names', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/verify/platforms' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.platforms)).toBe(true);
    const github = body.platforms.find((p: any) => p.platform === 'github');
    expect(github).toMatchObject({ kind: 'auto', name: 'GitHub' });
  });
});

// ─── POST /links/:linkId/start ────────────────────────────────────────────────

describe('POST /api/verify/links/:linkId/start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITLAB_CLIENT_ID = 'gitlab-client';
    process.env.GITLAB_CLIENT_SECRET = 'gitlab-secret';
  });

  it('404s when the link does not belong to the caller', async () => {
    mockPrisma.platformLink.findFirst.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/verify/links/link-1/start' });
    expect(res.statusCode).toBe(404);
  });

  it('returns an authorise URL for an oauth platform', async () => {
    mockPrisma.platformLink.findFirst.mockResolvedValue(link());
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/verify/links/link-1/start' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.kind).toBe('oauth');
    expect(body.url).toContain('https://gitlab.com/oauth/authorize');
    expect(body.url).toContain('client_id=gitlab-client');
    // The state must be signed and decode back to this link.
    const state = new URL(body.url).searchParams.get('state');
    expect(verifyVerifyState(state)).toMatchObject({ linkId: 'link-1', platform: 'gitlab' });
  });

  it('reports an existence check without a redirect', async () => {
    mockPrisma.platformLink.findFirst.mockResolvedValue(link({ platform: 'npm', username: 'express' }));
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/verify/links/link-1/start' });
    expect(res.json()).toMatchObject({ kind: 'existence' });
  });

  it('rejects a platform with no verification path', async () => {
    mockPrisma.platformLink.findFirst.mockResolvedValue(link({ platform: 'twitter' }));
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/verify/links/link-1/start' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/paid API/i);
  });

  it('refuses to start a flow for an already-auto-verified platform', async () => {
    mockPrisma.platformLink.findFirst.mockResolvedValue(link({ platform: 'github' }));
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/verify/links/link-1/start' });
    expect(res.statusCode).toBe(400);
  });
});

// ─── POST /links/:linkId/check (existence tier) ───────────────────────────────

describe('POST /api/verify/links/:linkId/check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('records a checkedAt when the account exists', async () => {
    mockPrisma.platformLink.findFirst.mockResolvedValue(link({ platform: 'npm', username: 'express' }));
    mockPrisma.platformLink.update.mockResolvedValue({ checkedAt: new Date('2026-01-01T00:00:00Z') });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/verify/links/link-1/check' });
    expect(res.statusCode).toBe(200);
    expect(res.json().checked).toBe(true);
    expect(mockPrisma.platformLink.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ verificationMethod: 'EXISTENCE' }) }),
    );
  });

  it('404s without writing when the account is not found', async () => {
    mockPrisma.platformLink.findFirst.mockResolvedValue(link({ platform: 'npm', username: 'definitely-not-real' }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/verify/links/link-1/check' });
    expect(res.statusCode).toBe(404);
    expect(mockPrisma.platformLink.update).not.toHaveBeenCalled();
  });

  it('does not treat an existence hit as an ownership verification', async () => {
    mockPrisma.platformLink.findFirst.mockResolvedValue(link({ platform: 'npm', username: 'express' }));
    mockPrisma.platformLink.update.mockResolvedValue({ checkedAt: new Date() });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const app = await buildApp();
    await app.inject({ method: 'POST', url: '/api/verify/links/link-1/check' });
    const data = mockPrisma.platformLink.update.mock.calls[0][0].data;
    expect(data.verified).toBeUndefined();
    expect(data.checkedAt).toBeInstanceOf(Date);
  });
});

// ─── DELETE /links/:linkId ────────────────────────────────────────────────────

describe('DELETE /api/verify/links/:linkId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clears every verification field', async () => {
    mockPrisma.platformLink.findFirst.mockResolvedValue(link({ verified: true }));
    mockPrisma.platformLink.update.mockResolvedValue({});

    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/verify/links/link-1' });
    expect(res.statusCode).toBe(200);
    expect(mockPrisma.platformLink.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          verified: false,
          verifiedAt: null,
          checkedAt: null,
          verificationMethod: null,
          platformUserId: null,
        },
      }),
    );
  });
});

// ─── GET /:provider/callback ──────────────────────────────────────────────────

describe('GET /api/verify/:provider/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    process.env.GITLAB_CLIENT_ID = 'gitlab-client';
    process.env.GITLAB_CLIENT_SECRET = 'gitlab-secret';
  });

  function locationOf(res: { headers: Record<string, unknown> }): string {
    return String(res.headers.location);
  }

  /** Parses the redirect's query string (URLSearchParams handles `+` as space). */
  function queryOf(res: { headers: Record<string, unknown> }): URLSearchParams {
    const loc = locationOf(res);
    return new URLSearchParams(loc.split('?')[1] ?? '');
  }

  it('returns to the app when the state is invalid', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/verify/gitlab/callback?code=x&state=bogus' });
    expect(res.statusCode).toBe(302);
    expect(locationOf(res)).toContain('devcard://oauth/callback?error=');
  });

  it('rejects when the authorised handle does not match the link', async () => {
    mockPrisma.platformLink.findFirst.mockResolvedValue(link({ username: 'somebody-else' }));
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok' }) } as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 7, username: 'octo-dev' }) } as any),
    );

    const state = signVerifyState({ userId: 'user-123', linkId: 'link-1', platform: 'gitlab' });
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: `/api/verify/gitlab/callback?code=x&state=${state}` });

    expect(res.statusCode).toBe(302);
    expect(queryOf(res).get('error')).toMatch(/does not match/i);
    expect(mockPrisma.platformLink.update).not.toHaveBeenCalled();
  });

  it('marks the link verified when the handle matches, ignoring case and @', async () => {
    mockPrisma.platformLink.findFirst.mockResolvedValue(link({ username: '@Octo-Dev' }));
    mockPrisma.platformLink.update.mockResolvedValue({});
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok' }) } as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 7, username: 'octo-dev' }) } as any),
    );

    const state = signVerifyState({ userId: 'user-123', linkId: 'link-1', platform: 'gitlab' });
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: `/api/verify/gitlab/callback?code=x&state=${state}` });

    expect(res.statusCode).toBe(302);
    expect(locationOf(res)).toContain('status=verified');
    expect(mockPrisma.platformLink.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'link-1' },
        data: expect.objectContaining({
          verified: true,
          verificationMethod: 'OAUTH',
          platformUserId: '7',
        }),
      }),
    );
  });

  it('verifies a Discord link saved in the legacy name#1234 format', async () => {
    process.env.DISCORD_CLIENT_ID = 'discord-client';
    process.env.DISCORD_CLIENT_SECRET = 'discord-secret';

    // Stored before Discord dropped discriminators.
    mockPrisma.platformLink.findFirst.mockResolvedValue(
      link({ platform: 'discord', username: 'octo-dev#1234' }),
    );
    mockPrisma.platformLink.update.mockResolvedValue({});
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok' }) } as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: '99887766', username: 'octo-dev' }) } as any),
    );

    const state = signVerifyState({ userId: 'user-123', linkId: 'link-1', platform: 'discord' });
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: `/api/verify/discord/callback?code=x&state=${state}` });

    expect(res.statusCode).toBe(302);
    expect(locationOf(res)).toContain('status=verified');
    expect(mockPrisma.platformLink.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verified: true,
          platformUserId: '99887766',
          // Discord is only addressable by snowflake, so verification fills the URL.
          url: 'https://discord.com/users/99887766',
        }),
      }),
    );

    delete process.env.DISCORD_CLIENT_ID;
    delete process.env.DISCORD_CLIENT_SECRET;
  });

  it('does not leave a non-ASCII character in the redirect header', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    const state = signVerifyState({ userId: 'user-123', linkId: 'link-1', platform: 'gitlab' });
    const app = await buildApp();
    mockPrisma.platformLink.findFirst.mockResolvedValue(link());
    const res = await app.inject({ method: 'GET', url: `/api/verify/gitlab/callback?code=x&state=${state}` });
    // Would throw ERR_INVALID_CHAR during inject if the header contained non-ASCII.
    expect(res.statusCode).toBe(302);
  });
});
