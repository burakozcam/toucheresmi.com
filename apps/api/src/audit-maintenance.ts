import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import {z} from 'zod';
import {Prisma,Role} from '@prisma/client';
import {prisma} from './db';
import {env} from './config';
import {requireAuth,requireRole,type AuthenticatedRequest} from './auth';
import {SecurityError} from './security-errors';
import {auditPolicy,expiredAudit,expiredAuditSql} from './audit-retention';
import {openTxt,sealTxt} from './txt-archive';
import {exportDigest} from './export-core';
const directory=()=>path.join(env.STORAGE_DIR,'audit-archives');
/** Full originals remain encrypted privately; public exports select only safe audit columns. */
export async function archiveAudit(rows:Array<{id:string}>,actor:string,downloadSha:string){
 const originals=await prisma.auditLog.findMany({where:{id:{in:rows.map(r=>r.id)}},orderBy:{id:'asc'}});
 if(originals.length!==rows.length)throw new SecurityError(409,'Log kapsamı değişti. Yeniden dışa aktarın.');
 const id=crypto.randomUUID(),record={id,actor,createdAt:new Date().toISOString(),downloadSha,digest:exportDigest(originals),rows:originals};
 await fs.mkdir(directory(),{recursive:true,mode:0o700});await fs.writeFile(path.join(directory(),id+'.enc'),sealTxt(Buffer.from(JSON.stringify(record))),{mode:0o600,flag:'wx'});return id;
}
export const auditMaintenanceRouter=express.Router();
auditMaintenanceRouter.use('/api/admin/audit-maintenance',requireAuth,requireRole(Role.SUPER_ADMIN));
auditMaintenanceRouter.get('/api/admin/audit-maintenance',async(q,r,n)=>{try{
 const [total,byAction,eligible,size,last,lastFailure]=await Promise.all([prisma.auditLog.count(),prisma.auditLog.groupBy({by:['action'],_count:{_all:true},orderBy:{_count:{action:'desc'}},take:30}),prisma.$queryRaw<Array<{count:bigint}>>(Prisma.sql`SELECT COUNT(*) AS count FROM "AuditLog" WHERE ${expiredAuditSql()}`),prisma.$queryRaw<Array<{bytes:bigint}>>`SELECT pg_total_relation_size('"AuditLog"') AS bytes`,prisma.auditLog.findFirst({where:{action:'AUDIT_CLEANUP'},orderBy:{createdAt:'desc'},select:{createdAt:true,summary:true}}),prisma.auditLog.findFirst({where:{action:{contains:'audit-maintenance/cleanup'},targetType:'SERVER_FAILURE'},orderBy:{createdAt:'desc'},select:{createdAt:true,summary:true}})]);
 r.json({total,byAction:byAction.map(v=>({action:v.action,count:v._count._all})),eligible:Number(eligible[0].count),storageBytes:Number(size[0].bytes),policy:auditPolicy,protectedActions:['ANSWER_KEY_REVISION','AUDIT_CLEANUP'],automaticMaintenance:{enabled:false,note:'Zamanlanmış otomatik silme kurulmadı. Temizlik yalnız doğrulanmış dışa aktarım arşivi ve yazılı onay ile çalışır.'},lastSuccess:last,lastFailure});
 }catch(e){n(e);}});
auditMaintenanceRouter.post('/api/admin/audit-maintenance/cleanup',async(q:AuthenticatedRequest,r,n)=>{try{
 const input=z.object({archiveId:z.string().uuid(),downloadSha:z.string().regex(/^[a-f0-9]{64}$/),confirmation:z.literal('ONAYLA')}).strict().parse(q.body);
 let archive:any;try{archive=JSON.parse(openTxt(await fs.readFile(path.join(directory(),input.archiveId+'.enc'))).toString('utf8'));}catch{throw new SecurityError(409,'Doğrulanmış özel log arşivi bulunamadı.');}
 if(archive.actor!==q.user!.id||archive.downloadSha!==input.downloadSha||exportDigest(archive.rows)!==archive.digest)throw new SecurityError(409,'Arşiv veya indirme bütünlüğü doğrulanamadı.');
 const deleted=await prisma.$transaction(async tx=>{
  const rows=await tx.auditLog.findMany({where:{id:{in:archive.rows.map((row:any)=>row.id)}},orderBy:{id:'asc'}});
  // A retry never deletes outside the archive. Rows already cleaned are allowed.
  const archived=new Map(archive.rows.map((row:any)=>[row.id,row]));
  for(const row of rows)if(exportDigest(row)!==exportDigest(archived.get(row.id)))throw new SecurityError(409,'Log kaydı arşivden sonra değişti.');
  const eligible=rows.filter(row=>expiredAudit(row)).slice(0,100);
  const result=await tx.auditLog.deleteMany({where:{id:{in:eligible.map(row=>row.id)}}});
  await tx.auditLog.create({data:{actorUserId:q.user!.id,actorName:q.user!.id,action:'AUDIT_CLEANUP',targetType:'AuditLog',targetId:input.archiveId,summary:JSON.stringify({deleted:result.count,archived:archive.rows.length,archiveDigest:archive.digest,policy:auditPolicy})}});return result.count;
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});r.json({deleted,archivedCount:archive.rows.length,note:'Şifreli özgün arşiv korunuyor. Saklama süresi dolmayan ve kritik revizyon kayıtları silinmedi.'});
 }catch(e){if(e instanceof z.ZodError){r.status(400).json({error:'Arşiv, SHA-256 ve ONAYLA bilgilerini kontrol edin.'});return;}n(e);}});
