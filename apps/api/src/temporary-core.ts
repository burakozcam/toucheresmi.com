import crypto from 'node:crypto';
export const TEMP_SCOPES = ['FMT_DEMO', 'PDF_TOOLS', 'DEALER_EXAMS'] as const;
export const DURATION_OPTIONS = { minute: [5,10,15,30], hour: [1,2,3,5,10,12,24], day: [2,3,5,10,15,30], month: [1,3,5,6,10,12], year: [2] } as const;
export function accessExpiry(unit: keyof typeof DURATION_OPTIONS, value: number, now = new Date()) {
  if (!DURATION_OPTIONS[unit]?.some(v => v === value)) throw Error('Geçersiz süre seçimi.');
  if (unit === 'minute' || unit === 'hour' || unit === 'day') return new Date(+now + value * ({minute:60_000,hour:3600_000,day:86400_000}[unit]));
  const result = new Date(now), day = result.getUTCDate();
  result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth() + value * (unit === 'year' ? 12 : 1));
  const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, last)); return result;
}
export function newAccessSecrets() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const code = Array.from({length:12}, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
  return {code, key: crypto.randomBytes(32).toString('base64url')};
}
export const accessHash = (kind: 'code' | 'link', value: string) => crypto.createHash('sha256').update(`ks-temporary-${kind}:`).update(value).digest('hex');
export function temporaryPathAllowed(method: string, pathname: string, scopes: string[]) {
  if (method === 'GET' && pathname === '/api/account' || method === 'POST' && pathname === '/api/security/logout') return true;
  // Only explicitly issued dealer grants use the existing dealer routes. Each route
  // still enforces its own role, institution ownership and dealer permissions.
  if (scopes.includes('DEALER_EXAMS')) {
    if (pathname.startsWith('/api/optical/') || pathname === '/api/exam-analytics' || pathname.startsWith('/api/exam-analytics/')) return true;
    if (pathname === '/api/schools' && ['GET', 'POST'].includes(method)) return true;
    if (pathname === '/api/dealer-policy' && method === 'GET') return true;
  }
  return scopes.includes('FMT_DEMO') && ['GET','POST'].includes(method) && pathname === '/api/temporary/demo/fmt';
}
export function accessIsValid(grant: {revokedAt: Date | null; expiresAt: Date}, now = new Date()) { return !grant.revokedAt && +grant.expiresAt > +now; }
