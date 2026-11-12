import {presentPublisherNames} from "../lib/publisher-display";
import {testCenterRouter} from "./test-center";
import {humanVerificationConfig} from "./captcha-config";
import { verifyHuman } from "./human-verification";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { AnswerKeyFileCategory, ApplicationType, Prisma, PublisherRequestStatus, RegistrationStatus, Role } from "@prisma/client";
import { z } from "zod";
import { env } from "./config";
import { AuthenticatedRequest, credentialVersion, requireAuth, requireRole } from "./auth";
import { RequestLimiter } from "./rate-limit";
import { prisma } from "./db";
import { scheduleRouter } from "./schedule";
import { opticalRouter } from "./optical-routes";
import { fmtShareRouter } from "./fmt-share";
import { inspectOutcomeFile } from "./outcome-file";
import { reviewImportedQuestions } from "./answer-import-review";
import { prepareEvaluation } from "./optical-catalog";
import { publicResultsRouter } from "./public-results";
import { readerRouter } from "./reader-routes";

import { systemObserver, systemRouter } from "./system-center";
import { contentRouter, imageSchema } from "./admin-content";

import { answerPdfRouter } from "./answer-pdf-routes";
import { publisherLogoRouter } from "./publisher-logos";

export const app = express();
app.use(systemObserver);
app.use(cors({ origin: env.WEB_ORIGIN, exposedHeaders: ["Content-Disposition"] }));
app.use("/api/admin/exam-schedule", requireAuth, requireRole(Role.SUPER_ADMIN), express.json({ limit: "20mb" }));
app.use("/api/optical/templates/bulk-rows", requireAuth, requireRole(Role.SUPER_ADMIN), express.json({ limit: "8mb" }));
app.use("/api/optical/templates/bulk", requireAuth, requireRole(Role.SUPER_ADMIN), express.json({ limit: "8mb" }));
app.use(express.json({ limit: "1mb" }));
// JSON presentation alias; does not change Prisma records or storage paths.
app.use((request,response,next)=>{
 const json=response.json.bind(response);
 response.json=((value:unknown)=>json(presentPublisherNames(value,/^\/api\/(?:admin\/)?(?:publishers|publisher-logos)(?:\/|$)/.test(request.path)))) as typeof response.json;
 next();
});

const recentContactSubmissions = new Map<string, number>();
app.use("/api/auth/setup", new RequestLimiter(10, 10 * 60_000).middleware());
app.use("/api/auth/login", new RequestLimiter(20, 10 * 60_000).middleware());
const loginAccountLimiter=new RequestLimiter(20,10*60_000);
const limitLoginAccount:express.RequestHandler=(req,res,next)=>{if(req.method!=="POST"){next();return;}const email=typeof req.body?.email==="string"?req.body.email.trim().toLowerCase():"";if(!email){next();return;}const key=crypto.createHmac("sha256",env.JWT_SECRET).update(email).digest("hex"),limit=loginAccountLimiter.check(key);if(limit.allowed){next();return;}res.setHeader("Retry-After",limit.retryAfter);res.status(429).json({error:"Çok sık deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin."});};
app.use("/api/account/password", new RequestLimiter(10, 10 * 60_000).middleware());
app.use("/api/auth/register", new RequestLimiter(8, 30 * 60_000).middleware());
app.use("/api/applications", new RequestLimiter(8, 30 * 60_000).middleware());
app.use("/api/contact", new RequestLimiter(10, 10 * 60_000).middleware());

async function recordAudit(
  actorUserId: string | null,
  action: string,
  targetType: string | null = null,
  targetId: string | null = null,
  summary: string | null = null,
) {
  try {
    const actor = actorUserId
      ? await prisma.user.findUnique({ where: { id: actorUserId }, select: { firstName: true, lastName: true } })
      : null;
    await prisma.auditLog.create({
      data: {
        actorUserId,
        actorName: actor ? `${actor.firstName} ${actor.lastName}`.trim() : actorUserId ? "Silinmiş kullanıcı" : "Kimliği doğrulanmamış kullanıcı",
        action,
        targetType,
        targetId,
        summary,
      },
    });
  } catch (error) {
    console.error("Audit log kaydı oluşturulamadı");
  }
}

app.use((request: AuthenticatedRequest, response, next) => {
  const method = request.method.toUpperCase();
  const isAuditedResource = request.path.startsWith("/api/admin/")
    || request.path.startsWith("/api/optical/")
    || request.path.startsWith("/api/reader-accounts") || request.path.startsWith("/api/reader-access/")
    || ["/api/exams", "/api/schools", "/api/publisher-requests"].some((prefix) =>
      request.path === prefix || request.path.startsWith(`${prefix}/`)
    );
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method) || !isAuditedResource) {
    next();
    return;
  }
  response.on("finish", () => {
    const readerChange = request.path.startsWith("/api/reader-") || request.path.includes("/publication");
    if (response.statusCode < 200 || response.statusCode >= 300 || !(request.user?.role === Role.SUPER_ADMIN || readerChange && request.user?.role === Role.DEALER)) return;
    const route = request.route?.path;
    const routePath = typeof route === "string" ? route : request.path;
    const segments = routePath.split("/").filter(Boolean);
    const targetType = segments[1] === "admin" ? segments[2] ?? "system" : segments[1] ?? "system";
    const targetId = Object.values(request.params).find((value) => typeof value === "string") ?? null;
    void recordAudit(
      request.user.id,
      `${method} ${routePath}`,
      targetType,
      targetId,
      `İşlem tamamlandı (HTTP ${response.statusCode}).`,
    );
  });
  next();
});

function optionalAuth(request: AuthenticatedRequest, response: express.Response, next: express.NextFunction) {
  if (!request.header("authorization")) {
    next();
    return;
  }
  void requireAuth(request, response, next);
}

const getRouteParamId = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

const storageRoot = path.resolve(env.STORAGE_DIR);
fs.mkdirSync(storageRoot, { recursive: true });

const normalizePublisherName = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^\p{L}\p{N}\s]/gu, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toUpperCase();

const normalizeSchoolIdentityPart = (value: string | null | undefined) =>
  normalizePublisherName(value ?? "");

const schoolIdentityKey = (name: string, city?: string | null, district?: string | null) =>
  [name, city, district].map(normalizeSchoolIdentityPart).join("|");

const schoolSchema = z.object({
  name: z.string().trim().min(2).max(180),
  city: z.string().trim().max(100).nullable().optional(),
  district: z.string().trim().max(100).nullable().optional(),
  code: z.string().trim().max(80).nullable().optional(),
  dealerId: z.string().min(1).nullable().optional(),
});

const schoolUpdateSchema = schoolSchema.partial().extend({
  active: z.boolean().optional(),
});

const examSchema = z.object({
  schoolId: z.string().min(1),
  publisherId: z.string().min(1).nullable().optional(),
  name: z.string().trim().min(2).max(180),
  examDate: z.coerce.date(),
});

const allowedExtensions = new Set(["pdf", "xlsx", "xls", "csv", "tsv", "png", "jpg", "jpeg", "webp"]);
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "text/csv",
  "text/tab-separated-values",
  "text/plain",
  "application/octet-stream",
  "image/jpeg",
  "image/webp",
]);

function answerKeyDownloadName(file: { originalFileName: string; category: AnswerKeyFileCategory; publishedAnswerKey: { examName: string; grade: number; publisher: { name: string } } }) {
  const key = file.publishedAnswerKey;
  const name = `${key.publisher.name} ${key.grade}. Sınıf ${key.examName} ${file.category === AnswerKeyFileCategory.ANSWER_KEY ? "Cevap Anahtarı" : "Kazanımlar"}`;
  return name.replace(/[\\/:*?"<>|\x00-\x1f]/g, "-").slice(0, 180).trim() + path.extname(file.originalFileName).toLowerCase();
}

function validateFileSignature(filePath: string, extension: string) {
  const buffer = fs.readFileSync(filePath).subarray(0, 16);
  const hex = Array.from(buffer).map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();

  if (["csv","tsv"].includes(extension)) return !buffer.includes(0);
  if (extension === "pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (["xlsx", "xls"].includes(extension)) return hex.startsWith("D0CF11E0A1B11AE1") || hex.startsWith("504B0304");
  if (["png"].includes(extension)) return hex.startsWith("89504E470D0A1A0A");
  if (["jpg", "jpeg"].includes(extension)) return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (extension === "webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, storageRoot),
    filename: (_request, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
      callback(null, uniqueName);
    },
  }),
  limits: { fileSize: env.MAX_UPLOAD_SIZE },
  fileFilter: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase().replace(".", "");
    const requiredMime = file.mimetype || "";
    if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(requiredMime)) {
      callback(new Error("İzin verilen dosya türleri: PDF, Excel ve görseller (PNG, JPG, JPEG, WEBP)."));
      return;
    }
    callback(null, true);
  },
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.nativeEnum(Role),
});

