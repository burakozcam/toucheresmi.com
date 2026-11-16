import express from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { env } from "./config";
import { credentialVersion } from "./credentials";
import { requireAuth, type AuthenticatedRequest } from "./auth";
import { issueSession, assertFreshAdmin, sessionLabel } from "./auth-sessions";
import { SecurityError } from "./security-errors";
import { base32, encryptMfa, decryptMfa, matchingCounter, recoveryCodes, consumeFactor } from "./mfa-core";
import { verifyPassword } from "./passwords";
import { RequestLimiter } from "./rate-limit";
const COOKIE = process.env.NODE_ENV === "production" ? "__Secure-ks-trusted" : "ks-trusted";
const cookieToken = (q: express.Request) => (q.header("cookie") ?? "").split(";").map(v => v.trim()).find(v => v.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
export const trustedCookieOptions = (production=process.env.NODE_ENV === "production") => ({ httpOnly: true, secure: production, sameSite: "strict" as const, path: "/api", maxAge: 30 * 86400_000 });
const cookieOptions=trustedCookieOptions();
const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
export const securityRouter = express.Router();
type Handler = (q: AuthenticatedRequest, r: express.Response) => Promise<void>;
const wrap = (fn: Handler): express.RequestHandler => async (q, r, n) => { try { await fn(q as AuthenticatedRequest, r); } catch (e) { if (e instanceof z.ZodError) { r.status(400).json({ error: "Doğrulama bilgilerini kontrol edin." }); return; } n(e); } };
const accountFactors = new RequestLimiter(10,5*60_000,10000,"mfa-account");
async function limitFactor(userId:string){const limit=await accountFactors.checkShared(userId);if(!limit.allowed)throw new SecurityError(429,"Çok sık doğrulama denemesi yapıldı. Beş dakika sonra tekrar deneyin.");}
const factorInput = z.object({ code: z.string().trim().min(6).max(80) });
function challenge(user: any, setup: boolean) { return jwt.sign({ purpose: setup ? "MFA_SETUP" : "MFA_LOGIN", role: user.role, credentialVersion: credentialVersion(user.passwordHash), jti: crypto.randomUUID() }, env.JWT_SECRET, { subject: user.id, expiresIn: "5m" }); }
async function challengedUser(token: string, purpose: string) {
  let claims: jwt.JwtPayload;
  try { const v = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }); if (typeof v === "string" || v.purpose !== purpose || !v.sub) throw Error(); claims = v; } catch { throw new SecurityError(401, "Doğrulama süresi dolmuş. Şifrenizle yeniden giriş yapın."); }
  const user = await prisma.user.findUnique({ where: { id: claims.sub }, include: { dealer: true } });
  if (!user?.active || claims.role !== user.role || claims.credentialVersion !== credentialVersion(user.passwordHash) || user.role === "DEALER" && !user.dealer?.active) throw new SecurityError(401, "Hesap etkin değil veya şifresi değişmiş.");
  return user;
}
export async function completePasswordLogin(user: any, q: express.Request, r: express.Response) {
  if (user.role === "DEALER") { const dealer = user.dealerId ? await prisma.dealer.findUnique({ where: { id: user.dealerId } }) : null; if (!dealer?.active) throw new SecurityError(401, "Bayi hesabı etkin değil."); }
  if (user.role === "SUPER_ADMIN" && !user.twoFactorEnabled) { r.json({ mfaRequired: true, setupRequired: true, challengeToken: challenge(user, true) }); return; }
  if (user.twoFactorEnabled) {
    const token = cookieToken(q), trusted = token && /^[A-Za-z0-9_-]{43}$/.test(token) ? await prisma.trustedDevice.findUnique({ where: { tokenHash: hash(token) } }) : null;
    if (!trusted || trusted.userId !== user.id || trusted.revokedAt || +trusted.expiresAt <= Date.now() || trusted.credentialVersion !== credentialVersion(user.passwordHash)) { r.json({ mfaRequired: true, setupRequired: false, challengeToken: challenge(user, false) }); return; }
    const result = await issueSession(user, q, { trustedDeviceId: trusted.id });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }); r.json(result); return;
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }); r.json(await issueSession(user, q));
}
securityRouter.use("/api/security", (_q, r, n) => { r.setHeader("Cache-Control", "private, no-store"); r.setHeader("Referrer-Policy", "no-referrer"); n(); });
securityRouter.use("/api/security/mfa", new RequestLimiter(12, 10 * 60_000, 10_000, "mfa").middleware());
securityRouter.post("/api/security/mfa/login", wrap(async (q, r) => {
  const data = factorInput.extend({ challengeToken: z.string().max(2000), trustDevice: z.boolean().default(false) }).parse(q.body), user = await challengedUser(data.challengeToken, "MFA_LOGIN");
  await limitFactor(user.id);
  const result = await prisma.$transaction(async tx => {
    const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } }); if (!current.active || current.passwordHash !== user.passwordHash) throw new SecurityError(401, "Hesap değişmiş.");
    await consumeFactor(tx, current, data.code); await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await tx.auditLog.create({ data: { actorUserId: user.id, actorName: user.id, action: "MFA_LOGIN", targetType: "AuthSession" } });
    return issueSession(current, q, { mfaVerifiedAt: new Date() }, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (data.trustDevice) { const token = crypto.randomBytes(32).toString("base64url"); await prisma.trustedDevice.create({ data: { userId: user.id, tokenHash: hash(token), credentialVersion: credentialVersion(user.passwordHash), label: sessionLabel(q), expiresAt: new Date(Date.now() + 30 * 86400_000) } }); r.cookie(COOKIE, token, cookieOptions); }
  r.json(result);
}));
// A setup challenge proves a recent password check but grants no application access.
securityRouter.post("/api/security/mfa/setup", wrap(async (q, r) => {
  const data = z.object({ challengeToken: z.string().max(2000) }).parse(q.body), user = await challengedUser(data.challengeToken, "MFA_SETUP");
  if (user.twoFactorEnabled || !["SUPER_ADMIN", "DEALER"].includes(user.role)) throw new SecurityError(403, "Bu hesap için kurulum açılamaz.");
  const secret = base32(crypto.randomBytes(20)), encrypted = encryptMfa(secret), now = new Date();
  await prisma.user.updateMany({ where: { id: user.id, twoFactorEnabled: false, passwordHash: user.passwordHash }, data: { twoFactorPending: encrypted, twoFactorPendingAt: now } });
  const uri = `otpauth://totp/${encodeURIComponent("Kurumsal Sınav:" + user.email)}?secret=${secret}&issuer=${encodeURIComponent("Kurumsal Sınav")}&algorithm=SHA1&digits=6&period=30`;
  const qr = await require("qrcode").toDataURL(uri, { width: 240, margin: 2, errorCorrectionLevel: "M" });
  r.json({ secret, qr, expiresAt: new Date(+now + 5 * 60_000) });
}));
securityRouter.post("/api/security/mfa/confirm", wrap(async (q, r) => {
  const data = factorInput.extend({ challengeToken: z.string().max(2000) }).parse(q.body), user = await challengedUser(data.challengeToken, "MFA_SETUP");
  await limitFactor(user.id);
  const codes = recoveryCodes();
  const result = await prisma.$transaction(async tx => {
    const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    if (current.twoFactorEnabled || !current.twoFactorPending || !current.twoFactorPendingAt || Date.now() - +current.twoFactorPendingAt > 5 * 60_000) throw new SecurityError(409, "Kurulumu yeniden başlatın.");
    const counter = matchingCounter(decryptMfa(current.twoFactorPending), data.code);
    if (counter === null) throw new SecurityError(401, "Doğrulama kodu geçersiz.");
    const changed = await tx.user.updateMany({ where: { id: user.id, twoFactorEnabled: false, passwordHash: user.passwordHash, twoFactorPending: current.twoFactorPending }, data: { twoFactorEnabled: true, twoFactorSecret: current.twoFactorPending, twoFactorCounter: BigInt(counter), twoFactorPending: null, twoFactorPendingAt: null, recoveryHashes: codes.hashes, lastLoginAt: new Date() } });
    if (!changed.count) throw new SecurityError(409, "Kurulum eşzamanlı değişti.");
    await tx.authSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.trustedDevice.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.auditLog.create({ data: { actorUserId: user.id, actorName: user.id, action: "MFA_ENABLED", targetType: "User", targetId: user.id } });
    return issueSession(current, q, { mfaVerifiedAt: new Date() }, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  r.json({ ...result, recoveryCodes: codes.codes });
}));
securityRouter.post("/api/security/mfa/enroll", requireAuth, wrap(async (q, r) => {
  if (q.user!.actorAdminId || !["DEALER", "SUPER_ADMIN"].includes(q.user!.role)) throw new SecurityError(403, "Temsil oturumunda güvenlik ayarları değiştirilemez.");
  await limitFactor(q.user!.id);
  const data = z.object({ password: z.string().max(128) }).parse(q.body), user = await prisma.user.findUniqueOrThrow({ where: { id: q.user!.id } });
  if (!await verifyPassword(data.password, user.passwordHash) || user.twoFactorEnabled) throw new SecurityError(403, "Şifreyi ve mevcut 2FA durumunu kontrol edin.");
  r.json({ challengeToken: challenge(user, true) });
}));
securityRouter.post("/api/security/mfa/step-up", requireAuth, wrap(async (q, r) => {
  if (q.user!.actorAdminId) throw new SecurityError(403, "Temsil oturumunda kullanılamaz.");
  const data = factorInput.parse(q.body);
  await limitFactor(q.user!.id);
  await prisma.$transaction(async tx => { const user = await tx.user.findUniqueOrThrow({ where: { id: q.user!.id } }); await consumeFactor(tx, user, data.code); await tx.authSession.update({ where: { id: q.user!.sessionId }, data: { mfaVerifiedAt: new Date() } }); }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  r.json({ message: "Güncel doğrulama tamamlandı." });
}));
securityRouter.post("/api/security/mfa/reset", requireAuth, wrap(async (q, r) => {
  if (q.user!.actorAdminId) throw new SecurityError(403, "Temsil oturumunda kullanılamaz.");
  const data = factorInput.extend({ password: z.string().max(128) }).parse(q.body);
  await limitFactor(q.user!.id);
  const result = await prisma.$transaction(async tx => { const user = await tx.user.findUniqueOrThrow({ where: { id: q.user!.id } }); if (!await verifyPassword(data.password, user.passwordHash)) throw new SecurityError(401, "Şifre hatalı."); await consumeFactor(tx, user, data.code);
    await tx.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorPending: null, twoFactorCounter: -1, recoveryHashes: [] } });
    await tx.authSession.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } }); await tx.trustedDevice.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });
    await tx.auditLog.create({ data: { actorUserId: user.id, actorName: user.id, action: "MFA_RESET", targetType: "User", targetId: user.id } });
    return { user, challengeToken: user.role === "SUPER_ADMIN" ? challenge(user, true) : undefined };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  r.clearCookie(COOKIE, cookieOptions); r.json({ message: "2FA ve güvenilir cihazlar sıfırlandı. Yeniden giriş yapın.", challengeToken: result.challengeToken, setupRequired: result.user.role === "SUPER_ADMIN" });
}));
securityRouter.get("/api/security/sessions", requireAuth, wrap(async (q, r) => {
  const userId = q.user!.actorAdminId ?? q.user!.id;
  if (q.user!.actorAdminId) throw new SecurityError(403, "Temsil oturumunda güvenlik kayıtları görüntülenemez.");
  const [sessions, devices, account] = await Promise.all([prisma.authSession.findMany({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, label: true, createdAt: true, expiresAt: true, actorAdminId: true }, orderBy: { createdAt: "desc" }, take: 100 }), prisma.trustedDevice.findMany({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, label: true, createdAt: true, expiresAt: true }, take: 100 }), prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { twoFactorEnabled: true } })]);
  r.json({ sessions, devices, currentSessionId: q.user!.sessionId, twoFactorEnabled: account.twoFactorEnabled });
}));
securityRouter.delete("/api/security/sessions/:id", requireAuth, wrap(async (q, r) => {
  if (q.user!.actorAdminId) throw new SecurityError(403, "Temsil oturumunda kullanılamaz.");
  const id = String(q.params.id); await prisma.authSession.updateMany({ where: { OR: [{ id, userId: q.user!.id }, { parentSessionId: id, actorAdminId: q.user!.id }] }, data: { revokedAt: new Date() } }); r.status(204).end();
}));
securityRouter.delete("/api/security/devices/:id", requireAuth, wrap(async (q, r) => {
  if (q.user!.actorAdminId) throw new SecurityError(403, "Temsil oturumunda kullanılamaz.");
  await prisma.trustedDevice.updateMany({ where: { id: String(q.params.id), userId: q.user!.id }, data: { revokedAt: new Date() } }); r.status(204).end();
}));
securityRouter.post("/api/security/logout", requireAuth, wrap(async (q, r) => {
  await prisma.authSession.updateMany({ where: { OR: [{ id: q.user!.sessionId, userId: q.user!.id }, { parentSessionId: q.user!.sessionId, actorAdminId: q.user!.id }] }, data: { revokedAt: new Date() } });
  await prisma.auditLog.create({ data: { actorUserId: q.user!.actorAdminId ?? q.user!.id, actorName: q.user!.actorAdminId ?? q.user!.id, action: q.user!.actorAdminId ? "IMPERSONATION_END" : "LOGOUT", targetType: "AuthSession", targetId: q.user!.sessionId } }); r.json({ message: "Oturum sonlandırıldı." });
}));
