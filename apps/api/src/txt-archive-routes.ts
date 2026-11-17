import express from "express";
import multer from "multer";
import fs from "node:fs";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { AuthenticatedRequest } from "./auth";
import { RequestLimiter } from "./rate-limit";
import { archiveScope,archiveDto,archiveChecksum,archiveDirectory,archivePath,sealTxt,archiveName } from "./txt-archive";
export const txtArchiveRouter=express.Router();
const ownerSelect={role:true,firstName:true,lastName:true,dealer:{select:{name:true}}} as const;
const wrap=(fn:(req:AuthenticatedRequest,res:express.Response)=>Promise<void>):express.RequestHandler=>async(req,res,next)=>{try{await fn(req as AuthenticatedRequest,res);}catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&["P2021","P2022"].includes(error.code)){res.status(503).json({error:"TXT arşivi veritabanı güncellemesi eksik: 20261111010000_optical_txt_archive migration’ını uygulayın."});return;}next(error);}};
const upload=multer({storage:multer.memoryStorage(),limits:{files:10,fileSize:2*1024*1024,fields:0}});
txtArchiveRouter.get("/txt-files",wrap(async(req,res)=>{const rows=await prisma.opticalTxtFile.findMany({where:{deletedAt:null,...archiveScope(req.user!)},orderBy:[{createdAt:"desc"},{id:"desc"}],select:{id:true,name:true,size:true,createdAt:true,evaluatedAt:true,resultId:true,createdBy:{select:ownerSelect}}});res.json(rows.map(archiveDto));}));
txtArchiveRouter.post("/txt-files",new RequestLimiter(30,10*60_000).middleware(),upload.array("files",10),wrap(async(req,res)=>{
 const files=(req.files??[]) as Express.Multer.File[];if(!files.length||files.some(f=>!f.buffer.length||!/\.txt$/i.test(f.originalname))){res.status(400).json({error:"1–10 adet, boş olmayan TXT dosyası seçin. Her dosya en fazla 2 MB olabilir."});return;}
 const paths:string[]=[];let committed=false;
 try{fs.mkdirSync(archiveDirectory(),{recursive:true,mode:0o700});
 const saved=await prisma.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"txt-upload:"+req.user!.id}))`;const rows=[];for(const file of files){const checksum=archiveChecksum(file.buffer);const previous=await tx.opticalTxtFile.findFirst({where:{createdById:req.user!.id,checksum,deletedAt:null},include:{createdBy:{select:ownerSelect}}});if(previous){rows.push(previous);continue;}const storedName=`${crypto.randomUUID()}.txt.enc`,target=archivePath(storedName);fs.writeFileSync(target,sealTxt(file.buffer),{mode:0o600,flag:"wx"});paths.push(target);rows.push(await tx.opticalTxtFile.create({data:{name:archiveName(file.originalname),storedName,size:file.buffer.length,checksum,createdById:req.user!.id},include:{createdBy:{select:ownerSelect}}}));}return rows;});committed=true;res.status(201).json(saved.map(archiveDto));
 }finally{if(!committed)for(const target of paths)fs.rmSync(target,{force:true});}
}));

txtArchiveRouter.delete("/txt-files/:id",wrap(async(req,res)=>{
 const removed=await prisma.opticalTxtFile.updateMany({where:{id:String(req.params.id),deletedAt:null,...archiveScope(req.user!)},data:{deletedAt:new Date()}});
 if(!removed.count){res.status(404).json({error:"TXT dosyası bulunamadı."});return;}
 res.json({deleted:true});
}));