const publisherRequestSchema = z.object({
  publisherName: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

const publisherDecisionSchema = z.object({
  status: z.enum([PublisherRequestStatus.APPROVED, PublisherRequestStatus.REJECTED]),
});

const answerKeyUploadBodySchema = z.object({
  confirmPublication:z.preprocess(v=>v===true||v==="true"||v==="on",z.boolean()),
  confirmImport:z.preprocess(v=>v===true||v==="true"||v==="on",z.boolean()),
  reviewedQuestions:z.string().max(1000000).optional(),
  sourceChecksum:z.string().max(64).optional(),
  evaluationFormat:z.enum(["auto","f","o","standard"]).default("auto"),
  showInEvaluation: z.preprocess(v=>v===undefined?undefined:v===true||v==="true"||v==="on"?true:v===false||v==="false"?false:v,z.boolean().optional()),
  penalty: z.preprocess(v=>v===undefined||v===""?undefined:Number(v),z.union([z.literal(0),z.literal(3),z.literal(4)]).optional()),
  publisherId: z.string().min(1),
  grade: z.coerce.number().int().min(1).max(12),
  examName: z.string().trim().min(2).max(180),
  published: z.preprocess((value) => {
    if (value === undefined) return undefined;
    if (value === true || value === "true" || value === "on") return true;
    if (value === false || value === "false") return false;
    return value;
  }, z.boolean().optional()),
  publishedAt: z.preprocess(
    (value) => typeof value === "string" && value.trim() ? value : undefined,
    z.coerce.date().optional(),
  ),
});

function toPublicPublisher(publisher: { id: string; name: string; normalizedName: string; active: boolean; createdAt: Date; updatedAt: Date }) {
  return {
    id: publisher.id,
    name: publisher.name,
    normalizedName: publisher.normalizedName,
    active: publisher.active,
    createdAt: publisher.createdAt,
    updatedAt: publisher.updatedAt,
  };
}

app.use(scheduleRouter);

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});


const humanConfig=humanVerificationConfig();
app.get("/api/auth/human-verification",(_req,res)=>{res.setHeader("Cache-Control","no-store");res.json({enabled:humanConfig.enabled,siteKey:humanConfig.enabled?humanConfig.siteKey:undefined,...(humanConfig.provider?{provider:humanConfig.provider}:{})});});
for(const [route,action] of [["login","login"],["register","register"]])app.use(`/api/auth/${route}`,async(req,res,next)=>{
 if(req.method!=="POST"){next();return;}
 if(!await verifyHuman(req.body?.humanToken,action,humanConfig)){res.status(403).json({error:"İnsan doğrulaması başarısız veya süresi doldu. Lütfen yeniden deneyin."});return;}if(action==="login"){limitLoginAccount(req,res,next);return;}next();
});

app.post("/api/auth/login", async (request, response, next) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    await recordAudit(null, "AUTH_LOGIN_FAILED", "AUTH", null, "Giriş formu geçersiz.");
    response.status(400).json({ error: "Giriş bilgileri geçersiz." });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });
    const passwordMatches = user
      ? await bcrypt.compare(parsed.data.password, user.passwordHash)
      : false;

    if (!user || !user.active || user.role !== parsed.data.role || !passwordMatches) {
      await recordAudit(null, "AUTH_LOGIN_FAILED", "AUTH", null, "Kimlik doğrulama başarısız.");
      response.status(401).json({ error: "E-posta, şifre veya kullanıcı türü hatalı." });
      return;
    }
    await recordAudit(user.id, "AUTH_LOGIN_SUCCESS", "AUTH", user.id, "Kullanıcı oturumu açıldı.");

    const token = jwt.sign(
      {
        role: user.role,
        dealerId: user.dealerId,
        schoolId: user.schoolId,
        credentialVersion: credentialVersion(user.passwordHash),
      },
      env.JWT_SECRET,
      { subject: user.id, expiresIn: "8h" },
    );

    response.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    next(error);
  }
});

const profileSelect = { avatar: true, id: true, email: true, firstName: true, lastName: true, phone: true, role: true, mustChangePassword: true } as const;
app.get("/api/account", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    response.json(await prisma.user.findUniqueOrThrow({ where: { id: request.user!.id }, select: profileSelect }));
  } catch (error) { next(error); }
});
const profileSchema = z.object({
  avatar: imageSchema,
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(30).refine((value) => !value || (/^[+\d\s().-]+$/.test(value) && value.replace(/\D/g, "").length >= 7)),
});
app.patch("/api/account", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  const parsed = profileSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Ad, soyad, e-posta ve telefon bilgilerini kontrol edin." }); return; }
  try {
    const user = await prisma.user.update({ where: { id: request.user!.id }, data: { ...parsed.data, phone: parsed.data.phone || null }, select: profileSelect });
    await recordAudit(user.id, "ACCOUNT_UPDATED", "user", user.id, "Hesap bilgileri güncellendi.");
    response.json(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") { response.status(409).json({ error: "Bu e-posta adresi başka bir hesapta kullanılıyor." }); return; }
    next(error);
  }
});

const newAccountSchema = z.object({
  firstName: z.string().trim().min(2).max(80), lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254), phone: z.string().trim().max(30).refine((v) => !v || /^[+\d\s().-]+$/.test(v) && /^(?:0?5\d{9}|905\d{9}|00[1-9]\d{7,14}|[1-9]\d{7,14})$/.test(v.replace(/\D/g, ""))).default(""),
});
app.post("/api/admin/users", requireAuth, requireRole(Role.SUPER_ADMIN), async (request: AuthenticatedRequest, response, next) => {
  const parsed = newAccountSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Kullanıcı bilgilerini kontrol edin." }); return; }
  try {
    const temporaryPassword = crypto.randomBytes(18).toString("base64url");
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const setupToken = crypto.randomBytes(32).toString("base64url");
    const setupTokenHash = crypto.createHash("sha256").update(setupToken).digest("hex");
    const setupExpiresAt = new Date(Date.now() + 30 * 60_000);
    const user = await prisma.user.create({ data: { setupTokenHash, setupExpiresAt, ...parsed.data, email: parsed.data.email.toLowerCase(), phone: parsed.data.phone || null, passwordHash, role: Role.DEALER, mustChangePassword: true }, select: profileSelect });
    response.setHeader("Cache-Control", "no-store");
    response.status(201).json({ user, setupUrl: `${env.WEB_ORIGIN}/hesap-kur#${setupToken}`, expiresAt: setupExpiresAt, message: "30 dakika geçerli tek kullanımlık şifre belirleme bağlantısı oluşturuldu." });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") { response.status(409).json({ error: "Bu e-posta adresi zaten kullanılıyor." }); return; }
    next(error);
  }
});
app.post("/api/auth/setup", async (request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  const parsed = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), password: z.string().min(12).max(128).refine((v) => Buffer.byteLength(v, "utf8") <= 72) }).safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Bağlantı veya şifre geçersiz. Şifre en az 12 karakter ve en fazla 72 bayt olmalıdır." }); return; }
  try {
    const setupTokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const result = await prisma.user.updateMany({ where: { setupTokenHash, setupExpiresAt: { gt: new Date() }, active: true, mustChangePassword: true }, data: { passwordHash, mustChangePassword: false, setupTokenHash: null, setupExpiresAt: null } });
    if (!result.count) { response.status(400).json({ error: "Bağlantının süresi dolmuş veya daha önce kullanılmış. Yöneticinizle iletişim kurun." }); return; }
    response.json({ message: "Şifreniz belirlendi. Giriş yapabilirsiniz." });
  } catch (error) { next(error); }
});
const ownPasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128).refine((value) => Buffer.byteLength(value, "utf8") <= 72),
});
app.patch("/api/account/password", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  const parsed = ownPasswordSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Yeni şifre en az 12 karakter, en fazla 72 UTF-8 bayt olmalıdır." }); return; }
  try {
    const current = await prisma.user.findUniqueOrThrow({ where: { id: request.user!.id } });
    if (!await bcrypt.compare(parsed.data.currentPassword, current.passwordHash)) { response.status(400).json({ error: "Geçerli / geçici şifre hatalı." }); return; }
    if (await bcrypt.compare(parsed.data.newPassword, current.passwordHash)) { response.status(400).json({ error: "Yeni şifre önceki şifreden farklı olmalıdır." }); return; }
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    const result = await prisma.user.updateMany({ where: { id: current.id, passwordHash: current.passwordHash, active: true }, data: { passwordHash, mustChangePassword: false, setupTokenHash: null, setupExpiresAt: null } });
    if (!result.count) { response.status(409).json({ error: "Hesap değişti. Yeniden giriş yapın." }); return; }
    const token = jwt.sign({ role: current.role, dealerId: current.dealerId, schoolId: current.schoolId, credentialVersion: credentialVersion(passwordHash) }, env.JWT_SECRET, { subject: current.id, expiresIn: "8h" });
    await recordAudit(current.id, "PASSWORD_CHANGED", "user", current.id, "Kullanıcı kendi şifresini belirledi.");
    response.json({ token, user: { id: current.id, email: current.email, firstName: current.firstName, lastName: current.lastName, phone: current.phone, role: current.role, mustChangePassword: false } });
  } catch (error) { next(error); }
});

const registrationSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128).refine((password) => Buffer.byteLength(password, "utf8") <= 72),
});

app.post("/api/auth/register", async (request, response, next) => {
  const parsed = registrationSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Kayıt bilgilerini kontrol edin. Şifre en az 12 karakter ve en fazla 72 bayt olmalıdır." });
    return;
  }

  try {
    const email = parsed.data.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      response.status(409).json({ error: "Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var." });
      return;
    }

    const { password, ...registrationData } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 12);
    const registration = await prisma.registrationRequest.create({
      data: {
        ...registrationData,
        email,
        passwordHash,
      },
      select: { id: true, status: true, createdAt: true },
    });
    response.status(201).json({
      ...registration,
      message: "Üyelik talebiniz alındı. Yönetici onayından sonra giriş yapabilirsiniz.",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      response.status(409).json({ error: "Bu e-posta adresi için bekleyen bir üyelik talebi zaten var." });
      return;
    }
    next(error);
  }
});

const applicationSchema = z.object({
  type: z.nativeEnum(ApplicationType),
  organization: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(30),
  message: z.string().trim().max(2000).optional(),
});

app.post("/api/applications", async (request, response, next) => {
  const parsed = applicationSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Başvuru bilgilerini kontrol edip tekrar deneyin." });
    return;
  }

  try {
    const application = await prisma.application.create({
      data: {
        ...parsed.data,
        email: parsed.data.email.toLowerCase(),
      },
      select: { id: true, status: true, createdAt: true },
    });
    response.status(201).json(application);
  } catch (error) {
    next(error);
  }
});

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  message: z.string().trim().min(5).max(2000),
}).superRefine((value, context) => {
  if (!(value.name || (value.firstName && value.lastName))) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["firstName"], message: "Ad ve soyad bilgilerini girin." });
  }
  if (value.phone) {
    const digitCount = value.phone.replace(/\D/g, "").length;
    if (!/^[+\d\s().-]+$/.test(value.phone) || digitCount < 7 || digitCount > 15) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "Telefon numarasını kontrol edin." });
    }
  }
});

app.post("/api/contact", optionalAuth, async (request: AuthenticatedRequest, response, next) => {
  const parsed = contactSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "İletişim formundaki bilgileri kontrol edin." });
    return;
  }

  const now = Date.now();
  for (const [key, expiresAt] of recentContactSubmissions) {
    if (expiresAt <= now) recentContactSubmissions.delete(key);
  }
  const submissionKey = crypto.createHash("sha256")
    .update(`${request.ip || request.socket.remoteAddress || "unknown"}:${parsed.data.email.toLowerCase()}`)
    .digest("hex");
  if ((recentContactSubmissions.get(submissionKey) ?? 0) > now) {
    response.status(429).json({ error: "Mesajınız az önce alındı. Yeni mesaj göndermeden önce lütfen bir dakika bekleyin." });
    return;
  }
  recentContactSubmissions.set(submissionKey, now + 60_000);

  const nameParts = (parsed.data.name ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = parsed.data.firstName?.trim() || nameParts.slice(0, -1).join(" ") || nameParts[0] || "";
  const lastName = parsed.data.lastName?.trim() || (nameParts.length > 1 ? nameParts.slice(-1)[0] : "");

  try {
    const message = await prisma.contactMessage.create({
      data: {
        firstName,
        lastName,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone?.trim() || null,
        message: parsed.data.message,
        userId: request.user?.id ?? null,
      },
      select: { id: true },
    });
    let warning: string | undefined;
    if (env.SMTP_HOST) {
      try {
        const transport = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465,
          ...(env.SMTP_USER && env.SMTP_PASSWORD ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } } : {}),
        });
        await transport.sendMail({
          from: env.SMTP_FROM ?? env.SMTP_USER ?? env.CONTACT_EMAIL,
          to: env.CONTACT_EMAIL,
          replyTo: parsed.data.email,
          subject: "Kurumsal Sınav web sitesi iletişim formu",
          text: [
            `Ad Soyad: ${firstName} ${lastName}`.trim(),
            `E-posta: ${parsed.data.email}`,
            `Telefon: ${parsed.data.phone || "-"}`,
            "",
            "Mesaj:",
            parsed.data.message,
          ].join("\n"),
        });
      } catch (error) {
        console.error("İletişim mesajı e-posta bildirimi gönderilemedi");
        warning = "Mesajınız kaydedildi; e-posta bildirimi gönderilemedi.";
      }
    } else {
      warning = "Mesajınız yönetici gelen kutusuna kaydedildi; e-posta bildirimi yapılandırılmamış.";
    }
    response.status(201).json({ id: message.id, message: "Mesajınız yönetici destek gelen kutusuna kaydedildi.", ...(warning ? { warning } : {}) });
  } catch (error) {
    recentContactSubmissions.delete(submissionKey);
    next(error);
  }
});

app.get(
  "/api/admin/contact-messages",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (request, response, next) => {
    const page = Math.max(1, Number(request.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(request.query.pageSize) || 25));
    const unreadOnly = request.query.unreadOnly === "true";
    try {
      const where = unreadOnly ? { readAt: null } : {};
      const [items, total, unreadCount] = await Promise.all([
        prisma.contactMessage.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
        }),
        prisma.contactMessage.count({ where }),
        prisma.contactMessage.count({ where: { readAt: null } }),
      ]);
      response.json({ items, total, unreadCount, page, pageSize });
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/admin/contact-messages/:id",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (request, response, next) => {
    const messageId = getRouteParamId(request.params.id);
    const parsed = z.object({ read: z.boolean() }).safeParse(request.body);
    if (!messageId || !parsed.success) {
      response.status(400).json({ error: "Mesaj durumu geçersiz." });
      return;
    }
    try {
      const updated = await prisma.contactMessage.update({
        where: { id: messageId },
        data: { readAt: parsed.data.read ? new Date() : null },
        select: { id: true, readAt: true },
      });
      response.json(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        response.status(404).json({ error: "Mesaj bulunamadı." });
        return;
      }
      next(error);
    }
  },
);

