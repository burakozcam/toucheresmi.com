import express from "express";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireRole, type AuthenticatedRequest } from "./auth";
import { prisma } from "./db";
import { SecurityError } from "./security-errors";
export const publisherTransferRouter=express.Router();
publisherTransferRouter.use(requireAuth,requireRole(Role.SUPER_ADMIN));
const input=z.object({publisherId:z.string().min(1).max(100),expectedPublisherId:z.string().min(1).max(100),expectedUpdatedAt:z.string().datetime(),confirm:z.boolean().default(false)});
/** Only affiliation changes. Key fingerprints, snapshots and identity stay untouched. */
export async function transferPublisher(tx:any,id:string,data:z.infer<typeof input>,actorId:string){
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"publisher-transfer:"+id}))`;
 const current=await tx.publishedAnswerKey.findUnique({where:{id},include:{publisher:true,opticalKey:{select:{id:true,_count:{select:{results:true}}}}}});
 const target=await tx.publisher.findFirst({where:{id:data.publisherId,active:true}});
 if(!current||!target)throw new SecurityError(404,"Sınav veya etkin hedef yayınevi bulunamadı.");
 if(current.publisherId!==data.expectedPublisherId||current.updatedAt.toISOString()!==data.expectedUpdatedAt)throw new SecurityError(409,"Sınav değişti. Güncel kayıttan yeniden önizleyin.");
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.publisherId+":"+current.grade}))`;
 if(await tx.publishedAnswerKey.findFirst({where:{id:{not:id},publisherId:target.id,grade:current.grade,examName:{equals:current.examName,mode:"insensitive"}}}))throw new SecurityError(409,"Hedef yayınevinde aynı sınıf ve isimde sınav var.");
 const schedules=await tx.examScheduleEntry.findMany({where:{answerKeyId:id}});
 for(const row of schedules)if(await tx.examScheduleEntry.findFirst({where:{id:{not:row.id},publisherId:target.id,level:row.level,sequence:row.sequence,examDate:row.examDate}}))throw new SecurityError(409,"Hedef yayınevinin takviminde çakışma var. Önce takvimi düzenleyin.");
 const preview={examName:current.examName,from:current.publisher.name,to:target.name,resultCount:current.opticalKey?._count.results??0,scheduleCount:schedules.length,warning:"Yayınevi bazlı bayi bölge izinleri yeni yayınevine göre uygulanır. Kurumlar, kayıtlı sonuçlar ve sıralama verileri korunur. Arşivdeki PDF metinleri değişmez."};
 if(data.confirm){
  await tx.publishedAnswerKey.update({where:{id},data:{publisherId:target.id}});
  await tx.examScheduleEntry.updateMany({where:{answerKeyId:id},data:{publisherId:target.id}});
  await tx.auditLog.create({data:{actorUserId:actorId,actorName:"Yönetici",action:"EXAM_PUBLISHER_TRANSFER",targetType:"PublishedAnswerKey",targetId:id,summary:JSON.stringify({from:current.publisherId,to:target.id})}});
 }
 return {...preview,saved:data.confirm};
}
publisherTransferRouter.post("/answer-keys/:id/publisher",async(req:AuthenticatedRequest,res,next)=>{try{const data=input.parse(req.body);res.json(await prisma.$transaction(tx=>transferPublisher(tx,String(req.params.id),data,req.user!.id),{isolationLevel:Prisma.TransactionIsolationLevel.Serializable}));}catch(error){if(error instanceof z.ZodError){res.status(400).json({error:"Yayınevi ve güncel sınav bilgilerini kontrol edin."});return;}next(error);}});
