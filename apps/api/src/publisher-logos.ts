import express from "express";
import multer from "multer";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Prisma,Role } from "@prisma/client";
import { prisma } from "./db";
import { env } from "./config";
import { requireAuth,requireRole,type AuthenticatedRequest } from "./auth";
import { RequestLimiter } from "./rate-limit";
export class LogoProcessingUnavailable extends Error {}
export async function optimizePublisherLogo(bytes:Buffer){
 if(!bytes.length||bytes.length>5*1024*1024)throw new Error("Logo en fazla 5 MB olabilir.");
 const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,webp=bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP";
 if(!png&&!jpeg&&!webp)throw new Error("Görsel imzası geçersiz.");
 const sharp=(await import("sharp").catch(()=>{throw new LogoProcessingUnavailable("Logo işleme servisi kullanılamıyor.");})).default;
 const image=sharp(bytes,{limitInputPixels:20_000_000,animated:false,failOn:"warning"}),meta=await image.metadata();
 if(!["png","jpeg","webp"].includes(meta.format??"")||(meta.pages??1)>1)throw new Error("Yalnızca tek kare PNG, JPEG veya WebP kabul edilir. SVG kabul edilmez.");
 const result=await image.rotate().resize({width:512,height:256,fit:"inside",withoutEnlargement:true}).png({compressionLevel:9}).toBuffer({resolveWithObject:true});
 return{bytes:result.data,width:result.info.width,height:result.info.height};
}
export const publisherLogoRouter=express.Router();
const directory=path.resolve(env.STORAGE_DIR,"publisher-logos");
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:1,fieldSize:64}});
const wrap=(fn:(q:AuthenticatedRequest,r:express.Response)=>Promise<void>):express.RequestHandler=>async(q,r,n)=>{try{r.setHeader("Cache-Control","private, no-store");await fn(q as AuthenticatedRequest,r);}catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&["P2034","P2002"].includes(e.code)){r.status(409).json({error:"Logo eşzamanlı olarak değişti. Listeyi yenileyip yeniden deneyin."});return;}n(e);}};
const admin=express.Router();admin.use(requireAuth,requireRole(Role.SUPER_ADMIN));
admin.get("/",wrap(async(_q,r)=>{
 const [publishers,logos]=await Promise.all([prisma.publisher.findMany({select:{id:true,name:true,active:true},orderBy:{name:"asc"}}),prisma.publisherLogo.findMany({select:{publisherId:true,updatedAt:true}})]);
 r.json(publishers.map(p=>({...p,logoUpdatedAt:logos.find(l=>l.publisherId===p.id)?.updatedAt??null})));
}));
admin.put("/:id",upload.single("logo"),wrap(async(q,r)=>{
 const id=String(q.params.id);if(!await prisma.publisher.findUnique({where:{id},select:{id:true}})){r.status(404).json({error:"Yayınevi bulunamadı."});return;}
 if(!q.file||!["image/png","image/jpeg","image/webp"].includes(q.file.mimetype)){r.status(400).json({error:"PNG, JPEG veya WebP logo seçin."});return;}
 let output;try{output=await optimizePublisherLogo(q.file.buffer);}catch(e){if(e instanceof LogoProcessingUnavailable){r.status(503).json({error:"Logo işleme servisi kullanılamıyor. Sunucu kurulumunu kontrol edin."});return;}r.status(400).json({error:"Görsel açılamadı veya desteklenmiyor. En fazla 5 MB, 20 megapiksel, tek kare PNG/JPEG/WebP kullanın."});return;}
 const storedName=crypto.randomUUID()+".png",destination=path.join(directory,storedName);
 let committed=false,created=false;
 try{
 await fs.mkdir(directory,{recursive:true,mode:0o700});const handle=await fs.open(destination,"wx",0o600);created=true;try{await handle.writeFile(output.bytes);}finally{await handle.close();}
 const result=await prisma.$transaction(async tx=>{
 const old=await tx.publisherLogo.findUnique({where:{publisherId:id}}),expected=q.body.expectedUpdatedAt??"";
 if((old?.updatedAt.toISOString()??"")!==expected)return null;
 const data={storedName,checksum:crypto.createHash("sha256").update(output.bytes).digest("hex"),width:output.width,height:output.height};
 const saved=await tx.publisherLogo.upsert({where:{publisherId:id},create:{publisherId:id,...data},update:data});return{old,saved};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 if(!result){r.status(409).json({error:"Logo başka bir işlemde değişmiş. Güncel listeyi yükleyip değişikliği yeniden onaylayın."});return;}
 committed=true;if(result.old)await fs.unlink(path.join(directory,path.basename(result.old.storedName))).catch(()=>{});
 r.json({publisherId:id,updatedAt:result.saved.updatedAt,width:output.width,height:output.height});
 }finally{if(created&&!committed)await fs.unlink(destination).catch(()=>{});}
}));
admin.delete("/:id",wrap(async(q,r)=>{
 const id=String(q.params.id),expected=q.get("If-Unmodified-Since");
 const result=await prisma.$transaction(async tx=>{const old=await tx.publisherLogo.findUnique({where:{publisherId:id}});if(!old)return{missing:true};if(!expected||old.updatedAt.toISOString()!==expected)return{conflict:true};await tx.publisherLogo.delete({where:{publisherId:id}});return{old};},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 if("conflict"in result){r.status(409).json({error:"Logo değişmiş. Listeyi yenileyin."});return;}
 if(result.old)await fs.unlink(path.join(directory,path.basename(result.old.storedName))).catch(()=>{});r.status(204).end();
}));
publisherLogoRouter.use("/api/admin/publisher-logos",admin);
publisherLogoRouter.get("/api/publishers/:id/logo",new RequestLimiter(500,60_000).middleware(),async(q,r)=>{
 try{const logo=await prisma.publisherLogo.findUnique({where:{publisherId:String(q.params.id)}});if(!logo){r.status(404).end();return;}
 r.setHeader("X-Content-Type-Options","nosniff");r.setHeader("Cache-Control","public, max-age=0, must-revalidate");const etag=`"${logo.checksum}"`;r.setHeader("ETag",etag);if(q.get("If-None-Match")===etag){r.status(304).end();return;}const bytes=await fs.readFile(path.join(directory,path.basename(logo.storedName)));r.type("image/png").send(bytes);
 }catch{r.status(404).end();}
});
