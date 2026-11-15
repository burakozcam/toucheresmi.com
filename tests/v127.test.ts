import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {decodeOptical,parseOptical,opticalSummary,opticalLayoutSchema} from "../apps/api/src/optical-core";
import {analyzeFmt} from "../apps/api/src/fmt-analyze";
import {layoutOzdebirSingle,legacyOzdebirSingle} from "../apps/api/src/ozdebir-layout";
import {evaluationReader} from "../apps/api/src/evaluation-reader";
import {systemEvaluationTemplates} from "../apps/api/src/evaluation-templates";
import {previewFmt} from "../apps/api/src/fmt-preview";
import {matchExamAnswers} from "../apps/api/src/optical-exam-matching";
import {newExamProfile} from "../apps/api/src/scoring-profile";
import {verifyHuman} from "../apps/api/src/human-verification";
import {analyticsPage} from "../apps/web/lib/analytics-policy";
const read=(n:string)=>fs.readFileSync(new URL(`./fixtures/ozdebir/${n}`,import.meta.url));
const {parseWorkbook}=require('../apps/api/lib/optical-import');
const workbook=JSON.parse(read('o8126-workbook.json').toString());
const rotate=(s:string)=>s.replace(/[ABCD]/g,c=>({A:'C',B:'D',C:'A',D:'B'}[c]!));
const imported=()=>parseWorkbook(structuredClone(workbook),'auto');
const key=()=>newExamProfile(imported().questions.map((q:any)=>({...q,answer:rotate(q.answer)})),'Özdebir',8);

test('v127 orijinal 2022 BLDM imzası ve eski manuel FMT aynı karakter konumlarıyla düzeltilir',()=>{
 const source=decodeOptical(read('single-original-2022.bldm')),analyzed=analyzeFmt(source);
 assert.deepEqual(analyzed.layout,layoutOzdebirSingle);assert.equal(analyzed.layout.fields.grade!.start,26);
 const text=decodeOptical(read('single-anonymous.txt'));
 const old=opticalLayoutSchema.parse(legacyOzdebirSingle);
 const chosen=evaluationReader(text,old,systemEvaluationTemplates());assert.ok(chosen.warning);assert.deepEqual(chosen.layout,layoutOzdebirSingle);
 const unrelated={...old,lessons:old.lessons.map(l=>({...l,name:l.name+' X'}))};assert.equal(evaluationReader(text.slice(0,27)+"A"+text.slice(28),unrelated,systemEvaluationTemplates()).warning,null);
 const preview=previewFmt(text,analyzed.layout);assert.equal(preview.canSave,true);assert.match(preview.warnings.join(' '),/varsayılan A/);
 const d=parseOptical(text,chosen.layout,key(),'Anonim',{allowMismatch:true});assert.equal(d.students.length,1);assert.equal(d.students[0].answers.length,90);assert.equal(d.students[0].branch.split('-')[0],'8');
 assert.ok(matchExamAnswers(text,chosen.layout,key()));
});

test('v127 gerçek O8126 Excel: 90 soru, kazanım ve ayrı A/B anahtarlarıyla doğrulanan çaprazlar',()=>{
 const result=imported();assert.deepEqual(result.issues,[]);assert.equal(result.questions.length,90);assert.equal(result.publisher,'ÖZDEBİR');
 assert.equal(new Set(result.questions.map((q:any)=>q.lesson)).size,6);assert.ok(result.questions.every((q:any)=>q.positions.A&&q.positions.B&&q.outcomeCode&&q.outcomeName));
 const broken=structuredClone(workbook);broken.find((s:any)=>s.name==='ÇAPRAZ').rows[3][2]=5;assert.throws(()=>parseWorkbook(broken),/çaprazı çelişiyor|eşleştirmesi/);
 const missing=structuredClone(workbook).filter((s:any)=>s.name!=='ÇAPRAZ');assert.throws(()=>parseWorkbook(missing),/başlıkları tanınmadı/);
});

