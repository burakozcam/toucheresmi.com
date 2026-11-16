import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

test("şifre sıfırlanınca eski JWT reddedilir; yeni oturum kabul edilir", async () => {
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
  process.env.JWT_SECRET = "test-only-secret-key-for-auth-unit-tests-123456";
  const { prisma } = await import("../apps/api/src/db");
  const { credentialVersion, requireAuth } = await import("../apps/api/src/auth");
  const {env}=await import("../apps/api/src/config");
  let passwordHash = "old-fake-password-hash";
  const original = prisma.user.findUnique,originalSession=prisma.authSession.findUnique;
  prisma.user.findUnique = (async () => ({ id:"test-user", role: "DEALER", active: true, dealerId: "unit-dealer", dealer:{active:true}, schoolId: null, passwordHash })) as any;
  try {
    prisma.authSession.findUnique=(async()=>({id:"session",userId:"test-user",role:"DEALER",credentialVersion:credentialVersion(passwordHash),expiresAt:new Date(Date.now()+3600000),revokedAt:null}))as any;
    const token = () => jwt.sign({ jti:"session", role: "DEALER", credentialVersion: credentialVersion(passwordHash) }, env.JWT_SECRET, { subject: "test-user", expiresIn: "1h" });
    const check = async (value: string) => {
      let code = 200, allowed = false;
      const response: any = { status(value: number) { code = value; return this; }, json() { return this; } };
      await requireAuth({ header: () => `Bearer ${value}` } as any, response, (error?: unknown) => { if (error) throw error; allowed = true; });
      return { code, allowed };
    };
    const old = token(); assert.equal((await check(old)).allowed, true);
    passwordHash = "new-fake-password-hash";
    assert.deepEqual(await check(old), { code: 401, allowed: false });
    assert.equal((await check(token())).allowed, true);
  } finally { prisma.user.findUnique = original; prisma.authSession.findUnique=originalSession; await prisma.$disconnect(); }
});

test("yönetici oluşturduğu hesap şifre belirlemeden yönetim uçlarına erişemez", async () => {
  const { prisma } = await import("../apps/api/src/db");
  const { credentialVersion, requireAuth } = await import("../apps/api/src/auth");
  const {env}=await import("../apps/api/src/config");
  const hash = "temporary-password-hash";
  const original = prisma.user.findUnique,originalSession=prisma.authSession.findUnique;
  prisma.user.findUnique = (async () => ({ id:"new-user", role: "DEALER", active: true, dealerId: "unit-dealer", dealer:{active:true}, schoolId: null, passwordHash: hash, mustChangePassword: true })) as any;
  try {
    prisma.authSession.findUnique=(async()=>({id:"session",userId:"new-user",role:"DEALER",credentialVersion:credentialVersion(hash),expiresAt:new Date(Date.now()+3600000),revokedAt:null}))as any;
    const token = jwt.sign({ jti:"session", role: "DEALER", credentialVersion: credentialVersion(hash) }, env.JWT_SECRET, { subject: "new-user", expiresIn: "1h" });
    const check = async (path: string, method: string) => {
      let code = 200, allowed = false;
      const response: any = { status(value: number) { code = value; return this; }, json() { return this; } };
      await requireAuth({ originalUrl: path, method, header: () => `Bearer ${token}` } as any, response, (error?: unknown) => { if (error) throw error; allowed = true; });
      return { code, allowed };
    };
    assert.deepEqual(await check("/api/exams", "GET"), { code: 403, allowed: false });
    assert.deepEqual(await check("/api/account", "PATCH"), { code: 403, allowed: false });
    assert.equal((await check("/api/account", "GET")).allowed, true);
    assert.equal((await check("/api/account/password", "PATCH")).allowed, true);
  } finally { prisma.user.findUnique = original; prisma.authSession.findUnique=originalSession; await prisma.$disconnect(); }
});
