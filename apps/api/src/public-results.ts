import {humanVerificationConfig} from "./captcha-config";
import {enrichReportView} from "./report-metadata";
import {env} from "./config";
import {verifyHuman} from "./human-verification";
import { resultGrade } from "../lib/result-grade";
import express from "express";
import { z } from "zod";
import { prisma } from "./db";
import { RequestLimiter } from "./rate-limit";
import { examView } from "./result-routes";
import { identityHash,studentNumberKey,matchesReportAccessCode } from "./result-identity";
import { isDeleted } from "./result-data";
import { reportPdf } from "./result-pdf";
export const publicResultsRouter=express.Router();
publicResultsRouter.use((_req,res,next)=>{res.setHeader("Cache-Control","private, no-store");next();});
publicResultsRouter.use(new RequestLimiter(30,10*60_000).middleware());
const wrap=(fn:(req:express.Request,res:express.Response)=>Promise<void>):express.RequestHandler=>async(req,res,next)=>{try{await fn(req,res);}catch(e){if(e instanceof z.ZodError){res.status(400).json({error:e.issues[0]?.message??"Kurum, sınıf, öğrenci bilgisini kontrol edin."});return;}if(e instanceof Error&&!((e as any).code)&&/eşleştirme|çelişen|cevap anahtarları/.test(e.message)){res.status(400).json({error:"Sonuç kayıtlarının eşleştirmesi belirsiz. Kurumunuzdan kayıtları kontrol etmesini isteyin."});return;}next(e);}};
publicResultsRouter.get("/schools",wrap(async(_req,res)=>{const rows=await prisma.opticalResult.findMany({where:{nextRevision:null,studentPublished:true,school:{active:true}},include:{school:{select:{id:true,name:true}}}});res.json([...new Map(rows.filter(r=>!isDeleted(r.snapshot)).map(r=>[r.schoolId,r.school])).values()].sort((a,b)=>a.name.localeCompare(b.name,"tr")));}));
publicResultsRouter.get("/classes",wrap(async(req,res)=>{const schoolId=z.string().min(1).parse(req.query.schoolId);const rows=await prisma.opticalResult.findMany({where:{schoolId,nextRevision:null,studentPublished:true,school:{active:true}},select:{snapshot:true}});res.json([...new Set(rows.filter(r=>!isDeleted(r.snapshot)).flatMap(r=>(r.snapshot as any).data.students.map((s:any)=>s.branch)))].sort());}));
publicResultsRouter.get("/grades",wrap(async(req,res)=>{const schoolId=z.string().min(1).parse(req.query.schoolId);const rows=await prisma.opticalResult.findMany({where:{schoolId,nextRevision:null,studentPublished:true,school:{active:true}},select:{snapshot:true}});res.json([...new Set(rows.filter(r=>!isDeleted(r.snapshot)).flatMap(r=>(r.snapshot as any).data.students.map((s:any)=>resultGrade(s.branch))))].sort());}));
const lookup=z.object({schoolId:z.string().min(1).max(100),branch:z.string().min(1).max(100).optional(),grade:z.string().regex(/^\d{1,2}$/).optional(),identifier:z.string().trim().min(1).max(30),keyId:z.string().optional(),studentId:z.string().optional()});
export async function lookupStudentResults(input:z.infer<typeof lookup>,accessCode?:string){
 if(!input.grade&&!input.branch)return[];
 const school=await prisma.school.findFirst({where:{id:input.schoolId,active:true},select:{id:true}});if(!school)return[];
 const rows=await prisma.opticalResult.findMany({where:{schoolId:input.schoolId,nextRevision:null,studentPublished:true},select:{keyId:true,snapshot:true}});const keys=[...new Set(rows.filter(row=>!isDeleted(row.snapshot)).map(row=>row.keyId))].filter(id=>!input.keyId||input.keyId===id);const results:any[]=[];
 for(const key of keys){const view=await examView(input.schoolId,key,true);if(!view)continue;const students=view.data.students.filter(s=>(input.grade?resultGrade(s.branch)===input.grade:s.branch===input.branch)&&(studentNumberKey(s.studentNo??s.id)===studentNumberKey(input.identifier)||s.identityHash===identityHash(input.identifier))&&(!accessCode||matchesReportAccessCode(accessCode,input.schoolId,key,s)));
 // A school number may identify different children in different sections. Never
 // reveal all matches or let a caller disambiguate by guessing studentId.
 const unique=new Set(students.map(s=>s.identityHash??`${s.studentNo??s.id}:${s.name}:${s.branch}`));
 if(unique.size>1)throw new z.ZodError([{code:"custom",path:["identifier"],message:"Öğrenci numarası birden fazla kayıtla eşleşiyor. TC veya öğrenci hesabıyla giriş yapın."}]);
 for(const student of students.filter(s=>!input.studentId||s.id===input.studentId))results.push({view,student});}

 const matchedPeople=new Set(results.map(({student})=>student.identityHash??`${student.studentNo??student.id}:${student.name}:${student.branch}`));
 if(matchedPeople.size>1)throw new z.ZodError([{code:"custom",path:["identifier"],message:"Öğrenci numarası birden fazla kayıtla eşleşiyor. TC veya öğrenci hesabıyla giriş yapın."}]);
 return results;
}
publicResultsRouter.use(["/lookup","/pdf"],async(req,res,next)=>{
 if(req.method!=="POST"){next();return;}
 const config=humanVerificationConfig();
 if(!await verifyHuman(req.body?.humanToken,"results",config)){res.status(403).json({error:"İnsan doğrulaması başarısız veya süresi doldu. Lütfen yeniden deneyin."});return;}next();
});
publicResultsRouter.post("/lookup",wrap(async(req,res)=>{const input=lookup.extend({accessCode:z.string().regex(/^[A-Za-z0-9_-]{16}$/,"Kurumunuzdan aldığınız erişim kodunu girin veya öğrenci hesabınızla giriş yapın.")}).parse(req.body),found=await lookupStudentResults(input,input.accessCode);if(!found.length){res.status(404).json({error:"Bu bilgilerle erişilebilir sonuç bulunamadı. Kurum, sınıf, öğrenci bilgisi ve erişim kodunu kontrol edin."});return;}
 res.json(found.map(({view,student})=>({keyId:view.keyId,examName:view.keyName,schoolName:view.schoolName,student:{id:student.id,name:student.name,studentNo:student.studentNo,branch:student.branch},summary:view.summary.find((r:any)=>r.id===student.id),ranking:view.rankings[student.id]})));
}));
publicResultsRouter.post("/pdf",wrap(async(req,res)=>{const input=lookup.extend({accessCode:z.string().regex(/^[A-Za-z0-9_-]{16}$/),keyId:z.string().min(1),templateId:z.enum(["classic-card","analysis-card","table-card","summary-card","detailed-card"]).optional()}).parse(req.body),found=await lookupStudentResults(input,input.accessCode);if(!found.length){res.status(404).json({error:"Sonuç bulunamadı veya bilgiler geçersiz."});return;}const {view,student}=found[0];res.attachment("ogrenci-karnesi.pdf").type("application/pdf").send(await reportPdf(await enrichReportView(view),{kind:"cards",order:"name",hideIdentity:true,studentId:student.id,templateId:input.templateId}));}));
