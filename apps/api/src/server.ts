import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { ApplicationType, Prisma, RegistrationStatus, Role } from "@prisma/client";
import { z } from "zod";
import { env } from "./config";
import { AuthenticatedRequest, requireAuth, requireRole } from "./auth";
import { prisma } from "./db";

const app = express();
app.use(cors({ origin: env.WEB_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.nativeEnum(Role),
});

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
      ...(env.SMTP_USER && env.SMTP_PASSWORD
        ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
        : {}),
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
    const userId = request.params.id;
    if (!parsed.success || typeof userId !== "string") {
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
    const userId = request.params.id;
    if (typeof userId !== "string") {
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
    const userId = request.params.id;
    if (!parsed.success || typeof userId !== "string") {
      response.status(400).json({ error: "Yeni şifre en az 12 karakter ve en fazla 72 bayt olmalıdır." });
      return;
    }

    try {
      const passwordHash = await bcrypt.hash(parsed.data.password, 12);
      const result = await prisma.user.updateMany({
        where: { id: userId, role: { not: Role.SUPER_ADMIN } },
        data: { passwordHash },
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
  async (request, response, next) => {
    const parsed = registrationDecisionSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Onay veya ret kararı seçin." });
      return;
    }
    const registrationId = request.params.id;
    if (typeof registrationId !== "string") {
      response.status(400).json({ error: "Üyelik talebi kimliği geçersiz." });
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
