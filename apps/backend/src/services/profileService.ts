import { detectPlatformFromUrl, getPlatform, getProfileUrl } from '@devcard/shared'

import { getErrorMessage } from '../utils/error.util.js'

import type { FastifyInstance } from 'fastify'

export async function getOwnProfile(app: FastifyInstance, userId: string) {
  const user = await app.prisma.user.findUnique({
    where: { id: userId },
    include: {
      platformLinks: { orderBy: { displayOrder: 'asc' } },
      cards: { where: { isDefault: true }, select: { id: true }, take: 1 },
    },
  })

  if (!user) {return null}

  const { provider: _provider, providerId: _providerId, ...profileData } = user as any
  return { ...profileData, defaultCardId: user.cards[0]?.id || null }
}

export async function updateProfile(app: FastifyInstance, userId: string, data: any) {
  // Fast-path uniqueness check
  if (data.username) {
    const existing = await app.prisma.user.findFirst({
      where: { username: data.username, NOT: { id: userId } },
    })
    if (existing) {throw Object.assign(new Error('Username taken'), { code: 'P2002' })}
  }

  const currentUser = await app.prisma.user.findUnique({ where: { id: userId }, select: { username: true } })

  try {
    const response = await app.prisma.user.update({ where: { id: userId }, data, select: {
      id: true, email: true, username: true, displayName: true, bio: true, pronouns: true, role: true, company: true, avatarUrl: true, accentColor: true
    } })

    if (app.redis && currentUser) {
      app.redis.del(`profile:${currentUser.username}`).catch((err: unknown) =>
        app.log.warn(`Failed to invalidate profile cache: ${getErrorMessage(err)}`)
      )
    }

    return response
  } catch (err: any) {
    if (err?.code === 'P2002') {throw err}
    app.log.error({ err }, 'DB error in updateProfile')
    throw err
  }
}

export async function createPlatformLink(app: FastifyInstance, userId: string, linkData: any) {
  const detected = linkData.url ? detectPlatformFromUrl(linkData.url) : null
  const platform = linkData.platform || detected?.platform.id || 'custom'
  const username = linkData.username || detected?.username || deriveUsernameFromUrl(linkData.url)
  const platformDef = getPlatform(platform)
  const url = linkData.url || (platform && username ? getProfileUrl(platform, username) : '')

  if (!platform || !username) {
    throw Object.assign(new Error('Invalid platform link'), { code: 'LINK_DETECTION_FAILED' })
  }

  // Some platforms have no public profile URL by handle — Discord only exposes
  // /users/<snowflake>, which we do not have until the account is verified. The
  // handle itself is the identity, so an empty URL is valid there.
  if (!url && platformDef?.urlPattern) {
    throw Object.assign(new Error('Invalid platform link'), { code: 'LINK_DETECTION_FAILED' })
  }

  const maxOrder = await app.prisma.platformLink.aggregate({ where: { userId }, _max: { displayOrder: true } })
  return app.prisma.platformLink.create({ data: { userId, platform, username, url, displayOrder: (maxOrder._max.displayOrder ?? -1) + 1 } })
}

export async function updatePlatformLink(app: FastifyInstance, userId: string, id: string, linkData: any) {
  const existing = await app.prisma.platformLink.findFirst({ where: { id, userId } })
  if (!existing) {return null}
  const detected = linkData.url ? detectPlatformFromUrl(linkData.url) : null
  const platform = linkData.platform || detected?.platform.id || existing.platform
  const username = linkData.username || detected?.username || existing.username
  const url = linkData.url || getProfileUrl(platform, username)

  return app.prisma.platformLink.update({ where: { id }, data: { platform, username, url } })
}

function deriveUsernameFromUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart) return lastPart;
    return url.hostname.replace(/^www\./, '');
  } catch {
    return urlString;
  }
}

export async function deletePlatformLink(app: FastifyInstance, userId: string, id: string) {
  const existing = await app.prisma.platformLink.findFirst({ where: { id, userId } })
  if (!existing) {return false}
  await app.prisma.platformLink.delete({ where: { id } })
  return true
}

export async function reorderLinks(app: FastifyInstance, userId: string, links: Array<{ id: string; displayOrder: number }>) {
  await app.prisma.$transaction(links.map((link) => app.prisma.platformLink.updateMany({ where: { id: link.id, userId }, data: { displayOrder: link.displayOrder } })))
  return { message: 'Links reordered' }
}
