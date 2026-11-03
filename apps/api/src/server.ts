import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { ApplicationType, Role } from "@prisma/client";
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

app.use(
  (error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    console.error("API request failed", error);
    response.status(500).json({ error: "Beklenmeyen bir sunucu hatası oluştu." });
  },
);

app.listen(env.API_PORT, () => {
  console.info(`API ${env.API_PORT} portunda çalışıyor.`);
});
