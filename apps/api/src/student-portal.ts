import {lookupStudentResults,publicResultSummary} from "./public-results";
import {studentNumberKey} from "./result-identity";
import {studentWelcome} from './student-welcome';
import {studentInsights,studentExam} from './student-insights';
import {studentAnnouncements,respondToStudent} from './student-services';
import {enrichReportView} from "./report-metadata";
import express from "express";
import {studentCodesPdf} from "./student-code-pdf";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { Prisma,Role } from "@prisma/client";
import { z } from "zod";
import {requireAuth,type AuthenticatedRequest} from "./auth";
import {prisma} from "./db";
import {env} from "./config";
import {SecurityError} from "./security-errors";
import {RequestLimiter} from "./rate-limit";
import {resultStudent,privateResult} from "./reader-core";
import {isDeleted} from "./result-data";
import {reportPdf} from "./result-pdf";
import {turkeyProvinces,resolveLocation,locationKey} from "../lib/turkey-locations";
export const studentPortalRouter=express.Router();
export const portalCode=()=>crypto.randomBytes(18).toString("base64url");
export const portalHash=(value:string)=>crypto.createHmac("sha256",env.JWT_SECRET).update(`student-portal:${value}`).digest("hex");
export const maskStudent=(name:string)=>name.trim().split(/\s+/).map((v,i)=>i===0?v:v[0]+"****").join(" ");
export const studentKey=(s:any)=>portalHash(JSON.stringify([s.identityHash??null,s.studentNo??s.id,s.name.trim().toLocaleUpperCase("tr-TR")]));
const year=z.string().regex(/^20\d{2}-20\d{2}$/).refine(v=>Number(v.slice(5))===Number(v.slice(0,4))+1,"Akademik yıl ardışık olmalıdır.");
const wrap=(fn:(q:AuthenticatedRequest,r:express.Response)=>Promise<unknown>):express.RequestHandler=>async(q,r,n)=>{try{r.setHeader("Cache-Control","private, no-store");await fn(q as AuthenticatedRequest,r);}catch(e){if(e instanceof z.ZodError){r.status(400).json({error:e.issues.map(i=>i.message).join("; ")});return;}n(e);}};
const scope=(q:AuthenticatedRequest)=>q.user!.role===Role.SUPER_ADMIN?{}:q.user!.role===Role.SCHOOL_ADMIN?{id:q.user!.schoolId??"__none__"}:{dealerId:q.user!.dealerId??"__none__"};
const manager=express.Router();manager.use(requireAuth,(q:AuthenticatedRequest,r,n)=>{if(!["SUPER_ADMIN","SCHOOL_ADMIN","DEALER"].includes(q.user!.role)){r.status(403).json({error:"Öğrenci kodu yönetme yetkiniz yok."});return;}n();});
manager.get("/schools",wrap(async(q,r)=>r.json(await prisma.school.findMany({where:{active:true,...scope(q)},select:{id:true,name:true,publicNumberLookup:true},orderBy:{name:"asc"}}))));
manager.patch("/schools/:id/sharing",wrap(async(q,r)=>{
 const {publicNumberLookup}=z.object({publicNumberLookup:z.boolean()}).parse(q.body);
 await prisma.$transaction(async tx=>{
 const school=await tx.school.findFirst({where:{AND:[{id:String(q.params.id),active:true},scope(q)]}});
 if(!school)throw new SecurityError(404,"Kurum bulunamadı veya yetkiniz yok.");
 await tx.school.update({where:{id:school.id},data:{publicNumberLookup}});
 await tx.auditLog.create({data:{actorUserId:q.user!.id,actorName:"Kurum yöneticisi",action:"SCHOOL_RESULT_SHARING",targetId:school.id,summary:publicNumberLookup?"Yayımlanmış sonuç özetleri öğrenci numarasıyla sorgulamaya açıldı.":"Öğrenci numarasıyla sonuç sorgulama kapatıldı."}});
 });r.json({publicNumberLookup});
}));
manager.get("/results",wrap(async(q,r)=>{const schoolId=z.string().min(1).parse(q.query.schoolId);const rows=await prisma.opticalResult.findMany({where:{schoolId,nextRevision:null,school:{active:true,...scope(q)}},select:{id:true,snapshot:true,createdAt:true}});r.json(rows.filter(v=>!isDeleted(v.snapshot)).map(v=>({id:v.id,name:(v.snapshot as any).keyName,createdAt:v.createdAt,students:(v.snapshot as any).data.students.map((s:any)=>({id:s.id,name:s.name,studentNo:s.studentNo??s.id,branch:s.branch}))})));}));
manager.get("/students",wrap(async(q,r)=>{const schoolId=z.string().min(1).parse(q.query.schoolId),academicYear=year.parse(q.query.academicYear);r.json(await prisma.studentPortal.findMany({where:{schoolId,academicYear,school:{active:true,...scope(q)}},select:{id:true,studentNo:true,academicYear:true,grants:{select:{resultId:true,studentId:true}}},orderBy:{studentNo:"asc"}}));}));
manager.post("/students",new RequestLimiter(30,10*60_000).middleware(),wrap(async(q,r)=>{
 const data=z.object({schoolId:z.string().min(1).max(100),academicYear:year,studentNo:z.string().trim().min(1).max(100),grants:z.array(z.object({resultId:z.string().min(1).max(100),studentId:z.string().min(1).max(180)})).min(1).max(100),confirm:z.literal(true)}).parse(q.body);
 const code=portalCode();
 const saved=await prisma.$transaction(async tx=>{
 if(!await tx.school.findFirst({where:{AND:[{id:data.schoolId,active:true},scope(q)]}}))throw new SecurityError(404,"Kurum bulunamadı veya yetkiniz yok.");
 const grants=[];let identity:string|undefined;
 for(const g of data.grants){const result=await tx.opticalResult.findFirst({where:{id:g.resultId,schoolId:data.schoolId,nextRevision:null}});if(!result||isDeleted(result.snapshot))throw new SecurityError(400,"Sonuç güncel değil veya kaldırılmış.");const student:any=resultStudent(result.snapshot,g.studentId);if(String(student.studentNo??student.id)!==data.studentNo)throw new SecurityError(400,"Öğrenci numarası sonuçla uyuşmuyor.");const key=studentKey(student);if(identity&&identity!==key)throw new SecurityError(400,"Farklı öğrencilerin sonuçları birleştirilemez.");identity=key;grants.push({...g,identityKey:key});}
 const previous=await tx.studentPortal.findUnique({where:{schoolId_academicYear_studentNo:{schoolId:data.schoolId,academicYear:data.academicYear,studentNo:data.studentNo}},include:{grants:true}});
 if(previous?.grants.some(g=>g.identityKey!==identity))throw new SecurityError(409,"Bu akademik yıl ve numara farklı bir öğrenciye bağlı. Kurum kayıtlarını kontrol edin.");
 // Explicit selection is additive; previous years are never inferred or rewritten.
 const portal=await tx.studentPortal.upsert({where:{schoolId_academicYear_studentNo:{schoolId:data.schoolId,academicYear:data.academicYear,studentNo:data.studentNo}},create:{schoolId:data.schoolId,academicYear:data.academicYear,studentNo:data.studentNo,codeHash:portalHash(code)},update:{codeHash:portalHash(code),version:{increment:1}}});
 for(const g of grants)await tx.studentPortalGrant.upsert({where:{portalId_resultId:{portalId:portal.id,resultId:g.resultId}},create:{portalId:portal.id,...g},update:{studentId:g.studentId,identityKey:g.identityKey}});
 await tx.auditLog.create({data:{actorUserId:q.user!.id,actorName:"Kurum yöneticisi",action:"STUDENT_PORTAL_ISSUE",targetType:"StudentPortal",targetId:portal.id,summary:"Yıl bazlı öğrenci bağlantıları doğrulandı; eski kod ve oturumlar geçersizleştirildi."}});
 return{id:portal.id};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});r.status(201).json({...saved,code,message:"Kod yalnız bu yanıtta gösterilir. Yenileme eski kodu ve oturumları geçersizleştirir."});
}));
manager.post("/export",new RequestLimiter(10,10*60_000).middleware(),wrap(async(q,r)=>{
 const data=z.object({schoolId:z.string().min(1).max(100),academicYear:year,confirmRotate:z.literal(true),format:z.enum(["xlsx","pdf"]).default("xlsx")}).parse(q.body);
 const rows=await prisma.$transaction(async tx=>{if(!await tx.school.findFirst({where:{AND:[{id:data.schoolId,active:true},scope(q)]}}))throw new SecurityError(404,"Kurum erişimi yok.");const portals=await tx.studentPortal.findMany({where:{schoolId:data.schoolId,academicYear:data.academicYear},orderBy:{studentNo:"asc"},take:5001});if(!portals.length||portals.length>5000)throw new SecurityError(400,"1–5.000 öğrenci kodu dışa aktarılabilir.");const output=[];for(const p of portals){const code=portalCode();await tx.studentPortal.update({where:{id:p.id},data:{codeHash:portalHash(code),version:{increment:1}}});output.push([p.studentNo,p.academicYear,code]);}await tx.auditLog.create({data:{actorUserId:q.user!.id,actorName:"Kurum yöneticisi",action:"STUDENT_PORTAL_ROTATE_EXPORT",targetId:data.schoolId,summary:`${data.academicYear}: ${output.length} kod yenilendi.`}});return output;},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:60000});
 if(data.format==="pdf"){const school=await prisma.school.findUnique({where:{id:data.schoolId},select:{name:true}});r.attachment("ogrenci-erisim-kodlari.pdf").type("application/pdf").send(await studentCodesPdf(rows,school?.name??"Kurum"));return;}
 const x=require("xlsx"),book=x.utils.book_new();x.utils.book_append_sheet(book,x.utils.aoa_to_sheet([["Öğrenci No","Akademik Yıl","Kişisel Erişim Kodu"],...rows]),"Ogrenci Kodlari");r.attachment("ogrenci-erisim-kodlari.xlsx").send(x.write(book,{type:"buffer",bookType:"xlsx"}));
}));
manager.delete("/students/:id",wrap(async(q,r)=>{const {confirm}=z.object({confirm:z.literal(true)}).parse(q.body);await prisma.$transaction(async tx=>{const portal=await tx.studentPortal.findFirst({where:{id:String(q.params.id),school:{active:true,...scope(q)}}});if(!portal)throw new SecurityError(404,"Öğrenci erişimi bulunamadı.");await tx.studentPortal.delete({where:{id:portal.id}});await tx.auditLog.create({data:{actorUserId:q.user!.id,actorName:"Kurum yöneticisi",action:"STUDENT_PORTAL_REVOKE",targetId:portal.id,summary:"Kişisel kod ve bağlantıları iptal edildi; sınav kayıtları korundu."}});},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});r.json({revoked:confirm});}));
studentPortalRouter.use("/api/student-portal-admin",manager);
const publicPortal=express.Router();publicPortal.use(new RequestLimiter(40,10*60_000,10000,"portal-ip").middleware());
publicPortal.get("/locations",wrap(async(_q,r)=>r.json(turkeyProvinces)));
publicPortal.get("/schools",wrap(async(q,r)=>{const data=z.object({city:z.string().max(100),district:z.string().max(100)}).parse(q.query),geo=resolveLocation(data.city,data.district);if(!geo)throw new SecurityError(400,"Geçerli il/ilçe seçin.");const schools=await prisma.school.findMany({where:{active:true},select:{id:true,name:true,city:true,district:true}});r.json(schools.filter(s=>locationKey(s.city??"")===locationKey(geo.city)&&locationKey(s.district??"")===locationKey(geo.district)).map(s=>({id:s.id,name:s.name})));}));
const attempts=new RequestLimiter(8,15*60_000,10000,"portal-student");
// The capability itself identifies the student/year/school. Older scoped clients remain valid.
publicPortal.post("/login",wrap(async(q,r)=>{
 const data=z.object({code:z.string().trim().regex(/^[A-Za-z0-9_-]{24}$/, "Geçerli kişisel öğrenci kodunuzu girin."),schoolId:z.string().min(1).max(100).optional(),academicYear:year.optional(),studentNo:z.string().trim().min(1).max(100).optional()}).parse(q.body);
 const hash=portalHash(data.code),limit=await attempts.checkShared(hash);
 if(!limit.allowed){r.setHeader("Retry-After",limit.retryAfter);throw new SecurityError(429,"Çok sık deneme yapıldı. Daha sonra tekrar deneyin.");}
 const matches=await prisma.studentPortal.findMany({where:{codeHash:hash,school:{active:true},...(data.schoolId?{schoolId:data.schoolId}:{}),...(data.academicYear?{academicYear:data.academicYear}:{}),...(data.studentNo?{studentNo:data.studentNo}:{})},take:2});
 if(matches.length!==1)throw new SecurityError(404,"Kişisel kod geçersiz, yenilenmiş veya iptal edilmiş. Kurumunuzdan güncel kodunuzu isteyin.");
 const portal=matches[0],token=jwt.sign({purpose:"STUDENT_PORTAL",version:portal.version},env.JWT_SECRET,{subject:portal.id,expiresIn:"20m",algorithm:"HS256"});r.json({token});
}));
// Public summaries require explicit school consent; this never issues a personal session.
publicPortal.post("/lookup-number",wrap(async(q,r)=>{
 const data=z.object({city:z.string().max(100),district:z.string().max(100),schoolId:z.string().min(1).max(100),studentNo:z.string().trim().min(1).max(100)}).parse(q.body),geo=resolveLocation(data.city,data.district);
 const school=geo?await prisma.school.findFirst({where:{id:data.schoolId,active:true},select:{city:true,district:true,publicNumberLookup:true}}):null;
 if(!geo||!school||locationKey(school.city??"")!==locationKey(geo.city)||locationKey(school.district??"")!==locationKey(geo.district))throw new SecurityError(400,"İl, ilçe ve kurum seçimini kontrol edin.");
 if(!school.publicNumberLookup)throw new SecurityError(403,"Bu kurum öğrenci numarasıyla sonuç paylaşımını açmamış. Kişisel kodunuz veya hesabınızla giriş yapın.");
 const limit=await attempts.checkShared(portalHash(`number:${data.schoolId}:${studentNumberKey(data.studentNo)}`));
 if(!limit.allowed){r.setHeader("Retry-After",limit.retryAfter);throw new SecurityError(429,"Çok sık deneme yapıldı. Daha sonra tekrar deneyin.");}
 const found=await lookupStudentResults({schoolId:data.schoolId,identifier:data.studentNo},undefined,true);
 if(!found.length)throw new SecurityError(404,"Bu kurumda öğrenci numaranızla eşleşen yayımlanmış sonuç bulunamadı.");
 r.json({results:found.map(publicResultSummary)});
}));
async function authorized(q:AuthenticatedRequest,withResults=true){let claims:any;try{claims=jwt.verify(q.header("authorization")?.replace(/^Bearer /,"")??"",env.JWT_SECRET,{algorithms:["HS256"]});}catch{throw new SecurityError(401,"Öğrenci oturumu sona erdi.");}if(claims.purpose!=="STUDENT_PORTAL"||typeof claims.sub!=="string")throw new SecurityError(401,"Öğrenci oturumu geçersiz.");const portal=await prisma.studentPortal.findFirst({where:{id:claims.sub,version:claims.version,school:{active:true}},include:{grants:withResults?{include:{result:true}}:false}});if(!portal)throw new SecurityError(401,"Kod yenilendi veya erişim kapatıldı.");return portal;}
export async function portalResults(portal:any){const output=[];for(const grant of portal.grants){
 // Follow the explicit result's revision chain; never search other exams by school number.
 let result=grant.result;for(let i=0;i<100;i++){const next=await prisma.opticalResult.findUnique({where:{supersedesId:result.id}});if(!next)break;result=next;if(i===99)throw new SecurityError(409,"Sonuç sürüm zinciri kontrol gerektiriyor.");}
 if(!result.studentPublished||isDeleted(result.snapshot))continue;const snapshot=result.snapshot as any;const students=snapshot.data.students.filter((s:any)=>studentKey(s)===grant.identityKey);if(students.length!==1)continue;
 const student=students[0],own=privateResult(snapshot,student.id);own.data.students[0].name=maskStudent(student.name);own.summary=own.summary.map((s:any)=>({id:s.id,score:s.score,net:s.net,lessons:s.lessons}));output.push({grantId:grant.id,academicYear:portal.academicYear,examName:snapshot.keyName,createdAt:result.createdAt,report:own,snapshot,student,reportSchoolId:result.schoolId,reportKeyId:result.keyId});
 }return output;}