test('v127 yeni üç orijinal karne: cevap ızgarası ile 18 dersin doğru/yanlış/net karşılaştırması',()=>{
 const refs=JSON.parse(read('v127-three-cards-anonymous.json').toString());
 const weights:Record<string,number>={'TÜRKÇE':4.112247,'MATEMATİK':4.450104,'FEN':3.776382,'SOSYAL':1.829886,'DİN':1.768433,'İNGİLİZCE':1.418961};
 for(const ref of refs){
  const questions=ref.lessons.flatMap((l:any)=>Array.from(l.key,(a:any,i)=>({lesson:l.lesson,number:i+1,answer:a==='T'?'H':a.trim()||'A',weight:weights[l.lesson],scoreBase:203.052560,multipleMark:'blank',positions:{A:i+1}})));
  const student={id:'anonymous',name:'Anonim',school:'Anonim',branch:'8-A',booklets:{},sourceLines:[],answers:ref.lessons.flatMap((l:any)=>Array.from(l.answers,(a:any)=>a.trim()))};
  const result=opticalSummary({questions,students:[student],warnings:[],lineCount:1} as any,3)[0];
  for(const [i,l]of result.lessons.entries()){assert.equal(l.correct,ref.correct[i],`page ${ref.page} ${l.lesson} correct`);assert.equal(l.wrong,ref.wrong[i],`page ${ref.page} ${l.lesson} wrong`);assert.equal(l.net,ref.correct[i]-ref.wrong[i]/3);}
  assert.ok(Math.abs(result.score!-ref.score)<0.0006);
 }
});

test('v127 v3 score, action, hostname, age, replay, malformed provider and network failure',async()=>{
 const config={enabled:true,provider:'recaptcha-v3' as const,hostname:'example.test',siteKey:'public',secret:'server-only',minScore:.5};
 let value:any={success:true,score:.5,action:'login',hostname:'example.test',challenge_ts:new Date().toISOString()},calls=0;
 const provider=(async(url:any,options:any)=>{calls++;assert.equal(url,'https://www.google.com/recaptcha/api/siteverify');assert.deepEqual([...options.body.keys()].sort(),['response','secret']);return {ok:true,json:async()=>value};}) as typeof fetch;
 assert.equal(await verifyHuman('token','login',config,provider),true);assert.equal(await verifyHuman('token','login',config,provider),false);assert.equal(calls,1);
 for(const [i,patch]of [{score:.49},{score:undefined},{score:NaN},{score:1.1},{action:'results'},{hostname:'other.test'},{challenge_ts:new Date(Date.now()-121000).toISOString()},{challenge_ts:'invalid'},{success:false},{'error-codes':['Over free quota.']}].entries()){
  const old=value;value={...old,...patch};assert.equal(await verifyHuman('bad-'+i,'login',config,provider),false);value=old;
 }
 assert.equal(await verifyHuman('threshold','login',{...config,minScore:.8},provider),false);
 assert.equal(await verifyHuman('offline','login',config,(async()=>{throw Error('offline');})as typeof fetch),false);
 assert.equal(await verifyHuman('missing-keys','login',{...config,secret:''},provider),false);
});

