import {heavyWorkGuard} from './heavy-work';
import {archiveAudit} from './audit-maintenance';
import express from 'express';
import {Prisma,Role} from '@prisma/client';
import {z} from 'zod';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {createReadStream} from 'node:fs';
import {prisma} from './db';
import {env} from './config';
import {requireAuth,requireRole,type AuthenticatedRequest} from './auth';
import {exportInput,validateExport,exportDigest,exportName,rowsCsv,type ExportInput} from './export-core';
import {StoredZip} from './report-zip';
import {fmtBytes} from './fmt-download';
import {archivePath,openTxt,archiveChecksum} from './txt-archive';
import {answerKeyRows} from '../lib/answer-key-rows';
import {evaluationQuestions} from './optical-catalog';
import {acquireCpuLease} from './resource-admission';
import {RequestLimiter} from './rate-limit';
import {SecurityError} from './security-errors';
export const exportRouter=express.Router();
exportRouter.use('/api/admin/exports',requireAuth,requireRole(Role.SUPER_ADMIN),heavyWorkGuard(),(q,r,n)=>{r.setHeader('Cache-Control','private, no-store');n();});
const sign=(data:unknown)=>crypto.createHmac('sha256',env.JWT_SECRET).update('export:'+JSON.stringify(data)).digest('hex');
async function readRows(tx:Prisma.TransactionClient,input:ExportInput,asOf:number){
 const f=input.filters,where:any={},date=(field:string)=>{if(f.from||f.to)where[field]={...(f.from?{gte:new Date(f.from+'T00:00:00+03:00')}:{}),...(f.to?{lte:new Date(f.to+'T23:59:59.999+03:00')}:{})};};
 let model:any,select:any;
 if(input.type==='publishers'){model=tx.publisher;select={id:true,name:true,description:true,email:true,phone:true,active:true,updatedAt:true};if(f.search)where.name={contains:f.search,mode:'insensitive'};}
 if(input.type==='audit'){model=tx.auditLog;select={id:true,actorUserId:true,actorName:true,action:true,targetType:true,targetId:true,createdAt:true};if(f.userId)where.actorUserId=f.userId;if(f.action)where.action=f.action;date('createdAt');where.createdAt={...(where.createdAt??{}),lte:new Date(Math.min(asOf,where.createdAt?.lte?.getTime()??asOf))};}
 if(input.type==='announcements'){model=tx.announcement;select={id:true,title:true,summary:true,content:true,category:true,state:true,audience:true,sourceEvent:true,startsAt:true,endsAt:true,releaseDate:true,updatedAt:true};for(const k of ['category','audience','state'])if(f[k])where[k]=f[k];if(f.version)where.sourceEvent=`release:${f.version}`;date('startsAt');}
 if(input.type==='keys'){model=tx.publishedAnswerKey;select={id:true,examName:true,grade:true,publisherId:true,published:true,publishedAt:true,updatedAt:true,files:{select:{id:true,originalFileName:true,storagePath:true}},opticalKey:{select:{id:true,questions:true,penalty:true,active:true}}};if(f.publisherId)where.publisherId=f.publisherId;}
 if(input.type==='fmt'){model=tx.opticalTemplate;select={id:true,name:true,originalFmt:true,originalBase64:true,layout:true,active:true,publisherId:true,grade:true,sourceFormat:true,validation:true};if(f.publisherId)where.publisherId=f.publisherId;if(f.sourceFormat)where.sourceFormat=f.sourceFormat;if(f.verified)where.validation={path:['readerConfirmed'],equals:f.verified==='true'};}
 if(input.type==='products'){model=tx.storeProduct;select={id:true,barcode:true,name:true,description:true,price:true,discount:true,stock:true,categoryId:true,brandId:true,grade:true,lesson:true,images:true,active:true,updatedAt:true};if(f.publisherId)where.brand={publisherId:f.publisherId};if(f.categoryId)where.categoryId=f.categoryId;}
 if(input.type==='txt'){model=tx.opticalTxtFile;select={id:true,name:true,storedName:true,size:true,checksum:true,createdById:true,createdAt:true,evaluatedAt:true,resultId:true};where.deletedAt=null;if(f.dealerId)where.createdBy={dealerId:f.dealerId};if(f.schoolId||f.keyId){const result={...(f.schoolId?{schoolId:f.schoolId}:{}),...(f.keyId?{keyId:f.keyId}:{})};where.OR=[{result},{uses:{some:{result}}}];}if(f.evaluated)where.evaluatedAt=f.evaluated==='true'?{not:null}:null;date('createdAt');}
 if(input.type==='schedule'){model=tx.examScheduleEntry;select={id:true,publisherId:true,level:true,sequence:true,examDate:true,scope:true,answerKeyId:true,published:true,series:true,updatedAt:true};if(f.publisherId)where.publisherId=f.publisherId;if(f.level)where.level=f.level;date('examDate');}
 if(f.grade)where.grade=Number(f.grade);for(const k of ['active','published'])if(f[k])where[k]=f[k]==='true';
 const limit=['keys','fmt'].includes(input.type)?100:1000,rows:any[]=[];let cursor:string|undefined;
 do{const batch=await model.findMany({where,select,orderBy:{id:'asc'},take:Math.min(100,limit+1-rows.length),...(cursor?{cursor:{id:cursor},skip:1}:{})});rows.push(...batch);if(batch.length<Math.min(100,limit+1-(rows.length-batch.length)))break;cursor=batch.at(-1)?.id;}while(rows.length<=limit&&cursor);
 if(rows.length>limit)throw new SecurityError(400,`Bu aktarım en fazla ${limit} kayıt içerir. Filtreleri daraltın.`);
 return rows;
}
const snapshot=(input:ExportInput,asOf:number)=>prisma.$transaction(tx=>readRows(tx,input,asOf),{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:30000});
const wrap=(fn:(q:AuthenticatedRequest,r:express.Response)=>Promise<void>):express.RequestHandler=>async(q,r,n)=>{try{await fn(q as AuthenticatedRequest,r);}catch(e){if(e instanceof z.ZodError){r.status(400).json({error:e.issues[0]?.message});return;}n(e);}};
exportRouter.post('/api/admin/exports/preview',new RequestLimiter(30,60000).middleware(),wrap(async(q,r)=>{const input=validateExport(exportInput.parse(q.body)),asOf=Date.now(),rows=await snapshot(input,asOf),proof={actor:q.user!.id,input,count:rows.length,digest:exportDigest(rows),asOf,expires:Date.now()+15*60000};r.json({count:rows.length,filters:input.filters,asOf,expires:proof.expires,digest:proof.digest,token:sign(proof),note:'Dosya boyutu ölçülmedi. Özgün dosyaların okunabilirliği indirme sırasında doğrulanır.'});}));
exportRouter.post('/api/admin/exports/download',new RequestLimiter(10,60000).middleware(),wrap(async(q,r)=>{
 const body=z.object({input:exportInput,count:z.number().int().nonnegative(),digest:z.string().length(64),asOf:z.number().int(),expires:z.number(),token:z.string().length(64)}).strict().parse(q.body),input=validateExport(body.input),proof={actor:q.user!.id,input,count:body.count,digest:body.digest,asOf:body.asOf,expires:body.expires};
 if(body.expires<Date.now()||!crypto.timingSafeEqual(Buffer.from(sign(proof)),Buffer.from(body.token)))throw new SecurityError(409,'Aktarım önizlemesini yenileyin.');
 const release=acquireCpuLease();let directory:string|undefined;
 try{
  const rows=await snapshot(input,body.asOf);if(rows.length!==body.count||exportDigest(rows)!==body.digest)throw new SecurityError(409,'Kayıtlar değişti. Aktarım kapsamını yeniden önizleyin.');
  const root=path.join(env.STORAGE_DIR,'private-exports');await fs.mkdir(root,{recursive:true,mode:0o700});directory=await fs.mkdtemp(path.join(root,'export-'));await fs.chmod(directory,0o700);const target=path.join(directory,`export.${input.format}`);
  const entries:Array<{id:string;name:string;size:number;sha256:string}>=[];
  if(input.format==='zip'){
   const handle=await fs.open(target,'wx',0o600),zip=new StoredZip(handle);
   try{for(const row of rows){if(r.destroyed)throw Error('İndirme iptal edildi.');let bytes:Buffer,name:string;
    if(input.type==='txt'){try{bytes=openTxt(await fs.readFile(archivePath(row.storedName)));}catch{throw new SecurityError(422,'Kaynak TXT okunamadı veya bütünlük doğrulanamadı. Aktarım tamamlanmadı.');}if(bytes.length!==row.size||archiveChecksum(bytes)!==row.checksum)throw new SecurityError(422,'Kaynak TXT bütünlüğü doğrulanamadı. Aktarım tamamlanmadı.');name=row.name;}
    else if(input.type==='fmt'){bytes=fmtBytes(row.originalFmt,row.originalBase64);if(!bytes.length||/^\s*[\[{]/.test(row.originalFmt))throw new SecurityError(422,'Özgün FMT bulunmayan kayıt var. Filtreyi daraltın.');name=row.name+'.fmt';const layoutName=exportName(row.id+'-'+row.name)+'.layout.json',layoutBytes=Buffer.from(JSON.stringify(row.layout,null,2));await zip.add(layoutName,layoutBytes);entries.push({id:row.id,name:layoutName,size:layoutBytes.length,sha256:crypto.createHash('sha256').update(layoutBytes).digest('hex')});}
    else{if(!row.opticalKey)throw new SecurityError(422,'Optik anahtarı olmayan sınav var. Aktarım tamamlanmadı.');const x=require('xlsx'),book=x.utils.book_new();x.utils.book_append_sheet(book,x.utils.aoa_to_sheet(answerKeyRows(evaluationQuestions(row.opticalKey.questions))),'Cevap Anahtarı');bytes=x.write(book,{type:'buffer',bookType:'xlsx'});name=row.examName+'.xlsx';}
    name=exportName(row.id+'-'+name);await zip.add(name,bytes);entries.push({id:row.id,name,size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
    if(input.type==='keys'&&input.filters.originals==='true')for(const file of row.files){const stored=path.resolve(file.storagePath),storageRoot=path.resolve(env.STORAGE_DIR)+path.sep;if(!stored.startsWith(storageRoot))throw new SecurityError(422,'Özgün anahtar dosyası özel depo kapsamında değil.');const originalBytes=await fs.readFile(stored),originalName=exportName(row.id+'-'+file.id+'-'+file.originalFileName);await zip.add(originalName,originalBytes);entries.push({id:file.id,name:originalName,size:originalBytes.length,sha256:crypto.createHash('sha256').update(originalBytes).digest('hex')});}

   }
   await zip.add('manifest.json',Buffer.from(JSON.stringify({createdAt:new Date().toISOString(),type:input.type,filters:input.filters,expectedCount:body.count,exportedCount:rows.length,fileCount:entries.length,files:entries,failed:[]},null,2)));await zip.finish();}finally{await handle.close();}
  }else{
   const safeRows=rows.map(row=>{const {originalBase64,originalFmt,files,...safe}=row;return {...safe,...(files?{files:files.map(({storagePath,...file}:any)=>file)}:{})};});
   if(input.format==='xlsx'){
    const x=require('xlsx'),book=x.utils.book_new();
    if(input.type==='keys'){if(rows.length>1)throw new SecurityError(400,'Birden çok cevap anahtarı için ZIP seçin; her Excel ayrı içe aktarılabilir.');for(const [i,row]of rows.entries()){if(!row.opticalKey)throw new SecurityError(422,'Optik anahtarı bulunmayan sınav var.');x.utils.book_append_sheet(book,x.utils.aoa_to_sheet(answerKeyRows(evaluationQuestions(row.opticalKey.questions))),`Anahtar ${i+1}`);}}
    else{x.utils.book_append_sheet(book,x.utils.json_to_sheet(safeRows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,typeof v==='object'&&v!==null?JSON.stringify(v):typeof v==='string'?v:v??''])))),'Kayıtlar');}
    await fs.writeFile(target,x.write(book,{type:'buffer',bookType:'xlsx'}),{mode:0o600,flag:'wx'});
   }else await fs.writeFile(target,input.format==='json'?JSON.stringify({type:input.type,filters:input.filters,count:rows.length,rows:safeRows},null,2):rowsCsv(safeRows),{mode:0o600,flag:'wx'});
  }
  if(input.type==='audit'){const digest=crypto.createHash('sha256').update(await fs.readFile(target)).digest('hex'),archive=await archiveAudit(rows,q.user!.id,digest);r.setHeader('X-Audit-Archive',archive);r.setHeader('X-Audit-Sha256',digest);}
  await prisma.auditLog.create({data:{actorUserId:q.user!.id,actorName:q.user!.id,action:'DATA_EXPORT_PREPARED',targetType:input.type,summary:JSON.stringify({format:input.format,count:rows.length,digest:body.digest})}});
  r.attachment(`kurumsalsinav-${input.type}.${input.format}`).type(({json:'application/json',csv:'text/csv; charset=utf-8',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',zip:'application/zip'})[input.format]);await pipeline(createReadStream(target),r);
 }finally{release();if(directory)await fs.rm(directory,{recursive:true,force:true});}
}));
