import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getCapability, getExistenceChecker, getOAuthProvider, listCapabilityIds } from '../services/verification/registry.js';
import { signVerifyState, verifyVerifyState } from '../services/verification/state.js';
import { PLATFORMS } from '@devcard/shared';

type LinkParams = { linkId: string };
type ProviderParams = { provider: string };

type StartBody = {
  /** Base64url S256 challenge (or the verifier itself when method is `plain`). */
  codeChallenge?: string;
  codeChallengeMethod?: string;
  /** Where the provider should return the user; must be allowlisted. */
  redirectUri?: string;
};

type CompleteBody = {
  /** The signed state we issued in /start — proves this flow was started here. */
  state?: string;
  providerUserId?: string;
  handle?: string;
};

/**
 * Deep-link redirects we will hand to a provider. Kept in env so a fork can
 * point at its own scheme without a code change.
 */
function allowedVerifyRedirects(): string[] {
  const raw = process.env.VERIFY_REDIRECT_URIS || 'devcard://verify/callback';
  return raw.split(',').map(value => value.trim()).filter(Boolean);
}

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
  app.post<{ Params: LinkParams; Body: StartBody }>('/links/:linkId/start', {
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

    const clientId = process.env[provider.clientIdEnv]?.trim();
    if (!clientId) return reply.status(400).send({ error: 'Provider is not configured' });

    const { codeChallenge, codeChallengeMethod, redirectUri: requestedRedirect } = request.body ?? {};

    // PKCE on-device: the provider's egress block only affects this server, so
    // the client runs the token exchange from its own IP instead.
    const usePkce = provider.pkce === true && typeof codeChallenge === 'string' && codeChallenge.length > 0;

    let redirectUri = `${process.env.BACKEND_URL?.trim()}/api/verify/${provider.id}/callback`;
    const pkceParams: Record<string, string> = {};

    if (usePkce) {
      if (!requestedRedirect || !allowedVerifyRedirects().includes(requestedRedirect)) {
        return reply.status(400).send({ error: 'That redirect URI is not allowed for this server' });
      }
      redirectUri = requestedRedirect;
      pkceParams.code_challenge = codeChallenge;
      pkceParams.code_challenge_method = codeChallengeMethod === 'plain' ? 'plain' : 'S256';
    }

    const state = signVerifyState({ userId, linkId: link.id, platform: link.platform });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: provider.scopes.join(' '),
      state,
      ...pkceParams,
      ...(provider.authorizeParams ?? {}),
    });

    return reply.send({
      kind: 'oauth',
      url: `${provider.authorizeBase}?${params}`,
      // Everything the device needs to finish the exchange itself. None of this
      // is secret: the client id is public and PKCE replaces the need for one.
      ...(usePkce
        ? {
            pkce: true,
            clientId,
            tokenUrl: provider.tokenUrl,
            identityUrl: provider.identityUrl,
            redirectUri,
            state,
          }
        : {}),
    });
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

  // ─── Complete a client-side (PKCE) verification ───
  // The token exchange ran on the device, because the provider rate-limits this
  // server's egress IP. That means we can no longer confirm the handle against
  // the provider ourselves, so the result is recorded as OAUTH_DEVICE: auditable
  // and distinguishable from the server-verified OAUTH tier, rather than being
  // silently presented as equivalent.
  app.post<{ Params: LinkParams; Body: CompleteBody }>('/links/:linkId/complete', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const userId = request.user.id;
    const { state, providerUserId, handle } = request.body ?? {};

    const link = await app.prisma.platformLink.findFirst({
      where: { id: request.params.linkId, userId },
    });
    if (!link) {
      return reply.status(404).send({ error: 'Link not found' });
    }

    const provider = getOAuthProvider(link.platform);
    if (!provider?.pkce) {
      return reply.status(400).send({ error: 'This platform cannot be verified on-device' });
    }

    // The signed state ties this completion back to the /start we issued, so a
    // caller cannot verify a link they did not begin a flow for.
    const payload = verifyVerifyState(state);
    if (
      !payload ||
      payload.userId !== userId ||
      payload.linkId !== link.id ||
      payload.platform !== link.platform
    ) {
      return reply.status(400).send({ error: 'This verification expired. Please try again.' });
    }

    if (!providerUserId || !handle) {
      return reply.status(400).send({ error: `The ${provider.name} account details were missing.` });
    }

    if (normaliseHandle(handle) !== normaliseHandle(link.username)) {
      return reply.status(409).send({
        error: `That ${provider.name} account is "${handle}", which does not match the handle on this link.`,
      });
    }

    await app.prisma.platformLink.update({
      where: { id: link.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
        verificationMethod: 'OAUTH_DEVICE',
        platformUserId: providerUserId,
        checkedAt: null,
        // Discord profiles are only addressable by snowflake, which we now have.
        ...(link.platform === 'discord'
          ? { url: `https://discord.com/users/${providerUserId}` }
          : {}),
      },
    });

    return reply.send({ verified: true, linkId: link.id, method: 'OAUTH_DEVICE' });
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

      // Trim: secrets pasted into a dashboard often carry a trailing newline,
      // which makes the provider reject the exchange as invalid_client.
      const clientId = process.env[provider.clientIdEnv]?.trim();
      const clientSecret = process.env[provider.clientSecretEnv]?.trim();
      if (!clientId || !clientSecret) return done({ error: 'Provider is not configured' });

      const redirectUri = `${process.env.BACKEND_URL?.trim()}/api/verify/${provider.id}/callback`;

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
            // Discord profiles are only addressable by snowflake, which we now
            // have — so the link becomes clickable after verification.
            ...(payload.platform === 'discord'
              ? { url: `https://discord.com/users/${identity.providerUserId}` }
              : {}),
          },
        });

        return done({ verification: payload.platform, linkId: link.id, status: 'verified' });
      } catch (error) {
        // `err` (not `error`) so pino serialises the Error instead of logging {}.
        request.log.error({ err: error, provider: providerId }, 'verification oauth failed');

        // Surface the provider's own reason — "invalid_client" vs "invalid_grant"
        // is the difference between a bad secret and a bad code. Stripped to
        // ASCII so it is safe in the redirect header.
        const detail = (error instanceof Error ? error.message : String(error))
          .replace(/[^\x20-\x7E]/g, '')
          .slice(0, 160);

        return done({
          error: `We could not complete the ${provider.name} verification (${detail}).`,
        });
      }
    },
  );
}

export default verifyRoutes;