test('v127 canlı doğrulama kapatılamaz, yerelde uzak DB engellenir, localhost geliştirme desteklenir',()=>{
 const run=(extra:Record<string,string>)=>spawnSync(process.execPath,['--import','tsx','-e',"require('./apps/api/src/config')"],{encoding:'utf8',env:{...process.env,JWT_SECRET:'unit-test-only-secret-at-least-32-chars',DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',RECAPTCHA_SECRET_KEY:'',RECAPTCHA_ENABLED:'false',TURNSTILE_ENABLED:'false',ALLOW_REMOTE_DATABASE:'false',...extra}});
 assert.notEqual(run({NODE_ENV:'production'}).status,0);
 assert.notEqual(run({NODE_ENV:'production',RECAPTCHA_ENABLED:'true'}).status,0);
 assert.equal(run({NODE_ENV:'development'}).status,0);
 assert.notEqual(run({NODE_ENV:'test',DATABASE_URL:'postgresql://test:test@production.invalid/test'}).status,0);
 assert.equal(run({NODE_ENV:'production',RECAPTCHA_ENABLED:'true',RECAPTCHA_SECRET_KEY:'dummy-secret'}).status,0);
});

test('v127 analytics yalnız izinli sabit yollar; özel URL, kimlik ve paylaşım tokenı dışlanır',()=>{
 assert.equal(analyticsPage('/contact'),'/contact');for(const p of ['/sonuclar','/sonuclarim','/panel','/dosya-paylasim/secret','/fmt-paylasim/secret','/blog/private-id'])assert.equal(analyticsPage(p),null);
 assert.equal(analyticsPage('/','?token=secret'),null);assert.equal(analyticsPage('/','','#private'),null);
});

test('v127 gerçek kaynaklı anonim TXT ve Excel, API önizleme/onay/kayıt akışından geçer; eski manuel şablon korunur',async()=>{
 const {prisma}=await import('../apps/api/src/db'),{opticalRouter}=await import('../apps/api/src/optical-routes');
 const savedTemplate={id:'original-2022',name:'Özdebir 2022 BLDM',layout:structuredClone(legacyOzdebirSingle),active:true};
 const questions=key(),school={id:'anonymous-school',name:'Anonim'},exam={id:'anonymous-key',questions,penalty:3,publication:{grade:8,examName:'O8126'}};
 const targets:any[]=[[prisma.opticalTemplate,'findFirst'],[prisma.school,'findFirst'],[prisma.opticalKey,'findFirst'],[prisma.opticalResult,'findFirst'],[prisma.opticalResult,'findMany'],[prisma.opticalResult,'create'],[prisma,'$transaction']];const originals=targets.map(([o,k])=>o[k]);let writes=0;
 prisma.opticalTemplate.findFirst=(async()=>savedTemplate)as any;prisma.school.findFirst=(async()=>school)as any;prisma.opticalKey.findFirst=(async()=>exam)as any;prisma.opticalResult.findFirst=(async()=>null)as any;prisma.opticalResult.findMany=(async()=>[])as any;prisma.opticalResult.create=(async({data}:any)=>{writes++;return{id:'isolated-result',createdAt:new Date(),revision:1,seriesId:'isolated-series',studentPublished:false,...data};})as any;prisma.$transaction=(async(fn:any)=>fn(prisma))as any;
 try{
  const body:any={schoolId:school.id,keyId:exam.id,templateId:savedTemplate.id};const file={originalname:'anonymous-source.txt',buffer:read('single-anonymous.txt')};
  const invoke=async(endpoint:string)=>{let status=200,value:any;const handler=(opticalRouter as any).stack.find((l:any)=>l.route?.path==='/'+endpoint).route.stack.at(-1).handle;await handler({user:{id:'anonymous-user',role:'DEALER',dealerId:'anonymous-dealer'},body,file},{status(n:number){status=n;return this;},json(v:any){value=v;}},(e:any)=>{if(e)throw e;});return{status,value};};
  const preview=await invoke('preview');assert.equal(preview.status,200);assert.equal(preview.value.data.students.length,1);assert.equal(preview.value.data.students[0].answers.length,90);assert.equal(preview.value.summary[0].score,225.26170733333333);assert.equal(preview.value.summary[0].net,5);assert.equal(writes,0);assert.deepEqual(preview.value.checks.blockers,[]);
  const noToken=await invoke('evaluate');assert.equal(noToken.status,409);assert.equal(writes,0);
  body.previewToken=preview.value.previewToken;body.confirmWarnings='true';const evaluated=await invoke('evaluate');assert.equal(evaluated.status,201);assert.equal(writes,1);assert.deepEqual(evaluated.value.summary,preview.value.summary);assert.deepEqual(savedTemplate.layout,legacyOzdebirSingle);
  const {reportPdf,reportExcelRows}=await import('../apps/api/src/result-pdf');
  const view:any={...evaluated.value,generalCount:1,rankings:Object.fromEntries(evaluated.value.data.students.map((s:any)=>[s.id,{generalRank:1,schoolRank:1,classRank:1,generalCount:1,schoolCount:1,classCount:1}]))};
  const rows=reportExcelRows(view,{kind:'cards',hideIdentity:true,order:'name'}),xlsx=require('xlsx'),book=xlsx.utils.book_new();xlsx.utils.book_append_sheet(book,xlsx.utils.aoa_to_sheet(rows),'Sonuçlar');const exported=xlsx.read(xlsx.write(book,{type:'buffer',bookType:'xlsx'}),{type:'buffer'}),values=xlsx.utils.sheet_to_json(exported.Sheets['Sonuçlar'],{header:1});
  const score=preview.value.summary[0].score;assert.equal(values[1][values[0].indexOf('Puan')],score);
  const pdf=await reportPdf(view,{kind:'cards',hideIdentity:true,order:'name',templateId:'summary-card'});const pages=await require('../apps/api/lib/pdf-text.cjs').readPdfText(pdf);assert.ok(pages.flat().map((r:any)=>r.text).join(' ').includes(score.toLocaleString('tr-TR',{minimumFractionDigits:3,maximumFractionDigits:3})));

 }finally{targets.forEach(([o,k],i)=>o[k]=originals[i]);}
});
