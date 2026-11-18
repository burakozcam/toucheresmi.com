import {withResultSnapshots,writeResultSnapshot} from './result-snapshot-storage';
import {dealerPermission,activity} from "./dealer-policy";
import { SecurityError } from "./security-errors";
import express from "express";
import crypto from "node:crypto";
import {Prisma,type OpticalResult} from "@prisma/client";
import {z} from "zod";
import {prisma} from "./db";
import {env} from "./config";
import type {AuthenticatedRequest} from "./auth";
import {aggregateResults,isDeleted,safeSnapshot,compatibleStudent} from "./result-data";
import {opticalSummary,type OpticalData} from "./optical-core";
import {keyFingerprint} from "./optical-review";
import {canonicalJson} from "./canonical-json";
import {editsSchema,applyResultEdits} from "./result-edit-core";
export {editsSchema,applyResultEdits} from "./result-edit-core";
const digest=(v:unknown)=>crypto.createHash('sha256').update(canonicalJson(v)).digest('hex');
const version=(rows:any[])=>digest(rows.map(r=>({id:r.id,snapshot:r.snapshot})));const seal=(v:unknown)=>crypto.createHmac('sha256',env.JWT_SECRET).update(canonicalJson(v)).digest('hex');
export const resultEditRouter=express.Router();
const wrap=(fn:(q:AuthenticatedRequest,r:express.Response)=>Promise<void>):express.RequestHandler=>async(q,r,n)=>{try{await fn(q as AuthenticatedRequest,r);}catch(e){if(e instanceof SecurityError){n(e);return;}if(e instanceof z.ZodError){r.status(400).json({error:e.issues[0]?.message});return;}if(e instanceof Prisma.PrismaClientKnownRequestError&&['P2034','P2002'].includes(e.code)){r.status(409).json({error:'Sonuç eşzamanlı değişti. Verileri yeniden yükleyin.'});return;}if(e instanceof Error&&!(e as any).code){r.status(400).json({error:e.message});return;}n(e);}};
async function load(q:AuthenticatedRequest,db:any=prisma){const schoolId=z.string().min(1).parse(q.method==='GET'?q.query.schoolId:q.body.schoolId),keyId=String(q.params.id);const school=await db.school.findFirst({where:{id:schoolId,active:true,...(q.user!.role==='SUPER_ADMIN'?{}:{dealerId:q.user!.dealerId??'__none__'})}});if(!school)throw new SecurityError(404,'Kurum veya düzenlenebilir sınav bulunamadı.');const rows=(await withResultSnapshots<Omit<OpticalResult,'snapshot'>>(db,await db.opticalResult.findMany({where:{schoolId,keyId,nextRevision:null},omit:{snapshot:true},orderBy:{createdAt:'asc'}}))).filter((r:any)=>!isDeleted(r.snapshot));const view=aggregateResults(rows);if(!view)throw Error('Düzenlenebilir sonuç bulunamadı.');const currentKey=await db.opticalKey.findUnique({where:{id:keyId}});if(!currentKey||keyFingerprint(currentKey.questions,currentKey.penalty)!==view.keyFingerprint)throw Error('Cevap anahtarı değişti. Önce güncel anahtarla yeniden değerlendirin.');return{rows,view,schoolId,keyId};}
resultEditRouter.get('/result-exams/:id/edit',wrap(async(q,r)=>{const {rows,view,schoolId,keyId}=await load(q);const history=await prisma.auditLog.findMany({where:{action:'RESULT_DATA_EDIT',targetType:'OpticalExam',targetId:`${schoolId}:${keyId}`},orderBy:{createdAt:'desc'},take:100});r.json({...safeSnapshot(view),editVersion:version(rows),history:history.map(({summary,...entry})=>({...entry,summary:"Sonuç verileri düzenlendi."}))});}));
const inputSchema=z.object({schoolId:z.string().min(1),version:z.string().length(64),edits:editsSchema,previewToken:z.string().max(200).optional(),expires:z.number().optional()});
for(const mode of ['edit-preview','edit'])resultEditRouter.post(`/result-exams/:id/${mode}`,wrap(async(q,r)=>{
 const input=inputSchema.parse(q.body),state=await load(q);if(version(state.rows)!==input.version){r.status(409).json({error:'Sonuç değişmiş. Yeniden yükleyip düzenleyin.'});return;}
 const updated=applyResultEdits(state.view.data,input.edits),snapshot={...state.view,data:updated.data,summary:opticalSummary(updated.data,state.view.penalty)};const expires=mode==='edit-preview'?Date.now()+15*60_000:input.expires;
 const proof={user:q.user!.id,school:state.schoolId,key:state.keyId,version:input.version,edits:input.edits,expires};
 if(mode==='edit-preview'){r.json({...safeSnapshot(snapshot),changes:updated.changes,expires,previewToken:seal(proof)});return;}
 if(!expires||expires<Date.now()||!input.previewToken||input.previewToken.length!==64||!crypto.timingSafeEqual(Buffer.from(input.previewToken),Buffer.from(seal(proof)))){r.status(409).json({error:'Değişiklik önizlemesini yenileyin.'});return;}
 const result=await prisma.$transaction(async tx=>{
  await dealerPermission(q.user!,"canEditResult",tx,true);
  const current=await load(q,tx);if(version(current.rows)!==input.version)throw Error('Sonuç eşzamanlı değişti. Yeniden yükleyin.');
  let main:any;for(const [index,row]of current.rows.entries()){
   const old=row.snapshot as any;const next=index===0?snapshot:{...old,data:{...old.data,students:[],lineCount:0,warnings:[],diagnostics:{rejectedLines:[],duplicateRecords:0,missingVerbal:0,missingNumeric:0}},summary:[]};
   const created=await tx.opticalResult.create({data:{schoolId:state.schoolId,keyId:state.keyId,templateId:row.templateId,createdById:q.user!.id,filename:row.filename,seriesId:row.seriesId,revision:row.revision+1,supersedesId:row.id,studentPublished:false,snapshot:{}},select:{id:true}});await writeResultSnapshot(tx,created.id,JSON.stringify({...next,editMetadata:{actorId:q.user!.id,actorAdminId:q.user!.actorAdminId??null,at:new Date().toISOString(),sourceResultIds:current.rows.map((v:any)=>v.id)}}));if(index===0)main=created;
  }
  const grants=await tx.studentResultAccess.findMany({where:{resultId:{in:current.rows.map((row:any)=>row.id)}}});
  const nextGrants=grants.map(g=>{
   const sourceIndex=current.rows.findIndex((row:any)=>row.id===g.resultId),sourceRow=current.rows[sourceIndex],source=(sourceRow.snapshot as any).data.students.find((s:any)=>s.id===g.studentNo);
   if(!source)throw Error('Bir öğrenci hesap bağlantısı kaynak kayıtla eşleşmiyor; kayıt değiştirilmeden yönetici kontrolü gerekir.');
   const offset=current.rows.slice(0,sourceIndex).reduce((sum:number,row:any)=>sum+((row.snapshot as any).data.lineCount??0),0),sourceLines=new Set<number>(source.sourceLines.map((l:number)=>l+offset));
   const people=current.view.data.students.filter(s=>compatibleStudent(s,source)||s.sourceLines.some(line=>sourceLines.has(line)));
   if(people.length!==1)throw Error('Hesap bağlantısında belirsiz öğrenci eşleşmesi var; kayıt değiştirilmedi.');
   const after=updated.data.students.find(s=>s.id===people[0].id)!;return {userId:g.userId,resultId:main.id,studentNo:after.id,studentName:after.name};
  });
  const grantPeople=new Map<string,string>();for(const g of nextGrants){const id=`${g.userId}:${g.studentNo}`,previous=grantPeople.get(id);if(previous&&previous!==g.studentName)throw Error('Hesap bağlantıları çelişiyor; kayıt değiştirilmedi.');grantPeople.set(id,g.studentName);}
  if(nextGrants.length)await tx.studentResultAccess.createMany({data:nextGrants,skipDuplicates:true});
  await tx.opticalResult.updateMany({where:{id:{in:current.rows.map((row:any)=>row.id)}},data:{studentPublished:false}});

  await tx.auditLog.create({data:{actorUserId:q.user!.actorAdminId??q.user!.id,actorName:q.user!.actorAdminId??q.user!.id,action:'RESULT_DATA_EDIT',targetType:'OpticalExam',targetId:`${state.schoolId}:${state.keyId}`,summary:JSON.stringify({changeCount:updated.changes.length,fields:[...new Set(updated.changes.map(c=>c.field))],resultId:main.id})}});await activity(tx,q.user!,"RESULT_EDIT",{schoolId:state.schoolId,keyId:state.keyId,resultId:main.id,studentCount:updated.data.students.length});return main;
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});r.status(201).json({id:result.id,message:'Değişiklikler yeni sonuç revizyonlarına kaydedildi. Öğrenci yayını kontrol için kapalıdır.'});
}));
