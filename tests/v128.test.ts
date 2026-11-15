import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {decodeOptical,parseOptical,opticalSummary,layout7108} from '../apps/api/src/optical-core';
import {inferFmt} from '../apps/api/src/fmt-inference';
import {systemEvaluationTemplates} from '../apps/api/src/evaluation-templates';
import {analyzeFmt} from '../apps/api/src/fmt-analyze';
import {applyResultEdits,editsSchema} from '../apps/api/src/result-edit-core';
import {verifyHuman} from '../apps/api/src/human-verification';
import {parseClipboard} from '../apps/web/app/panel/data-grid';
const file=(name:string)=>new URL('./fixtures/7108-v128/'+name,import.meta.url),text=fs.readFileSync(file('ankara-anonymous.txt'),'utf8'),questions=JSON.parse(fs.readFileSync(file('ankara-key.json'),'utf8')),refs=JSON.parse(fs.readFileSync(file('reference-anonymous.json'),'utf8')),provenance=JSON.parse(fs.readFileSync(file('provenance.json'),'utf8'));
const parsed=()=>parseOptical(text,layout7108,questions,'Anonim Kurum',{allowMismatch:true});

test('v128 gerçek Ankara 7108: 198 kayıt, 196 öğrenci, 40 eşleşen karne, 240 D/Y/net ve 3560 fiziksel cevap',()=>{
 const data=parsed(),summary=opticalSummary(data,3);assert.equal(data.students.length,196);assert.equal(data.diagnostics!.rejectedLines.length,1);assert.equal(data.diagnostics!.duplicateRecords,1);let answers=0,lessons=0,booklets=0;
 for(const ref of refs){const s=data.students.find(s=>s.sourceLines.includes(ref.sourceLine))!,r=summary.find(r=>r.id===s.id)!;assert.ok(s);for(const [i,l]of ref.lessons.entries()as any){const result=r.lessons.find(row=>row.lesson===l.lesson)!;assert.equal(result.correct,ref.correct[i]);assert.equal(result.wrong,ref.wrong[i]);assert.equal(result.net,ref.correct[i]-ref.wrong[i]/3);lessons++;if(l.omitted){assert.ok(data.questions.flatMap((q,j)=>q.lesson===l.lesson?[s.answers[j]]:[]).every(a=>!a));continue;}assert.equal(s.booklets[l.lesson],l.booklet);booklets++;data.questions.forEach((q,j)=>{if(q.lesson!==l.lesson)return;assert.equal(s.answers[j],l.answers[q.positions[l.booklet]-1].trim(),`page ${ref.page} ${l.lesson} ${q.number}`);answers++;});}}
 assert.equal(lessons,240);assert.equal(answers,3560);assert.equal(booklets,237);
 const suggested=inferFmt(text,systemEvaluationTemplates());assert.ok(['strong','possible'].includes(suggested.confidence));assert.equal(suggested.candidates[0].id,'system-fmt-7108');
});

test('v128 Ankara puanları: 25 karneden tanı amaçlı profil, 15 ayrı karne üzerinde hata <0.001; küresel varsayılan yapılmaz',()=>{
 const fit=provenance.diagnosticScoreFit,qs=questions.map((q:any)=>({...q,weight:fit.weights[q.lesson],scoreBase:fit.base})),data=parseOptical(text,layout7108,qs,'Anonim',{allowMismatch:true}),summary=opticalSummary(data,3);let max=0,rounded=0;
 for(const ref of refs){const s=data.students.find(s=>s.sourceLines.includes(ref.sourceLine))!,score=summary.find(r=>r.id===s.id)!.score!;assert.notEqual(score,null);max=Math.max(max,Math.abs(score-ref.score));if(score.toFixed(3)===ref.score.toFixed(3))rounded++;}
 assert.ok(max>.0005&&max<.001);assert.ok(rounded>=35);assert.ok(questions.every((q:any)=>q.weight===null&&q.scoreBase===undefined));
});

