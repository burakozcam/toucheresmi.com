import test from "node:test";
import assert from "node:assert/strict";
import { RequestLimiter } from "../apps/api/src/rate-limit";
test("normal kullanıma izin verir, aşırı denemeyi engeller ve süre sonunda açılır", () => {
  const limiter = new RequestLimiter(2, 10_000);
  assert.equal(limiter.check("a", 1000).allowed, true);
  assert.equal(limiter.check("a", 2000).allowed, true);
  const blocked = limiter.check("a", 3000);
  assert.equal(blocked.allowed, false); assert.equal(blocked.retryAfter, 8);
  assert.equal(limiter.check("b", 3000).allowed, true);
  assert.equal(limiter.check("a", 11001).allowed, true);
});
test("bellek tablosu sınırlıdır ve eski kayıtlar temizlenir", () => {
  const limiter = new RequestLimiter(2, 1000, 1);
  assert.equal(limiter.check("a", 0).allowed, true);
  assert.equal(limiter.check("b", 1).allowed, false);
  assert.equal(limiter.check("b", 1001).allowed, true);
});
