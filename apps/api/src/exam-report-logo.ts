import {normalizeExamReportLogo} from './report-logo-image';
import express from 'express';
import {Prisma} from '@prisma/client';
import {z} from 'zod';
import {prisma} from './db';
import {dealerPermission,schoolScope} from './dealer-policy';
import type {AuthenticatedRequest} from './auth';
import {SecurityError} from './security-errors';
import {RequestLimiter} from './rate-limit';
export const examReportLogoRouter=express.Router();
const wrap=(fn:(q:AuthenticatedRequest,r:express.Response)=>Promise<void>):express.RequestHandler=>async(q,r,n)=>{try{await fn(q as AuthenticatedRequest,r);}catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&['P2021','P2022'].includes(error.code)){r.status(503).json({error:'Sınava özel logo için veritabanı güncellemesi henüz uygulanmamış.'});return;}n(error);}};
async function ownExam(q:AuthenticatedRequest,schoolId:string,db:any=prisma){
 const keyId=String(q.params.id);
 const school=await db.school.findFirst({where:{id:schoolId,active:true,...schoolScope(q.user!)},select:{id:true}});
 if(!school||!await db.opticalResult.findFirst({where:{schoolId,keyId},select:{id:true}}))throw new SecurityError(404,'Kurum veya sınav bulunamadı.');
 return {schoolId,keyId};
}
examReportLogoRouter.get('/result-exams/:id/report-logo',wrap(async(q,r)=>{
 const schoolId=z.string().min(1).max(100).parse(q.query.schoolId),scope=await ownExam(q,schoolId),dealer=await dealerPermission(q.user!,'canExport');
 const logo=await prisma.examReportLogo.findUnique({where:{schoolId_keyId:scope}});
 r.json({image:logo?.image??null,enabled:logo?.enabled??false,canEdit:q.user!.role==='SUPER_ADMIN'||!!dealer?.canEditResult});
}));
examReportLogoRouter.put('/result-exams/:id/report-logo',new RequestLimiter(20,10*60_000,10000,'exam-report-logo').middleware(q=>(q as AuthenticatedRequest).user!.id),wrap(async(q,r)=>{
 const data=z.object({schoolId:z.string().min(1).max(100),enabled:z.boolean(),image:z.string().max(3_000_000).optional()}).strict().parse(q.body);
 await dealerPermission(q.user!,'canEditResult');await ownExam(q,data.schoolId);
 const image=data.image?await normalizeExamReportLogo(data.image):undefined;
 const saved=await prisma.$transaction(async tx=>{
  await dealerPermission(q.user!,'canEditResult',tx,true);const scope=await ownExam(q,data.schoolId,tx),old=await tx.examReportLogo.findUnique({where:{schoolId_keyId:scope}});
  if(data.enabled&&!image&&!old?.image)throw new SecurityError(400,'Önce bu sınav için bir logo görseli seçin.');
  const actor=q.user!.actorAdminId??q.user!.id;
  const next=image?await tx.examReportLogo.upsert({where:{schoolId_keyId:scope},create:{...scope,enabled:data.enabled,image,updatedById:actor},update:{image,enabled:data.enabled,updatedById:actor}}):old?await tx.examReportLogo.update({where:{id:old.id},data:{enabled:data.enabled,updatedById:actor}}):null;
  await tx.auditLog.create({data:{actorUserId:actor,actorName:actor,action:'REPORT_LOGO_UPDATE',targetType:'OpticalExam',targetId:`${scope.schoolId}:${scope.keyId}`,summary:data.enabled?'Sınava özel karne logosu kaydedildi.':'Karnenin varsayılan logosuna dönüldü.'}});
  return next;
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 r.json({image:saved?.image??null,enabled:saved?.enabled??false,canEdit:true});
}));
