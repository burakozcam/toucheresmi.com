import express from 'express';
import crypto from 'node:crypto';
import {z} from 'zod';
import {Prisma} from '@prisma/client';
import {prisma} from './db';
import {env} from './config';
import type {AuthenticatedRequest} from './auth';
import {schoolScope,dealerPermission,activity} from './dealer-policy';
import {withResultSnapshots,writeResultSnapshot} from './result-snapshot-storage';
import {isDeleted,snapshotFingerprint} from './result-data';
import {keyFingerprint,reviewSnapshot,type Snapshot} from './optical-review';
import {cpuJob} from './cpu-jobs';
import {carryReaderGrants} from './reader-grants';
import {evaluationPublicationWhere,evaluationQuestions} from './optical-catalog';
import {exportDigest} from './export-core';
import {SecurityError} from './security-errors';
const inputSchema=z.object({keyId:z.string().min(1).max(100),schoolId:z.string().min(1).max(100).optional(),dealerId:z.string().min(1).max(100).optional()}).strict();
const sign=(proof:unknown)=>crypto.createHmac('sha256',env.JWT_SECRET).update('batch-reevaluate:'+JSON.stringify(proof)).digest('hex');
export const batchReevaluationRouter=express.Router();
async function load(db:Prisma.TransactionClient,q:AuthenticatedRequest,input:z.infer<typeof inputSchema>){
 const key=await db.opticalKey.findFirst({where:{id:input.keyId,publication:evaluationPublicationWhere},include:{publication:{select:{examName:true,grade:true}}}});if(!key)throw new SecurityError(404,'Değerlendirme anahtarı bulunamadı.');
 const school:Prisma.SchoolWhereInput={AND:[schoolScope(q.user!),{active:true},...(input.schoolId?[{id:input.schoolId}]:[]),...(input.dealerId?[{dealerId:input.dealerId}]:[])]};
 const metadata=await db.opticalResult.findMany({where:{keyId:key.id,nextRevision:null,school},omit:{snapshot:true},include:{txtUses:{select:{fileId:true}},txtFiles:{select:{id:true}}},orderBy:{id:'asc'},take:101});
 if(metadata.length>100)throw new SecurityError(400,'En fazla 100 sonuç yüklemesi için kapsamı kurum veya bayiyle daraltın.');
 const rows=(await withResultSnapshots(db,metadata)).filter(row=>!isDeleted(row.snapshot)),fingerprint=keyFingerprint(key.questions,key.penalty),pending=rows.filter(row=>snapshotFingerprint(row.snapshot)!==fingerprint);
 if(pending.reduce((n,row)=>n+row.snapshot.data.students.length,0)>5000)throw new SecurityError(400,'Bir işlemde en fazla 5.000 öğrenci kaydı için kurum kapsamını daraltın.');
 return {key,rows,pending,fingerprint,digest:exportDigest({input,fingerprint,rows:rows.map(row=>({id:row.id,revision:row.revision,snapshot:row.snapshot}))})};
}
for(const preview of [true,false])batchReevaluationRouter.post(`/re-evaluate-batch${preview?'/preview':''}`,async(q:AuthenticatedRequest,r,n)=>{try{
 const body=z.object({scope:inputSchema,token:z.string().length(64).optional(),expires:z.number().optional(),confirmation:z.string().optional()}).strict().parse(q.body);
 await dealerPermission(q.user!,'canReevaluate');
 const state=await prisma.$transaction(tx=>load(tx,q,body.scope),{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:30000});
 const proof={actor:q.user!.id,scope:body.scope,digest:state.digest,expires:body.expires??Date.now()+15*60000};
 if(!preview&&(body.confirmation!=='ONAYLA'||!body.expires||body.expires<Date.now()||!body.token||!crypto.timingSafeEqual(Buffer.from(sign(proof)),Buffer.from(body.token))))throw new SecurityError(409,'ONAYLA yazın; kapsam önizlemesini yenileyin.');
 const prepared:Array<{old:typeof state.pending[number];next:Snapshot}>=[],errors:string[]=[];
 for(const row of state.pending){try{
  const next=await cpuJob<Snapshot>({kind:'reevaluate',snapshot:row.snapshot,questions:evaluationQuestions(state.key.questions),penalty:state.key.penalty});next.keyName=state.key.publication?.examName??state.key.name;
  const checks=reviewSnapshot(next);if(checks.blockers.length)throw Error(checks.blockers.join(' '));prepared.push({old:row,next});
 }catch{errors.push(`${row.id}: kaynak soru/kitapçık verisi uyumsuz veya hesaplama tamamlanamadı. Özgün TXT ve anahtarı kontrol edin.`);}}
 const sourceTxtCount=new Set(state.pending.flatMap(row=>[...row.txtUses.map(t=>t.fileId),...row.txtFiles.map(t=>t.id)])).size;
 if(preview){r.json({keyName:state.key.publication?.examName??state.key.name,currentFingerprint:state.fingerprint,previousFingerprints:[...new Set(state.pending.map(row=>snapshotFingerprint(row.snapshot)))],resultCount:state.pending.length,studentRecordCount:state.pending.reduce((n,row)=>n+row.snapshot.data.students.length,0),schoolCount:new Set(state.pending.map(row=>row.schoolId)).size,sourceTxtCount,ready:prepared.length,alreadyCurrent:state.rows.length-state.pending.length,errors,expires:proof.expires,token:sign(proof)});return;}
 if(errors.length)throw new SecurityError(422,'Uyumsuz kayıtlar var. Hiçbir sonuç kaydedilmedi; önizlemeyi inceleyin.');
 const saved=await prisma.$transaction(async tx=>{
  await dealerPermission(q.user!,'canReevaluate',tx,true);const current=await load(tx,q,body.scope);if(current.digest!==state.digest)throw new SecurityError(409,'Sonuç veya anahtar değişti; kapsamı yeniden önizleyin.');
  const ids:string[]=[];
  for(const {old,next}of prepared){const created=await tx.opticalResult.create({data:{schoolId:old.schoolId,keyId:old.keyId,templateId:old.templateId,createdById:q.user!.id,filename:old.filename,seriesId:old.seriesId,revision:old.revision+1,supersedesId:old.id,uploadChecksum:old.uploadChecksum,snapshot:{}}});await writeResultSnapshot(tx,created.id,JSON.stringify(next));await carryReaderGrants(tx,old,created.id,next.data);const fileIds=[...new Set([...old.txtUses.map(t=>t.fileId),...old.txtFiles.map(t=>t.id)])];if(fileIds.length)await tx.opticalTxtUse.createMany({data:fileIds.map(fileId=>({fileId,resultId:created.id})),skipDuplicates:true});await tx.opticalResult.update({where:{id:old.id},data:{studentPublished:false}});ids.push(created.id);}
  await activity(tx,q.user!,'REEVALUATE',{keyId:state.key.id,studentCount:prepared.reduce((n,row)=>n+row.next.data.students.length,0)});return ids;
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:60000});
 r.json({successCount:saved.length,failedCount:0,alreadyCurrent:state.rows.length-state.pending.length,resultIds:saved,note:'Kapsamdaki yeni revizyonlar tek transaction ile kaydedildi. Öğrenci yayını ayrıca kontrol edilip açılmalıdır. PDF’ler talep edildiğinde üretilir.'});
 }catch(e){if(e instanceof z.ZodError){r.status(400).json({error:'Yeniden değerlendirme kapsamı veya onayı geçersiz.'});return;}n(e);}});
