import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "./config";
import { prisma } from "./db";
import { credentialVersion } from "./credentials";
export { credentialVersion } from "./credentials";
export interface AuthenticatedRequest extends Request {
  user?: { id: string; role: Role; dealerId: string | null; schoolId: string | null; mustChangePassword?: boolean; sessionId?: string; actorAdminId?: string; parentSessionId?: string };
}
export async function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction): Promise<void> {
  const authorization = request.header("authorization"), token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  if (!token) { response.status(401).json({ error: "Oturum açmanız gerekiyor." }); return; }
  let claims: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof decoded === "string" || typeof decoded.sub !== "string" || typeof decoded.jti !== "string" || decoded.purpose || !Object.values(Role).includes(decoded.role)) throw Error();
    claims = decoded;
  } catch { response.status(401).json({ error: "Oturum geçersiz veya süresi dolmuş. Yeniden giriş yapın." }); return; }
  try {
    const [user, session] = await Promise.all([
      prisma.user.findUnique({ where: { id: claims.sub }, include: { dealer: { select: { active: true } } } }),
      prisma.authSession.findUnique({ where: { id: claims.jti } }),
    ]);
    const valid = user && session && user.active && user.role === claims.role && session.userId === user.id && session.role === user.role && !session.revokedAt && +session.expiresAt > Date.now() && session.credentialVersion === credentialVersion(user.passwordHash) && claims.credentialVersion === session.credentialVersion;
    if (!valid || user.role === "DEALER" && (!user.dealerId || !user.dealer?.active) || user.role === "SUPER_ADMIN" && (!user.twoFactorEnabled || !session.mfaVerifiedAt && !session.trustedDeviceId)) {
      response.status(401).json({ error: "Kullanıcı oturumu artık geçerli değil." }); return;
    }
    if (session.trustedDeviceId) {
      const device = await prisma.trustedDevice.findUnique({ where: { id: session.trustedDeviceId } });
      if (!device || device.userId !== user.id || device.revokedAt || +device.expiresAt <= Date.now() || device.credentialVersion !== session.credentialVersion) { response.status(401).json({ error: "Güvenilir cihaz izni sonlandırıldı." }); return; }
    }
    if (session.actorAdminId) {
      const [actor, parent] = await Promise.all([prisma.user.findUnique({ where: { id: session.actorAdminId } }), prisma.authSession.findUnique({ where: { id: session.parentSessionId ?? "__none__" } })]);
      if (user.role !== "DEALER" || !actor?.active || actor.role !== "SUPER_ADMIN" || !actor.twoFactorEnabled || !parent || parent.actorAdminId || parent.userId !== actor.id || parent.revokedAt || +parent.expiresAt <= Date.now() || parent.credentialVersion !== credentialVersion(actor.passwordHash)) { response.status(401).json({ error: "Temsil oturumu sonlandı." }); return; }
    }
    request.user = { id: user.id, role: user.role, dealerId: user.dealerId, schoolId: user.schoolId, mustChangePassword: user.mustChangePassword, sessionId: session.id, ...(session.actorAdminId ? { actorAdminId: session.actorAdminId, parentSessionId: session.parentSessionId! } : {}) };
    const pathname = request.originalUrl?.split("?")[0];
    if (session.actorAdminId && pathname?.startsWith("/api/account") && request.method !== "GET") { response.status(403).json({ error: "Temsil oturumunda bayi hesap bilgileri ve şifresi değiştirilemez." }); return; }
    if (user.mustChangePassword && !(pathname === "/api/account/password" || pathname === "/api/account" && request.method === "GET" || pathname === "/api/security/logout")) { response.status(403).json({ code: "PASSWORD_CHANGE_REQUIRED", error: "Devam etmek için kendi şifrenizi belirlemelisiniz." }); return; }
    next();
  } catch (error) { next(error); }
}
export function requireRole(role: Role) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction) => { if (request.user?.role !== role) { response.status(403).json({ error: "Bu işlem için yetkiniz yok." }); return; } next(); };
}
