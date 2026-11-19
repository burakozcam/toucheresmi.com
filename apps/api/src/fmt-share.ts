import {shareWindowInput,shareWindow} from './share-window';
import fs from "node:fs";
import path from "node:path";
import {encryptShareToken,decryptShareToken,validShare} from "./share-security";
import {evaluationQuestions} from "./optical-catalog";
import {createAnswerKeyPdf} from "./answer-key-pdf";
import express from "express";
import crypto from "node:crypto";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { requireAuth,type AuthenticatedRequest } from "./auth";
import { RequestLimiter } from "./rate-limit";
import { env } from "./config";
import { decodeOptical } from "./optical-core";
import { fmtBytes } from "./fmt-download";
import { findLibraryFmt, fmtLibraryCodes, libraryFmtBytes } from "./fmt-library";
export const shareDurations={"5m":300,"10m":600,"30m":1800,"1h":3600,"3h":10800,"5h":18000,"12h":43200,"1d":86400,"2d":172800,"3d":259200,"5d":432000,"1w":604800,"1mo":0} as const;
export function shareExpiry(duration:keyof typeof shareDurations,now=new Date()){
 if(duration!=="1mo")return new Date(now.getTime()+shareDurations[duration]*1000);
 const date=new Date(now),day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+1);const end=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,end));return date;
}
export const shareHash=(token:string)=>crypto.createHash("sha256").update(token).digest("hex");
export const hasFmt=(t:{originalFmt:string;originalBase64?:string|null})=>{const text=t.originalBase64?decodeOptical(Buffer.from(t.originalBase64,"base64")):t.originalFmt;return !!text?.trim()&&!/^\s*[\[{]/.test(text);};
export const fmtShareRouter=express.Router();
type Handler=(q:AuthenticatedRequest,r:express.Response)=>Promise<void>;
const wrap=(fn:Handler):express.RequestHandler=>async(q,r,n)=>{try{r.setHeader("Cache-Control","private, no-store");r.setHeader("Referrer-Policy","no-referrer");await fn(q as AuthenticatedRequest,r);}catch(e){if(e instanceof Error&&e.message.startsWith("Bitiş tarihi")){r.status(400).json({error:e.message});return;}if(e instanceof z.ZodError){r.status(400).json({error:"Paylaşım bilgileri geçersiz."});return;}n(e);}};
const manager:express.RequestHandler=(q:AuthenticatedRequest,r,n)=>{if(![Role.SUPER_ADMIN,Role.DEALER].includes(q.user!.role as any)){r.status(403).json({error:"Paylaşım için bayi veya yönetici hesabı gerekir."});return;}n();};
const limit=new RequestLimiter(90,10*60_000).middleware();
type FileRef={id:string;name:string;example?:boolean};
const bundleInput=z.object({duration:z.enum(Object.keys(shareDurations) as [keyof typeof shareDurations,...Array<keyof typeof shareDurations>]),templateIds:z.array(z.string().min(1)).max(30).default([]),exampleCodes:z.array(z.enum(fmtLibraryCodes as [string,...string[]])).max(fmtLibraryCodes.length).default([])}).merge(shareWindowInput);
fmtShareRouter.post("/api/optical/fmt-shares",requireAuth,manager,limit,wrap(async(q,r)=>{
 const input=bundleInput.parse(q.body),ids=[...new Set(input.templateIds)],codes=[...new Set(input.exampleCodes)];
 if(!ids.length&&!codes.length){r.status(400).json({error:"En az bir FMT seçin."});return;}
 const templates=ids.length?await prisma.opticalTemplate.findMany({where:{id:{in:ids},active:true}}):[];
 if(templates.length!==ids.length||templates.some(t=>!hasFmt(t))){r.status(400).json({error:"Seçilen özgün FMT dosyalarından biri kullanılamıyor."});return;}
 const fileRefs:FileRef[]=[...codes.map(id=>({id:`example:${id}`,name:findLibraryFmt(id)!.name,example:true})),...templates.map(t=>({id:t.id,name:t.name}))];
 const token=crypto.randomBytes(32).toString("base64url"),share=await prisma.fmtShare.create({data:{templateId:null,fileRefs,name:fileRefs.map(f=>f.name).join(" + "),createdById:q.user!.id,tokenHash:shareHash(token),tokenEncrypted:encryptShareToken(token),...shareWindow(input,start=>shareExpiry(input.duration,start))}});
 r.status(201).json({id:share.id,url:`${env.WEB_ORIGIN}/fmt-paylasim/${share.id}#${token}`,startsAt:share.startsAt,expiresAt:share.expiresAt});
}));
fmtShareRouter.get("/api/optical/fmt-shares",requireAuth,manager,wrap(async(q,r)=>{
 r.json(await prisma.fmtShare.findMany({where:{category:"FMT",...(q.user!.role===Role.SUPER_ADMIN?{}:{createdById:q.user!.id})},select:{id:true,createdAt:true,startsAt:true,expiresAt:true,revokedAt:true},orderBy:{createdAt:"desc"},take:100}));
}));
async function shareFiles(share:{fileRefs:unknown;template?:{id:string;name:string;active:boolean;originalFmt:string;originalBase64?:string|null}|null}):Promise<Array<{id:string;name:string;bytes:Buffer;downloadName?:string}>>{
 if(!share.fileRefs)return share.template?.active&&hasFmt(share.template)?[{id:share.template.id,name:share.template.name,bytes:fmtBytes(share.template.originalFmt,share.template.originalBase64)}]:[];
 const refs=share.fileRefs as FileRef[],files:Array<{id:string;name:string;bytes:Buffer;downloadName?:string}>=[];
 for(const ref of refs){
  if(ref.example){const code=ref.id.startsWith("example:")?ref.id.slice(8):"",entry=findLibraryFmt(code);if(!entry)return [];files.push({id:ref.id,name:entry.name,downloadName:entry.downloadName,bytes:libraryFmtBytes(code)});continue;}
  const t=await prisma.opticalTemplate.findFirst({where:{id:ref.id,active:true}});
  if(!t||!hasFmt(t))return [];
  files.push({id:t.id,name:t.name,bytes:fmtBytes(t.originalFmt,t.originalBase64)});
 }
 return files;
}
fmtShareRouter.post("/api/optical/templates/:id/shares",requireAuth,manager,limit,wrap(async(q,r)=>{
 const input=z.object({duration:z.enum(Object.keys(shareDurations) as [keyof typeof shareDurations,...Array<keyof typeof shareDurations>])}).merge(shareWindowInput).parse(q.body);
 const template=await prisma.opticalTemplate.findFirst({where:{id:String(q.params.id),active:true}});
 if(!template||!hasFmt(template)){r.status(404).json({error:"Paylaşılabilir özgün ve etkin FMT bulunamadı."});return;}
 const token=crypto.randomBytes(32).toString("base64url"),share=await prisma.fmtShare.create({data:{templateId:template.id,name:template.name,createdById:q.user!.id,tokenHash:shareHash(token),tokenEncrypted:encryptShareToken(token),...shareWindow(input,start=>shareExpiry(input.duration,start))}});
 const url=`${env.WEB_ORIGIN}/fmt-paylasim/${share.id}#${token}`;r.status(201).json({id:share.id,url,startsAt:share.startsAt,expiresAt:share.expiresAt});
}));
fmtShareRouter.get("/api/optical/templates/:id/shares",requireAuth,manager,wrap(async(q,r)=>{
 r.json(await prisma.fmtShare.findMany({where:{templateId:String(q.params.id),...(q.user!.role===Role.SUPER_ADMIN?{}:{createdById:q.user!.id})},select:{id:true,createdAt:true,startsAt:true,expiresAt:true,revokedAt:true},orderBy:{createdAt:"desc"},take:100}));
}));
fmtShareRouter.delete("/api/optical/fmt-shares/:id",requireAuth,manager,wrap(async(q,r)=>{
 const result=await prisma.fmtShare.updateMany({where:{id:String(q.params.id),category:"FMT",...(q.user!.role===Role.SUPER_ADMIN?{}:{createdById:q.user!.id}),revokedAt:null},data:{revokedAt:new Date()}});
 if(!result.count){r.status(404).json({error:"Paylaşım bulunamadı veya iptal yetkiniz yok."});return;}r.status(204).end();
}));
// The public metadata contains only expiry, never the token, file name, or contents.
fmtShareRouter.get("/api/public/fmt-shares/:id/info",limit,wrap(async(q,r)=>{
 const share=await prisma.fmtShare.findFirst({where:{id:String(q.params.id),revokedAt:null,category:"FMT",AND:[{OR:[{startsAt:null},{startsAt:{lte:new Date()}}]},{OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]}]},include:{template:true}});
 if(!share||!(await shareFiles(share)).length){r.status(410).json({error:"Paylaşım sona ermiş, iptal edilmiş veya bulunamıyor."});return;}r.json({expiresAt:share.expiresAt});
}));
for(const action of ["view","download"]){fmtShareRouter.post(`/api/public/fmt-shares/:id/${action}`,limit,wrap(async(q,r)=>{
 const {token,fileId}=z.object({token:z.string().regex(/^[A-Za-z0-9_-]{43}$/),fileId:z.string().optional()}).parse(q.body);
 const share=await prisma.fmtShare.findFirst({where:{id:String(q.params.id),tokenHash:shareHash(token),revokedAt:null,category:"FMT",AND:[{OR:[{startsAt:null},{startsAt:{lte:new Date()}}]},{OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]}]},include:{template:true}});
 const files=share?await shareFiles(share):[];
 if(!share||!files.length){r.status(410).json({error:"Paylaşım süresi dolmuş, iptal edilmiş veya bağlantı geçersiz."});return;}
 if(action==="view"){await prisma.fmtShare.update({where:{id:share.id},data:{views:{increment:1},lastAccessAt:new Date()}});r.json({name:files.map(f=>f.name).join(" + "),files:files.map(({id,name,downloadName})=>({id,name,...(downloadName?{downloadName}:{})})),expiresAt:share.expiresAt});return;}
 const file=fileId?files.find(f=>f.id===fileId):files.length===1?files[0]:undefined;
 if(!file){r.status(400).json({error:"İndirmek istediğiniz FMT’yi seçin."});return;}
 await prisma.fmtShare.update({where:{id:share.id},data:{downloads:{increment:1},lastAccessAt:new Date()}});
 r.attachment(file.downloadName??file.name.replace(/[\\/:*?"<>|\x00-\x1f]/g,"-").replace(/\.fmt$/i,"")+".fmt").type("application/octet-stream").send(file.bytes);
}));}

// Common management for existing FMT links and protected answer PDFs.
const managementGuards=[requireAuth,manager];
fmtShareRouter.get("/api/shares/browser",...managementGuards,wrap(async(q,r)=>{
 const input=z.object({page:z.coerce.number().int().min(1).max(100000).default(1),category:z.enum(["","FMT","PDF","MEMBERSHIP"]).default(""),status:z.enum(["","scheduled","active","expired","used","revoked"]).default(""),search:z.string().max(100).default("")}).parse(q.query);
 const owner=q.user!.role===Role.SUPER_ADMIN?Prisma.sql`TRUE`:Prisma.sql`f."createdById"=${q.user!.id}`;
 const legacy=q.user!.role===Role.SUPER_ADMIN?Prisma.sql`SELECT 'invite:'||u.id AS id,(u."firstName"||' '||u."lastName") AS name,'MEMBERSHIP' AS category,'Admin' AS creator,u."createdAt",CASE WHEN u."setupExpiresAt">NOW() THEN 'active' ELSE 'expired' END AS status FROM "User" u WHERE u."setupTokenHash" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "FmtShare" f WHERE f.category='MEMBERSHIP' AND f."targetId"=u.id)`:Prisma.sql`SELECT NULL::text AS id,NULL::text AS name,NULL::text AS category,NULL::text AS creator,NULL::timestamp AS "createdAt",NULL::text AS status WHERE FALSE`;
 const filters=[Prisma.sql`TRUE`];if(input.category)filters.push(Prisma.sql`category=${input.category}`);if(input.status)filters.push(Prisma.sql`status=${input.status}`);if(input.search)filters.push(Prisma.sql`position(lower(${input.search}) in lower(name||' '||creator))>0`);
 const selected=await prisma.$queryRaw<Array<{id:string;total:number}>>(Prisma.sql`WITH links AS (
 SELECT f.id,COALESCE(f.name,'FMT paylaşımı') AS name,f.category,CASE WHEN c.role='SUPER_ADMIN' THEN 'Admin' ELSE COALESCE(c."firstName"||' '||c."lastName",'Kullanıcı') END AS creator,f."createdAt",CASE WHEN f."usedAt" IS NOT NULL THEN 'used' WHEN f."revokedAt" IS NOT NULL OR (f.category='MEMBERSHIP' AND (t.id IS NULL OR NOT t.active OR t."setupTokenHash" IS DISTINCT FROM f."tokenHash")) THEN 'revoked' WHEN f."expiresAt"<=NOW() THEN 'expired' WHEN f."startsAt">NOW() THEN 'scheduled' ELSE 'active' END AS status
 FROM "FmtShare" f LEFT JOIN "User" c ON c.id=f."createdById" LEFT JOIN "User" t ON t.id=f."targetId" WHERE ${owner} UNION ALL ${legacy})
 SELECT id,COUNT(*) OVER()::int AS total FROM links WHERE ${Prisma.join(filters,' AND ')} ORDER BY "createdAt" DESC,id LIMIT 25 OFFSET ${(input.page-1)*25}`);
 const shares=await prisma.fmtShare.findMany({where:{id:{in:selected.filter(s=>!s.id.startsWith('invite:')).map(s=>s.id)},...(q.user!.role===Role.SUPER_ADMIN?{}:{createdById:q.user!.id})}});
 const users=await prisma.user.findMany({where:{id:{in:[...shares.map(s=>s.createdById),...shares.flatMap(s=>s.targetId?[s.targetId]:[]),...selected.filter(s=>s.id.startsWith('invite:')).map(s=>s.id.slice(7))]}},select:{id:true,firstName:true,lastName:true,role:true,active:true,setupTokenHash:true,setupExpiresAt:true,createdAt:true}}),byId=new Map(users.map(u=>[u.id,u]));
 const rows=selected.map(({id})=>{if(id.startsWith('invite:')){const u=byId.get(id.slice(7))!;return {id,name:`${u.firstName} ${u.lastName}`,category:'MEMBERSHIP',creator:'Admin',createdAt:u.createdAt,expiresAt:u.setupExpiresAt,status:u.setupExpiresAt&&u.setupExpiresAt>new Date()?'active':'expired',url:null,views:0,downloads:0,lastAccessAt:null};}
 const s=shares.find(s=>s.id===id)!,creator=byId.get(s.createdById),target=s.targetId?byId.get(s.targetId):null;let url:string|null=null;
 try{if(s.tokenEncrypted)url=`${env.WEB_ORIGIN}/${s.category==='MEMBERSHIP'?'hesap-kur':`${s.category==='PDF'?'pdf-paylasim':'fmt-paylasim'}/${s.id}`}#${decryptShareToken(s.tokenEncrypted)}`;}catch{}
 return {id:s.id,name:s.name??'FMT paylaşımı',category:s.category,creator:creator?.role===Role.SUPER_ADMIN?'Admin':creator?`${creator.firstName} ${creator.lastName}`:'Kullanıcı',createdAt:s.createdAt,startsAt:s.startsAt,expiresAt:s.expiresAt,status:s.usedAt?'used':s.revokedAt||s.category==='MEMBERSHIP'&&(!target?.active||target.setupTokenHash!==s.tokenHash)?'revoked':s.expiresAt&&s.expiresAt<=new Date()?'expired':s.startsAt&&s.startsAt>new Date()?'scheduled':'active',url,views:s.views,downloads:s.downloads,lastAccessAt:s.lastAccessAt};});
 r.json({rows,total:selected[0]?.total??0,page:input.page});
}));
fmtShareRouter.get("/api/shares",...managementGuards,wrap(async(q,r)=>{
 const shares=await prisma.fmtShare.findMany({where:q.user!.role===Role.SUPER_ADMIN?{}:{createdById:q.user!.id},orderBy:{createdAt:"desc"},take:500});
 const creatorIds=[...new Set([...shares.map(s=>s.createdById),...shares.flatMap(s=>s.category==="MEMBERSHIP"&&s.targetId?[s.targetId]:[])])];
 const creators=await prisma.user.findMany({where:{id:{in:creatorIds}},select:{id:true,firstName:true,lastName:true,role:true,active:true,setupTokenHash:true}});
 const rows=shares.map(s=>{const creator=creators.find(c=>c.id===s.createdById),target=s.category==="MEMBERSHIP"?creators.find(c=>c.id===s.targetId):null,invalidInvite=s.category==="MEMBERSHIP"&&(!target?.active||target.setupTokenHash!==s.tokenHash);let url:null|string=null;try{if(s.tokenEncrypted)url=`${env.WEB_ORIGIN}/${s.category==="MEMBERSHIP"?"hesap-kur":`${s.category==="PDF"?"pdf-paylasim":"fmt-paylasim"}/${s.id}`}#${decryptShareToken(s.tokenEncrypted)}`;}catch{/* Key rotation: retain revocation capability. */}
 return {...s,tokenHash:undefined,tokenEncrypted:undefined,url,name:s.name??(s.fileRefs as FileRef[]|null)?.map(f=>f.name).join(" + ")??"FMT paylaşımı",creator:creator?.role===Role.SUPER_ADMIN?"Admin":creator?`${creator.firstName} ${creator.lastName}`:"Kullanıcı",status:s.usedAt?"used":s.revokedAt||invalidInvite?"revoked":s.expiresAt&&s.expiresAt<=new Date()?"expired":s.startsAt&&s.startsAt>new Date()?"scheduled":"active"};});
 if(q.user!.role===Role.SUPER_ADMIN){const invites=await prisma.user.findMany({where:{setupTokenHash:{not:null}},select:{id:true,firstName:true,lastName:true,createdAt:true,setupExpiresAt:true,setupTokenHash:true,mustChangePassword:true},take:500,orderBy:{createdAt:"desc"}});
 // Only pending invitations have sufficient provenance in legacy user records.
 for(const u of invites.filter(u=>u.setupTokenHash&&!shares.some(s=>s.category==="MEMBERSHIP"&&s.targetId===u.id)))rows.push({id:`invite:${u.id}`,name:`${u.firstName} ${u.lastName}`,category:"MEMBERSHIP",startsAt:null,usedAt:null,createdById:"",creator:"Admin",createdAt:u.createdAt,expiresAt:u.setupExpiresAt,revokedAt:null,status:u.setupExpiresAt&&u.setupExpiresAt>new Date()?"active":"expired",url:null,views:0,downloads:0,lastAccessAt:null,targetId:u.id,templateId:null,fileRefs:null,tokenHash:undefined,tokenEncrypted:undefined});
 }
 r.json(rows);
}));
fmtShareRouter.patch("/api/shares/:id",...managementGuards,wrap(async(q,r)=>{
 const input=z.object({expiresAt:z.string().datetime().nullable().optional(),revoked:z.boolean().optional()}).refine(v=>v.expiresAt!==undefined||v.revoked!==undefined).parse(q.body),id=String(q.params.id);
 if(id.startsWith("invite:")){
  if(q.user!.role!==Role.SUPER_ADMIN){r.status(403).json({error:"Yönetici yetkisi gerekir."});return;}
  if(input.revoked===false||input.expiresAt===null){r.status(400).json({error:"Üyelik bağlantısı yeniden etkinleştirilemez veya süresiz olamaz."});return;}
  const expiry=input.revoked?new Date():new Date(input.expiresAt!);
  if(!input.revoked&&(expiry<=new Date()||+expiry>Date.now()+30*60_000)){r.status(400).json({error:"Davet süresi en fazla 30 dakika olabilir."});return;}
  const result=await prisma.user.updateMany({where:{id:id.slice(7),setupTokenHash:{not:null},mustChangePassword:true},data:input.revoked?{setupTokenHash:null,setupExpiresAt:null}:{setupExpiresAt:expiry}});
  if(!result.count){r.status(409).json({error:"Davet kullanılmış veya iptal edilmiş."});return;}r.json({ok:true});return;
 }
 const managed=await prisma.fmtShare.findFirst({where:{id,...(q.user!.role===Role.SUPER_ADMIN?{}:{createdById:q.user!.id})}});
 if(!managed){r.status(404).json({error:"Bağlantı bulunamadı."});return;}
 if(managed.category==="MEMBERSHIP"){
  if(managed.usedAt||managed.revokedAt||input.revoked===false||input.expiresAt===null){r.status(400).json({error:"Kullanılmış/iptal edilmiş davet yeniden etkinleştirilemez; davet süresiz olamaz."});return;}
  const expiry=input.revoked?new Date():new Date(input.expiresAt!);
  if(!input.revoked&&(expiry<=new Date()||+expiry>Date.now()+30*60_000)){r.status(400).json({error:"Davet en fazla 30 dakika geçerli olabilir."});return;}
  const result=await prisma.$transaction(async tx=>{
   const updated=await tx.user.updateMany({where:{id:managed.targetId!,setupTokenHash:managed.tokenHash,mustChangePassword:true},data:input.revoked?{setupTokenHash:null,setupExpiresAt:null}:{setupExpiresAt:expiry}});
   if(updated.count)await tx.fmtShare.update({where:{id},data:input.revoked?{revokedAt:new Date()}:{expiresAt:expiry}});
   return updated;
  });
  if(!result.count){r.status(409).json({error:"Davet artık kullanılamıyor."});return;}r.json({ok:true});return;
 }
 const expiry=input.expiresAt===undefined?undefined:input.expiresAt===null?null:new Date(input.expiresAt);
 if(expiry&&+expiry<=Math.max(Date.now(),+(managed.startsAt??new Date()))){r.status(400).json({error:"Gelecekte bir tarih seçin."});return;}
 const result=await prisma.fmtShare.updateMany({where:{id,...(q.user!.role===Role.SUPER_ADMIN?{}:{createdById:q.user!.id})},data:{...(expiry!==undefined?{expiresAt:expiry}:{}),...(input.revoked!==undefined?{revokedAt:input.revoked?new Date():null}:{})}});
 if(!result.count){r.status(404).json({error:"Bağlantı bulunamadı."});return;}r.json({ok:true});
}));
fmtShareRouter.post("/api/answer-keys/:id/shares",...managementGuards,limit,wrap(async(q,r)=>{
 const input=shareWindowInput.extend({durationDays:z.number().int().min(1).max(365).default(7)}).parse(q.body),{startsAt,expiresAt}=shareWindow(input,start=>new Date(+start+input.durationDays*86400_000));
 if(expiresAt&&expiresAt<=new Date()){r.status(400).json({error:"Gelecekte bir tarih seçin."});return;}
 const publication=await prisma.publishedAnswerKey.findFirst({where:{id:String(q.params.id),...(q.user!.role===Role.SUPER_ADMIN?{}:{published:true})},include:{opticalKey:true,files:{where:{category:"ANSWER_KEY"},orderBy:{createdAt:"desc"}}}});
 if(!publication){r.status(404).json({error:"Sınav bulunamadı."});return;}if(!pdfSource(publication)){r.status(409).json({error:"Paylaşılabilir cevap anahtarı PDF veya soru verisi yok."});return;}
 const token=crypto.randomBytes(32).toString("base64url"),share=await prisma.fmtShare.create({data:{category:"PDF",targetId:publication.id,name:publication.examName,createdById:q.user!.id,tokenHash:shareHash(token),tokenEncrypted:encryptShareToken(token),startsAt,expiresAt}});
 r.status(201).json({id:share.id,url:`${env.WEB_ORIGIN}/pdf-paylasim/${share.id}#${token}`,startsAt,expiresAt});
}));
for(const action of ["view","download"]){fmtShareRouter.post(`/api/public/pdf-shares/:id/${action}`,limit,wrap(async(q,r)=>{
 const {token}=z.object({token:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).parse(q.body);
 const share=await prisma.fmtShare.findFirst({where:{id:String(q.params.id),category:"PDF",tokenHash:shareHash(token)}});
 if(!validShare(share)){r.status(410).json({error:"Bağlantı geçersiz, iptal edilmiş veya süresi dolmuş."});return;}
 const publication=await prisma.publishedAnswerKey.findUnique({where:{id:share!.targetId!},include:{opticalKey:true,publisher:true,files:{where:{category:"ANSWER_KEY"},orderBy:{createdAt:"desc"}}}});
 if(!publication||!publication.published||publication.publishedAt>new Date()||!publication.publisher.active){r.status(410).json({error:"Cevap anahtarı artık kullanılamıyor."});return;}
 const source=pdfSource(publication);
 if(!source){r.status(410).json({error:"Cevap anahtarı artık kullanılamıyor."});return;}
 if(action==="view"){await prisma.fmtShare.update({where:{id:share!.id},data:{lastAccessAt:new Date(),views:{increment:1}}});r.json({name:share!.name,expiresAt:share!.expiresAt});return;}
 const bytes=source.questions?await createAnswerKeyPdf(source.questions,{examName:publication.examName,grade:publication.grade,publisherName:publication.publisher.name}):fs.readFileSync(source.file!);
 await prisma.fmtShare.update({where:{id:share!.id},data:{lastAccessAt:new Date(),downloads:{increment:1}}});
 r.attachment("Cevap Anahtarı.pdf").type("application/pdf").send(bytes);
}));}

/** Stored answer PDFs stay private; the server resolves the path after checking the capability. */
function pdfSource(publication:{opticalKey?:{questions:unknown}|null;files?:Array<{storagePath:string;originalFileName:string}>}){
 try{return {questions:evaluationQuestions(publication.opticalKey?.questions),file:null};}catch{}
 const root=path.resolve(env.STORAGE_DIR,"answer-keys");
 for(const file of publication.files??[]){const location=path.resolve(file.storagePath);if(!/\.pdf$/i.test(file.originalFileName)||!location.startsWith(root+path.sep))continue;
  try{const stat=fs.statSync(location);if(!stat.isFile()||stat.size>10*1024*1024)continue;const descriptor=fs.openSync(location,"r");try{const header=Buffer.alloc(5);fs.readSync(descriptor,header,0,5,0);if(header.toString()==="%PDF-")return {questions:null,file:location};}finally{fs.closeSync(descriptor);}}catch{}
 }
 return null;
}
