import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { inspectOutcomeFile } from "../apps/api/src/outcome-file";
import { evaluationQuestions } from "../apps/api/src/optical-catalog";
import { questionProblems } from "../apps/web/lib/optical-admin-validation";
import { reviewImportedQuestions } from "../apps/api/src/answer-import-review";

test("v113: kodsuz, bilinmeyen ve kısmi kazanım; eksik cevap uydurulmaz",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ks-v113-"));
 try{for(const kind of ["known","none","unknown","partial","missing-answer"]){
 const rows=[["Ders","Soru No","Cevap","Kazanım Kodu","Kazanım Metni"],...Array.from({length:20},(_,i)=>["TÜRKÇE",i+1,kind==="missing-answer"&&i===0?"":"ABCDE"[i%5],kind==="none"||kind==="partial"&&i>=12?"":kind==="unknown"?"YABANCI-"+i:"T.8."+i,kind==="none"||kind==="partial"&&i>=12?"":"Açıklama"])];
 const file=path.join(dir,kind+".csv");fs.writeFileSync(file,rows.map(r=>r.join(",")).join("\n"));const r=await inspectOutcomeFile(file,kind+".csv");assert.equal(r.questions.length,20);
 if(kind==="missing-answer"){assert.equal(r.questions[0].answer,"");assert.throws(()=>evaluationQuestions(r.questions));assert.ok(questionProblems(r.questions).some(v=>v.includes("cevap")));continue;}
 assert.equal(evaluationQuestions(r.questions).length,20);assert.deepEqual(questionProblems(r.questions),[]);
 if(kind==="partial")assert.match(r.warnings.join(" "),/8 sorunun/);
 if(kind==="none")assert.ok(r.questions.every(q=>q.outcomeCode===""&&q.outcomeName===""));
 const source={fieldname:"learningOutcomesFile",originalname:kind+".csv",path:file,mimetype:"text/csv",size:fs.statSync(file).size} as Express.Multer.File;
 const files=[source];await reviewImportedQuestions(files,{evaluationFormat:"standard",confirmImport:true,reviewedQuestions:JSON.stringify(r.questions),sourceChecksum:crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")});
 assert.equal(files.length,2);const pages=await require("../apps/api/lib/pdf-text.cjs").readPdfText(fs.readFileSync(files[1].path));assert.ok(pages.flat().some((v:any)=>v.text.includes("KİTAPÇIĞI")));
 }}finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test("v113: ortak kurumun yüksek normal trafiği şüpheli sayılmaz; proxy başlıkları kullanılmaz",async()=>{
 const {suspiciousLogin,clientIp,safeRoute}=await import("../apps/api/src/system-center");
 assert.equal(suspiciousLogin(0,200),false);assert.equal(suspiciousLogin(8,200),false);assert.equal(suspiciousLogin(80,100),true);assert.equal(suspiciousLogin(80,1000),false);
 assert.equal(clientIp({socket:{remoteAddress:"::ffff:127.0.0.1"},headers:{"x-forwarded-for":"1.2.3.4"}} as any),"127.0.0.1");assert.equal(safeRoute("/api/example?token=secret"),"/api/example");
});

test("v113: SUPER_ADMIN dışındaki roller yönetim router'larına erişemez",async()=>{
 const {requireRole}=await import("../apps/api/src/auth");
 for(const role of ["DEALER","SCHOOL_ADMIN","STUDENT","PARENT",undefined]){let code=200,next=false;requireRole("SUPER_ADMIN" as any)({user:role?{role}:undefined} as any,{status(n:number){code=n;return this;},json(){}} as any,()=>{next=true;});assert.equal(code,403);assert.equal(next,false);}
 const {systemRouter}=await import("../apps/api/src/system-center"),{contentRouter}=await import("../apps/api/src/admin-content");
 for(const router of [systemRouter,contentRouter]){const mounted=(router as any).stack.find((v:any)=>v.handle?.stack);assert.ok(mounted);assert.equal(mounted.handle.stack[0].handle.name,"requireAuth");assert.equal(mounted.handle.stack.length>1,true);}
});

test("v113: izleme yazma hatası ana istek akışını engellemez ve hassas alanları loglamaz",async()=>{
 const {systemObserver}=await import("../apps/api/src/system-center");let finish:()=>void=()=>{},next=false;
 systemObserver({path:"/api/auth/login",socket:{remoteAddress:"127.0.0.1"},body:{password:"secret",token:"secret"},headers:{cookie:"session=secret"}} as any,{on(_s:string,fn:()=>void){finish=fn;},statusCode:401} as any,()=>{next=true;});assert.equal(next,true);assert.doesNotThrow(finish);
 const {prisma}=await import("../apps/api/src/db"),{bufferVisit,flushAnalytics}=await import("../apps/api/src/analytics");const tx=prisma.$transaction;
 prisma.$transaction=(()=>{throw new Error("monitor unavailable");}) as any;
 try{bufferVisit("2026-11-09","/",13,"anonymous");await assert.doesNotReject(()=>flushAnalytics());}finally{prisma.$transaction=tx;}
});

test("v113: paylaşım zamanı, süre ve görsel türü doğrulanır",async()=>{
 const {validShareWindow,validImage,safeFilename}=await import("../apps/api/src/admin-content");const now=Date.parse("2026-11-09T09:00:00Z");
 assert.equal(validShareWindow(new Date(now+86400000),new Date(now+90000000),now),true);assert.equal(validShareWindow(new Date(now+86400000),new Date(now),now),false);assert.equal(validShareWindow(new Date(now),new Date(now+91*86400000),now),false);
 assert.equal(validImage("data:image/svg+xml;base64,PHN2Zz4="),false);assert.equal(validImage("data:image/png;base64,PHNjcmlwdD4="),false);assert.equal(safeFilename("../a\n.exe"),".._a_.exe");
});

test("v113: gerçek F/O örneklerinde tüm kazanım sütunları kaldırılınca 90 soru ve kitapçıklar korunur",()=>{
 const {parseWorkbook}=require("../apps/api/lib/optical-import");
 for(const [fixture,format] of [["fernus-082701.json","f"],["okulizyon-ankara.json","o"]]){
  const sheets=structuredClone(require("./fixtures/"+fixture));
  for(const sheet of sheets){const head=sheet.rows.find((r:any[])=>r.some(v=>String(v).trim().toLocaleUpperCase("tr-TR")==="DERS")&&r.some(v=>/CEVAP|KİTAPÇIK/.test(String(v).toLocaleUpperCase("tr-TR"))));if(!head)continue;const removed=head.map((v:any,i:number)=>/KAZANIM/.test(String(v).toLocaleUpperCase("tr-TR"))?i:-1).filter((i:number)=>i>=0);sheet.rows=sheet.rows.map((row:any[])=>row.filter((_,i)=>!removed.includes(i)));}
  const result=parseWorkbook(sheets,format);assert.equal(result.questions.length,90);assert.ok(result.questions.every((q:any)=>!q.outcomeCode&&!q.outcomeName));assert.equal(evaluationQuestions(result.questions).length,90);assert.deepEqual(questionProblems(result.questions),[]);assert.ok(result.questions.every((q:any)=>q.positions.B>=1));
 }
});

test("v113: güvenlik deposu hata verdiğinde izleme yazması reddedilmez ve hassas gövde kaydedilmez",async()=>{
 const {prisma}=await import("../apps/api/src/db"),{systemObserver,flushSystemEvents}=await import("../apps/api/src/system-center");const original=prisma.systemEvent.createMany;let batch:any[]=[];
 prisma.systemEvent.createMany=(async({data}:any)=>{batch=data;throw new Error("security store unavailable");}) as any;
 try{let finish=()=>{},continued=false;systemObserver({path:"/api/auth/login",socket:{remoteAddress:"127.0.0.1"},body:{password:"do-not-store",token:"do-not-store",role:"SUPER_ADMIN"},headers:{cookie:"do-not-store"}} as any,{statusCode:401,on(_e:string,fn:()=>void){finish=fn;}} as any,()=>{continued=true;});finish();assert.equal(continued,true);await assert.doesNotReject(()=>flushSystemEvents());assert.ok(batch.some(e=>e.kind==="ADMIN_LOGIN_FAILED"));assert.ok(!JSON.stringify(batch).includes("do-not-store"));assert.ok(batch.every(e=>!('body'in e)&&!('headers'in e)));}finally{prisma.systemEvent.createMany=original;}
});
