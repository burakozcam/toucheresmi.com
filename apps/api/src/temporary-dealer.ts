import { prisma } from './db';
import { accessIsValid } from './temporary-core';
import { SecurityError } from './security-errors';
import type { AuthenticatedRequest } from './auth';

/** Recheck at transaction/export boundaries, including already-open panels. */
export async function assertTemporaryDealer(user: NonNullable<AuthenticatedRequest['user']>, db: any = prisma) {
  const [grant, session] = await Promise.all([
    db.temporaryAccess.findUnique({ where: { userId: user.id } }),
    db.authSession.findUnique({ where: { id: user.sessionId ?? '__none__' } }),
  ]);
  if (!grant || !accessIsValid(grant) || !grant.scopes.includes('DEALER_EXAMS') || !session || session.userId !== user.id || session.role !== 'TEMPORARY' || session.revokedAt || +session.expiresAt <= Date.now() || +session.expiresAt > +grant.expiresAt) {
    throw new SecurityError(401, 'Geçici bayi erişimi sona erdi.');
  }
}