app.get(
  "/api/admin/audit-log-users",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (_request: AuthenticatedRequest, response, next) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      response.json(users);
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/admin/audit-logs",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (request, response, next) => {
    const page = Math.max(1, Number(request.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(request.query.pageSize) || 25));
    const userId = typeof request.query.userId === "string" ? request.query.userId : undefined;
    const from = typeof request.query.from === "string" ? new Date(`${request.query.from}T00:00:00.000Z`) : undefined;
    const to = typeof request.query.to === "string" ? new Date(`${request.query.to}T23:59:59.999Z`) : undefined;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      response.status(400).json({ error: "Tarih aralığını kontrol edin." });
      return;
    }
    const where: Prisma.AuditLogWhereInput = {
      ...(userId ? { actorUserId: userId } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    };
    try {
      const [items, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: { id: true, actorUserId: true, actorName: true, action: true, targetType: true, targetId: true, summary: true, createdAt: true },
        }),
        prisma.auditLog.count({ where }),
      ]);
      response.json({ items, total, page, pageSize });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/admin/applications",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (_request: AuthenticatedRequest, response, next) => {
    try {
      const applications = await prisma.application.findMany({
        orderBy: { createdAt: "desc" },
      });
      response.json(applications);
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/admin/registration-requests",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (_request: AuthenticatedRequest, response, next) => {
    try {
      const registrations = await prisma.registrationRequest.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
      response.json(registrations);
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/admin/users",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (_request: AuthenticatedRequest, response, next) => {
    try {
      const users = await prisma.user.findMany({
        where: { role: { not: Role.SUPER_ADMIN } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          active: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
      response.json(users);
    } catch (error) {
      next(error);
    }
  },
);

const userStatusSchema = z.object({ active: z.boolean() });

app.patch(
  "/api/admin/users/:id/status",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (request, response, next) => {
    const parsed = userStatusSchema.safeParse(request.body);
    const userId = getRouteParamId(request.params.id);
    if (!parsed.success || !userId) {
      response.status(400).json({ error: "Kullanıcı durumu geçersiz." });
      return;
    }

    try {
      const result = await prisma.user.updateMany({
        where: { id: userId, role: { not: Role.SUPER_ADMIN } },
        data: { active: parsed.data.active },
      });
      if (result.count === 0) {
        response.status(404).json({ error: "Kullanıcı bulunamadı." });
        return;
      }
      response.json({ id: userId, active: parsed.data.active });
    } catch (error) {
      next(error);
    }
  },
);

app.delete(
  "/api/admin/users/:id",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (request, response, next) => {
    const userId = getRouteParamId(request.params.id);
    if (!userId) {
      response.status(400).json({ error: "Kullanıcı kimliği geçersiz." });
      return;
    }
    try {
      const user = await prisma.user.findFirst({
        where: { id: userId, role: { not: Role.SUPER_ADMIN } },
        select: { id: true, email: true },
      });
      if (!user) {
        response.status(404).json({ error: "Kullanıcı bulunamadı." });
        return;
      }
      await prisma.$transaction(async (transaction) => {
        await transaction.registrationRequest.deleteMany({
          where: { email: user.email, status: RegistrationStatus.APPROVED },
        });
        await transaction.user.delete({ where: { id: user.id } });
      });
      response.status(204).end();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        response.status(409).json({ error: "Kullanıcı ilişkili kayıtlara sahip olduğu için silinemiyor. Erişimini kapatarak hesabı pasifleştirebilirsiniz." });
        return;
      }
      next(error);
    }
  },
);

const passwordResetSchema = z.object({
  password: z.string().min(12).max(128)
    .refine((password) => Buffer.byteLength(password, "utf8") <= 72),
});

app.patch(
  "/api/admin/users/:id/password",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (request, response, next) => {
    const parsed = passwordResetSchema.safeParse(request.body);
    const userId = getRouteParamId(request.params.id);
    if (!parsed.success || !userId) {
      response.status(400).json({ error: "Yeni şifre en az 12 karakter ve en fazla 72 bayt olmalıdır." });
      return;
    }
    try {
      const passwordHash = await bcrypt.hash(parsed.data.password, 12);
      const result = await prisma.user.updateMany({
        where: { id: userId, role: { not: Role.SUPER_ADMIN } },
        data: { passwordHash, setupTokenHash: null, setupExpiresAt: null },
      });
      if (result.count === 0) {
        response.status(404).json({ error: "Kullanıcı bulunamadı." });
        return;
      }
      response.json({ id: userId, message: "Kullanıcı şifresi güncellendi." });
    } catch (error) {
      next(error);
    }
  },
);

const registrationDecisionSchema = z.object({
  status: z.enum([RegistrationStatus.APPROVED, RegistrationStatus.REJECTED]),
});

app.patch(
  "/api/admin/registration-requests/:id",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (request: AuthenticatedRequest, response, next) => {
    const parsed = registrationDecisionSchema.safeParse(request.body);
    const registrationId = getRouteParamId(request.params.id);
    if (!parsed.success || !registrationId) {
      response.status(400).json({ error: "Onay veya ret kararı seçin." });
      return;
    }
    try {
      const result = await prisma.$transaction(async (transaction) => {
        const registration = await transaction.registrationRequest.findUnique({
          where: { id: registrationId },
        });
        if (!registration) return { kind: "not-found" as const };
        if (registration.status !== RegistrationStatus.PENDING) {
          return { kind: "already-reviewed" as const, status: registration.status };
        }
        if (parsed.data.status === RegistrationStatus.APPROVED) {
          if (!registration.passwordHash) return { kind: "missing-password" as const };
          await transaction.user.create({
            data: {
              email: registration.email,
              passwordHash: registration.passwordHash,
              firstName: registration.firstName,
              lastName: registration.lastName,
              phone: registration.phone,
              role: Role.DEALER,
              active: true,
            },
            select: { id: true },
          });
        }
        const updated = await transaction.registrationRequest.update({
          where: { id: registration.id },
          data: { status: parsed.data.status, passwordHash: null },
          select: { id: true, status: true, updatedAt: true },
        });
        return { kind: "updated" as const, registration: updated };
      });
      if (result.kind === "not-found") {
        response.status(404).json({ error: "Üyelik talebi bulunamadı." });
        return;
      }
      if (result.kind === "already-reviewed") {
        response.status(409).json({ error: `Bu talep daha önce ${result.status === RegistrationStatus.APPROVED ? "onaylanmış" : "reddedilmiş"}.` });
        return;
      }
      if (result.kind === "missing-password") {
        response.status(409).json({ error: "Üyelik talebinde kullanılabilir bir şifre özeti bulunamadı." });
        return;
      }
      response.json(result.registration);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        response.status(409).json({ error: "Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor." });
        return;
      }
      next(error);
    }
  },
);

app.get("/api/publishers", async (_request, response, next) => {
  try {
    const publishers = await prisma.publisher.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, normalizedName: true, active: true, createdAt: true, updatedAt: true },
    });
    response.json([...publishers].sort((left, right) => left.name.localeCompare(right.name, "tr-TR")));
  } catch (error) {
    next(error);
  }
});