publicPortal.get("/reports",wrap(async(q,r)=>{const rows=await portalResults(await authorized(q));r.json(rows.map(({snapshot,student,reportSchoolId,reportKeyId,...row})=>row));}));
publicPortal.post("/pdf",new RequestLimiter(10,10*60_000).middleware(),wrap(async(q,r)=>{const {grantId,templateId,showSiteAddress}=z.object({grantId:z.string().min(1).max(100),templateId:z.enum(["classic-card","analysis-card","table-card","summary-card","two-page-card","detailed-card"]).optional(),showSiteAddress:z.boolean().default(true)}).parse(q.body),rows=await portalResults(await authorized(q)),own=rows.find(v=>v.grantId===grantId);if(!own)throw new SecurityError(404,"Karne erişimi yok.");const snapshot={...structuredClone(own.snapshot),schoolId:own.reportSchoolId,keyId:own.reportKeyId};snapshot.data.students=[{...own.student,name:maskStudent(own.student.name),identityEncrypted:undefined,identityHash:undefined}];snapshot.summary=snapshot.summary.filter((s:any)=>s.id===own.student.id);snapshot.rankings={[own.student.id]:{}};r.attachment("ogrenci-karnesi.pdf").type("application/pdf").send(await reportPdf(await enrichReportView(snapshot),{kind:"cards",studentId:own.student.id,order:"name",hideIdentity:true,templateId,showSiteAddress,showGeneralParticipation:false,showSchoolParticipation:false}));}));
async function portalInsights(portal:any){const rows=(await portalResults(portal)).sort((a,b)=>+b.createdAt-+a.createdAt),seen=new Set<string>();return studentInsights(rows.filter(row=>{if(seen.has(row.reportKeyId))return false;seen.add(row.reportKeyId);return true;}).slice(0,5).map(row=>studentExam(row.snapshot,row.student.id,row.grantId,row.createdAt)));}
publicPortal.get('/insights',wrap(async(q,r)=>r.json(await portalInsights(await authorized(q)))));
publicPortal.get('/welcome',wrap(async(q,r)=>{const portal=await authorized(q,false);const [welcome,announcements]=await Promise.all([studentWelcome('portal',portal.id,(student,identity)=>studentKey(student)===identity),studentAnnouncements(portal.schoolId)]);r.json({...welcome,announcements});}));
publicPortal.post('/assistant',new RequestLimiter(30,60_000).middleware(),wrap(async(q,r)=>{const portal=await authorized(q);r.json(respondToStudent(q.body,await portalInsights(portal),await studentAnnouncements(portal.schoolId)));}));
studentPortalRouter.use("/api/student-portal",publicPortal);
