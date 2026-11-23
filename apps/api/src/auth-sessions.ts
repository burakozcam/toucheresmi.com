import jwt from "jsonwebtoken";
import type { Request } from "express";
import { prisma } from "./db";
import { env } from "./config";
import { credentialVersion } from "./credentials";
import { SecurityError } from "./security-errors";
export const sessionLabel = (request?: Request) => (request?.header?.("user-agent") ?? "Tarayıcı").replace(/[^\x20-\x7e]/g, "").slice(0, 180);
export async function issueSession(user: any, request?: Request, options: { mfaVerifiedAt?: Date; trustedDeviceId?: string; actorAdminId?: string; parentSessionId?: string; expiresAt?: Date } = {}, db: any = prisma) {
  const expiresAt = options.expiresAt ?? new Date(Date.now() + 8 * 3600_000);
  const session = await db.authSession.create({ data: { userId: user.id, role: user.role, credentialVersion: credentialVersion(user.passwordHash), expiresAt, label: sessionLabel(request), ...options } });
  const token = jwt.sign({ role: user.role, credentialVersion: session.credentialVersion, jti: session.id, ...(options.actorAdminId?{dealerId:user.dealerId}:{}) }, env.JWT_SECRET, { subject: user.id, expiresIn: Math.max(1, Math.floor((+expiresAt - Date.now()) / 1000)) });
  return { token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone, role: user.role, mustChangePassword: user.mustChangePassword }, expiresAt };
}
export async function assertFreshAdmin(user: any, db: any = prisma) {
  if (user?.role !== "SUPER_ADMIN" || user.actorAdminId || !user.sessionId) throw new SecurityError(403, "Yalnızca doğrudan yönetici oturumu bu işlemi yapabilir.");
  const session = await db.authSession.findUnique({ where: { id: user.sessionId } });
  if (!session || session.userId !== user.id || session.role !== "SUPER_ADMIN" || session.actorAdminId || session.revokedAt || !session.mfaVerifiedAt || +session.expiresAt <= Date.now() || Date.now() - +session.mfaVerifiedAt > 5 * 60_000) throw new SecurityError(403, "Bu işlem için güncel iki aşamalı yönetici doğrulaması gerekir. Bayiye geçiş ve kritik işlemler için 2FA doğrulaması son 5 dakika içinde yapılmış olmalıdır. Hesap Ayarları → Oturumlar ve iki aşamalı doğrulama bölümünden kurulum yapın veya “Kritik işlem için yeniden doğrula” seçeneğini kullanın.", "FRESH_MFA_REQUIRED");
  return session;
}
