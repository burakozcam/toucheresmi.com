import {studentWelcome} from './student-welcome';
import {heavyWorkGuard} from './heavy-work';
import {accountInsights,studentAnnouncements,respondToStudent} from './student-services';
import {compatibleStudent} from "./result-data";
import {encryptShareToken} from "./share-security";
import {examView} from "./result-routes";
import {enrichReportView} from "./report-metadata";
import {reportPdf} from "./result-pdf";
import {studentNumberKey} from "./result-identity";
import express from "express";
import { Prisma, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "./auth";
import { prisma } from "./db";
import { env } from "./config";
import { privateResult, resultStudent, type StoredResult } from "./reader-core";
import { RequestLimiter } from "./rate-limit";

export const readerRouter=express.Router();
readerRouter.use(requireAuth,(_req,res,next)=>{res.setHeader("Cache-Control","private, no-store");next();});
const manager:express.RequestHandler=(req:AuthenticatedRequest,res,next)=>{if(req.user!.role!==Role.SUPER_ADMIN&&req.user!.role!==Role.DEALER){res.status(403).json({error:"Bu işlem için bayi veya yönetici hesabı gerekir."});return;}next();};
const reader:express.RequestHandler=(req:AuthenticatedRequest,res,next)=>{if(req.user!.role!==Role.STUDENT&&req.user!.role!==Role.PARENT){res.status(403).json({error:"Öğrenci veya veli hesabı gerekir."});return;}next();};
const schoolScope=(req:AuthenticatedRequest):Prisma.SchoolWhereInput=>req.user!.role===Role.SUPER_ADMIN?{}:{dealerId:req.user!.dealerId??"__none__"};
const accountScope=(req:AuthenticatedRequest):Prisma.UserWhereInput=>({role:{in:[Role.STUDENT,Role.PARENT]},...(req.user!.role===Role.SUPER_ADMIN?{}:{school:{dealerId:req.user!.dealerId??"__none__"}})});
const accountSelect={id:true,email:true,firstName:true,lastName:true,role:true,active:true,mustChangePassword:true} as const;
const id=(req:AuthenticatedRequest)=>String(req.params.id??"");
type Handler=(req:AuthenticatedRequest,res:express.Response)=>Promise<void>;
const wrap=(handler:Handler):express.RequestHandler=>async(req,res,next)=>{try{await handler(req as AuthenticatedRequest,res);}catch(e){
  if(e instanceof z.ZodError){res.status(400).json({error:e.issues[0]?.message??"Bilgileri kontrol edin."});return;}
  if(e instanceof Prisma.PrismaClientKnownRequestError){if(e.code==="P2002"){res.status(409).json({error:"Bu e-posta veya sonuç bağlantısı zaten kayıtlı. Mevcut hesabı seçin; farklı yöneticiye bağlı hesaplar için sistem yöneticisine başvurun."});return;}if(["P2021","P2022"].includes(e.code)){res.status(503).json({error:"Öğrenci/veli sistemi veritabanı güncellemesi henüz uygulanmamış."});return;}}
  next(e);
}};
const selection=z.object({resultId:z.string().min(1).max(100),studentNo:z.string().trim().min(1).max(180)});
async function invitation(){const passwordHash=await bcrypt.hash(crypto.randomBytes(32).toString("base64url"),12),token=crypto.randomBytes(32).toString("base64url");return{passwordHash,token,setupTokenHash:crypto.createHash("sha256").update(token).digest("hex"),setupExpiresAt:new Date(Date.now()+30*60_000)};}
function inviteResponse(res:express.Response,account:unknown,invite:Awaited<ReturnType<typeof invitation>>,status=200){res.status(status).json({user:account,setupUrl:`${env.WEB_ORIGIN}/hesap-kur#${invite.token}`,expiresAt:invite.setupExpiresAt});}
const inviteLimiter=new RequestLimiter(30,10*60_000).middleware();

readerRouter.get("/reader-accounts",manager,wrap(async(req,res)=>{
  const accounts=await prisma.user.findMany({
    where:accountScope(req),
    select:{...accountSelect,studentResultAccess:{
      where:{result:{school:schoolScope(req)}},
      select:{id:true,studentNo:true,studentName:true,resultId:true,result:{select:{
        revision:true,studentPublished:true,createdAt:true,school:{select:{name:true}},key:{select:{name:true}},
      }}},
    }},
    orderBy:{createdAt:"desc"},take:200,
  });
  res.json(accounts);
}));
readerRouter.post("/reader-accounts",manager,inviteLimiter,wrap(async(req,res)=>{
  const data=selection.extend({role:z.enum(["STUDENT","PARENT"]),email:z.string().trim().email().max(254),firstName:z.string().trim().min(2).max(80),lastName:z.string().trim().min(2).max(80)}).parse(req.body);
  const allowed=await prisma.opticalResult.findFirst({where:{id:data.resultId,nextRevision:null,school:{active:true,...schoolScope(req)}},select:{snapshot:true}});
  if(!allowed){res.status(404).json({error:"Sonuç bulunamadı veya bu kurumda yetkiniz yok."});return;}
  let student;try{student=resultStudent(allowed.snapshot,data.studentNo);}catch(e){res.status(400).json({error:(e as Error).message});return;}
  const invite=await invitation();
  const account=await prisma.$transaction(async tx=>{
    const current=await tx.opticalResult.findFirst({where:{id:data.resultId,nextRevision:null,school:{active:true,...schoolScope(req)}},select:{schoolId:true}});if(!current)return null;
    const created=await tx.user.create({data:{email:data.email.toLowerCase(),firstName:data.firstName,lastName:data.lastName,role:data.role,schoolId:current.schoolId,readerManagerId:req.user!.id,readerStudentNo:data.role==="STUDENT"?((student as any).studentNo??student.id)||null:null,passwordHash:invite.passwordHash,setupTokenHash:invite.setupTokenHash,setupExpiresAt:invite.setupExpiresAt,mustChangePassword:true,studentResultAccess:{create:{resultId:data.resultId,studentNo:data.studentNo,studentName:student.name}}},select:accountSelect});
    await tx.fmtShare.create({data:{category:"MEMBERSHIP",targetId:created.id,name:`${data.firstName} ${data.lastName}`,createdById:req.user!.id,tokenHash:invite.setupTokenHash,tokenEncrypted:encryptShareToken(invite.token),expiresAt:invite.setupExpiresAt}});return created;
  });
  if(!account){res.status(403).json({error:"Kurum erişimi değişti. Sayfayı yenileyin."});return;}
  inviteResponse(res,account,invite,201);
}));
readerRouter.post("/reader-accounts/:id/access",manager,wrap(async(req,res)=>{
  const data=selection.parse(req.body);
  const saved=await prisma.$transaction(async tx=>{
    const [account,result]=await Promise.all([tx.user.findFirst({where:{id:id(req),...accountScope(req)},select:{id:true,role:true,schoolId:true,readerStudentNo:true,studentResultAccess:{select:{studentNo:true,result:{select:{schoolId:true,snapshot:true}}}}}}),tx.opticalResult.findFirst({where:{id:data.resultId,nextRevision:null,school:{active:true,...schoolScope(req)}},select:{snapshot:true,schoolId:true}})]);
    if(!account||!result)return{error:"Hesap veya sonuç bulunamadı; erişim yetkinizi kontrol edin.",status:404};
    let student;try{student=resultStudent(result.snapshot,data.studentNo);}catch(e){return{error:(e as Error).message,status:400};}
    if(account.role===Role.STUDENT){
     if(account.schoolId&&account.schoolId!==result.schoolId||account.studentResultAccess.some(a=>a.result.schoolId!==result.schoolId))return{error:"Öğrenci hesabına başka kurumun sonucu bağlanamaz.",status:400};
     const linked=account.studentResultAccess.flatMap(a=>{try{return[resultStudent(a.result.snapshot,a.studentNo)];}catch{return[];}});
     if(linked.length&&!linked.some(source=>compatibleStudent(source as any,student as any)))return{error:"Öğrenci hesabına farklı bir öğrencinin sonucu bağlanamaz. Birden fazla çocuk için veli hesabı kullanın.",status:400};
     const physical=(student as any).studentNo??student.id;
     if(!linked.length&&account.readerStudentNo&&account.readerStudentNo!==physical&&account.readerStudentNo!==student.id)return{error:"Öğrenci numarası hesapla eşleşmiyor.",status:400};
     if(!account.readerStudentNo)await tx.user.update({where:{id:account.id},data:{readerStudentNo:physical||null,schoolId:result.schoolId}});
    }
    const grant=await tx.studentResultAccess.upsert({where:{userId_resultId_studentNo:{userId:account.id,resultId:data.resultId,studentNo:data.studentNo}},create:{userId:account.id,resultId:data.resultId,studentNo:data.studentNo,studentName:student.name},update:{}});
    return{grant};
  });
  if("error"in saved){res.status(saved.status!).json({error:saved.error});return;}res.status(201).json(saved.grant);
}));
readerRouter.delete("/reader-access/:id",manager,wrap(async(req,res)=>{
  const count=await prisma.$transaction(async tx=>{
    const grant=await tx.studentResultAccess.findFirst({where:{id:id(req),user:accountScope(req),result:{school:schoolScope(req)}},include:{result:{select:{seriesId:true}}}});
    if(!grant)return 0;
    const removed=await tx.studentResultAccess.deleteMany({where:{userId:grant.userId,studentNo:grant.studentNo,result:{seriesId:grant.result.seriesId,school:schoolScope(req)}}});return removed.count;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  if(!count){res.status(404).json({error:"Bağlantı bulunamadı veya yetkiniz yok."});return;}res.status(204).end();
}));
readerRouter.post("/reader-accounts/:id/invitation",manager,inviteLimiter,wrap(async(req,res)=>{
  const invite=await invitation();
  const result=await prisma.$transaction(async tx=>{const updated=await tx.user.updateMany({where:{id:id(req),...accountScope(req)},data:{active:true,passwordHash:invite.passwordHash,setupTokenHash:invite.setupTokenHash,setupExpiresAt:invite.setupExpiresAt,mustChangePassword:true}});
    if(updated.count){await tx.fmtShare.updateMany({where:{category:"MEMBERSHIP",targetId:id(req),usedAt:null,revokedAt:null},data:{revokedAt:new Date()}});await tx.fmtShare.create({data:{category:"MEMBERSHIP",targetId:id(req),name:"Öğrenci / veli hesap daveti",createdById:req.user!.id,tokenHash:invite.setupTokenHash,tokenEncrypted:encryptShareToken(invite.token),expiresAt:invite.setupExpiresAt}});}return updated;
  });
  if(!result.count){res.status(404).json({error:"Hesap bulunamadı veya yetkiniz yok."});return;}
  const account=await prisma.user.findUnique({where:{id:id(req)},select:accountSelect});inviteResponse(res,account,invite);
}));
readerRouter.patch("/reader-accounts/:id",manager,wrap(async(req,res)=>{
  z.object({active:z.literal(false)}).parse(req.body);
  const passwordHash=await bcrypt.hash(crypto.randomBytes(32).toString("base64url"),12);
  const changed=await prisma.user.updateMany({where:{id:id(req),...accountScope(req)},data:{active:false,passwordHash,setupTokenHash:null,setupExpiresAt:null,mustChangePassword:true}});
  if(!changed.count){res.status(404).json({error:"Hesap bulunamadı veya yetkiniz yok."});return;}res.json({message:"Hesap erişimi kapatıldı. Önceki oturum ve davetler geçersizdir."});
}));
readerRouter.get("/my-results",reader,wrap(async(req,res)=>{
  const access=await prisma.studentResultAccess.findMany({where:{userId:req.user!.id,result:{studentPublished:true,nextRevision:null,school:{active:true}}},select:{id:true,studentNo:true,studentName:true,result:{select:{id:true,createdAt:true,snapshot:true}}},orderBy:{result:{createdAt:"desc"}},take:100});
  res.json(access.filter(a=>!(a.result.snapshot as any)?.deletedAt).map(a=>({id:a.id,studentNo:a.studentNo,studentName:a.studentName,resultId:a.result.id,createdAt:a.result.createdAt,examName:(a.result.snapshot as unknown as StoredResult).keyName,schoolName:(a.result.snapshot as unknown as StoredResult).schoolName})));
}));
async function ownExam(req:AuthenticatedRequest){
 const access=await prisma.studentResultAccess.findFirst({where:{id:id(req),userId:req.user!.id,result:{studentPublished:true,nextRevision:null,school:{active:true}}},select:{studentNo:true,result:{select:{schoolId:true,keyId:true,createdAt:true,snapshot:true}}}});
 if(!access)return null;
 let own;try{own=resultStudent(access.result.snapshot,access.studentNo);}catch{return null;}
 const view=await examView(access.result.schoolId,access.result.keyId,true);if(!view)return null;
 const matches=view.data.students.filter(s=>compatibleStudent(s,own as typeof s));
 return matches.length===1?{view,person:matches[0],createdAt:access.result.createdAt}:null;
}
readerRouter.get("/my-results/:id",reader,wrap(async(req,res)=>{
 const found=await ownExam(req);if(!found){res.status(404).json({error:"Sonuç bulunamadı, yayımlanmamış veya hesabınıza bağlı değil."});return;}
 res.json({createdAt:found.createdAt,...privateResult(found.view,found.person.id),rankings:{[found.person.id]:found.view.rankings[found.person.id]}});
}));

readerRouter.get("/my-results/:id/pdf",reader,wrap(async(req,res)=>{
 const showSiteAddress=z.enum(["true","false"]).default("true").parse(req.query.showSiteAddress)==="true";
 const showSchoolParticipation=z.enum(["true","false"]).default("true").parse(req.query.showSchoolParticipation)==="true";
 const showGeneralParticipation=z.enum(["true","false"]).default("true").parse(req.query.showGeneralParticipation)==="true";
 const templateId=z.enum(["summary-card","two-page-card","detailed-card","classic-card","analysis-card","table-card"]).default("detailed-card").parse(req.query.templateId);
 const found=await ownExam(req);if(!found){res.status(404).json({error:"Yayımlanmış sonuç bulunamadı veya hesabınıza bağlı değil."});return;}
 res.attachment("ogrenci-karnesi.pdf").type("application/pdf").send(await reportPdf(await enrichReportView(found.view),{kind:"cards",order:"name",hideIdentity:true,studentId:found.person.id,templateId,showGeneralParticipation,showSchoolParticipation,showSiteAddress}));
}));

const insightsGuard=heavyWorkGuard(2,1,true);
const studentOnly:express.RequestHandler=(q:AuthenticatedRequest,r,n)=>{if(q.user!.role!==Role.STUDENT){r.status(403).json({error:"Asistan yalnız öğrenci hesabına açıktır."});return;}n();};
readerRouter.get('/student-insights',studentOnly,insightsGuard,wrap(async(q,r)=>{r.json(await accountInsights(q.user!.id));}));
readerRouter.get('/student-welcome',studentOnly,wrap(async(q,r)=>{
 const [welcome,announcements]=await Promise.all([studentWelcome('account',q.user!.id),studentAnnouncements(q.user!.schoolId,q.user!.id)]);
 r.json({...welcome,announcements});
}));
readerRouter.post('/student-assistant',studentOnly,new RequestLimiter(30,60_000).middleware(),insightsGuard,wrap(async(q,r)=>{r.json(respondToStudent(q.body,await accountInsights(q.user!.id),await studentAnnouncements(q.user!.schoolId,q.user!.id)));}));
