import type { RequestHandler } from "express";

/** Small, bounded in-memory limiter. Forwarded headers are never trusted here. */
export class RequestLimiter {
  private entries = new Map<string, { count: number; resetAt: number }>();
  constructor(private limit: number, private windowMs: number, private maxEntries = 10_000) {}

  check(key: string, now = Date.now()) {
    for (const [id, entry] of this.entries) if (entry.resetAt <= now) this.entries.delete(id);
    let entry = this.entries.get(key);
    if (!entry) {
      if (this.entries.size >= this.maxEntries) return { allowed: false, retryAfter: Math.ceil(this.windowMs / 1000) };
      entry = { count: 0, resetAt: now + this.windowMs };
      this.entries.set(key, entry);
    }
    entry.count += 1;
    return { allowed: entry.count <= this.limit, retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }

  middleware(): RequestHandler {
    return (request, response, next) => {
      const result = this.check(request.ip || request.socket.remoteAddress || "unknown");
      if (result.allowed) { next(); return; }
      response.setHeader("Retry-After", result.retryAfter);
      response.status(429).json({ error: "Çok sık deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin." });
    };
  }
}
