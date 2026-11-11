import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {oracleBytes,oracleExpected,oracleQuestions} from "./fixtures/v120-oracle";
import {parseOptical,decodeOptical,opticalSummary,layout7108,layout8050} from "../apps/api/src/optical-core";
import {inferFmt} from "../apps/api/src/fmt-inference";
import {systemEvaluationTemplates,evaluationTemplateChoices,systemStorageId} from "../apps/api/src/evaluation-templates";
import {verifyHuman} from "../apps/api/src/human-verification";

test("v120 system template rows cannot replace canonical 7108 or defeat inference",async()=>{
 const wrong=structuredClone(layout7108);wrong.fields.booklet.start=50;wrong.fields.session!.start=51;
 const choices=evaluationTemplateChoices([{id:'system-fmt-7108',name:'Sistem FMT 7108',active:true,layout:wrong}]);
 assert.deepEqual(choices.find(t=>t.id==='system-fmt-7108')!.layout,layout7108);
 const text=decodeOptical(oracleBytes);assert.equal(inferFmt(text,choices).message,'Tahmin edilen FMT: 7108');
 const {prisma}=await import('../apps/api/src/db'),{opticalRouter}=await import('../apps/api/src/optical-routes');
 const original=[prisma.opticalTemplate.findFirst,prisma.school.findFirst,prisma.opticalKey.findFirst,prisma.opticalResult.findFirst,prisma.opticalResult.findMany];
 prisma.opticalResult.findFirst=(async()=>null) as any;prisma.opticalResult.findMany=(async()=>[]) as any;
 const old={id:'system-fmt-7108',active:true,layout:wrong};
 prisma.opticalTemplate.findFirst=(async({where}:any)=>where.id===old.id?structuredClone(old):null) as any;
 prisma.school.findFirst=(async()=>({id:'school',name:'Anonim Okul'})) as any;
 prisma.opticalKey.findFirst=(async()=>({id:'key',questions:oracleQuestions,penalty:3,publication:{grade:8}})) as any;
 try{const handler=(opticalRouter as any).stack.find((l:any)=>l.route?.path==='/preview').route.stack.at(-1).handle;let status=200,value:any;
 await handler({user:{id:'user',role:'DEALER',dealerId:'dealer'},body:{schoolId:'school',keyId:'key',templateId:old.id},file:{originalname:'7108.txt',buffer:oracleBytes}},{status(n:number){status=n;return this;},json(v:any){value=v;}},(e:any)=>{if(e)throw e;});
 assert.equal(status,200);assert.equal(value.data.students.length,4);assert.equal(value.summary.find((r:any)=>r.id==='00101').net,11);assert.deepEqual(old.layout,wrong);assert.notEqual(systemStorageId(systemEvaluationTemplates()[0]),old.id);
 }finally{[prisma.opticalTemplate.findFirst,prisma.school.findFirst,prisma.opticalKey.findFirst,prisma.opticalResult.findFirst,prisma.opticalResult.findMany]=original as any;}
});

test("v120 all records inspected, invalid booklet remains invalid after prefix detection",()=>{
 const templates=systemEvaluationTemplates();
 const valid=decodeOptical(oracleBytes).replace(/[\r\n]+$/,'').split(/\r?\n/)[0];
 const many=Array.from({length:101},()=>valid);many[100]=valid.slice(0,50)+' '+valid.slice(51);
 const prediction=inferFmt(many.join('\n'),templates);assert.equal(prediction.confidence,'possible');assert.equal(prediction.candidates[0].sampled,101);assert.equal(prediction.candidates[0].valid,100);
 assert.throws(()=>parseOptical(many[100],layout7108,oracleQuestions,'Anonim'),/kitapçık/);
 const blankBooks=decodeOptical(oracleBytes).replace(/[\r\n]+$/,'').split(/\r?\n/).map(l=>l.slice(0,50)+' '+l.slice(51)).join('\n');
 assert.equal(inferFmt(blankBooks,templates).confidence,'possible');
 assert.equal(inferFmt('7108 fake data\n7108 fake data',templates).confidence,'failed');
});

test("v120 independent oracle: answers, D/Y/B, weighted score, sessions and determinism",()=>{
 const data=parseOptical(decodeOptical(oracleBytes),layout7108,oracleQuestions,'Anonim Okul'),summary=opticalSummary(data,3);
 assert.equal(data.students.length,4);assert.equal(data.lineCount,5);assert.deepEqual(data.students.find(s=>s.id==="00103")!.recordBooklets,["A"]);assert.deepEqual(data.students[0].recordBooklets,["A","B"]);
 for(const s of data.students){const expected=oracleExpected[s.id as keyof typeof oracleExpected],r=summary.find(r=>r.id===s.id)!;
  assert.equal(r.lessons.reduce((a,l)=>a+l.correct,0),expected.correct);assert.equal(r.lessons.reduce((a,l)=>a+l.wrong,0),expected.wrong);assert.equal(r.lessons.reduce((a,l)=>a+l.blank,0),expected.blank);
  assert.ok(Math.abs(r.net-expected.net)<1e-9);assert.ok(Math.abs(r.lessons.reduce((a,l)=>a+l.weighted,0)-expected.weighted)<1e-9);assert.ok(Math.abs(r.score-expected.score)<1e-9);
  assert.equal(1+summary.filter(v=>v.score>r.score+1e-8).length,expected.rank);
 }
 assert.deepEqual(data.students[0].sourceLines,[1,2]);assert.equal(data.students[0].booklets.MATEMATİK,'B');
 assert.deepEqual(opticalSummary(parseOptical(decodeOptical(oracleBytes),layout7108,oracleQuestions,'Anonim Okul'),3),summary);
 assert.deepEqual(summary,opticalSummary(parseOptical(decodeOptical(oracleBytes).replace(/\r\n/g,'\n'),layout7108,oracleQuestions,'Anonim Okul'),3));
});

