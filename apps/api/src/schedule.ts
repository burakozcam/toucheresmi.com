import { Router } from "express";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { requireAuth, requireRole, AuthenticatedRequest } from "./auth";

export const scheduleRouter = Router();
export const levels = [...Array.from({ length: 12 }, (_, i) => String(i + 1)), "TYT", "AYT"];
export const scheduleSchema = z.object({
  publisherId: z.string().min(1), level: z.string().refine((v) => levels.includes(v)),
  sequence: z.number().int().min(1).max(999),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v),
  series: z.string().trim().max(191).nullable().optional(), sourcePublisher: z.string().trim().max(191).nullable().optional(),
  scope: z.string().trim().min(1).max(6000), answerKeyId: z.string().min(1).nullable().default(null), published: z.boolean().default(true),
});
const include = { publisher: { select: { id: true, name: true } }, answerKey: { select: { id: true, examName: true, grade: true, published: true, publisher: { select: { name: true } } } } } as const;

async function validateLinks(data: z.infer<typeof scheduleSchema>) {
  const publisher = await prisma.publisher.findFirst({ where: { id: data.publisherId, active: true }, select: { id: true } });
  if (!publisher) throw new Error("Etkin yayınevi bulunamadı.");
  if (data.answerKeyId) {
    const key = await prisma.publishedAnswerKey.findFirst({ where: { id: data.answerKeyId, publisherId: data.publisherId, published: true, ...(/^\d+$/.test(data.level) ? { grade: Number(data.level) } : {}) }, select: { id: true } });
    if (!key) throw new Error("Cevap anahtarı yayınevi ve sınıfla eşleşmeli ve yayında olmalıdır.");
  }
}
function fail(error: unknown, response: any, next: any) {
  if (error instanceof Error && !(error instanceof Prisma.PrismaClientKnownRequestError) && (error.message.includes("eşleşmeli") || error.message.includes("bulunamadı") || error.message.includes("geri alınamaz"))) { response.status(400).json({ error: error.message }); return; }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") { response.status(409).json({ error: "Bu yayınevi / sınıf / deneme / tarih kaydı zaten var." }); return; }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") { response.status(404).json({ error: "Takvim kaydı bulunamadı." }); return; }
  next(error);
}
scheduleRouter.get("/api/exam-schedule", async (request, response, next) => {
  const level = typeof request.query.level === "string" ? request.query.level : "";
  const month = typeof request.query.month === "string" ? request.query.month : "";
  if (level && !levels.includes(level) || month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) { response.status(400).json({ error: "Sınıf veya ay filtresi geçersiz." }); return; }
  try {
    const start = month ? new Date(`${month}-01T00:00:00Z`) : undefined;
    const end = start ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)) : undefined;
    const items = await prisma.examScheduleEntry.findMany({ where: { published: true, ...(level ? { level } : {}), ...(start ? { examDate: { gte: start, lt: end } } : {}) }, include, orderBy: [{ examDate: "asc" }, { publisher: { name: "asc" } }], take: 5000 });
    response.json(items.map((item) => ({ ...item, answerKey: item.answerKey?.published ? item.answerKey : null })));
  } catch (error) { next(error); }
});
scheduleRouter.get("/api/exam-schedule/:id", async (request, response, next) => {
  try {
    const item = await prisma.examScheduleEntry.findFirst({ where: { id: String(request.params.id), published: true }, include });
    if (!item) { response.status(404).json({ error: "Sınav takvimi kaydı bulunamadı." }); return; }
    response.json({ ...item, answerKey: item.answerKey?.published ? item.answerKey : null });
  } catch (error) { next(error); }
});
scheduleRouter.get("/api/admin/exam-schedule", requireAuth, requireRole(Role.SUPER_ADMIN), async (_request, response, next) => {
  try { response.json(await prisma.examScheduleEntry.findMany({ include, orderBy: { examDate: "desc" }, take: 5000 })); } catch (error) { next(error); }
});
scheduleRouter.post("/api/admin/exam-schedule", requireAuth, requireRole(Role.SUPER_ADMIN), async (request: AuthenticatedRequest, response, next) => {
  const parsed = z.object({ importId: z.string().uuid().optional(), items: z.array(z.unknown()).min(1).max(2500) }).safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Bir yüklemede 1–2500 kayıt olabilir." }); return; }
  let batchId: string | undefined;
  try {
    const batch = await prisma.scheduleImport.create({ data: { ...(parsed.data.importId ? { id: parsed.data.importId } : {}), actorId: request.user!.id, total: parsed.data.items.length } }); batchId = batch.id;
    const publishers = new Set((await prisma.publisher.findMany({ where: { active: true }, select: { id: true } })).map((p) => p.id));
    const keyIds = parsed.data.items.map((v: any) => v?.answerKeyId).filter((id): id is string => typeof id === "string");
    const keys = new Map((await prisma.publishedAnswerKey.findMany({ where: { id: { in: keyIds }, published: true }, select: { id: true, publisherId: true, grade: true } })).map((k) => [k.id, k]));
    const valid: Prisma.ExamScheduleEntryCreateManyInput[] = []; const errors: { row: number; error: string }[] = [];
    parsed.data.items.forEach((raw, index) => {
      const item = scheduleSchema.safeParse(raw);
      if (!item.success) { errors.push({ row: index + 1, error: "Sınıf, tarih, deneme veya kapsam geçersiz." }); return; }
      const d = item.data, key = d.answerKeyId ? keys.get(d.answerKeyId) : null;
      if (!publishers.has(d.publisherId) || d.answerKeyId && (!key || key.publisherId !== d.publisherId || /^\d+$/.test(d.level) && key.grade !== +d.level)) { errors.push({ row: index + 1, error: "Yayınevi / cevap anahtarı eşleşmesi geçersiz." }); return; }
      valid.push({ ...d, examDate: new Date(`${d.examDate}T00:00:00Z`), importId: batch.id, importBaseline: batch.createdAt, createdAt: batch.createdAt, updatedAt: batch.createdAt });
    });
    let saved = 0;
    for (let i = 0; i < valid.length; i += 100) {
      const chunk = valid.slice(i, i + 100);
      await prisma.$transaction(async (tx) => {
        const result = await tx.examScheduleEntry.createMany({ data: chunk, skipDuplicates: true }); saved += result.count;
        await tx.scheduleImport.update({ where: { id: batch.id }, data: { saved, invalid: errors.length, duplicates: i + chunk.length - saved } });
      });
    }
    const duplicates = valid.length - saved;
    await prisma.scheduleImport.update({ where: { id: batch.id }, data: { saved, invalid: errors.length, duplicates, status: "complete" } });
    response.status(201).json({ importId: batch.id, total: parsed.data.items.length, valid: valid.length, invalid: errors.length, duplicates, count: saved, errors });
  } catch (error) { if (batchId) await prisma.scheduleImport.update({ where: { id: batchId }, data: { status: "failed" } }).catch(() => {}); fail(error, response, next); }
});
scheduleRouter.get("/api/admin/schedule-imports", requireAuth, requireRole(Role.SUPER_ADMIN), async (_request, response, next) => {
  try {
    const imports = await prisma.scheduleImport.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    const users = await prisma.user.findMany({ where: { id: { in: imports.map((i) => i.actorId) } }, select: { id: true, firstName: true, lastName: true } });
    response.json(imports.map((i) => ({ ...i, actor: users.find((u) => u.id === i.actorId) })));
  } catch (error) { next(error); }
});
scheduleRouter.post("/api/admin/schedule-imports/:id/rollback", requireAuth, requireRole(Role.SUPER_ADMIN), async (request, response, next) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.scheduleImport.findUniqueOrThrow({ where: { id: String(request.params.id) } });
      if (batch.status === "processing") throw new Error("Devam eden yükleme geri alınamaz.");
      const remaining = await tx.examScheduleEntry.count({ where: { importId: batch.id } });
      // Conditional delete is atomic: edited entries and linked answer keys are retained.
      const removed = await tx.examScheduleEntry.deleteMany({ where: { importId: batch.id, updatedAt: batch.createdAt, answerKeyId: null } });
      await tx.scheduleImport.update({ where: { id: batch.id }, data: { status: "rolled_back" } });
      return { count: removed.count, retained: remaining - removed.count };
    }); response.json(result);
  } catch (error) { fail(error, response, next); }
});
scheduleRouter.get("/api/admin/publisher-aliases", requireAuth, requireRole(Role.SUPER_ADMIN), async (_request, response, next) => {
  try { response.json(await prisma.publisherAlias.findMany({ orderBy: { updatedAt: "desc" }, take: 2500 })); } catch (error) { next(error); }
});
scheduleRouter.put("/api/admin/publisher-aliases", requireAuth, requireRole(Role.SUPER_ADMIN), async (request, response, next) => {
  const parsed = z.object({ source: z.string().trim().min(1).max(191), publisherId: z.string().min(1), series: z.string().trim().max(191).nullable().default(null) }).safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Eşleştirme geçersiz." }); return; }
  try {
    if (!await prisma.publisher.findFirst({ where: { id: parsed.data.publisherId, active: true } })) { response.status(400).json({ error: "Etkin yayınevi seçin." }); return; }
    const data = { ...parsed.data, source: parsed.data.source.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ") };
    response.json(await prisma.publisherAlias.upsert({ where: { source: data.source }, create: data, update: data }));
  } catch (error) { next(error); }
});
scheduleRouter.delete("/api/admin/publisher-aliases/:id", requireAuth, requireRole(Role.SUPER_ADMIN), async (request, response, next) => {
  try { response.json(await prisma.publisherAlias.delete({ where: { id: String(request.params.id) } })); } catch (error) { next(error); }
});
scheduleRouter.patch("/api/admin/exam-schedule-bulk", requireAuth, requireRole(Role.SUPER_ADMIN), async (request, response, next) => {
  const parsed = z.object({ ids: z.array(z.string().min(1)).min(1).max(2500), changes: scheduleSchema.partial().omit({ answerKeyId: true }) }).safeParse(request.body);
  if (!parsed.success || !Object.keys(parsed.data.changes).length) { response.status(400).json({ error: "Alanları ve seçilen kayıtları kontrol edin." }); return; }
  try {
    const entries = await prisma.examScheduleEntry.findMany({ where: { id: { in: parsed.data.ids } } });
    const updates = entries.map((entry) => ({ id: entry.id, data: { ...entry, ...parsed.data.changes, examDate: parsed.data.changes.examDate ?? entry.examDate.toISOString().slice(0, 10) } }));
    for (const { data } of updates) await validateLinks(data);
    await prisma.$transaction(updates.map(({ id, data }) => prisma.examScheduleEntry.update({ where: { id }, data: { ...parsed.data.changes, ...(parsed.data.changes.examDate ? { examDate: new Date(`${parsed.data.changes.examDate}T00:00:00Z`) } : {}) } })));
    response.json({ count: updates.length });
  } catch (error) { fail(error, response, next); }
});
scheduleRouter.patch("/api/admin/exam-schedule/:id", requireAuth, requireRole(Role.SUPER_ADMIN), async (request, response, next) => {
  const parsed = scheduleSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Takvim bilgileri geçersiz." }); return; }
  try {
    try { await validateLinks(parsed.data); } catch (error) { response.status(400).json({ error: error instanceof Error ? error.message : "Eşleşme geçersiz." }); return; }
    response.json(await prisma.examScheduleEntry.update({ where: { id: String(request.params.id) }, data: { ...parsed.data, examDate: new Date(`${parsed.data.examDate}T00:00:00Z`) }, include }));
  } catch (error) { fail(error, response, next); }
});
scheduleRouter.delete("/api/admin/exam-schedule", requireAuth, requireRole(Role.SUPER_ADMIN), async (request, response, next) => {
  const parsed = z.object({ ids: z.array(z.string().min(1)).min(1).max(5000) }).safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Silinecek kayıtları seçin." }); return; }
  try { response.json(await prisma.examScheduleEntry.deleteMany({ where: { id: { in: parsed.data.ids } } })); } catch (error) { next(error); }
});