app.get("/api/publishers/search", async (request, response, next) => {
  try {
    const search = String(request.query.q ?? "").trim();
    const publishers = await prisma.publisher.findMany({
      where: search ? {
        active: true,
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { normalizedName: { contains: normalizePublisherName(search), mode: "insensitive" } },
        ],
      } : { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, normalizedName: true, active: true, createdAt: true, updatedAt: true },
    });
    response.json([...publishers].sort((left, right) => left.name.localeCompare(right.name, "tr-TR")));
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/publisher-requests",
  requireAuth,
  async (request: AuthenticatedRequest, response, next) => {
    const parsed = publisherRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Yayınevi adı en az 2 karakter olmalıdır." });
      return;
    }

    const normalizedName = normalizePublisherName(parsed.data.publisherName);
    if (!normalizedName) {
      response.status(400).json({ error: "Yayınevi adı geçerli olmalıdır." });
      return;
    }

    try {
      const existingPublisher = await prisma.publisher.findUnique({ where: { normalizedName } });
      if (existingPublisher) {
        response.status(409).json({ error: "Bu yayınevi sistemde zaten kayıtlı." });
        return;
      }

      const existingRequest = await prisma.publisherRequest.findFirst({
        where: { normalizedName, status: PublisherRequestStatus.PENDING },
      });
      if (existingRequest) {
        response.status(409).json({ error: "Bu yayınevi için bekleyen bir talep zaten mevcut." });
        return;
      }

      const requestRecord = await prisma.publisherRequest.create({
        data: {
          publisherName: parsed.data.publisherName.trim(),
          normalizedName,
          description: parsed.data.description?.trim() || null,
          requestedByUserId: request.user!.id,
          status: PublisherRequestStatus.PENDING,
        },
        select: { id: true, status: true, createdAt: true, publisherName: true },
      });

      response.status(201).json({
        ...requestRecord,
        message: "Yayınevi ekleme talebiniz yönetici onayına gönderildi.",
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/publisher-requests",
  requireAuth,
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const requests = await prisma.publisherRequest.findMany({
        where: { requestedByUserId: request.user!.id },
        orderBy: { createdAt: "desc" },
        include: {
          requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          reviewedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      response.json(requests);
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/admin/publisher-requests",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (_request: AuthenticatedRequest, response, next) => {
    try {
      const requests = await prisma.publisherRequest.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          reviewedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      response.json(requests);
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/admin/publisher-requests/:id",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (request: AuthenticatedRequest, response, next) => {
    const parsed = publisherDecisionSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Onay veya reddetme kararı seçin." });
      return;
    }

    try {
      const requestId = getRouteParamId(request.params.id);
      const result = await prisma.$transaction(async (transaction) => {
        const currentRequest = await transaction.publisherRequest.findUnique({
          where: { id: requestId },
        });
        if (!currentRequest) {
          return { kind: "not-found" as const };
        }
        if (currentRequest.status !== PublisherRequestStatus.PENDING) {
          return { kind: "already-reviewed" as const, status: currentRequest.status };
        }

        const normalizedName = currentRequest.normalizedName;
        const publisherName = currentRequest.publisherName;

        if (parsed.data.status === PublisherRequestStatus.APPROVED) {
          const existingPublisher = await transaction.publisher.findUnique({ where: { normalizedName } });
          if (existingPublisher) {
            return { kind: "duplicate-publisher" as const };
          }

          const publisher = await transaction.publisher.create({
            data: {
              name: publisherName,
              normalizedName,
              active: true,
            },
          });
          await transaction.publisherRequest.update({
            where: { id: currentRequest.id },
            data: {
              publisherId: publisher.id,
              status: PublisherRequestStatus.APPROVED,
              reviewedByUserId: request.user!.id,
              reviewedAt: new Date(),
            },
          });
          return { kind: "approved" as const, publisher };
        }

        await transaction.publisherRequest.update({
          where: { id: currentRequest.id },
          data: {
            status: PublisherRequestStatus.REJECTED,
            reviewedByUserId: request.user!.id,
            reviewedAt: new Date(),
          },
        });
        return { kind: "rejected" as const };
      });

      if (result.kind === "not-found") {
        response.status(404).json({ error: "Yayınevi talebi bulunamadı." });
        return;
      }
      if (result.kind === "already-reviewed") {
        response.status(409).json({ error: `Bu talep daha önce ${result.status === PublisherRequestStatus.APPROVED ? "onaylanmış" : "reddedilmiş"}.` });
        return;
      }
      if (result.kind === "duplicate-publisher") {
        response.status(409).json({ error: "Bu yayınevi aynı isimle mevcut olduğu için onaylanamaz." });
        return;
      }

      response.json({ status: parsed.data.status, message: parsed.data.status === PublisherRequestStatus.APPROVED ? "Yayınevi onaylandı." : "Yayınevi talebi reddedildi." });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/admin/publishers",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (request: AuthenticatedRequest, response, next) => {
    const parsed = publisherRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Yayınevi adı geçerli değil." });
      return;
    }

    const normalizedName = normalizePublisherName(parsed.data.publisherName);
    try {
      const existingPublisher = await prisma.publisher.findUnique({ where: { normalizedName } });
      if (existingPublisher) {
        response.status(409).json({ error: "Bu yayınevi zaten mevcut." });
        return;
      }

      const publisher = await prisma.publisher.create({
        data: {
          name: parsed.data.publisherName.trim(),
          normalizedName,
          active: true,
        },
      });

      response.status(201).json(toPublicPublisher(publisher));
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/admin/publishers",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (_request: AuthenticatedRequest, response, next) => {
    try {
      const publishers = await prisma.publisher.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, normalizedName: true, active: true, createdAt: true, updatedAt: true },
      });
      response.json([...publishers].sort((left, right) => left.name.localeCompare(right.name, "tr-TR")));
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/admin/publishers/:id",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (request, response, next) => {
    const publisherId = getRouteParamId(request.params.id);
    const parsed = z.object({
      name: z.string().trim().min(2).max(180).optional(),
      active: z.boolean().optional(),
    }).refine((value) => value.name !== undefined || value.active !== undefined).safeParse(request.body);
    if (!publisherId || !parsed.success) {
      response.status(400).json({ error: "Yayınevi bilgileri geçersiz." });
      return;
    }

    try {
      const currentPublisher = await prisma.publisher.findUnique({ where: { id: publisherId } });
      if (!currentPublisher) {
        response.status(404).json({ error: "Yayınevi bulunamadı." });
        return;
      }

      const normalizedName = parsed.data.name
        ? normalizePublisherName(parsed.data.name)
        : currentPublisher.normalizedName;
      if (normalizedName !== currentPublisher.normalizedName) {
        const duplicate = await prisma.publisher.findUnique({ where: { normalizedName } });
        if (duplicate) {
          response.status(409).json({ error: "Bu isimde başka bir yayınevi zaten kayıtlı." });
          return;
        }
      }

      const updated = await prisma.publisher.update({
        where: { id: publisherId },
        data: {
          ...(parsed.data.name ? { name: parsed.data.name.trim(), normalizedName } : {}),
          ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
        },
        select: { id: true, name: true, normalizedName: true, active: true, createdAt: true, updatedAt: true },
      });
      response.json(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        response.status(409).json({ error: "Bu yayınevi adı başka bir kayıt tarafından kullanılıyor." });
        return;
      }
      next(error);
    }
  },
);

app.delete(
  "/api/admin/publishers/:id",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (request: AuthenticatedRequest, response, next) => {
    const publisherId = getRouteParamId(request.params.id);
    if (!publisherId) {
      response.status(400).json({ error: "Yayınevi kimliği geçersiz." });
      return;
    }
    try {
      const publisher = await prisma.publisher.findUnique({
        where: { id: publisherId },
        include: { _count: { select: { exams: true, answerKeys: true, publisherRequests: true, scheduleEntries: true } } },
      });
      if (!publisher) {
        response.status(404).json({ error: "Yayınevi bulunamadı." });
        return;
      }
      const linkedRecords = [
        publisher._count.exams ? `${publisher._count.exams} sınav` : "",
        publisher._count.answerKeys ? `${publisher._count.answerKeys} yayımlanmış cevap anahtarı` : "",
        publisher._count.publisherRequests ? `${publisher._count.publisherRequests} yayınevi talebi` : "",
        publisher._count.scheduleEntries ? `${publisher._count.scheduleEntries} takvim kaydı` : "",
      ].filter(Boolean);
      if (linkedRecords.length) {
        response.status(409).json({
          error: `Yayınevi silinemiyor; ilişkili kayıtlar bulundu: ${linkedRecords.join(", ")}. Verileri korumak için yayınevini pasife alabilirsiniz.`,
        });
        return;
      }
      await prisma.publisher.delete({ where: { id: publisherId } });
      response.status(204).end();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        response.status(409).json({ error: "İlişkili kayıtlar nedeniyle yayınevi silinemedi. Önce ilişkili kayıtları inceleyin veya yayınevini pasife alın." });
        return;
      }
      next(error);
    }
  },
);

app.get(
  "/api/admin/dealers",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (_request: AuthenticatedRequest, response, next) => {
    try {
      const dealers = await prisma.dealer.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
      response.json(dealers);
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/schools",
  requireAuth,
  async (request: AuthenticatedRequest, response, next) => {
    if (request.user!.role !== Role.SUPER_ADMIN && request.user!.role !== Role.DEALER) {
      response.status(403).json({ error: "Kurum listesini görüntüleme yetkiniz yok." });
      return;
    }
    try {
      const activeFilter = request.query.active === "true"
        ? { active: true }
        : request.query.active === "false"
          ? { active: false }
          : {};
      const ownership = request.user!.role === Role.SUPER_ADMIN
        ? {}
        : {
          OR: [
            { createdByUserId: request.user!.id },
            ...(request.user!.dealerId ? [{ dealerId: request.user!.dealerId }] : []),
          ],
        };
      const schools = await prisma.school.findMany({
        where: { ...activeFilter, ...ownership },
        select: request.query.compact==="true" ? {id:true,name:true,city:true,district:true} : {
          id: true,
          name: true,
          code: true,
          city: true,
          district: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          dealer: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: [{ name: "asc" }, { city: "asc" }, { district: "asc" }],
      });
      response.json(schools);
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/schools",
  requireAuth,
  async (request: AuthenticatedRequest, response, next) => {
    if (request.user!.role !== Role.SUPER_ADMIN && request.user!.role !== Role.DEALER) {
      response.status(403).json({ error: "Kurum ekleme yetkiniz yok." });
      return;
    }
    const parsed = schoolSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Kurum adı geçerli olmalı; il ve ilçe bilgilerini kontrol edin." });
      return;
    }

    const identity = schoolIdentityKey(parsed.data.name, parsed.data.city, parsed.data.district);
    try {
      const schools = await prisma.school.findMany({
        select: { id: true, name: true, city: true, district: true },
      });
      const duplicate = schools.find((school) =>
        schoolIdentityKey(school.name, school.city, school.district) === identity
      );
      if (duplicate) {
        await prisma.schoolDuplicateAttempt.create({
          data: {
            submittedByUserId: request.user!.id,
            matchedSchoolId: duplicate.id,
            submittedName: parsed.data.name,
            submittedCity: parsed.data.city?.trim() || null,
            submittedDistrict: parsed.data.district?.trim() || null,
          },
        });
        response.status(409).json({
          error: "Bu kurum aynı il ve ilçede zaten kayıtlı. Farklı bir il veya ilçedeki aynı adlı kurum eklenebilir.",
        });
        return;
      }

      const dealerId = request.user!.role === Role.SUPER_ADMIN
        ? parsed.data.dealerId ?? null
        : request.user!.dealerId;
      if (dealerId) {
        const dealer = await prisma.dealer.findUnique({ where: { id: dealerId }, select: { id: true } });
        if (!dealer) {
          response.status(400).json({ error: "Seçilen bayi bulunamadı." });
          return;
        }
      }
      const school = await prisma.school.create({
        data: {
          name: parsed.data.name,
          city: parsed.data.city?.trim() || null,
          district: parsed.data.district?.trim() || null,
          code: parsed.data.code?.trim() || null,
          dealerId,
          createdByUserId: request.user!.id,
          duplicateKey: identity,
        },
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          district: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          dealer: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });
      response.status(201).json(school);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        response.status(409).json({ error: "Bu kurum bilgileri veya kurum kodu başka bir kayıt tarafından kullanılıyor." });
        return;
      }
      next(error);
    }
  },
);

app.get(
  "/api/admin/school-duplicate-attempts",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (request, response, next) => {
    try {
      const reviewed = request.query.reviewed === "true"
        ? { reviewedAt: { not: null } }
        : request.query.reviewed === "false"
          ? { reviewedAt: null }
          : {};
      const attempts = await prisma.schoolDuplicateAttempt.findMany({
        where: reviewed,
        include: {
          submittedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          matchedSchool: { select: { id: true, name: true, city: true, district: true } },
          reviewedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      response.json(attempts);
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/admin/school-duplicate-attempts/:id",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (request: AuthenticatedRequest, response, next) => {
    const attemptId = getRouteParamId(request.params.id);
    const parsed = z.object({ reviewNote: z.string().trim().max(500).optional() }).safeParse(request.body);
    if (!attemptId || !parsed.success) {
      response.status(400).json({ error: "İnceleme bilgileri geçersiz." });
      return;
    }
    try {
      const updated = await prisma.schoolDuplicateAttempt.update({
        where: { id: attemptId },
        data: {
          reviewedAt: new Date(),
          reviewedByUserId: request.user!.id,
          ...(parsed.data.reviewNote !== undefined ? { reviewNote: parsed.data.reviewNote || null } : {}),
        },
        select: { id: true, reviewedAt: true, reviewNote: true },
      });
      response.json(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        response.status(404).json({ error: "Mükerrer kurum inceleme kaydı bulunamadı." });
        return;
      }
      next(error);
    }
  },
);

app.patch(
  "/api/admin/schools/:id",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (request, response, next) => {
    const schoolId = getRouteParamId(request.params.id);
    const parsed = schoolUpdateSchema.safeParse(request.body);
    if (!schoolId || !parsed.success) {
      response.status(400).json({ error: "Kurum bilgileri geçersiz." });
      return;
    }
    try {
      const current = await prisma.school.findUnique({ where: { id: schoolId } });
      if (!current) {
        response.status(404).json({ error: "Kurum bulunamadı." });
        return;
      }
      const name = parsed.data.name ?? current.name;
      const city = parsed.data.city === undefined ? current.city : parsed.data.city;
      const district = parsed.data.district === undefined ? current.district : parsed.data.district;
      const identity = schoolIdentityKey(name, city, district);
      const identityChanged = identity !== schoolIdentityKey(current.name, current.city, current.district);
      if (identityChanged) {
        const schools = await prisma.school.findMany({
          where: { id: { not: schoolId } },
          select: { name: true, city: true, district: true },
        });
        if (schools.some((school) => schoolIdentityKey(school.name, school.city, school.district) === identity)) {
          response.status(409).json({ error: "Aynı il ve ilçede bu isimde başka bir kurum var." });
          return;
        }
      }

      const updated = await prisma.school.update({
        where: { id: schoolId },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.city !== undefined ? { city: parsed.data.city?.trim() || null } : {}),
          ...(parsed.data.district !== undefined ? { district: parsed.data.district?.trim() || null } : {}),
          ...(parsed.data.code !== undefined ? { code: parsed.data.code?.trim() || null } : {}),
          ...(parsed.data.dealerId !== undefined ? { dealerId: parsed.data.dealerId } : {}),
          ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
          ...(identityChanged ? { duplicateKey: identity } : {}),
        },
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          district: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          dealer: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });
      response.json(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        response.status(409).json({ error: "Kurum kodu veya kurum bilgileri başka bir kayıt tarafından kullanılıyor." });
        return;
      }
      next(error);
    }
  },
);

app.get(
  "/api/exams",
  requireAuth,
  async (request: AuthenticatedRequest, response, next) => {
    if (![Role.SUPER_ADMIN, Role.DEALER, Role.SCHOOL_ADMIN].some((role) => role === request.user!.role)) {
      response.status(403).json({ error: "Sınav listesini görüntüleme yetkiniz yok." });
      return;
    }
    try {
      const where: Prisma.ExamWhereInput = request.user!.role === Role.SUPER_ADMIN
        ? {}
        : request.user!.role === Role.SCHOOL_ADMIN
          ? { schoolId: request.user!.schoolId ?? "" }
          : {
            school: {
              OR: [
                { createdByUserId: request.user!.id },
                ...(request.user!.dealerId ? [{ dealerId: request.user!.dealerId }] : []),
              ],
            },
          };
      const exams = await prisma.exam.findMany({
        where,
        include: {
          school: { select: { id: true, name: true, city: true, district: true } },
          publisher: { select: { id: true, name: true } },
        },
        orderBy: { examDate: "desc" },
        take: 100,
      });
      response.json(exams);
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/exams",
  requireAuth,
  async (request: AuthenticatedRequest, response, next) => {
    if (![Role.SUPER_ADMIN, Role.DEALER, Role.SCHOOL_ADMIN].some((role) => role === request.user!.role)) {
      response.status(403).json({ error: "Sınav oluşturma yetkiniz yok." });
      return;
    }
    const parsed = examSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Kurum, sınav adı ve sınav tarihi geçerli olmalıdır." });
      return;
    }
    try {
      const schoolScope: Prisma.SchoolWhereInput = request.user!.role === Role.SCHOOL_ADMIN
        ? { id: request.user!.schoolId ?? "" }
        : request.user!.role === Role.DEALER
          ? {
            OR: [
              { createdByUserId: request.user!.id },
              ...(request.user!.dealerId ? [{ dealerId: request.user!.dealerId }] : []),
            ],
          }
          : {};
      const schoolWhere: Prisma.SchoolWhereInput = {
        id: parsed.data.schoolId,
        active: true,
        ...schoolScope,
      };
      const school = await prisma.school.findFirst({ where: schoolWhere, select: { id: true } });
      if (!school) {
        response.status(404).json({ error: "Aktif ve erişim yetkiniz olan kurum bulunamadı." });
        return;
      }
      if (parsed.data.publisherId) {
        const publisher = await prisma.publisher.findFirst({
          where: { id: parsed.data.publisherId, active: true },
          select: { id: true },
        });
        if (!publisher) {
          response.status(400).json({ error: "Seçilen yayınevi etkin değil veya bulunamadı." });
          return;
        }
      }
      const exam = await prisma.exam.create({
        data: {
          schoolId: school.id,
          publisherId: parsed.data.publisherId ?? null,
          name: parsed.data.name,
          examDate: parsed.data.examDate,
        },
        include: {
          school: { select: { id: true, name: true } },
          publisher: { select: { id: true, name: true } },
        },
      });
      response.status(201).json(exam);
    } catch (error) {
      next(error);
    }
  },
);

app.get("/api/answer-keys", async (request, response, next) => {
  try {
    const publisherId = typeof request.query.publisherId === "string" ? request.query.publisherId : undefined;
    const grade = typeof request.query.grade === "string" ? Number(request.query.grade) : undefined;
    const search = typeof request.query.search === "string" ? request.query.search.trim() : "";
    const fileType = typeof request.query.fileType === "string" ? request.query.fileType : undefined;
    const page = Number(request.query.page ?? 1);
    const limit = Number(request.query.limit ?? 12);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      response.status(400).json({ error: "Sayfa numarası veya sayfa boyutu geçersiz." });
      return;
    }
    if (grade !== undefined && (!Number.isInteger(grade) || grade < 1 || grade > 12)) {
      response.status(400).json({ error: "Sınıf filtresi 1 ile 12 arasında olmalıdır." });
      return;
    }
    if (fileType && !Object.values(AnswerKeyFileCategory).includes(fileType as AnswerKeyFileCategory)) {
      response.status(400).json({ error: "Dosya türü filtresi geçersiz." });
      return;
    }

    const where: Prisma.PublishedAnswerKeyWhereInput = {
      published: true,
      ...(publisherId ? { publisherId } : {}),
      ...(grade !== undefined ? { grade } : {}),
      ...(search ? {
        OR: [
          { examName: { contains: search, mode: "insensitive" } },
          { publisher: { name: { contains: search, mode: "insensitive" } } },
        ],
      } : {}),
      ...(fileType ? { files: { some: { category: fileType as AnswerKeyFileCategory } } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.publishedAnswerKey.findMany({
        where,
        include: {
          publisher: { select: { id: true, name: true } },
          files: {
            orderBy: { createdAt: "desc" },
            select: { id: true, category: true, originalFileName: true, mimeType: true, size: true, createdAt: true,generated:true },
          },
        },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.publishedAnswerKey.count({ where }),
    ]);

    response.json({ items, total, page, totalPages: Math.ceil(total / limit) || 1 });
  } catch (error) {
    next(error);
  }
});

app.get("/api/answer-keys/:id", async (request, response, next) => {
  try {
    const answerKeyId = getRouteParamId(request.params.id);
    const item = await prisma.publishedAnswerKey.findFirst({
      where: { id: answerKeyId, published: true },
      include: {
        publisher: { select: { id: true, name: true } },
        files: {
          orderBy: { createdAt: "desc" },
          select: { id: true, category: true, originalFileName: true, mimeType: true, size: true, createdAt: true,generated:true },
        },
      },
    });
    if (!item) {
      response.status(404).json({ error: "Yayımlanmış cevap anahtarı bulunamadı." });
      return;
    }
    response.json(item);
  } catch (error) {
    next(error);
  }
});

app.get(
  "/api/admin/answer-keys",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (_request: AuthenticatedRequest, response, next) => {
    try {
      const items = await prisma.publishedAnswerKey.findMany({
        include: {
          publisher: true,
          files: true,
          opticalKey: { select: { id: true, penalty: true, active: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      response.json(items);
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/admin/answer-key-files/:id",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (request, response, next) => {
    try {
      const fileId = getRouteParamId(request.params.id);
      const fileRecord = await prisma.answerKeyFile.findUnique({ where: { id: fileId }, include: { publishedAnswerKey: { include: { publisher: true } } } });
      if (!fileRecord) {
        response.status(404).json({ error: "Dosya bulunamadı." });
        return;
      }
      if (!fs.existsSync(fileRecord.storagePath)) {
        response.status(404).json({ error: "Dosya sunucuda bulunamadı." });
        return;
      }
      response.download(fileRecord.storagePath, answerKeyDownloadName(fileRecord), {
        headers: { "Content-Type": fileRecord.mimeType },
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get("/api/answer-key-files/:id", async (request, response, next) => {
  try {
    const fileId = getRouteParamId(request.params.id);
    const fileRecord = await prisma.answerKeyFile.findFirst({
      where: { id: fileId, publishedAnswerKey: { published: true } },
      include: { publishedAnswerKey: { include: { publisher: true } } },
    });
    if (!fileRecord) {
      response.status(404).json({ error: "Dosya bulunamadı." });
      return;
    }
    if (!fs.existsSync(fileRecord.storagePath)) {
      response.status(404).json({ error: "Dosya sunucuda bulunamadı." });
      return;
    }
    response.download(fileRecord.storagePath, answerKeyDownloadName(fileRecord), {
      headers: { "Content-Type": fileRecord.mimeType },
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/outcome-preview",requireAuth,requireRole(Role.SUPER_ADMIN),upload.single("file"),async(request:AuthenticatedRequest,response,next)=>{
 try{if(!request.file){response.status(400).json({error:"Kazanım dosyasını seçin."});return;}const format=z.enum(["auto","standard","f","o"]).parse(request.body.evaluationFormat??"auto");
 if(!validateFileSignature(request.file.path,path.extname(request.file.originalname).slice(1).toLowerCase())){response.status(400).json({error:"Dosya içeriği uzantısıyla eşleşmiyor."});return;}
 const result=await inspectOutcomeFile(request.file.path,request.file.originalname,format,true);response.json({...result,checksum:crypto.createHash("sha256").update(fs.readFileSync(request.file.path)).digest("hex")});
 }catch(error){response.status(400).json({error:error instanceof Error?error.message:"Kazanım dosyası okunamadı."});}finally{if(request.file&&fs.existsSync(request.file.path))fs.unlinkSync(request.file.path);}
});

// Definition creation is explicit and contains no files or evaluation side effects.
app.post("/api/admin/exam-definitions",requireAuth,requireRole(Role.SUPER_ADMIN),async(request:AuthenticatedRequest,response,next)=>{
 const parsed=z.object({publisherId:z.string().min(1),grade:z.coerce.number().int().min(1).max(12),examName:z.string().trim().min(2).max(180)}).safeParse(request.body);
 if(!parsed.success){response.status(400).json({error:"Yayınevi, sınıf ve sınav adını kontrol edin."});return;}
 try{
  const data=parsed.data;
  if(!await prisma.publisher.findFirst({where:{id:data.publisherId,active:true},select:{id:true}})){response.status(404).json({error:"Etkin yayınevi bulunamadı."});return;}
  const record=await prisma.$transaction(async tx=>{
   // Serializes definitions for a publisher/grade across workers without a schema change.
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.publisherId+":"+data.grade}))`;
   if(await tx.publishedAnswerKey.findFirst({where:{publisherId:data.publisherId,grade:data.grade,examName:{equals:data.examName,mode:"insensitive"}}}))return null;
   return tx.publishedAnswerKey.create({data:{...data,published:false,showInEvaluation:false,createdByUserId:request.user!.id}});
  });
  if(!record){response.status(409).json({error:"Bu yayınevi ve sınıfta aynı adlı sınav zaten var. Mevcut sınavı seçin."});return;}
  response.status(201).json({id:record.id});
 }catch(e){next(e);}
});
app.post("/api/admin/answer-keys",requireAuth,requireRole(Role.SUPER_ADMIN),(_request,response)=>{
 response.status(409).json({error:"Önce yayın sınavını tanımlayın; cevap anahtarını mevcut sınava ekleyin."});
});

app.patch(
  "/api/admin/answer-keys/:id",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  upload.fields([{ name: "answerKeyFile", maxCount: 1 }, { name: "learningOutcomesFile", maxCount: 1 }]),
  async (
    request: AuthenticatedRequest & { files?: { answerKeyFile?: Express.Multer.File[]; learningOutcomesFile?: Express.Multer.File[] } },
    response,
    next,
  ) => {
    const answerKeyId = getRouteParamId(request.params.id);
    const parsed = answerKeyUploadBodySchema.safeParse(request.body);
    const uploadedFiles = [
      ...(request.files?.answerKeyFile ?? []),
      ...(request.files?.learningOutcomesFile ?? []),
    ];
    const movedUploads: string[] = [];
    let replacementCommitted = false;
    const removeTemporaryUploads = () => {
      for (const file of uploadedFiles) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
    };
    if (!answerKeyId || !parsed.success) {
      removeTemporaryUploads();
      response.status(400).json({ error: "Cevap anahtarı bilgileri geçersiz." });
      return;
    }

    try {
      const current = await prisma.publishedAnswerKey.findUnique({
        where: { id: answerKeyId },
        include: { files: true, opticalKey: true,publisher:true },
      });
      if (!current) {
        removeTemporaryUploads();
        response.status(404).json({ error: "Cevap anahtarı bulunamadı." });
        return;
      }
      let pdfPublisherName=current.publisher?.name;
      if (parsed.data.publisherId !== current.publisherId) {
        const activePublisher = await prisma.publisher.findFirst({
          where: { id: parsed.data.publisherId, active: true },
          select: { id: true,name:true },
        });
        if (!activePublisher) {
          removeTemporaryUploads();
          response.status(400).json({ error: "Yeni yayınevi seçimi etkin değil veya bulunamadı." });
          return;
        }
        pdfPublisherName=activePublisher.name;
      }

      for (const file of uploadedFiles) {
        const extension = path.extname(file.originalname).toLowerCase().replace(".", "");
        if (!allowedExtensions.has(extension) || !validateFileSignature(file.path, extension)) {
          removeTemporaryUploads();
          response.status(400).json({ error: `Dosya türü veya içeriği doğrulanamadı: ${file.originalname}` });
          return;
        }
      }

      if(((parsed.data.published??current.published)||(parsed.data.showInEvaluation??current.showInEvaluation))&&!parsed.data.confirmPublication){response.status(400).json({error:"Önizleme ve yayın seçeneklerini açıkça onaylayın."});return;}
      let reviewed;try{reviewed=await reviewImportedQuestions(uploadedFiles,parsed.data,{examName:parsed.data.examName,grade:parsed.data.grade,publisherName:pdfPublisherName});}catch(error){response.status(400).json({error:(error as Error).message});return;}
      const replacedFields = new Set(uploadedFiles.map(f=>f.fieldname==="answerKeyFile"?"ANSWER_KEY":"LEARNING_OUTCOMES"));
      const effectiveFiles = [...current.files.filter(f=>!replacedFields.has(f.category)),...uploadedFiles.map(f=>({category:f.fieldname==="answerKeyFile"?"ANSWER_KEY":"LEARNING_OUTCOMES",storagePath:f.path,originalFileName:f.originalname}))];
      let evaluation;
      const showInEvaluation=parsed.data.showInEvaluation??current.showInEvaluation, penalty=parsed.data.penalty??current.opticalKey?.penalty??3;
      try { evaluation=reviewed??prepareEvaluation(effectiveFiles,showInEvaluation,current.opticalKey?.questions,uploadedFiles.length>0,parsed.data.evaluationFormat); }
      catch(error){response.status(400).json({error:error instanceof Error?error.message:"Değerlendirme anahtarı okunamadı."});return;}
      const replacementFiles = uploadedFiles.map((file) => {
        const extension = path.extname(file.originalname).toLowerCase().replace(".", "");
        const targetDirectory = path.join(storageRoot, "answer-keys", answerKeyId);
        fs.mkdirSync(targetDirectory, { recursive: true });
        const destinationFilePath = path.join(
          targetDirectory,
          `${Date.now()}-${crypto.randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_")}`,
        );
        fs.renameSync(file.path, destinationFilePath);
        movedUploads.push(destinationFilePath);
        const category = file.fieldname === "answerKeyFile"
          ? AnswerKeyFileCategory.ANSWER_KEY
          : AnswerKeyFileCategory.LEARNING_OUTCOMES;
        return {
          answerKeyId,
          category,
          generated:file.filename?.endsWith(".generated-answer.pdf")??false,
          originalFileName: file.originalname,
          storedFileName: path.basename(destinationFilePath),
          mimeType: file.mimetype,
          size: file.size,
          storagePath: destinationFilePath,
        };
      });

      const replacedCategories = [...new Set(replacementFiles.map((file) => file.category))];
      const previousFiles = current.files.filter((file) => replacedCategories.includes(file.category));
      try {
        const updated = await prisma.$transaction(async (transaction) => {
          const record = await transaction.publishedAnswerKey.update({
            where: { id: answerKeyId },
            data: {
              publisherId: parsed.data.publisherId,
              grade: parsed.data.grade,
              examName: parsed.data.examName.trim(),
              published: parsed.data.published??current.published,
              showInEvaluation,
              ...(evaluation ? {opticalKey:{upsert:{create:{name:`${parsed.data.examName.trim()} · ${answerKeyId}`,questions:evaluation as Prisma.InputJsonValue,penalty,active:true},update:{questions:evaluation as Prisma.InputJsonValue,penalty,active:true}}}} : current.opticalKey ? {opticalKey:{update:{active:false,questions:[]}}} : {}),
              ...(parsed.data.publishedAt ? { publishedAt: parsed.data.publishedAt } : {}),
            },
          });
          if (replacedCategories.length > 0) {
            await transaction.answerKeyFile.deleteMany({
              where: { answerKeyId, category: { in: replacedCategories } },
            });
            await transaction.answerKeyFile.createMany({ data: replacementFiles });
          }
          return record;
        });
        replacementCommitted = true;
        for (const file of previousFiles) {
          try { if (fs.existsSync(file.storagePath)) fs.unlinkSync(file.storagePath); }
          catch (error) { console.error("Eski dosya temizlenemedi"); }
        }
        response.json({ message: "Cevap anahtarı güncellendi.", answerKey: updated });
      } catch (error) {
        throw error;
      }
    } catch (error) {
      next(error);
    } finally {
      for (const filePath of [...uploadedFiles.map((file) => file.path), ...(!replacementCommitted ? movedUploads : [])]) {
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
        catch (error) { console.error("Yükleme dosyası temizlenemedi"); }
      }
    }
  },
);

app.delete(
  "/api/admin/answer-keys/:id",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const answerKeyId = getRouteParamId(request.params.id);
      const answerKey = await prisma.publishedAnswerKey.findUnique({
        where: { id: answerKeyId },
        include: { files: true },
      });
      if (!answerKey) {
        response.status(404).json({ error: "Cevap anahtarı bulunamadı." });
        return;
      }

      await prisma.publishedAnswerKey.delete({ where: { id: answerKey.id } });
      for (const file of answerKey.files) {
        try { if (fs.existsSync(file.storagePath)) fs.unlinkSync(file.storagePath); }
        catch (error) { console.error("Silinen kaydın dosyası temizlenemedi"); }
      }
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

app.use(answerPdfRouter);
app.use(publisherLogoRouter);
app.use(systemRouter);
app.use(testCenterRouter);
app.use(contentRouter);
app.use(fmtShareRouter);
app.use("/api/optical", opticalRouter);
app.use("/api/public-results", publicResultsRouter);
app.use("/api", readerRouter);

app.use(
  (error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if ((error as { type?: string })?.type === "entity.too.large") { response.status(413).json({ error: "İstek boyutu sınırı aşıldı. Takvim dosyasını daha küçük parçalara bölün." }); return; }
    if (error instanceof multer.MulterError) {
      response.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Dosya boyutu izin verilen sınırı aşıyor." : "Yüklenen dosya sayısını ve dosya alanlarını kontrol edin." });
      return;
    }
    response.locals.failureKind = error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError ? "DATABASE_ERROR" : /pdf/i.test(_request.route?.path ?? "") ? "PDF_ERROR" : "SERVER_ERROR";
    console.error("API request failed", { category: error instanceof Prisma.PrismaClientKnownRequestError ? "DATABASE" : "SERVER", route: _request.route?.path ?? "unknown" });
    response.status(500).json({ error: "Beklenmeyen bir sunucu hatası oluştu." });
  },
);

const port = env.PORT ?? env.API_PORT;
if (require.main === module) {
  app.listen(port, () => { console.info(`API ${port} portunda çalışıyor.`); });
}
