import {locationKey} from "../lib/turkey-locations";
import {evaluationPublicationWhere} from "./optical-catalog";
import {compatibleStudent} from "./result-data";
import crypto from "node:crypto";
import { Prisma, type Dealer } from "@prisma/client";
import { prisma } from "./db";
import { env } from "./config";
import type { AuthenticatedRequest } from "./auth";
import { SecurityError } from "./security-errors";
import { studentNumberKey } from "./result-identity";

type User = NonNullable<AuthenticatedRequest["user"]>;
export type DealerPermission = "canCreateSchool" | "canEditSchool" | "canEvaluate" | "canDeleteResult" | "canEditResult" | "canReevaluate" | "canExport";
export const schoolScope = (user: User): Prisma.SchoolWhereInput => user.role === "SUPER_ADMIN" ? {} : user.role === "DEALER" && user.dealerId ? { dealerId: user.dealerId } : { id: "__no_access__" };
export const turkeyDay = (date = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
export const normalizeRegion = (value: string | null | undefined) => locationKey(value);
export function regionAllowed(dealer: { restrictedRegions: boolean; regions: { publisherId: string | null; city: string | null; district: string | null }[] }, publisherId: string | null, city: string | null, district: string | null) {
  return !dealer.restrictedRegions || dealer.regions.some(rule => (!rule.publisherId || rule.publisherId === publisherId) && (!rule.city || normalizeRegion(rule.city) === normalizeRegion(city)) && (!rule.district || normalizeRegion(rule.district) === normalizeRegion(district)));
}
export async function dealerPermission(user: User, permission: DealerPermission, db: any = prisma, lock = false) {
  if (user.role === "SUPER_ADMIN") return null;
  if (user.role !== "DEALER" || !user.dealerId) throw new SecurityError(403, "Bu işlem için bayi yetkisi gerekir.");
  if (lock) await db.$queryRaw`SELECT "id" FROM "Dealer" WHERE "id" = ${user.dealerId} FOR UPDATE`;
  const [dealer, account] = await Promise.all([db.dealer.findUnique({ where: { id: user.dealerId }, include: { regions: true } }), db.user.findUnique({ where: { id: user.id }, select: { active: true, role: true, dealerId: true } })]);
  if (!dealer?.active || !account?.active || account.role !== "DEALER" || account.dealerId !== user.dealerId) throw new SecurityError(401, "Bayi hesabı artık etkin değil.");
  if (!dealer[permission]) throw new SecurityError(403, "Bu işlem yetkiniz yönetici tarafından kapatılmış.", "DEALER_PERMISSION_DISABLED");
  return dealer as Dealer & { regions: { publisherId: string | null; city: string | null; district: string | null }[] };
}
export const regionError = () => new SecurityError(403, "Bu yayınevinin sınavlarını seçilen bölgede değerlendirme yetkiniz bulunmamaktadır. Bölge yetkileriniz için sistem yöneticinizle iletişime geçin.", "REGION_DENIED");
export const quotaIdentity = (schoolId: string, student: any) => crypto.createHmac("sha256", env.JWT_SECRET).update(JSON.stringify([schoolId, student.identityHash || [String(student.branch).split("-")[0], studentNumberKey(student.studentNo ?? student.id), String(student.name).trim().toLocaleUpperCase("tr-TR")]])).digest("hex");

/** Called inside the result transaction under the dealer lock. No previews or rolled-back work consume quota. */
export async function authorizeEvaluation(db: any, user: User, schoolId: string, keyId: string, students: any[]) {
  const dealer = await dealerPermission(user, "canEvaluate", db, true);
  const school = await db.school.findFirst({ where: { id: schoolId, active: true, ...schoolScope(user) } });
  const key = await db.opticalKey.findFirst({ where: { id: keyId, publication:evaluationPublicationWhere }, include: { publication: { select: { publisherId: true } } } });
  if (!school || !key) throw new SecurityError(404, "Kurum veya sınav bulunamadı.");
  const previous = await db.opticalResult.findMany({ where: { schoolId, keyId }, select: { snapshot: true } });
  const known = previous.flatMap((r: any) => r.snapshot?.data?.students ?? []);
  const fresh = [...new Set(students.filter(s=>!known.some((old:any)=>compatibleStudent(old,s))).map(s => quotaIdentity(schoolId, s)))];
  if (dealer && fresh.length && !regionAllowed(dealer, key.publication?.publisherId ?? null, school.city, school.district)) throw regionError();
  if (dealer && !fresh.length && previous.length) await dealerPermission(user, "canReevaluate", db);
  if (dealer) {
    const day = turkeyDay();
    const usage = await db.dealerDailyUsage.upsert({ where: { dealerId_day: { dealerId: dealer.id, day } }, create: { dealerId: dealer.id, day }, update: {} });
    const existing = await db.dealerQuotaStudent.findMany({ where: { dealerId: dealer.id, day, keyId, schoolId, studentHash: { in: fresh } }, select: { studentHash: true } });
    const hashes = fresh.filter(h => !existing.some((v: any) => v.studentHash === h));
    if (hashes.length && dealer.dailyStudentLimit !== null && usage.students + hashes.length > dealer.dailyStudentLimit) throw new SecurityError(403, "Günlük öğrenci değerlendirme kotanız bu işlem için yeterli değil.", "DAILY_QUOTA_EXCEEDED");
    if (hashes.length) await db.dealerQuotaStudent.createMany({ data: hashes.map(studentHash => ({ dealerId: dealer.id, day, schoolId, keyId, studentHash })) });
    await db.dealerDailyUsage.update({ where: { id: usage.id }, data: { students: { increment: hashes.length }, evaluations: { increment: 1 } } });
  }
  return { school, publisherId: key.publication?.publisherId ?? null, newStudents: fresh.length };
}
export async function activity(db: any, user: User, action: string, context: { schoolId?: string; keyId?: string; publisherId?: string | null; city?: string | null; district?: string | null; studentCount?: number; resultId?: string; success?: boolean } = {}) {
  // Resolve missing operation metadata from authoritative records, never request fields.
  if (context.schoolId && (context.city === undefined || context.publisherId === undefined)) {
    const [school, key] = await Promise.all([
      db.school.findUnique({where:{id:context.schoolId},select:{city:true,district:true}}),
      context.keyId ? db.opticalKey.findUnique({where:{id:context.keyId},select:{publication:{select:{publisherId:true}}}}) : null,
    ]);
    context = {...context, city:context.city === undefined ? school?.city ?? null : context.city, district:context.district === undefined ? school?.district ?? null : context.district, publisherId:context.publisherId === undefined ? key?.publication?.publisherId ?? null : context.publisherId};
  }
  return db.dealerActivity.create({ data: { dealerId: user.dealerId, actorUserId: user.id, actorAdminId: user.actorAdminId ?? null, action, success: context.success ?? true, ...context } });
}
