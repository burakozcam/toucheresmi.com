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
import { AuthenticatedRequest, requireAuth, requireRole } from "./auth";
import { prisma } from "./db";

const app = express();
app.use(cors({ origin: env.WEB_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

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

const allowedExtensions = new Set(["pdf", "xlsx", "xls", "png", "jpg", "jpeg", "webp"]);
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function validateFileSignature(filePath: string, extension: string) {
  const buffer = fs.readFileSync(filePath).subarray(0, 16);
  const hex = Array.from(buffer).map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();

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
  publisherId: z.string().min(1),
  grade: z.coerce.number().int().min(1).max(12),
  examName: z.string().trim().min(2).max(180),
  published: z.preprocess((value) => value === "false" ? false : Boolean(value), z.boolean()).default(true),
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

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/api/auth/login", async (request, response, next) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
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
      response.status(401).json({ error: "E-posta, şifre veya kullanıcı türü hatalı." });
      return;
    }

    const token = jwt.sign(
      {
        role: user.role,
        dealerId: user.dealerId,
        schoolId: user.schoolId,
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
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
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
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().min(5).max(3000),
});

app.post("/api/contact", async (request, response, next) => {
  const parsed = contactSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "İletişim formundaki bilgileri kontrol edin." });
    return;
  }

  if (!env.SMTP_HOST) {
    response.status(503).json({ error: "E-posta gönderimi henüz yapılandırılmadı." });
    return;
  }

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
        `Ad Soyad: ${parsed.data.name}`,
        `E-posta: ${parsed.data.email}`,
        `Telefon: ${parsed.data.phone || "-"}`,
        "",
        "Mesaj:",
        parsed.data.message,
      ].join("\n"),
    });
    response.status(202).json({ message: "Mesajınız destek ekibine gönderildi." });
  } catch (error) {
    next(error);
  }
});

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

