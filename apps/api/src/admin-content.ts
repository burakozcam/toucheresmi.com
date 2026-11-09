import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { Role, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { env } from "./config";
import { requireAuth,requireRole,type AuthenticatedRequest } from "./auth";
import { RequestLimiter } from "./rate-limit";
import { safeFilename, renamedFilename, uploadFilename } from "./file-names";
export { safeFilename } from "./file-names";

export function validImage(value:string){
 const match=value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);if(!match||value.length>350_000)return false;
 const b=Buffer.from(match[2],"base64");return match[1]==="png"?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):match[1]==="jpeg"?b[0]===255&&b[1]===216&&b[2]===255:b.toString("ascii",0,4)==="RIFF"&&b.toString("ascii",8,12)==="WEBP";
}
export const imageSchema=z.string().refine(validImage).nullable().optional();
export const validShareWindow=(start:Date,end:Date,now=Date.now())=>Number.isFinite(+start)&&Number.isFinite(+end)&&+end>Math.max(+start,now)&&+end-now<=90*86400_000;
const hash=(v:string)=>crypto.createHash("sha256").update(v).digest("hex");
const root=path.resolve(env.STORAGE_DIR,"admin-files");
const upload=multer({storage:multer.diskStorage({destination:(_q,_f,cb)=>{fs.mkdir(root,{recursive:true,mode:0o700},e=>cb(e,root));},filename:(_q,_f,cb)=>cb(null,crypto.randomUUID())}),limits:{fileSize:env.MAX_UPLOAD_SIZE,files:1}});
export const contentRouter=express.Router();
type Handler=(q:AuthenticatedRequest,r:express.Response)=>Promise<unknown>;
const wrap=(fn:Handler):express.RequestHandler=>async(q,r,n)=>{try{r.setHeader("Cache-Control","private, no-store");r.setHeader("X-Content-Type-Options","nosniff");r.setHeader("Referrer-Policy","no-referrer");await fn(q as AuthenticatedRequest,r);}catch(e){if(e instanceof z.ZodError){r.status(400).json({error:"Alanları ve tarihleri kontrol edin."});return;}if(e instanceof Prisma.PrismaClientKnownRequestError&&["P2003","P2025","P2034"].includes(e.code)){r.status(409).json({error:"Kayıt bulunamadı, eşzamanlı değişti veya klasör boş değil. Listeyi yenileyin."});return;}n(e);}};
const blogSelect={id:true,title:true,summary:true,image:true,createdAt:true,updatedAt:true} as const;
contentRouter.get("/api/blog",wrap(async(q,r)=>{const page=Math.max(1,Math.min(10000,Number(q.query.page)||1));const [items,total]=await Promise.all([prisma.blogPost.findMany({where:{published:true},select:blogSelect,orderBy:{createdAt:"desc"},skip:(page-1)*9,take:9}),prisma.blogPost.count({where:{published:true}})]);r.setHeader("Cache-Control","public, max-age=60").json({items,total,page,pages:Math.ceil(total/9)});}));
contentRouter.get("/api/blog/:id",wrap(async(q,r)=>{const post=await prisma.blogPost.findFirst({where:{id:String(q.params.id),published:true},select:{...blogSelect,content:true}});if(!post){r.status(404).json({error:"Yazı bulunamadı."});return;}r.setHeader("Cache-Control","public, max-age=60").json(post);}));
const admin=express.Router();admin.use(requireAuth,requireRole(Role.SUPER_ADMIN));
const postSchema=z.object({title:z.string().trim().min(3).max(160),summary:z.string().trim().min(10).max(360),content:z.string().trim().min(20).max(50000),image:imageSchema,published:z.boolean()});
admin.get("/blog",wrap(async(q,r)=>{const page=Math.max(1,Math.min(10000,Number(q.query.page)||1));r.json(await prisma.blogPost.findMany({select:{id:true,title:true,published:true,createdAt:true},orderBy:{createdAt:"desc"},skip:(page-1)*50,take:50}));}));
admin.get("/blog/:id",wrap(async(q,r)=>{const post=await prisma.blogPost.findUnique({where:{id:String(q.params.id)}});if(!post){r.status(404).json({error:"Yazı bulunamadı."});return;}r.json(post);}));
admin.post("/blog",wrap(async(q,r)=>r.status(201).json(await prisma.blogPost.create({data:{...postSchema.parse(q.body),actorId:q.user!.id}}))));
admin.patch("/blog/:id",wrap(async(q,r)=>r.json(await prisma.blogPost.update({where:{id:String(q.params.id)},data:postSchema.parse(q.body)}))));
admin.delete("/blog/:id",wrap(async(q,r)=>{await prisma.blogPost.delete({where:{id:String(q.params.id)}});r.status(204).end();}));
const name=z.string().trim().min(1).max(180).refine(v=>!/[\\/\x00-\x1f]/.test(v)&&![".",".."].includes(v));
admin.get("/files",wrap(async(q,r)=>{
 const folderId=typeof q.query.folderId==="string"?q.query.folderId:null;
 const page=Math.max(1,Math.min(10000,Number(q.query.page)||1));
 const [folders,files,total]=await Promise.all([prisma.managedFolder.findMany({where:{parentId:folderId},orderBy:{name:"asc"},take:500}),prisma.managedFile.findMany({where:{folderId},orderBy:{name:"asc"},take:100,skip:(page-1)*100,select:{id:true,name:true,size:true,folderId:true,createdAt:true}}),prisma.managedFile.count({where:{folderId}})]);
 r.json({folders,files,total,page,pages:Math.ceil(total/100)});
}));
admin.get("/folder-tree",wrap(async(_q,r)=>r.json(await prisma.managedFolder.findMany({orderBy:{name:"asc"},take:5000}))));
admin.get("/file-export",wrap(async(q,r)=>{
 const folders=await prisma.managedFolder.findMany({take:5001});if(folders.length>5000){r.status(400).json({error:"Çok fazla klasör; alt klasörlerden indirin."});return;}
 const selected=typeof q.query.folderId==="string"?q.query.folderId:null,ids=new Set<string>();let changed=true;if(selected)ids.add(selected);
 while(changed){changed=false;for(const f of folders)if((!selected&&f.parentId===null||f.parentId&&ids.has(f.parentId))&&!ids.has(f.id)){ids.add(f.id);changed=true;}}
 const files=await prisma.managedFile.findMany({where:{OR:[{folderId:{in:[...ids]}},...(!selected?[{folderId:null}]:[])]},select:{id:true,name:true,size:true,folderId:true},take:2001});
 if(files.length>2000||files.reduce((n,f)=>n+f.size,0)>100*1024*1024){r.status(400).json({error:"Tek ZIP için sınır 2.000 dosya / 100 MB. Alt klasörlerden parça parça indirin."});return;}
 r.json(files.map(f=>{let parent=f.folderId,parts:string[]=[],depth=0;while(parent&&parent!==selected&&depth++<100){const folder=folders.find(v=>v.id===parent);if(!folder)break;parts.unshift(safeFilename(folder.name)+"_"+folder.id.slice(-6));parent=folder.parentId;}return{...f,zipPath:[...parts,f.id+"_"+safeFilename(f.name)].join("/")};}));
}));
admin.post("/folders",wrap(async(q,r)=>{const v=z.object({name,parentId:z.string().nullable()}).parse(q.body);r.status(201).json(await prisma.managedFolder.create({data:v}));}));
admin.patch("/folders/:id",wrap(async(q,r)=>{
 const v=z.object({name:name.optional(),parentId:z.string().nullable().optional()}).parse(q.body),id=String(q.params.id);
 const result=await prisma.$transaction(async tx=>{
 if(v.parentId!==undefined){let parent=v.parentId,depth=0;while(parent){if(parent===id||depth++>=100)throw new z.ZodError([]);const row: {parentId:string|null}|null=await tx.managedFolder.findUnique({where:{id:parent},select:{parentId:true}});if(!row)throw new z.ZodError([]);parent=row.parentId;}}
 return tx.managedFolder.update({where:{id},data:v});
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});r.json(result);
}));
admin.delete("/folders/:id",wrap(async(q,r)=>{await prisma.managedFolder.delete({where:{id:String(q.params.id)}});r.status(204).end();}));
admin.post("/files",upload.single("file"),wrap(async(q,r)=>{
 let saved=false;try{if(!q.file){r.status(400).json({error:"Dosya seçin."});return;}
 const folderId=z.string().nullable().parse(q.body.folderId||null),file=await prisma.managedFile.create({data:{name:safeFilename(uploadFilename(q.file.originalname)),storedName:q.file.filename,size:q.file.size,folderId,actorId:q.user!.id}});saved=true;r.status(201).json({id:file.id,name:file.name,size:file.size});
 }finally{if(!saved&&q.file)await fs.promises.unlink(q.file.path).catch(()=>{});}
}));
admin.patch("/files/:id",wrap(async(q,r)=>{const v=z.object({name:name.optional(),folderId:z.string().nullable().optional()}).parse(q.body);const id=String(q.params.id),current=await prisma.managedFile.findUnique({where:{id},select:{name:true}});if(!current){r.status(404).json({error:"Dosya bulunamadı."});return;}const f=await prisma.managedFile.update({where:{id},data:{...v,...(v.name!==undefined?{name:renamedFilename(current.name,v.name)}:{})}});r.json({id:f.id,name:f.name});}));
admin.delete("/files/:id",wrap(async(q,r)=>{const file=await prisma.managedFile.delete({where:{id:String(q.params.id)}});await fs.promises.unlink(path.join(root,file.storedName)).catch(()=>{});r.status(204).end();}));
admin.get("/files/:id/download",wrap(async(q,r)=>{const file=await prisma.managedFile.findUnique({where:{id:String(q.params.id)}});if(!file){r.status(404).json({error:"Dosya bulunamadı."});return;}r.type("application/octet-stream").download(path.join(root,file.storedName),safeFilename(file.name));}));
admin.get("/files/:id/shares",wrap(async(q,r)=>r.json(await prisma.managedFileShare.findMany({where:{fileId:String(q.params.id)},select:{id:true,startsAt:true,expiresAt:true,revokedAt:true,createdAt:true},orderBy:{createdAt:"desc"},take:100}))));
admin.post("/files/:id/shares",wrap(async(q,r)=>{const input=z.object({startsAt:z.string().datetime({offset:true}),expiresAt:z.string().datetime({offset:true})}).parse(q.body),startsAt=new Date(input.startsAt),expiresAt=new Date(input.expiresAt);if(!validShareWindow(startsAt,expiresAt))throw new z.ZodError([]);
 const token=crypto.randomBytes(32).toString("base64url"),share=await prisma.managedFileShare.create({data:{fileId:String(q.params.id),tokenHash:hash(token),actorId:q.user!.id,startsAt,expiresAt}});r.status(201).json({id:share.id,url:`${env.WEB_ORIGIN}/dosya-paylasim/${share.id}#${token}`,startsAt,expiresAt});
}));
admin.delete("/file-shares/:id",wrap(async(q,r)=>{await prisma.managedFileShare.updateMany({where:{id:String(q.params.id),revokedAt:null},data:{revokedAt:new Date()}});r.status(204).end();}));
const publicFileLimits={info:new RequestLimiter(30,60_000).middleware(),download:new RequestLimiter(30,60_000).middleware()};
for(const action of ["info","download"] as const){contentRouter.post(`/api/public/file-shares/:id/${action}`,publicFileLimits[action],wrap(async(q,r)=>{
 const {token}=z.object({token:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).parse(q.body),share=await prisma.managedFileShare.findFirst({where:{id:String(q.params.id),tokenHash:hash(token),revokedAt:null},include:{file:true}});
 if(!share||+share.expiresAt<=Date.now()){r.status(410).json({error:"Bağlantı geçersiz, iptal edilmiş veya süresi dolmuş."});return;}
 if(+share.startsAt>Date.now()){r.status(425).json({error:`Dosya ${share.startsAt.toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"})} (İstanbul) tarihinde açılacak.`});return;}
 if(action==="info"){r.json({name:safeFilename(share.file.name)});return;}
 r.type("application/octet-stream").download(path.join(root,share.file.storedName),safeFilename(share.file.name));
}));}
contentRouter.use("/api/admin",admin);
