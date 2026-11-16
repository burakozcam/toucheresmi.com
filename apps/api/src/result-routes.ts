import { resultRankings } from "./result-rankings";
import {indexResultCodes} from "./public-result-codes";
import { dealerPermission, schoolScope, activity } from "./dealer-policy";
import { SecurityError } from "./security-errors";
import {studentReportAccessCode} from "./result-identity";
import {reportBenchmarks} from "./report-benchmarks";
import {enrichReportView} from "./report-metadata";
import { reportTemplates,reportTemplate } from "../lib/report-templates";
import express from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { AuthenticatedRequest } from "./auth";
import { aggregateResults,isDeleted,safeSnapshot,snapshotFingerprint } from "./result-data";
import { reportPdf,reportExcelRows,selectedStudents,type ReportOptions } from "./result-pdf";
export const resultRouter=express.Router();
const scope=(req:AuthenticatedRequest)=>schoolScope(req.user!);
const wrap=(fn:(req:AuthenticatedRequest,res:express.Response)=>Promise<void>):express.RequestHandler=>async(req,res,next)=>{try{await fn(req as AuthenticatedRequest,res);}catch(e){if(e instanceof SecurityError){next(e);return;}if(e instanceof z.ZodError){res.status(400).json({error:e.issues[0]?.message});return;}if(e instanceof Error&&!((e as any).code)){res.status(400).json({error:e.message});return;}next(e);}};
export async function examView(schoolId:string,keyId:string,publishedOnly=false){
 const all=await prisma.opticalResult.findMany({where:{keyId,nextRevision:null},orderBy:{createdAt:"asc"}});
 const own=all.filter(r=>r.schoolId===schoolId&&!isDeleted(r.snapshot)&&(!publishedOnly||r.studentPublished));
 const view=aggregateResults(own);if(!view)return null;
 const grouped=new Map<string,typeof all>();
 for(const row of all){if(isDeleted(row.snapshot)||snapshotFingerprint(row.snapshot as any)!==view.keyFingerprint)continue;const rows=grouped.get(row.schoolId)??[];rows.push(row);grouped.set(row.schoolId,rows);}
 const cohorts=[...grouped.values()].map(rows=>aggregateResults(rows)).filter(Boolean) as NonNullable<ReturnType<typeof aggregateResults>>[];
 const locations=await prisma.school.findMany({where:{id:{in:cohorts.map(c=>c.schoolId)}},select:{id:true,city:true,district:true}});
 const {rankings,generalCount}=resultRankings(view,cohorts,locations);
 const benchmarks=reportBenchmarks(cohorts);
 // Exact ranks/participation are allowed; suppress small cross-institution means that can expose a peer's score.
 const safeMean=(value:any)=>value.count>=5&&cohorts.length>=2?value:{...value,score:null,lessons:{}};
 return {...view,keyId,rankings,generalCount,benchmarks:{all:safeMean(benchmarks.all),grades:Object.fromEntries(Object.entries(benchmarks.grades).map(([g,v])=>[g,safeMean(v)]))}};
}
resultRouter.get("/report-templates",(_req,res)=>{res.json(reportTemplates);});
async function allowed(req:AuthenticatedRequest,schoolId:string){return prisma.school.findFirst({where:{id:schoolId,...scope(req)},select:{id:true}});}
resultRouter.get("/result-exams",wrap(async(req,res)=>{const schoolId=z.string().min(1).parse(req.query.schoolId);if(!await allowed(req,schoolId)){res.status(403).json({error:"Kurum erişimi yok."});return;}
 const rows=await prisma.opticalResult.findMany({where:{schoolId,nextRevision:null},include:{key:{include:{publication:{select:{examName:true,publisher:{select:{name:true}}}}}}},orderBy:{createdAt:"desc"}});
 const grouped=new Map<string,any>();for(const row of rows.filter(r=>!isDeleted(r.snapshot))){const snapshot=row.snapshot as any;const current=grouped.get(row.keyId);if(current){current.uploadCount++;continue;}grouped.set(row.keyId,{id:row.keyId,name:row.key.publication?.examName??snapshot.keyName,publisher:row.key.publication?.publisher?.name??"",createdAt:row.createdAt,uploadCount:1});}res.json([...grouped.values()]);
}));
resultRouter.get("/result-exams/:id",wrap(async(req,res)=>{const schoolId=z.string().min(1).parse(req.query.schoolId);if(!await allowed(req,schoolId)){res.status(403).json({error:"Kurum erişimi yok."});return;}const view=await examView(schoolId,String(req.params.id));if(!view){res.status(404).json({error:"Kayıtlı sınav sonucu yok."});return;}res.json(safeSnapshot(view));}));
resultRouter.get("/result-exams/:id/access-codes",wrap(async(req,res)=>{
 const schoolId=z.string().min(1).parse(req.query.schoolId);if(!await allowed(req,schoolId)){res.status(403).json({error:"Kurum erişimi yok."});return;}
 const keyId=String(req.params.id),view=await examView(schoolId,keyId);if(!view){res.status(404).json({error:"Sonuç bulunamadı."});return;}
 await indexResultCodes(prisma,schoolId,keyId,view.data.students);
 res.setHeader("Cache-Control","private, no-store");res.json(view.data.students.map(s=>({studentId:s.id,name:s.name,studentNo:s.studentNo,branch:s.branch,accessCode:studentReportAccessCode(schoolId,keyId,s)})));
}));
const optionsSchema=z.object({schoolId:z.string().min(1),kind:z.enum(["cards","school","classes"]).default("cards"),order:z.enum(["score","name"]).default("score"),showGeneralParticipation:z.enum(["true","false"]).default("true"),hideIdentity:z.enum(["true","false"]).default("true"),grade:z.string().regex(/^\d{1,2}$/).optional(),templateId:z.string().optional(),branch:z.string().optional(),studentId:z.string().optional(),format:z.enum(["pdf","xlsx"]).default("pdf")});
resultRouter.get("/result-exams/:id/export",wrap(async(req,res)=>{const input=optionsSchema.parse(req.query);if(!await allowed(req,input.schoolId)){res.status(403).json({error:"Kurum erişimi yok."});return;}const view=await examView(input.schoolId,String(req.params.id));if(!view){res.status(404).json({error:"Sonuç bulunamadı."});return;}await dealerPermission(req.user!,"canExport");reportTemplate(input.kind,input.templateId);const options:ReportOptions={...input,showGeneralParticipation:input.showGeneralParticipation==="true",hideIdentity:input.hideIdentity==="true"};if(!selectedStudents(view,options).length){res.status(400).json({error:"Seçilen öğrenci veya sınıf için sonuç yok."});return;}res.setHeader("Cache-Control","private, no-store");
 if(input.format==="pdf"){const bytes=await reportPdf(await enrichReportView(view),options);await dealerPermission(req.user!,"canExport");await activity(prisma,req.user!,"REPORT_PDF",{schoolId:input.schoolId,keyId:String(req.params.id),studentCount:selectedStudents(view,options).length});res.attachment("sinav-sonuclari.pdf").type("application/pdf").send(bytes);return;}const xlsx=require("xlsx"),book=xlsx.utils.book_new();const branches=input.kind==="classes"?[...new Set(selectedStudents(view,options).map(s=>s.branch))]:[input.branch];for(const [i,branch]of branches.entries())xlsx.utils.book_append_sheet(book,xlsx.utils.aoa_to_sheet(reportExcelRows(view,{...options,branch})),input.kind==="classes"?`${i+1}-${branch}`.replace(/[\\/?:*\[\]]/g,"-").slice(0,31):"Sonuçlar");
 if(input.kind==="cards"){const outcomes=[["Öğrenci No","Ders","Soru","Öğrenci Cevabı","Doğru Cevap","Kazanım Kodu","Kazanım"]];for(const s of selectedStudents(view,options))view.data.questions.forEach((q,i)=>outcomes.push([input.hideIdentity==="true"&&/^\d{11}$/.test(s.studentNo??s.id)?"***********":s.studentNo??s.id,q.lesson,String(q.number),s.answers[i],q.answer,q.outcomeCode??"",q.outcomeName??""]));xlsx.utils.book_append_sheet(book,xlsx.utils.aoa_to_sheet(outcomes),"Kazanımlar");}
 await dealerPermission(req.user!,"canExport");await activity(prisma,req.user!,"REPORT_EXCEL",{schoolId:input.schoolId,keyId:String(req.params.id),studentCount:selectedStudents(view,options).length});
 res.attachment("sinav-sonuclari.xlsx").type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").send(xlsx.write(book,{type:"buffer",bookType:"xlsx"}));
}));
for(const restore of [false,true])resultRouter.post(`/results/:id/${restore?"restore":"delete"}`,wrap(async(req,res)=>{
 z.object({confirm:z.literal(true).optional()}).parse(req.body);if(!restore&&req.body.confirm!==true){res.status(400).json({error:"Silme işlemini onaylayın."});return;}
 await prisma.$transaction(async tx=>{
  await dealerPermission(req.user!,"canDeleteResult",tx,true);
  const item=await tx.opticalResult.findFirst({where:{id:String(req.params.id),school:scope(req)},include:{school:{select:{city:true,district:true}},key:{include:{publication:{select:{publisherId:true}}}}}});
  if(!item)throw new SecurityError(404,"Sonuç bulunamadı.");
  const rows=await tx.opticalResult.findMany({where:{seriesId:item.seriesId,school:scope(req)}}),now=new Date().toISOString();
  for(const row of rows){const {deletedAt,deletedById,deletedDealerId,...old}=row.snapshot as any;await tx.opticalResult.update({where:{id:row.id},data:{studentPublished:false,snapshot:restore?{...old,restoredAt:now,restoredById:req.user!.actorAdminId??req.user!.id}:{...old,deletedAt:now,deletedById:req.user!.actorAdminId??req.user!.id,deletedDealerId:req.user!.dealerId}}});}
  await activity(tx,req.user!,restore?"RESULT_RESTORE":"RESULT_DELETE",{schoolId:item.schoolId,keyId:item.keyId,resultId:item.id,publisherId:item.key.publication?.publisherId,city:item.school.city,district:item.school.district,studentCount:(item.snapshot as any).data?.students?.length??0});
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});res.json({message:restore?"Değerlendirme geri yüklendi. Öğrenci yayını kapalıdır.":"Değerlendirme geri alınabilir biçimde kaldırıldı."});
}));
