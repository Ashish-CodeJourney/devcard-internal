import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getCapability, getExistenceChecker, getOAuthProvider, listCapabilityIds } from '../services/verification/registry.js';
import { signVerifyState, verifyVerifyState } from '../services/verification/state.js';
import { PLATFORMS } from '@devcard/shared';

type LinkParams = { linkId: string };
type ProviderParams = { provider: string };

/** Handles are case-insensitive and are routinely written with a leading @. */
function normaliseHandle(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/^@+/, '')
    .replace(/\/+$/, '')
    // Discord dropped the name#1234 form in 2023; ignore a legacy discriminator
    // so links created before the migration can still be verified.
    .replace(/#\d{1,4}$/, '')
    .toLowerCase();
}

function asciiSafe(message: string): string {
  return message.replace(/[^\x20-\x7E]/g, '');
}

export async function verifyRoutes(app: FastifyInstance): Promise<void> {
  const mobileRedirect = () => process.env.MOBILE_REDIRECT_URI || 'devcard://oauth/callback';

  // ─── Capability list ───
  // Public: it is static metadata about what the server supports.
  app.get('/platforms', async () => {
    return {
      platforms: listCapabilityIds().map(id => {
        const name = PLATFORMS[id]?.name ?? id;
        return { ...getCapability(id, name), name };
      }),
    };
  });

  // ─── Begin verification for a link ───
  app.post<{ Params: LinkParams }>('/links/:linkId/start', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const userId = request.user.id;
    const link = await app.prisma.platformLink.findFirst({
      where: { id: request.params.linkId, userId },
    });
    if (!link) return reply.status(404).send({ error: 'Link not found' });

    const name = PLATFORMS[link.platform]?.name ?? link.platform;
    const capability = getCapability(link.platform, name);

    if (capability.kind === 'existence') {
      return reply.send({ kind: 'existence', label: capability.label });
    }
    if (capability.kind === 'auto') {
      return reply.status(400).send({ error: capability.reason ?? 'Already verified at sign-in' });
    }
    if (capability.kind !== 'oauth') {
      return reply.status(400).send({ error: capability.reason ?? 'This platform cannot be verified' });
    }

    const provider = getOAuthProvider(link.platform);
    if (!provider) return reply.status(400).send({ error: 'Unsupported provider' });

    const clientId = process.env[provider.clientIdEnv];
    if (!clientId) return reply.status(400).send({ error: 'Provider is not configured' });

    const redirectUri = `${process.env.BACKEND_URL}/api/verify/${provider.id}/callback`;
    const state = signVerifyState({ userId, linkId: link.id, platform: link.platform });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: provider.scopes.join(' '),
      state,
      ...(provider.authorizeParams ?? {}),
    });

    return reply.send({ kind: 'oauth', url: `${provider.authorizeBase}?${params}` });
  });

  // ─── Existence check (weaker tier) ───
  app.post<{ Params: LinkParams }>('/links/:linkId/check', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const userId = request.user.id;
    const link = await app.prisma.platformLink.findFirst({
      where: { id: request.params.linkId, userId },
    });
    if (!link) return reply.status(404).send({ error: 'Link not found' });

    const checker = getExistenceChecker(link.platform);
    if (!checker) return reply.status(400).send({ error: 'No public API check for this platform' });

    let exists = false;
    try {
      exists = await checker(link.username);
    } catch {
      exists = false;
    }

    if (!exists) {
      return reply.status(404).send({
        error: `We could not find "${link.username}" on ${PLATFORMS[link.platform]?.name ?? link.platform}.`,
      });
    }

    const updated = await app.prisma.platformLink.update({
      where: { id: link.id },
      data: { checkedAt: new Date(), verificationMethod: 'EXISTENCE' },
    });

    return reply.send({ checked: true, checkedAt: updated.checkedAt });
  });

  // ─── Clear verification ───
  app.delete<{ Params: LinkParams }>('/links/:linkId', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const userId = request.user.id;
    const link = await app.prisma.platformLink.findFirst({
      where: { id: request.params.linkId, userId },
    });
    if (!link) return reply.status(404).send({ error: 'Link not found' });

    await app.prisma.platformLink.update({
      where: { id: link.id },
      data: {
        verified: false,
        verifiedAt: null,
        checkedAt: null,
        verificationMethod: null,
        platformUserId: null,
      },
    });
    return reply.send({ ok: true });
  });

  // ─── OAuth callback ───
  // No auth preHandler: the browser arrives here from the provider with only the
  // signed state, which is what identifies the user and the target link.
  app.get<{ Params: ProviderParams; Querystring: { code?: string; state?: string; error?: string } }>(
    '/:provider/callback',
    async (request: FastifyRequest<{ Params: ProviderParams; Querystring: { code?: string; state?: string; error?: string } }>, reply: FastifyReply) => {
      const done = (query: Record<string, string>) =>
        reply.redirect(`${mobileRedirect()}?${new URLSearchParams(query)}`);

      const { provider: providerId } = request.params;
      const provider = getOAuthProvider(providerId);
      if (!provider) return done({ error: 'Unsupported provider' });

      const payload = verifyVerifyState(request.query.state);
      if (!payload || payload.platform !== providerId) {
        return done({ error: 'This verification link has expired. Please try again.' });
      }

      const { code } = request.query;
      if (!code) return done({ error: 'The provider did not return an authorisation code.' });

      const clientId = process.env[provider.clientIdEnv];
      const clientSecret = process.env[provider.clientSecretEnv];
      if (!clientId || !clientSecret) return done({ error: 'Provider is not configured' });

      const redirectUri = `${process.env.BACKEND_URL}/api/verify/${provider.id}/callback`;

      const link = await app.prisma.platformLink.findFirst({
        where: { id: payload.linkId, userId: payload.userId },
      });
      if (!link) return done({ error: 'That link no longer exists.' });

      try {
        const { accessToken } = await provider.exchangeCode({ code, redirectUri, clientId, clientSecret });
        const identity = await provider.fetchIdentity(accessToken, clientId, clientSecret);

        const handle = identity.handle;
        if (!handle) {
          return done({
            error: `${provider.name} does not expose a username, so we cannot confirm this handle.`,
          });
        }

        if (normaliseHandle(handle) !== normaliseHandle(link.username)) {
          return done({
            error: `That ${provider.name} account is "${handle}", which does not match the handle on this link.`,
          });
        }

        await app.prisma.platformLink.update({
          where: { id: link.id },
          data: {
            verified: true,
            verifiedAt: new Date(),
            verificationMethod: 'OAUTH',
            platformUserId: identity.providerUserId,
            checkedAt: null,
          },
        });

        return done({ verification: payload.platform, linkId: link.id, status: 'verified' });
      } catch (error) {
        request.log.error({ error, provider: providerId }, 'verification oauth failed');
        return done({ error: `We could not complete the ${provider.name} verification.` });
      }
    },
  );
}

export default verifyRoutes;
