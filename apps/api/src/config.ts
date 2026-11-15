import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
// Source and compiled API both find their package root on Windows/Linux.
const apiRoot=fs.existsSync(path.resolve(__dirname,"../package.json"))?path.resolve(__dirname,".."):path.resolve(__dirname,"../..");
dotenv.config({path:path.join(apiRoot,".env"),override:false});
dotenv.config({path:path.resolve(apiRoot,"../../.env"),override:false});
import { z } from "zod";

const environmentSchema = z.object({
  RECAPTCHA_ENABLED:z.enum(["true","false"]).default(process.env.NODE_ENV==="production"?"true":"false"),
  RECAPTCHA_MIN_SCORE:z.coerce.number().min(0).max(1).default(0.5),
  ALLOW_REMOTE_DATABASE:z.enum(["true","false"]).default("false"),
  RECAPTCHA_SECRET_KEY:z.string().default(""),
  RECAPTCHA_SITE_KEY:z.string().default(""),
  RECAPTCHA_HOSTNAME:z.string().default(""),
  TURNSTILE_ENABLED:z.enum(["true","false"]).default("false"),
  TURNSTILE_SECRET_KEY:z.string().default(""),
  TURNSTILE_SITE_KEY:z.string().default(""),
  TURNSTILE_HOSTNAME:z.string().default(""),
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
  if(process.env.NODE_ENV==="production"&&values.RECAPTCHA_ENABLED!=="true"&&values.TURNSTILE_ENABLED!=="true")context.addIssue({code:z.ZodIssueCode.custom,path:["RECAPTCHA_ENABLED"],message:"Canlı ortamda insan doğrulaması kapatılamaz."});
  if(process.env.NODE_ENV!=="production"&&values.ALLOW_REMOTE_DATABASE!=="true"){
    try{const host=new URL(values.DATABASE_URL).hostname;if(!["localhost","127.0.0.1","[::1]"].includes(host))context.addIssue({code:z.ZodIssueCode.custom,path:["DATABASE_URL"],message:"Yerel/test ortamında uzak veritabanı engellendi. Ayrı test veritabanı için ALLOW_REMOTE_DATABASE=true değerini bilinçli olarak ayarlayın."});}catch{context.addIssue({code:z.ZodIssueCode.custom,path:["DATABASE_URL"],message:"Geçersiz veritabanı adresi."});}
  }
  if(values.RECAPTCHA_ENABLED==="true"&&values.TURNSTILE_ENABLED==="true")context.addIssue({code:z.ZodIssueCode.custom,path:["RECAPTCHA_ENABLED"],message:"Yalnızca bir CAPTCHA sağlayıcısını etkinleştirin."});
  if(values.RECAPTCHA_ENABLED==="true"&&!values.RECAPTCHA_SECRET_KEY)context.addIssue({code:z.ZodIssueCode.custom,path:["RECAPTCHA_ENABLED"],message:"reCAPTCHA v3 için RECAPTCHA_SECRET_KEY gereklidir."});
  if(values.TURNSTILE_ENABLED==="true"&&(!values.TURNSTILE_SECRET_KEY||!values.TURNSTILE_SITE_KEY||!values.TURNSTILE_HOSTNAME))context.addIssue({code:z.ZodIssueCode.custom,path:["TURNSTILE_ENABLED"],message:"Turnstile etkinleştirilirken sunucu anahtarı, site anahtarı ve hostname birlikte gereklidir."});
  if (Boolean(values.SMTP_USER) !== Boolean(values.SMTP_PASSWORD)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SMTP_PASSWORD"],
      message: "SMTP_USER ve SMTP_PASSWORD birlikte ayarlanmalıdır.",
    });
  }
});

export const env = environmentSchema.parse(process.env);
