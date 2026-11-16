import type { RequestHandler, Request } from "express";
import crypto from "node:crypto";
import { prisma } from "./db";
import { env } from "./config";
/** Memory for isolated development; production counters are atomic PostgreSQL upserts shared by Passenger workers. */
export class RequestLimiter {
  private entries = new Map<string, { count: number; resetAt: number }>();
  constructor(private limit: number, private windowMs: number, private maxEntries = 10_000, private namespace = "request") {}
  check(key: string, now = Date.now()) {
    for (const [id, entry] of this.entries) if (entry.resetAt <= now) this.entries.delete(id);
    let entry = this.entries.get(key);
    if (!entry) { if (this.entries.size >= this.maxEntries) return { allowed: false, retryAfter: Math.ceil(this.windowMs / 1000) }; entry = { count: 0, resetAt: now + this.windowMs }; this.entries.set(key, entry); }
    entry.count += 1;
    return { allowed: entry.count <= this.limit, retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  async checkShared(key: string) {
    if (env.RATE_LIMIT_STORE !== "database") return this.check(key);
    const digest = crypto.createHmac("sha256", env.JWT_SECRET).update(JSON.stringify([this.namespace, this.limit, this.windowMs, key])).digest("hex"), now = new Date(), until = new Date(+now + this.windowMs);
    const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`INSERT INTO "SecurityRateBucket" ("key", "count", "resetAt") VALUES (${digest}, 1, ${until}) ON CONFLICT ("key") DO UPDATE SET "count" = CASE WHEN "SecurityRateBucket"."resetAt" <= ${now} THEN 1 ELSE "SecurityRateBucket"."count" + 1 END, "resetAt" = CASE WHEN "SecurityRateBucket"."resetAt" <= ${now} THEN ${until} ELSE "SecurityRateBucket"."resetAt" END RETURNING "count", "resetAt"`;
    // Expired counters contain no PII, but still have bounded retention. Low-rate deterministic sampling.
    if (crypto.randomInt(100) === 0) void prisma.securityRateBucket.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 86400_000) } } }).catch(() => {});
    return { allowed: rows[0].count <= this.limit, retryAfter: Math.max(1, Math.ceil((+rows[0].resetAt - Date.now()) / 1000)) };
  }
  middleware(keyForRequest?: (request: Request) => string): RequestHandler {
    return async (request, response, next) => {
      try {
        const result = await this.checkShared((request.baseUrl || request.path || this.namespace).replace(/\?.*$/, "") + ":" + (keyForRequest ? keyForRequest(request) : request.ip || request.socket.remoteAddress || "unknown"));
        if (result.allowed) { next(); return; }
        response.setHeader("Retry-After", result.retryAfter); response.status(429).json({ error: "Çok sık deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin." });
      } catch { response.status(503).json({ error: "Güvenlik sınırı şu anda doğrulanamıyor. Lütfen tekrar deneyin." }); }
    };
  }
}