test("v120 reCAPTCHA v2 validates provider, age, hostname, errors and replay",async()=>{
 const config={enabled:true,provider:'recaptcha-v2' as const,hostname:'example.test',siteKey:'test-site',secret:'only-server'};
 let value:any={success:true,hostname:'example.test',challenge_ts:new Date().toISOString()};
 const provider=(async(url:any,options:any)=>{assert.equal(url,'https://www.google.com/recaptcha/api/siteverify');assert.equal(options.body.get('secret'),'only-server');return {ok:true,json:async()=>value};}) as typeof fetch;
 assert.equal(await verifyHuman('fresh','login',config,provider),true);assert.equal(await verifyHuman('fresh','login',config,provider),false);
 value={...value,challenge_ts:new Date(Date.now()-121000).toISOString()};assert.equal(await verifyHuman('expired','login',config,provider),false);
 value={...value,challenge_ts:new Date().toISOString(),hostname:'evil.test'};assert.equal(await verifyHuman('wrong-host','login',config,provider),false);
 value={...value,hostname:'example.test','error-codes':['Over free quota.']};assert.equal(await verifyHuman('overquota','login',config,provider),false);
 value={success:true,hostname:'example.test'};assert.equal(await verifyHuman('no-date','login',config,provider),false);
});


test("v120 UTF-16 BOM is decoded explicitly; byte offsets never replace character positions",()=>{
 const text=decodeOptical(oracleBytes),le=Buffer.concat([Buffer.from([0xff,0xfe]),Buffer.from(text,"utf16le")]),be=Buffer.from(le);be.swap16();
 assert.equal(decodeOptical(le),text);assert.equal(decodeOptical(be),text);
 assert.deepEqual(parseOptical(decodeOptical(le),layout7108,oracleQuestions,"Anonim").students,parseOptical(text,layout7108,oracleQuestions,"Anonim").students);
 assert.throws(()=>decodeOptical(Buffer.from([0xff,0xfe,0x41])));
});

test("v120 guest access capability binds exam, school and student",async()=>{
 const {studentReportAccessCode,matchesReportAccessCode}=await import("../apps/api/src/result-identity");
 const student={id:"r1",studentNo:"00101",name:"Anonim Test",branch:"8-A",identityHash:"anonymous-hash"};
 const code=studentReportAccessCode("school","exam",student);assert.equal(code.length,16);
 assert.equal(matchesReportAccessCode(code,"school","exam",student),true);
 assert.equal(matchesReportAccessCode(code,"other-school","exam",student),false);
 assert.equal(matchesReportAccessCode(code,"school","other-exam",student),false);
 assert.equal(matchesReportAccessCode(code,"school","exam",{...student,identityHash:"peer"}),false);
 assert.equal(matchesReportAccessCode("ğ".repeat(16),"school","exam",student),false);
});


test("v120 equivalent joined/split 7108 literals are aliases, not ambiguous formats",async()=>{
 const {analyzeFmt}=await import("../apps/api/src/fmt-analyze");
 const original=decodeOptical(fs.readFileSync(new URL("../apps/api/assets/templates/7108.fmt",import.meta.url)));
 const analyzed=analyzeFmt(original).layout;assert.equal(analyzed.literals?.length,4);
 const candidates=[{id:"uploaded-7108",name:"7108",layout:analyzed},...systemEvaluationTemplates()];
 const prediction=inferFmt(decodeOptical(oracleBytes),candidates);
 assert.equal(prediction.confidence,"strong");assert.equal(prediction.message,"Tahmin edilen FMT: 7108");
 assert.deepEqual(prediction.candidates[0].aliases,["uploaded-7108","system-fmt-7108"]);
 assert.equal(parseOptical(decodeOptical(oracleBytes),analyzed,oracleQuestions,"Anonim").students.length,4);
});


test("v120 read-only inference quota is per authenticated user, separate from shared-IP uploads",async()=>{
 const {RequestLimiter}=await import("../apps/api/src/rate-limit");const handler=new RequestLimiter(1,60000).middleware((req:any)=>req.user.id);
 const run=(id:string)=>{let status=200,passed=false;handler({ip:"127.0.0.1",user:{id}} as any,{setHeader(){},status(n:number){status=n;return this;},json(){}} as any,()=>{passed=true;});return {status,passed};};
 assert.deepEqual(run("first"),{status:200,passed:true});assert.deepEqual(run("first"),{status:429,passed:false});assert.deepEqual(run("second"),{status:200,passed:true});
});
