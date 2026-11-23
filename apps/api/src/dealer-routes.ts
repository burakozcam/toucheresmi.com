import {resolveLocation,schoolLocationIdentity,findProvince} from "../lib/turkey-locations";
import express from "express";
import crypto from "node:crypto";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { requireAuth, requireRole, type AuthenticatedRequest } from "./auth";
import { issueSession, assertFreshAdmin } from "./auth-sessions";
import { dealerPermission, schoolScope, turkeyDay, activity, normalizeRegion } from "./dealer-policy";
import { SecurityError } from "./security-errors";
import { hashPassword } from "./passwords";
import { encryptShareToken } from "./share-security";
import { env } from "./config";
export const dealerRouter = express.Router();
const wrap = (fn: (q: AuthenticatedRequest, r: express.Response) => Promise<void>): express.RequestHandler => async (q, r, n) => { try { await fn(q as AuthenticatedRequest, r); } catch (e) { if (e instanceof z.ZodError) { r.status(400).json({ error: e.issues[0]?.message }); return; } n(e); } };
const admin = express.Router(); admin.use(requireAuth, requireRole(Role.SUPER_ADMIN));
const permissions = { canCreateSchool: z.boolean(), canEditSchool: z.boolean(), canEvaluate: z.boolean(), canDeleteResult: z.boolean(), canEditResult: z.boolean(), canReevaluate: z.boolean(), canExport: z.boolean() };
const region = z.object({ publisherId: z.string().min(1).max(100).nullable(), city: z.string().trim().min(1).max(100).nullable(), district: z.string().trim().min(1).max(100).nullable() }).refine(v => !v.district || !!v.city, { message: "İlçeden önce il seçin." }).refine(v=>!v.city&&!v.district||!!findProvince(v.city)&&(!v.district||!!resolveLocation(v.city,v.district)),{message:"Geçerli il ve ilçe ilişkisi seçin."}).transform(v=>({...v,city:v.city?findProvince(v.city)!.name:null,district:v.district?resolveLocation(v.city,v.district)!.district:null}));
const policy = z.object({ ...permissions, name: z.string().trim().min(2).max(180), email: z.string().email().max(254).nullable(), phone: z.string().max(40).nullable(), active: z.boolean(), restrictedRegions: z.boolean(), dailyStudentLimit: z.number().int().min(0).max(10000000).nullable(), regions: z.array(region).max(500) }).strict();
const usersSelect = { id: true, firstName: true, lastName: true, email: true, active: true, createdAt: true, lastLoginAt: true, role: true, twoFactorEnabled: true } as const;
async function summary(dealerId: string) {
  const rows = await prisma.$queryRaw<Array<{ exams: bigint; students: bigint }>>`SELECT COUNT(DISTINCT (r."schoolId",r."keyId")) AS exams, COUNT(DISTINCT (r."schoolId",r."keyId", COALESCE(s->>'identityHash', concat_ws('|',s->>'studentNo',s->>'name',split_part(s->>'branch','-',1))))) AS students FROM "OpticalResult" r JOIN "School" sc ON sc.id=r."schoolId" CROSS JOIN LATERAL jsonb_array_elements(r.snapshot->'data'->'students') s WHERE sc."dealerId"=${dealerId} AND NOT (r.snapshot ? 'deletedAt') AND NOT EXISTS (SELECT 1 FROM "OpticalResult" n WHERE n."supersedesId"=r.id)`;
  return { exams: Number(rows[0]?.exams ?? 0), students: Number(rows[0]?.students ?? 0) };
}
admin.get("/dealers", wrap(async (_q, r) => {
  const dealers = await prisma.dealer.findMany({ include: { users: { where: { role: "DEALER" }, select: usersSelect }, _count: { select: { schools: true } }, usage: { where: { day: turkeyDay() } } }, orderBy: { name: "asc" }, take: 1000 });
  r.json(dealers.map(({ usage, ...d }) => ({ ...d, dailyUsed: usage[0]?.students ?? 0, dailyEvaluations: usage[0]?.evaluations ?? 0, dailyRemaining: d.dailyStudentLimit === null ? null : Math.max(0, d.dailyStudentLimit - (usage[0]?.students ?? 0)) })));
}));
admin.get("/dealers/:id", wrap(async (q, r) => {
  const dealer = await prisma.dealer.findUnique({ where: { id: String(q.params.id) }, include: { regions: true, users: { where: { role: "DEALER" }, select: usersSelect }, _count: { select: { schools: true } }, usage: { where: { day: turkeyDay() } } } });
  if (!dealer) throw new SecurityError(404, "Bayi bulunamadı.");
  r.json({ ...dealer, totals: await summary(dealer.id), schools: await prisma.school.findMany({ where: { dealerId: dealer.id }, select: { id: true, name: true, city: true, district: true, active: true } }), dailyUsed: dealer.usage[0]?.students ?? 0, dailyEvaluations: dealer.usage[0]?.evaluations ?? 0 });
}));
admin.post("/dealers", wrap(async (q, r) => {
  await assertFreshAdmin(q.user!); const data = z.object({ name: z.string().trim().min(2).max(180) }).strict().parse(q.body);
  const dealer = await prisma.dealer.create({ data }); await activity(prisma, q.user!, "DEALER_CREATE"); r.status(201).json(dealer);
}));
admin.patch("/dealers/:id", wrap(async (q, r) => {
  await assertFreshAdmin(q.user!); const data = policy.parse(q.body), id = String(q.params.id);
  const saved = await prisma.$transaction(async tx => {
    await assertFreshAdmin(q.user!, tx); await tx.$queryRaw`SELECT "id" FROM "Dealer" WHERE "id"=${id} FOR UPDATE`;
    const existing = await tx.dealer.findUnique({ where: { id } }); if (!existing) throw new SecurityError(404, "Bayi bulunamadı.");
    const publisherIds = [...new Set(data.regions.flatMap(v => v.publisherId ? [v.publisherId] : []))];
    if (publisherIds.length !== await tx.publisher.count({ where: { id: { in: publisherIds } } })) throw new SecurityError(400, "Bölge kuralındaki yayınevi bulunamadı.");
    const { regions, ...settings } = data;
    await tx.dealerRegion.deleteMany({ where: { dealerId: id } }); if (regions.length) await tx.dealerRegion.createMany({ data: regions.map(rule => ({ ...rule, dealerId: id })) });
    const updated = await tx.dealer.update({ where: { id }, data: settings });
    await tx.auditLog.create({ data: { actorUserId: q.user!.id, actorName: q.user!.id, action: "DEALER_POLICY_CHANGED", targetType: "Dealer", targetId: id, summary: "Bayi yetkileri, durum veya bölge/kota ayarları güncellendi." } }); return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); r.json(saved);
}));
admin.post("/dealers/:id/users", wrap(async (q, r) => {
  await assertFreshAdmin(q.user!); const data = z.object({ firstName: z.string().trim().min(2).max(80), lastName: z.string().trim().min(2).max(80), email: z.string().email().max(254) }).strict().parse(q.body), dealerId = String(q.params.id);
  const token = crypto.randomBytes(32).toString("base64url"), setupTokenHash = crypto.createHash("sha256").update(token).digest("hex"), expiresAt = new Date(Date.now() + 30 * 60_000), passwordHash = await hashPassword(crypto.randomBytes(32).toString("base64url"));
  const user = await prisma.$transaction(async tx => { await assertFreshAdmin(q.user!, tx); if (!await tx.dealer.findUnique({ where: { id: dealerId } })) throw new SecurityError(404, "Bayi bulunamadı.");
    const user = await tx.user.create({ data: { ...data, email: data.email.toLowerCase(), dealerId, role: "DEALER", passwordHash, mustChangePassword: true, setupTokenHash, setupExpiresAt: expiresAt }, select: usersSelect });
    await tx.fmtShare.create({ data: { category: "MEMBERSHIP", targetId: user.id, name: `${data.firstName} ${data.lastName}`, createdById: q.user!.id, tokenHash: setupTokenHash, tokenEncrypted: encryptShareToken(token), expiresAt } }); return user;
  }); r.status(201).json({ user, setupUrl: `${env.WEB_ORIGIN}/hesap-kur#${token}`, expiresAt });
}));
admin.post("/dealers/:id/impersonate", wrap(async (q, r) => {
  const parent = await assertFreshAdmin(q.user!);
  const session = await prisma.$transaction(async tx => { await assertFreshAdmin(q.user!, tx);
    await tx.$queryRaw`SELECT "id" FROM "AuthSession" WHERE "id"=${parent.id} FOR UPDATE`;
    const target = await tx.user.findFirst({ where: { dealerId: String(q.params.id), role: "DEALER", active: true, mustChangePassword: false, dealer: { active: true } }, orderBy: { createdAt: "asc" } });
    if (!target) throw new SecurityError(404, "Etkin ve şifresi kurulmuş bayi kullanıcısı bulunamadı.");
    await tx.authSession.updateMany({where:{parentSessionId:parent.id,actorAdminId:q.user!.id,revokedAt:null},data:{revokedAt:new Date()}});
    const issued = await issueSession(target, q, { actorAdminId: q.user!.id, parentSessionId: parent.id, expiresAt: new Date(Math.min(Date.now() + 15 * 60_000, +parent.expiresAt)) }, tx);
    await activity(tx, { ...q.user!, dealerId: target.dealerId }, "IMPERSONATION_START");
    await tx.auditLog.create({ data: { actorUserId: q.user!.id, actorName: q.user!.id, action: "IMPERSONATION_START", targetType: "Dealer", targetId: target.dealerId } }); return issued;
  }); r.json({ ...session, dealerName: (await prisma.dealer.findUniqueOrThrow({ where: { id: String(q.params.id) } })).name });
}));
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
admin.get("/activities", wrap(async (q, r) => {
  const input = z.object({ dealerId: z.string().max(100).optional(), publisherId: z.string().max(100).optional(), schoolId: z.string().max(100).optional(), city: z.string().max(100).optional(), district: z.string().max(100).optional(), from: date.optional(), to: date.optional(), page: z.coerce.number().int().min(1).max(100000).default(1) }).parse(q.query);
  const { from, to, page, ...filters } = input, where: Prisma.DealerActivityWhereInput = { ...Object.fromEntries(Object.entries(filters).filter(([,v]) => !!v)), ...(from || to ? { createdAt: { ...(from ? { gte: new Date(`${from}T00:00:00+03:00`) } : {}), ...(to ? { lt: new Date(+new Date(`${to}T00:00:00+03:00`) + 86400_000) } : {}) } } : {}) };
  const start = new Date(`${turkeyDay()}T00:00:00+03:00`), week = new Date(+start - 6 * 86400_000), month = new Date(`${turkeyDay().slice(0,7)}-01T00:00:00+03:00`);
  const [items, total, ...stats] = await Promise.all([prisma.dealerActivity.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 50, take: 50 }), prisma.dealerActivity.count({ where }), ...[start, week, month, null].map(since => prisma.dealerActivity.aggregate({ where: { AND: [where, { success: true, action: "EVALUATE", ...(since ? { createdAt: { gte: since } } : {}) }] }, _count: { id: true }, _sum: { studentCount: true } }))]);
  const actorIds = [...new Set(items.flatMap(i => [i.actorUserId, ...(i.actorAdminId ? [i.actorAdminId] : [])]))], schoolIds = [...new Set(items.flatMap(i => i.schoolId ? [i.schoolId] : []))], publisherIds = [...new Set(items.flatMap(i => i.publisherId ? [i.publisherId] : []))];
  const [actors, schools, publishers] = await Promise.all([prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, firstName: true, lastName: true } }), prisma.school.findMany({ where: { id: { in: schoolIds } }, select: { id: true, name: true } }), prisma.publisher.findMany({ where: { id: { in: publisherIds } }, select: { id: true, name: true } })]);
  r.json({ items, total, page, pages: Math.max(1, Math.ceil(total/50)), stats: Object.fromEntries(["daily","weekly","monthly","total"].map((name,i)=>[name,stats[i]])), actors, schools, publishers });
}));
admin.get("/location-requests", wrap(async (_q, r) => { r.json(await prisma.schoolLocationRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 200 })); }));
admin.post("/location-requests/:id/review", wrap(async (q, r) => {
  await assertFreshAdmin(q.user!); const { approve } = z.object({ approve: z.boolean() }).strict().parse(q.body);
  await prisma.$transaction(async tx => { const item = await tx.schoolLocationRequest.findUnique({ where: { id: String(q.params.id) } }); if (!item || item.status !== "PENDING") throw new SecurityError(409, "Talep zaten incelenmiş veya bulunamadı.");
    await tx.$queryRaw`SELECT "id" FROM "School" WHERE "id"=${item.schoolId} FOR UPDATE`;
    const school = await tx.school.findUnique({ where: { id: item.schoolId } });
    if (!school || school.dealerId !== item.dealerId || normalizeRegion(school.city) !== normalizeRegion(item.previousCity) || normalizeRegion(school.district) !== normalizeRegion(item.previousDistrict)) throw new SecurityError(409, "Kurum bilgileri değişmiş. Yeni düzeltme talebi oluşturun.");
    if (approve) { if(!resolveLocation(item.city,item.district))throw new SecurityError(400,"Konum isteği güncel il/ilçe listesiyle eşleşmiyor.");const duplicateKey = schoolLocationIdentity(school.name,item.city,item.district); if((await tx.school.findMany({where:{id:{not:school.id}},select:{name:true,city:true,district:true}})).some(s=>schoolLocationIdentity(s.name,s.city,s.district)===duplicateKey))throw new SecurityError(409,"Bu konumda aynı kurum zaten var; kayıtları yönetici incelemelidir."); await tx.school.update({ where: { id: school.id }, data: { city: item.city, district: item.district, duplicateKey } }); }
    await tx.schoolLocationRequest.update({ where: { id: item.id }, data: { status: approve ? "APPROVED" : "REJECTED", reviewedById: q.user!.id, reviewedAt: new Date() } }); await activity(tx,q.user!,approve?"SCHOOL_LOCATION_APPROVED":"SCHOOL_LOCATION_REJECTED",{schoolId:school.id,city:item.city,district:item.district});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});r.json({message:"Düzeltme talebi incelendi."});
}));
dealerRouter.use("/api/admin/dealer-management", admin);
dealerRouter.get("/api/dealer-policy", requireAuth, wrap(async (q, r) => {
  if(q.user!.role!=="DEALER")throw new SecurityError(403,"Bayi hesabı gerekir.");
  const dealer=await prisma.dealer.findUnique({where:{id:q.user!.dealerId!},include:{regions:true,usage:{where:{day:turkeyDay()}}}});if(!dealer)throw new SecurityError(404,"Bayi bulunamadı.");const used=dealer.usage[0]?.students??0;
  r.json({...dealer,dailyUsed:used,dailyRemaining:dealer.dailyStudentLimit===null?null:Math.max(0,dealer.dailyStudentLimit-used),impersonation:q.user!.actorAdminId?{dealerName:dealer.name,expiresAt:(await prisma.authSession.findUniqueOrThrow({where:{id:q.user!.sessionId}})).expiresAt}:null});
}));
dealerRouter.patch("/api/schools/:id",requireAuth,wrap(async(q,r)=>{
 const data=z.object({name:z.string().trim().min(2).max(180).optional(),code:z.string().trim().max(80).nullable().optional(),city:z.string().trim().min(1).max(100).optional(),district:z.string().trim().min(1).max(100).optional()}).strict().parse(q.body);
 const outcome=await prisma.$transaction(async tx=>{await dealerPermission(q.user!,"canEditSchool",tx,true);const school=await tx.school.findFirst({where:{id:String(q.params.id),...schoolScope(q.user!)}});if(!school)throw new SecurityError(404,"Kurum bulunamadı.");
  let city=data.city??school.city,district=data.district??school.district;
  if(data.city!==undefined||data.district!==undefined){const geo=resolveLocation(city,district);if(!geo)throw new SecurityError(400,"Geçerli il ve bu ile ait ilçe seçin.");city=geo.city;district=geo.district;}
  if(normalizeRegion(city)!==normalizeRegion(school.city)||normalizeRegion(district)!==normalizeRegion(school.district)){if(!city||!district)throw new SecurityError(400,"İl ve ilçe seçin.");const request=await tx.schoolLocationRequest.create({data:{schoolId:school.id,dealerId:school.dealerId!,actorUserId:q.user!.id,city,district,previousCity:school.city,previousDistrict:school.district}});return{pending:true,id:request.id,message:"İl/ilçe düzeltmesi yönetici onayına gönderildi. Kurumun mevcut bölgesi değişmedi."};}
  const {city:_city,district:_district,...nonGeo}=data;const name=data.name??school.name;const duplicateKey=schoolLocationIdentity(name,school.city,school.district);
  if((await tx.school.findMany({where:{id:{not:school.id}},select:{name:true,city:true,district:true}})).some(s=>schoolLocationIdentity(s.name,s.city,s.district)===duplicateKey))throw new SecurityError(409,"Bu konumda aynı kurum zaten var.");
  await tx.school.update({where:{id:school.id},data:{...nonGeo,duplicateKey}});await activity(tx,q.user!,"SCHOOL_EDIT",{schoolId:school.id});return{message:"Kurum güncellendi."};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});r.status("pending"in outcome?202:200).json(outcome);
}));
