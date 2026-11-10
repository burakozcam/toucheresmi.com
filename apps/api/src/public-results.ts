import express from "express";
import { z } from "zod";
import { prisma } from "./db";
import { RequestLimiter } from "./rate-limit";
import { examView } from "./result-routes";
import { identityHash,studentNumberKey } from "./result-identity";
import { isDeleted } from "./result-data";
import { reportPdf } from "./result-pdf";
export const publicResultsRouter=express.Router();
publicResultsRouter.use((_req,res,next)=>{res.setHeader("Cache-Control","private, no-store");next();});
publicResultsRouter.use(new RequestLimiter(30,10*60_000).middleware());
const wrap=(fn:(req:express.Request,res:express.Response)=>Promise<void>):express.RequestHandler=>async(req,res,next)=>{try{await fn(req,res);}catch(e){if(e instanceof z.ZodError){res.status(400).json({error:"Kurum, sınıf, öğrenci bilgisi  kontrol edin."});return;}next(e);}};
publicResultsRouter.get("/schools",wrap(async(_req,res)=>{const rows=await prisma.opticalResult.findMany({where:{nextRevision:null,school:{active:true}},include:{school:{select:{id:true,name:true}}}});res.json([...new Map(rows.filter(r=>!isDeleted(r.snapshot)).map(r=>[r.schoolId,r.school])).values()].sort((a,b)=>a.name.localeCompare(b.name,"tr")));}));
publicResultsRouter.get("/classes",wrap(async(req,res)=>{const schoolId=z.string().min(1).parse(req.query.schoolId);const rows=await prisma.opticalResult.findMany({where:{schoolId,nextRevision:null,school:{active:true}},select:{snapshot:true}});res.json([...new Set(rows.filter(r=>!isDeleted(r.snapshot)).flatMap(r=>(r.snapshot as any).data.students.map((s:any)=>s.branch)))].sort());}));
const lookup=z.object({schoolId:z.string().min(1).max(100),branch:z.string().min(1).max(100),identifier:z.string().trim().min(1).max(30),keyId:z.string().optional(),studentId:z.string().optional()});
export async function lookupStudentResults(input:z.infer<typeof lookup>){
 const school=await prisma.school.findFirst({where:{id:input.schoolId,active:true},select:{id:true}});if(!school)return[];
 const rows=await prisma.opticalResult.findMany({where:{schoolId:input.schoolId,nextRevision:null},select:{keyId:true,snapshot:true}});const keys=[...new Set(rows.filter(row=>!isDeleted(row.snapshot)).map(row=>row.keyId))].filter(id=>!input.keyId||input.keyId===id);const results:any[]=[];
 for(const key of keys){const view=await examView(input.schoolId,key);if(!view)continue;const students=view.data.students.filter(s=>s.branch===input.branch&&(studentNumberKey(s.studentNo??s.id)===studentNumberKey(input.identifier)||s.identityHash===identityHash(input.identifier)));
 for(const student of students.filter(s=>!input.studentId||s.id===input.studentId))results.push({view,student});}

 return results;
}
publicResultsRouter.post("/lookup",wrap(async(req,res)=>{const input=lookup.parse(req.body),found=await lookupStudentResults(input);if(!found.length){res.status(404).json({error:"Bu bilgilerle erişilebilir sonuç bulunamadı. Kurum, sınıf ve öğrenci numarası veya TC bilgisini kontrol edin."});return;}
 res.json(found.map(({view,student})=>({keyId:view.keyId,examName:view.keyName,schoolName:view.schoolName,student:{id:student.id,name:student.name,studentNo:student.studentNo,branch:student.branch},summary:view.summary.find((r:any)=>r.id===student.id),ranking:view.rankings[student.id]})));
}));
publicResultsRouter.post("/pdf",wrap(async(req,res)=>{const input=lookup.extend({keyId:z.string().min(1)}).parse(req.body),found=await lookupStudentResults(input);if(!found.length){res.status(404).json({error:"Sonuç bulunamadı veya bilgiler geçersiz."});return;}const {view,student}=found[0];res.attachment("ogrenci-karnesi.pdf").type("application/pdf").send(await reportPdf(view,{kind:"cards",order:"name",hideIdentity:true,studentId:student.id}));}));