test('v128 7108 tanımı FMT/BLDM uzantısından, yayınevi ve sınıftan bağımsızdır; kapasite gerçek soru sayısı değildir',()=>{
 const fmt=fs.readFileSync(new URL('../apps/api/assets/templates/7108.fmt',import.meta.url));assert.equal(crypto.createHash('sha256').update(fmt).digest('hex'),'5464cc6f29ad349d1fcb5808e6eb46cd2f5f398a7add899a67992f9fc519b857');
 const analyzed=analyzeFmt(decodeOptical(fmt));assert.equal(analyzed.layout.lineLength,171);assert.deepEqual(analyzed.layout.lessons.map(l=>[l.start,l.length]),[[52,20],[72,20],[92,20],[112,20],[132,20],[152,20]]);
 const {compatibleEvaluation}=require('../apps/api/lib/evaluation-compatibility');for(const publisher of ['Ankara','Özdebir','Limit','Hız','Nartest','Mozaik','Yeni Yayın'])for(const grade of [5,6,7,8]){
  const count=grade===8?20:grade+5,qs=questions.filter((q:any)=>q.number<=Math.min(count,['SOSYAL','DİN','İNGİLİZCE'].includes(q.lesson)?10:count)).map((q:any)=>({...q,positions:{A:q.number}}));
  const key={grade,publisher:{name:publisher},booklets:['A'],lessonCounts:Object.fromEntries(layout7108.lessons.map(l=>[l.name,qs.filter((q:any)=>q.lesson===l.name).length]))};assert.equal(compatibleEvaluation({layout:layout7108,grade:1,publisher:{name:'Başka'}},key),true);
 }
});

test('v128 boş cevap korunur, boş kitapçık A olur, Z reddedilir; kullanılan soruların dışı sayılmaz',()=>{
 const row=text.split('\n')[0],qs=questions.map((q:any)=>({...q,positions:{A:q.number}}));const blank=row.slice(0,50)+' '+row.slice(51),data=parseOptical(blank,layout7108,qs,'Anonim',{allowMismatch:true});assert.deepEqual(data.students[0].recordBooklets,['A']);
 const invalid=row.slice(0,50)+'Z'+row.slice(51);assert.equal(parseOptical(blank+'\n'+invalid,layout7108,qs,'Anonim',{allowMismatch:true}).diagnostics!.rejectedLines.length,1);
 const allBlank=row.slice(0,49)+' '+'A'+' '.repeat(120),empty=parseOptical(allBlank,layout7108,qs,'Anonim',{allowMismatch:true});assert.equal(empty.students[0].missingLessons!.length,0);assert.equal(opticalSummary(empty,3)[0].lessons.reduce((n,l)=>n+l.blank,0),90);
 const short=qs.filter((q:any)=>q.lesson==='TÜRKÇE'&&q.number<=5),limited=parseOptical(blank,layout7108,short,'Anonim',{allowMismatch:true});assert.equal(limited.students[0].answers.length,5);
});

test('v128 öğrenci ve hücre düzeltmesi özgün veriyi değiştirmez; cevap, net, puan ve oturum çaprazı yeniden hesaplanır',()=>{
 const data=parsed(),s=data.students[0],base=JSON.stringify(data),q=data.questions[0],answer=q.answer===s.answers[0]?'':q.answer;
 const {data:next,changes}=applyResultEdits(data,editsSchema.parse([{studentId:s.id,field:'answer',question:0,value:answer},{studentId:s.id,field:'name',value:'Yeni Anonim Ad'},{studentId:s.id,field:'studentNo',value:''},{studentId:s.id,field:'section',value:'C'}]));
 assert.equal(JSON.stringify(data),base);assert.equal(next.students[0].answers[0],answer);assert.equal(next.students[0].studentNo,'');assert.equal(changes.length,4);assert.notEqual(opticalSummary(data,3)[0].net,opticalSummary(next,3)[0].net);
 const opposite=s.booklets.TÜRKÇE==='A'?'B':'A',remapped=applyResultEdits(data,[{studentId:s.id,field:'booklet',lesson:'TÜRKÇE',value:opposite}]).data;assert.equal(remapped.students[0].booklets.TÜRKÇE,opposite);assert.equal(remapped.students[0].booklets.FEN,s.booklets.FEN);
 const missing=structuredClone(data);missing.students[0].missingLessons=['FEN'];const fen=missing.questions.findIndex(q=>q.lesson==='FEN');assert.throws(()=>applyResultEdits(missing,[{studentId:s.id,field:'answer',question:fen,value:'A'}]),/Eksik oturum/);
 assert.throws(()=>applyResultEdits(data,[{studentId:'other',field:'name',value:'X'}]),/öğrenci/);assert.throws(()=>applyResultEdits(data,[{studentId:s.id,field:'answer',question:0,value:'Z'}]),/Cevap/);
});

