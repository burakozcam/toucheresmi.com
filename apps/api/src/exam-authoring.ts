import express from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import {Prisma,Role} from "@prisma/client";
import {z} from "zod";
import {prisma} from "./db";
import {env} from "./config";
import {requireAuth,requireRole,type AuthenticatedRequest} from "./auth";
import {opticalQuestionsSchema} from "./optical-core";
import {configuredNewExamProfile} from "./scoring-profile";
export async function optimizedCover(image:string|null){
 if(image===null)return null;const match=image.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);if(!match||image.length>1_000_000)throw Error('Kapak PNG, JPEG veya WebP ve en fazla 750 KB olmalıdır.');
 const bytes=Buffer.from(match[2],'base64'),pipeline=sharp(bytes,{limitInputPixels:20_000_000,failOn:'error'}),meta=await pipeline.metadata();if(!['jpeg','png','webp'].includes(meta.format??'')||meta.pages&&meta.pages>1)throw Error('Yalnız tek kareli PNG, JPEG veya WebP desteklenir.');
 const buffer=await pipeline.rotate().resize(450,600,{fit:'cover'}).webp({quality:78}).toBuffer();return `data:image/webp;base64,${buffer.toString('base64')}`;
}
const examInput=z.object({clientId:z.string().max(100),publisherId:z.string().min(1),examName:z.string().trim().min(2).max(180),grade:z.number().int().min(1).max(12),examDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'Geçerli sınav tarihi girin.'),published:z.boolean().default(false),showInEvaluation:z.boolean().default(true),penalty:z.number().int().min(0).max(10).default(3),questions:opticalQuestionsSchema,coverImage:z.string().max(1_000_000).nullable().optional()});
export const examAuthoringRouter=express.Router();examAuthoringRouter.use('/api/admin',requireAuth,requireRole(Role.SUPER_ADMIN));
examAuthoringRouter.patch('/api/admin/answer-keys/:id/cover',async(q,r,n)=>{try{const v=z.object({image:z.string().max(1_000_000).nullable()}).parse(q.body),coverImage=await optimizedCover(v.image);const record=await prisma.publishedAnswerKey.update({where:{id:String(q.params.id)},data:{coverImage},select:{id:true,coverImage:true}});r.json(record);}catch(e){if(e instanceof z.ZodError||e instanceof Error&&!(e as any).code){r.status(400).json({error:e.message});return;}n(e);}});
examAuthoringRouter.post('/api/admin/bulk-exams',async(request:AuthenticatedRequest,response,next)=>{
 const parsed=z.object({exams:z.array(z.unknown()).min(1).max(50)}).safeParse(request.body);if(!parsed.success){response.status(400).json({error:'1–50 sınav gönderin.'});return;}
 const results=[];
 for(const [index,raw]of parsed.data.exams.entries()){
  const files:string[]=[];let committed=false;
  try{
   const input=examInput.parse(raw),publisher=await prisma.publisher.findFirst({where:{id:input.publisherId,active:true}});if(!publisher)throw Error('Etkin yayınevi seçin.');
   const coverImage=input.coverImage?await optimizedCover(input.coverImage):null,questions=await configuredNewExamProfile(input.questions,publisher.name,input.grade);
   const result=await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.publisherId+':'+input.grade}))`;
    if(await tx.publishedAnswerKey.findFirst({where:{publisherId:input.publisherId,grade:input.grade,examName:{equals:input.examName,mode:'insensitive'}}}))throw Error('Bu yayınevi ve sınıfta aynı adlı sınav zaten var.');
    const id="exam"+crypto.randomBytes(16).toString("hex"),directory=path.resolve(env.STORAGE_DIR,'answer-keys',id);fs.mkdirSync(directory,{recursive:true,mode:0o700});
    const x=require('xlsx'),book=x.utils.book_new(),rows=[['DERS','A SORU NO','B SORU NO','C SORU NO','D SORU NO','DOĞRU CEVAP','KATSAYI','KAZANIM KODU','KAZANIM METNİ'],...questions.map(q=>[q.lesson,q.number,q.positions.B??'',q.positions.C??'',q.positions.D??'',q.answer,q.weight??'',q.outcomeCode??'',q.outcomeName??''])];x.utils.book_append_sheet(book,x.utils.aoa_to_sheet(rows),'Sınav');const buffer=x.write(book,{type:'buffer',bookType:'xlsx'});
    const records=['ANSWER_KEY','LEARNING_OUTCOMES'].map(category=>{const filename=category==='ANSWER_KEY'?'cevap-anahtari.xlsx':'kazanimlar.xlsx',storagePath=path.join(directory,filename);fs.writeFileSync(storagePath,buffer,{mode:0o600});files.push(storagePath);return{category:category as 'ANSWER_KEY'|'LEARNING_OUTCOMES',storagePath,storedFileName:filename,originalFileName:filename,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',size:buffer.length};});
    const publication=await tx.publishedAnswerKey.create({data:{id,publisherId:input.publisherId,examName:input.examName,grade:input.grade,examDate:new Date(input.examDate),coverImage,published:input.published,showInEvaluation:input.showInEvaluation,createdByUserId:request.user!.id,files:{create:records},opticalKey:{create:{name:`${publisher.name} / ${input.examName} / ${id}`,questions:questions as unknown as Prisma.InputJsonValue,penalty:input.penalty,active:true}}}});
    await tx.auditLog.create({data:{actorUserId:request.user!.id,actorName:request.user!.id,action:'BULK_EXAM_CREATE',targetType:'PublishedAnswerKey',targetId:publication.id,summary:JSON.stringify({clientId:input.clientId,questionCount:questions.length})}});return publication;
   });committed=true;results.push({index,clientId:input.clientId,status:'success',id:result.id});
  }catch(error){results.push({index,clientId:(raw as any)?.clientId,status:'error',error:error instanceof z.ZodError?error.issues[0]?.message:error instanceof Error?error.message:'Sınav kaydedilemedi.'});}
  finally{if(!committed)for(const file of files){try{fs.unlinkSync(file);}catch{}}}
 }
 response.status(207).json({results,successCount:results.filter(r=>r.status==='success').length});
});