app.get("/api/answer-keys", async (request, response, next) => {
  try {
    const publisherId = typeof request.query.publisherId === "string" ? request.query.publisherId : undefined;
    const grade = typeof request.query.grade === "string" ? Number(request.query.grade) : undefined;
    const search = typeof request.query.search === "string" ? request.query.search.trim() : "";
    const fileType = typeof request.query.fileType === "string" ? request.query.fileType : undefined;
    const page = Number(request.query.page ?? 1);
    const limit = Math.min(Number(request.query.limit ?? 12), 50);

    const where: Prisma.AnswerKeyWhereInput = {
      published: true,
      ...(publisherId ? { publisherId } : {}),
      ...(Number.isFinite(grade) ? { grade: Number(grade) } : {}),
      ...(search ? {
        OR: [
          { examName: { contains: search, mode: "insensitive" } },
          { publisher: { name: { contains: search, mode: "insensitive" } } },
        ],
      } : {}),
      ...(fileType ? { files: { some: { category: fileType as AnswerKeyFileCategory } } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.answerKey.findMany({
        where,
        include: {
          publisher: { select: { id: true, name: true } },
          files: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.answerKey.count({ where }),
    ]);

    response.json({ items, total, page, totalPages: Math.ceil(total / limit) || 1 });
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
      const items = await prisma.answerKey.findMany({
        include: {
          publisher: true,
          files: true,
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

app.get("/api/answer-key-files/:id", async (request, response, next) => {
  try {
    const fileId = getRouteParamId(request.params.id);
    const fileRecord = await prisma.answerKeyFile.findUnique({ where: { id: fileId } });
    if (!fileRecord) {
      response.status(404).json({ error: "Dosya bulunamadı." });
      return;
    }
    if (!fs.existsSync(fileRecord.storagePath)) {
      response.status(404).json({ error: "Dosya sunucuda bulunamadı." });
      return;
    }
    response.download(fileRecord.storagePath, fileRecord.originalFileName, {
      headers: { "Content-Type": fileRecord.mimeType },
    });
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/admin/answer-keys",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  upload.fields([{ name: "answerKeyFile", maxCount: 1 }, { name: "learningOutcomesFile", maxCount: 1 }]),
  async (request: AuthenticatedRequest & { files?: { answerKeyFile?: Express.Multer.File[]; learningOutcomesFile?: Express.Multer.File[] } }, response, next) => {
    const body = request.body as Record<string, unknown>;
    const parsed = answerKeyUploadBodySchema.safeParse(body);
    if (!parsed.success) {
      response.status(400).json({ error: "Yayınevi, sınıf, sınav adı ve yayın durumu geçerli olmalıdır." });
      return;
    }

    const uploadedFiles = [
      ...(request.files?.answerKeyFile ?? []),
      ...(request.files?.learningOutcomesFile ?? []),
    ];
    if (uploadedFiles.length === 0) {
      response.status(400).json({ error: "En az bir dosya yüklemelisiniz." });
      return;
    }

    try {
      const publisher = await prisma.publisher.findUnique({ where: { id: parsed.data.publisherId } });
      if (!publisher) {
        response.status(404).json({ error: "Seçilen yayınevi bulunamadı." });
        return;
      }

      const answerKey = await prisma.answerKey.create({
        data: {
          publisherId: publisher.id,
          grade: parsed.data.grade,
          examName: parsed.data.examName.trim(),
          published: parsed.data.published,
          createdByUserId: request.user!.id,
        },
      });

      const createdFiles: { originalFileName: string; storedFileName: string; mimeType: string; size: number; storagePath: string; category: AnswerKeyFileCategory }[] = [];

      for (const uploadedFile of uploadedFiles) {
        const extension = path.extname(uploadedFile.originalname).toLowerCase().replace(".", "");
        if (!allowedExtensions.has(extension)) {
          response.status(400).json({ error: `Desteklenmeyen dosya türü: ${uploadedFile.originalname}` });
          return;
        }

        const isValidSignature = validateFileSignature(uploadedFile.path, extension);
        if (!isValidSignature) {
          fs.unlinkSync(uploadedFile.path);
          response.status(400).json({ error: `Dosya içeriği doğrulanamadı: ${uploadedFile.originalname}` });
          return;
        }

        const targetDirectory = path.join(storageRoot, "answer-keys", answerKey.id);
        fs.mkdirSync(targetDirectory, { recursive: true });
        const destinationFilePath = path.join(targetDirectory, `${Date.now()}-${crypto.randomUUID()}-${uploadedFile.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_")}`);
        fs.renameSync(uploadedFile.path, destinationFilePath);

        const fileCategory = uploadedFile.fieldname === "answerKeyFile" ? AnswerKeyFileCategory.ANSWER_KEY : AnswerKeyFileCategory.LEARNING_OUTCOMES;
        createdFiles.push({
          originalFileName: uploadedFile.originalname,
          storedFileName: path.basename(destinationFilePath),
          mimeType: uploadedFile.mimetype,
          size: uploadedFile.size,
          storagePath: destinationFilePath,
          category: fileCategory,
        });
      }

      await prisma.answerKeyFile.createMany({
        data: createdFiles.map((file) => ({
          answerKeyId: answerKey.id,
          category: file.category,
          originalFileName: file.originalFileName,
          storedFileName: file.storedFileName,
          mimeType: file.mimeType,
          size: file.size,
          storagePath: file.storagePath,
        })),
      });

      response.status(201).json({
        message: "Cevap anahtarı kaydedildi.",
        answerKeyId: answerKey.id,
        files: createdFiles.length,
      });
    } catch (error) {
      next(error);
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
      const answerKey = await prisma.answerKey.findUnique({
        where: { id: answerKeyId },
        include: { files: true },
      });
      if (!answerKey) {
        response.status(404).json({ error: "Cevap anahtarı bulunamadı." });
        return;
      }

      for (const file of answerKey.files) {
        if (fs.existsSync(file.storagePath)) {
          fs.unlinkSync(file.storagePath);
        }
      }

      await prisma.answerKey.delete({ where: { id: answerKey.id } });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

app.use(
  (error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    console.error("API request failed", error);
    response.status(500).json({ error: "Beklenmeyen bir sunucu hatası oluştu." });
  },
);

const port = env.PORT ?? env.API_PORT;
app.listen(port, () => {
  console.info(`API ${port} portunda çalışıyor.`);
});
