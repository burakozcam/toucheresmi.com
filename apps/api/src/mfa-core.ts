import crypto from "node:crypto";
import { env } from "./config";
import { SecurityError } from "./security-errors";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32(bytes: Buffer) { let bits = 0, value = 0, out = ""; for (const b of bytes) { value = (value << 8) | b; bits += 8; while (bits >= 5) { out += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; } } if (bits) out += alphabet[(value << (5 - bits)) & 31]; return out; }
export function unbase32(text: string) { let bits = 0, value = 0; const out = []; for (const c of text.replace(/=+$/, "").toUpperCase()) { const n = alphabet.indexOf(c); if (n < 0) throw Error("Invalid base32"); value = (value << 5) | n; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); }
export function totp(secret: string, counter: number, digits = 6) { const value = Buffer.alloc(8); value.writeBigUInt64BE(BigInt(counter)); const mac = crypto.createHmac("sha1", unbase32(secret)).update(value).digest(), offset = mac[mac.length - 1] & 15; return String((mac.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits)).padStart(digits, "0"); }
export function matchingCounter(secret: string, code: string, last = -1, now = Date.now()) { if (!/^\d{6}$/.test(code)) return null; const step = Math.floor(now / 30_000); for (const n of [step, step - 1, step + 1]) if (n >= 0 && n > last && crypto.timingSafeEqual(Buffer.from(code), Buffer.from(totp(secret, n)))) return n; return null; }
function mfaKey() { if (!env.MFA_ENCRYPTION_KEY) throw new SecurityError(503, "İki aşamalı doğrulama şifreleme anahtarı sunucuda yapılandırılmalıdır."); return Buffer.from(env.MFA_ENCRYPTION_KEY, "hex"); }
export function encryptMfa(secret: string) { const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv("aes-256-gcm", mfaKey(), iv); return Buffer.concat([iv, cipher.update(secret), cipher.final(), cipher.getAuthTag()]).toString("base64url"); }
export function decryptMfa(encrypted: string) { try { const bytes = Buffer.from(encrypted, "base64url"), cipher = crypto.createDecipheriv("aes-256-gcm", mfaKey(), bytes.subarray(0, 12)); cipher.setAuthTag(bytes.subarray(-16)); return Buffer.concat([cipher.update(bytes.subarray(12, -16)), cipher.final()]).toString(); } catch (e) { if (e instanceof SecurityError) throw e; throw new SecurityError(503, "İki aşamalı doğrulama anahtarı okunamadı. Sunucu anahtarını kontrol edin."); } }
export const recoveryHash = (code: string) => crypto.createHmac("sha256", mfaKey()).update("recovery:" + code.toUpperCase().replace(/[^A-Z0-9]/g, "")).digest("hex");
export function recoveryCodes() { const codes = Array.from({ length: 10 }, () => crypto.randomBytes(20).toString("hex").toUpperCase().match(/.{1,8}/g)!.join("-")); return { codes, hashes: codes.map(recoveryHash) }; }
export async function consumeFactor(db: any, user: any, code: string) {
  if (!user.twoFactorEnabled || !user.twoFactorSecret) throw new SecurityError(401, "İki aşamalı doğrulama etkin değil.");
  if (/^\d{6}$/.test(code)) {
    const counter = matchingCounter(decryptMfa(user.twoFactorSecret), code, Number(user.twoFactorCounter));
    if (counter === null) throw new SecurityError(401, "Doğrulama kodu geçersiz, kullanılmış veya süresi dolmuş.");
    const changed = await db.user.updateMany({ where: { id: user.id, twoFactorEnabled: true, twoFactorCounter: user.twoFactorCounter }, data: { twoFactorCounter: BigInt(counter) } });
    if (!changed.count) throw new SecurityError(409, "Kod eşzamanlı kullanıldı. Yeni kodu bekleyin.");
  } else {
    const hash = recoveryHash(code), hashes: string[] = user.recoveryHashes;
    if (!hashes.includes(hash)) throw new SecurityError(401, "Kurtarma kodu geçersiz veya daha önce kullanılmış.");
    const changed = await db.user.updateMany({ where: { id: user.id, twoFactorEnabled: true, recoveryHashes: { equals: hashes } }, data: { recoveryHashes: hashes.filter(h => h !== hash) } });
    if (!changed.count) throw new SecurityError(409, "Kurtarma kodları eşzamanlı değişti. Yeniden deneyin.");
  }
}