test('v128 Excel panosu çok satırlı, çok sütunlu ve boş hücreli yapıştırmada konumları korur',()=>{
 assert.deepEqual(parseClipboard('TÜRKÇE\t1\t\tA\r\nFEN\t2\t\t\r\n'),[['TÜRKÇE','1','','A'],['FEN','2','','']]);assert.equal(parseClipboard(Array(100).fill('A\t\tB').join('\n')).length,100);
});

test('v128 v2 ayrı anahtar ister, v3 varsayılanı korunur; v2 token tarih/hostname/tekrar doğrulaması',async()=>{
 const config={enabled:true,provider:'recaptcha-v2' as const,secret:'v2-only',siteKey:'v2-public',hostname:'local.test'},provider=(async(_url:any,options:any)=>{assert.equal(options.body.get('secret'),'v2-only');return{ok:true,json:async()=>({success:true,hostname:'local.test',challenge_ts:new Date().toISOString()})};})as typeof fetch;
 assert.equal(await verifyHuman('v2-token','login',config,provider),true);assert.equal(await verifyHuman('v2-token','login',config,provider),false);
 const run=(extra:Record<string,string>)=>spawnSync(process.execPath,['--import','tsx','-e',"const {humanVerificationConfig}=require('./apps/api/src/captcha-config');if(humanVerificationConfig().provider!==process.env.EXPECTED_PROVIDER)process.exit(2)"],{encoding:'utf8',env:{...process.env,NODE_ENV:'production',DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',JWT_SECRET:'only-unit-test-32-characters-long-secret',RECAPTCHA_ENABLED:'true',TURNSTILE_ENABLED:'false',RECAPTCHA_SECRET_KEY:'v3-only',RECAPTCHA_VERSION:'v2',RECAPTCHA_V2_SECRET_KEY:'',RECAPTCHA_V2_SITE_KEY:'',EXPECTED_PROVIDER:'recaptcha-v2',...extra}});
 assert.notEqual(run({}).status,0);const v2=run({RECAPTCHA_V2_SECRET_KEY:'separate-v2',RECAPTCHA_V2_SITE_KEY:'separate-public-v2'});assert.equal(v2.status,0);const v3=run({RECAPTCHA_VERSION:'v3',EXPECTED_PROVIDER:'recaptcha-v3'});assert.equal(v3.status,0);
});

test('v128 kapak gerçek rasterden optimize edilir; SVG ve bozuk veri reddedilir',async()=>{
 const sharp=(await import('sharp')).default,{optimizedCover}=await import('../apps/api/src/exam-authoring');const bytes=await sharp({create:{width:800,height:1000,channels:3,background:'#334466'}}).png().toBuffer();const image=await optimizedCover('data:image/png;base64,'+bytes.toString('base64'));assert.ok(image!.startsWith('data:image/webp;base64,'));const meta=await sharp(Buffer.from(image!.split(',')[1],'base64')).metadata();assert.equal(meta.width,450);assert.equal(meta.height,600);assert.equal(await optimizedCover(null),null);await assert.rejects(()=>optimizedCover('data:image/svg+xml;base64,PHN2Zz4='));await assert.rejects(()=>optimizedCover('data:image/png;base64,YmFk'));
});
