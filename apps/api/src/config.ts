import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  TXT_STORAGE_KEY:z.preprocess(v=>v===""?undefined:v,z.string().min(32).optional()),
  JWT_SECRET: z.string().min(32, "JWT_SECRET en az 32 karakter olmalıdır."),
  PORT: z.coerce.number().int().positive().optional(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  CONTACT_EMAIL: z.string().email().default("destek@kurumsalsinav.com"),
  STORAGE_DIR: z.string().min(1).default("./storage"),
  MAX_UPLOAD_SIZE: z.coerce.number().int().positive().default(10485760),
}).superRefine((values, context) => {
  if (Boolean(values.SMTP_USER) !== Boolean(values.SMTP_PASSWORD)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SMTP_PASSWORD"],
      message: "SMTP_USER ve SMTP_PASSWORD birlikte ayarlanmalıdır.",
    });
  }
});

export const env = environmentSchema.parse(process.env);
