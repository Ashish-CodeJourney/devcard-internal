import type { FastifyInstance } from 'fastify';

/**
 * The access token only carries { id, username }, so the role is resolved from
 * the database. ADMIN_EMAILS is an optional comma-separated allowlist that makes
 * bootstrapping the first admin possible without touching SQL.
 */
export async function isAdmin(app: FastifyInstance, userId: string): Promise<boolean> {
  try {
    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      select: { authRole: true, email: true },
    });
    if (!user) return false;

    if (user.authRole === 'ADMIN' || user.authRole === 'SUPERADMIN') return true;

    const allowlist = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map(entry => entry.trim().toLowerCase())
      .filter(Boolean);

    return allowlist.includes(user.email.toLowerCase());
  } catch {
    // Never let a role lookup failure break the caller — resolve to "not admin".
    return false;
  }
}
