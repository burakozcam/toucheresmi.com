import express from "express";
import crypto from "node:crypto";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { requireAuth,type AuthenticatedRequest } from "./auth";
import { RequestLimiter } from "./rate-limit";
import { env } from "./config";
import { decodeOptical } from "./optical-core";
import { fmtBytes } from "./fmt-download";
export const shareDurations={"5m":300,"10m":600,"30m":1800,"1h":3600,"3h":10800,"5h":18000,"12h":43200,"1d":86400,"2d":172800,"3d":259200,"5d":432000,"1w":604800,"1mo":0} as const;
export function shareExpiry(duration:keyof typeof shareDurations,now=new Date()){
 if(duration!=="1mo")return new Date(now.getTime()+shareDurations[duration]*1000);
 const date=new Date(now),day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+1);const end=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,end));return date;
}
export const shareHash=(token:string)=>crypto.createHash("sha256").update(token).digest("hex");
export const hasFmt=(t:{originalFmt:string;originalBase64?:string|null})=>{const text=t.originalBase64?decodeOptical(Buffer.from(t.originalBase64,"base64")):t.originalFmt;return !!text?.trim()&&!/^\s*[\[{]/.test(text);};
export const fmtShareRouter=express.Router();
type Handler=(q:AuthenticatedRequest,r:express.Response)=>Promise<void>;
const wrap=(fn:Handler):express.RequestHandler=>async(q,r,n)=>{try{r.setHeader("Cache-Control","private, no-store");r.setHeader("Referrer-Policy","no-referrer");await fn(q as AuthenticatedRequest,r);}catch(e){if(e instanceof z.ZodError){r.status(400).json({error:"Paylaşım bilgileri geçersiz."});return;}n(e);}};
const manager:express.RequestHandler=(q:AuthenticatedRequest,r,n)=>{if(![Role.SUPER_ADMIN,Role.DEALER].includes(q.user!.role as any)){r.status(403).json({error:"Paylaşım için bayi veya yönetici hesabı gerekir."});return;}n();};
const limit=new RequestLimiter(90,10*60_000).middleware();
fmtShareRouter.post("/api/optical/templates/:id/shares",requireAuth,manager,limit,wrap(async(q,r)=>{
 const {duration}=z.object({duration:z.enum(Object.keys(shareDurations) as [keyof typeof shareDurations,...Array<keyof typeof shareDurations>])}).parse(q.body);
 const template=await prisma.opticalTemplate.findFirst({where:{id:String(q.params.id),active:true}});
 if(!template||!hasFmt(template)){r.status(404).json({error:"Paylaşılabilir özgün ve etkin FMT bulunamadı."});return;}
 const token=crypto.randomBytes(32).toString("base64url"),share=await prisma.fmtShare.create({data:{templateId:template.id,createdById:q.user!.id,tokenHash:shareHash(token),expiresAt:shareExpiry(duration)}});
 const url=`${env.WEB_ORIGIN}/fmt-paylasim/${share.id}#${token}`;r.status(201).json({id:share.id,url,expiresAt:share.expiresAt});
}));
fmtShareRouter.get("/api/optical/templates/:id/shares",requireAuth,manager,wrap(async(q,r)=>{
 r.json(await prisma.fmtShare.findMany({where:{templateId:String(q.params.id),...(q.user!.role===Role.SUPER_ADMIN?{}:{createdById:q.user!.id})},select:{id:true,createdAt:true,expiresAt:true,revokedAt:true},orderBy:{createdAt:"desc"},take:100}));
}));
fmtShareRouter.delete("/api/optical/fmt-shares/:id",requireAuth,manager,wrap(async(q,r)=>{
 const result=await prisma.fmtShare.updateMany({where:{id:String(q.params.id),...(q.user!.role===Role.SUPER_ADMIN?{}:{createdById:q.user!.id}),revokedAt:null},data:{revokedAt:new Date()}});
 if(!result.count){r.status(404).json({error:"Paylaşım bulunamadı veya iptal yetkiniz yok."});return;}r.status(204).end();
}));
// The public metadata contains only expiry, never the token, file name, or contents.
fmtShareRouter.get("/api/public/fmt-shares/:id/info",limit,wrap(async(q,r)=>{
 const share=await prisma.fmtShare.findFirst({where:{id:String(q.params.id),revokedAt:null,expiresAt:{gt:new Date()},template:{active:true}},select:{expiresAt:true}});
 if(!share){r.status(410).json({error:"Paylaşım sona ermiş, iptal edilmiş veya bulunamıyor."});return;}r.json(share);
}));
for(const action of ["view","download"]){fmtShareRouter.post(`/api/public/fmt-shares/:id/${action}`,limit,wrap(async(q,r)=>{
 const {token}=z.object({token:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).parse(q.body);
 const share=await prisma.fmtShare.findFirst({where:{id:String(q.params.id),tokenHash:shareHash(token),revokedAt:null,expiresAt:{gt:new Date()},template:{active:true}},include:{template:true}});
 if(!share||!hasFmt(share.template)){r.status(410).json({error:"Paylaşım süresi dolmuş, iptal edilmiş veya bağlantı geçersiz."});return;}
 if(action==="view"){r.json({name:share.template.name,expiresAt:share.expiresAt});return;}
 r.attachment(share.template.name.replace(/[\\/:*?"<>|\x00-\x1f]/g,"-")+".fmt").type("application/octet-stream").send(fmtBytes(share.template.originalFmt,share.template.originalBase64));
}));}
