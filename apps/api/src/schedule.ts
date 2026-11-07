import { Router } from "express";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { requireAuth, requireRole } from "./auth";

export const scheduleRouter = Router();
export const levels = [...Array.from({ length: 12 }, (_, i) => String(i + 1)), "TYT", "AYT"];
export const scheduleSchema = z.object({
  publisherId: z.string().min(1), level: z.string().refine((v) => levels.includes(v)),
  sequence: z.number().int().min(1).max(999),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v),
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
scheduleRouter.post("/api/admin/exam-schedule", requireAuth, requireRole(Role.SUPER_ADMIN), async (request, response, next) => {
  const parsed = z.object({ items: z.array(scheduleSchema).min(1).max(500) }).safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Takvim verilerini kontrol edin. Bir yüklemede 1–500 kayıt olabilir.", details: parsed.error.issues.slice(0, 10).map((i) => `${i.path.join(".")}: ${i.message}`) }); return; }
  try {
    for (const item of parsed.data.items) { try { await validateLinks(item); } catch (error) { response.status(400).json({ error: error instanceof Error ? error.message : "Yayın eşleşmesi geçersiz." }); return; } }
    const result = await prisma.$transaction(parsed.data.items.map((item) => prisma.examScheduleEntry.create({ data: { ...item, examDate: new Date(`${item.examDate}T00:00:00Z`) } })));
    response.status(201).json({ count: result.length });
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
