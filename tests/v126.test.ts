import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {parseOptical,opticalSummary,opticalQuestionsSchema} from "../apps/api/src/optical-core";
import {layoutOzdebirSingle as single,layoutOzdebirVerbal as verbal} from "../apps/api/src/ozdebir-layout";
import {newExamProfile} from "../apps/api/src/scoring-profile";
import {scaledScore} from "../apps/web/lib/evaluation";
import {lessonIdentity} from "../apps/api/lib/evaluation-compatibility";
const file=(name:string)=>new URL(`./fixtures/ozdebir/${name}`,import.meta.url);
const source=fs.readFileSync(file('split-anonymous.txt'),'utf8');
const counts:Record<string,number>={'TÜRKÇE':20,'MATEMATİK':20,'FEN':20,'DİN':10,'SOSYAL':10,'İNGİLİZCE':10};
const qs=single.lessons.flatMap(l=>Array.from({length:counts[l.name]},(_,i)=>({lesson:l.name,number:i+1,answer:'A',weight:null,positions:{A:i+1,B:i+1}})));
test('v126 gerçek anonim TXT: Din 72, Sosyal 92, İngilizce 112; altı ders ve 105 öğrenci',()=>{
 const data=parseOptical(source,single,qs,'Anonim',{allowMismatch:true});assert.equal(data.students.length,105);assert.equal(data.diagnostics!.missingNumeric,1);
 for(const s of data.students){const row=source.split('\n')[s.sessions!.verbal.sourceLine-1];for(const [lesson,start]of [['DİN',72],['SOSYAL',92],['İNGİLİZCE',112]]as const){assert.deepEqual(data.questions.flatMap((q,i)=>q.lesson===lesson?[s.answers[i]]:[]),row.slice(start-1,start+9).split('').map(c=>c.trim()));}}
});
test('v126 profili sınava özel, değiştirilebilir, mevcut katsayıları değiştirmez; ham netle affine puan',()=>{
 const weights=newExamProfile(qs,'Özdebir',8);assert.equal(weights[0].weight,4.112247);assert.equal(weights[0].scoreBase,203.052560);
 assert.equal(newExamProfile(qs,'Başka',8),qs);assert.equal(newExamProfile(qs,'Özdebir',7),qs);assert.equal(newExamProfile(weights,'Özdebir',8),weights);
 const data=parseOptical(source,single,weights,'Anonim',{allowMismatch:true});for(const s of data.students){const r=opticalSummary(data,3).find(r=>r.id===s.id)!;assert.equal(scaledScore(data.questions,s,3,{},500),r.score);if(!s.missingLessons?.length)assert.equal(r.score,203.052560+r.lessons.reduce((sum,l)=>sum+l.weighted!,0));else assert.equal(r.score,null);}
 assert.equal(new Set(['İNG','İngilizce','Yabancı Dil','English'].map(lessonIdentity)).size,1);
 assert.equal(opticalQuestionsSchema.parse([{lesson:'FEN',number:1,answer:'T',weight:1,positions:{A:1}}])[0].answer,'H');
});
test('v126 ayrı yüklemeler sonuç listesinde birbirini silmez; bütün oturum korunur',async()=>{
 const {aggregateResults}=await import('../apps/api/src/result-data');const rows=source.trimEnd().split('\n'),v=rows.find(r=>r[0]==='1')!,n=rows.find(r=>r[0]==='2'&&r.slice(9,14)===v.slice(9,14))!;
 const snapshot=(text:string)=>{const data=parseOptical(text,single,qs,'Anonim',{allowMismatch:true});return{data,summary:opticalSummary(data,3),penalty:3,keyName:'Test',templateName:'Özdebir',schoolName:'Anonim'};};
 const view=aggregateResults([{id:'v',schoolId:'s',createdAt:new Date(1),snapshot:snapshot(v)},{id:'n',schoolId:'s',createdAt:new Date(2),snapshot:snapshot(n)}])!;assert.equal(view.data.students.length,1);assert.equal(view.data.students[0].missingLessons!.length,0);assert.equal(Object.keys(view.data.students[0].booklets).length,6);
});
test('v126 sayı/metin katmanı kurtarma: Unicode rakamları, bozuk font eşlemesi ve boş OCR adayı',()=>{
 const {inspect}=require('../apps/api/lib/pdf-text-recovery');assert.equal(inspect('１０２９５',true).text,'10295');assert.equal(inspect('١٠٢٩٥',true).text,'10295');assert.equal(inspect('\ue001\ue002',true).needsOcr,true);assert.equal(inspect('',true).confidence,0);assert.equal(inspect('10295',true).needsOcr,false);
});
test('v126 parola politikası ve scrypt; eski bcrypt doğrulaması korunur',async()=>{
 const {passwordProblem,hashPassword,verifyPassword}=await import('../apps/api/src/passwords');const bcrypt=await import('bcryptjs');
 assert.ok(passwordProblem('123456789012345'));assert.ok(passwordProblem('short'));assert.equal(passwordProblem('uzun bir parola cümlesi'),null);
 const value='örnek uzun parola 🌳 '.repeat(4),hash=await hashPassword(value);assert.ok(await verifyPassword(value,hash));assert.equal(await verifyPassword(value+'x',hash),false);assert.ok(await verifyPassword('legacy',await bcrypt.hash('legacy',4)));
});
test('v126 paylaşım anahtarı şifreli saklanır, süre ve iptal sunucuda denetlenir',async()=>{
 const {encryptShareToken,decryptShareToken,validShare}=await import('../apps/api/src/share-security');const token='x'.repeat(43),cipher=encryptShareToken(token);assert.ok(!cipher.includes(token));assert.equal(decryptShareToken(cipher),token);assert.notEqual(encryptShareToken(token),cipher);assert.equal(validShare({revokedAt:null,expiresAt:null}),true);assert.equal(validShare({revokedAt:new Date(),expiresAt:null}),false);assert.equal(validShare({revokedAt:null,expiresAt:new Date(0)}),false);
});

test('v126 gerçek 427 O8126 karne: her ders D/Y/net, T=herkese doğru ve altı referans puan',()=>{
 const references=JSON.parse(fs.readFileSync(file('o8126-reference-anonymous.json'),'utf8')) as Array<{page:number;correct:number[];wrong:number[];score:number;lessons:Array<{lesson:string;key:string;answers:string}>}>;
 assert.equal(references.length,427);let roundedMatches=0,maximumError=0,correctMatches=0;
 const weights:Record<string,number>={'TÜRKÇE':4.112247,'MATEMATİK':4.450104,'FEN':3.776382,'SOSYAL':1.829886,'DİN':1.768433,'İNGİLİZCE':1.418961};
 for(const ref of references){
  const questions=ref.lessons.flatMap(l=>Array.from(l.key,(key,i)=>({lesson:l.lesson,number:i+1,answer:key==='T'?'H':key.trim()||'A',weight:weights[l.lesson],scoreBase:203.052560,multipleMark:'blank' as const,positions:{A:i+1},column:`${l.lesson} | ${i+1}`})));
  const student={id:`anon-${ref.page}`,name:'Anonim',school:'Anonim',branch:'8-A',booklets:{},sourceLines:[],answers:ref.lessons.flatMap(l=>Array.from(l.answers,a=>a.trim()))};
  const data={questions,students:[student],warnings:[],lineCount:1},result=opticalSummary(data,3)[0];
  for(const [i,l]of result.lessons.entries()){assert.equal(l.correct,ref.correct[i],`Page ${ref.page} ${l.lesson} D`);assert.equal(l.wrong,ref.wrong[i],`Page ${ref.page} ${l.lesson} Y`);assert.equal(l.net,ref.correct[i]-ref.wrong[i]/3);correctMatches++;}
  assert.equal(scaledScore(questions,student,3,{},500),result.score);
  const error=Math.abs(result.score!-ref.score);maximumError=Math.max(maximumError,error);roundedMatches+=Number(result.score!.toFixed(3)===ref.score.toFixed(3));assert.ok(error<.0006,`Page ${ref.page} coefficient residual ${error}`);
 }
 assert.equal(correctMatches,427*6);assert.equal(roundedMatches,422);assert.ok(maximumError>.0005&&maximumError<.0006);
 for(const score of [500,471.550,392.133,422.487,489.031,494.965])assert.ok(references.some(r=>r.score===score));
});

test('v126 gerçek O8126 referansının anonim PDF ve Excel çıktısı 471,550 puan gösterir',async()=>{
 const reference=JSON.parse(fs.readFileSync(file('o8126-reference-anonymous.json'),'utf8'))[0];
 const weights:Record<string,number>={'TÜRKÇE':4.112247,'MATEMATİK':4.450104,'FEN':3.776382,'SOSYAL':1.829886,'DİN':1.768433,'İNGİLİZCE':1.418961};
 const questions=reference.lessons.flatMap((l:any)=>Array.from(l.key,(key:any,i)=>({lesson:l.lesson,number:i+1,answer:key==='T'?'H':key,weight:weights[l.lesson],scoreBase:203.052560,multipleMark:'blank' as const,positions:{A:i+1},column:`${l.lesson} | ${i+1}`})));
 const student={id:'anonymous-001',name:'ANONİM ÖĞRENCİ',school:'Anonim Kurum',branch:'8-A',booklets:Object.fromEntries(Object.keys(weights).map(l=>[l,'A'])),sourceLines:[1],answers:reference.lessons.flatMap((l:any)=>Array.from(l.answers,(a:any)=>a.trim()))};
 const data={questions,students:[student],warnings:[],lineCount:1},summary=opticalSummary(data,3),view:any={data,summary,keyName:'Özdebir O8126 · Anonim referans',schoolName:'Anonim Kurum',penalty:3,generalCount:1,rankings:{[student.id]:{generalRank:1,schoolRank:1,classRank:1,generalCount:1,schoolCount:1,classCount:1}}};
 const {reportPdf,reportExcelRows}=await import('../apps/api/src/result-pdf'),{readPdfText}=require('../apps/api/lib/pdf-text.cjs');
 const bytes=await reportPdf(view,{kind:'cards',hideIdentity:true,order:'name',templateId:'summary-card'}),text=(await readPdfText(bytes)).flat().map((r:any)=>r.text).join(' ');
 assert.match(text,/471,550/);assert.equal(summary[0].net,82);const rows=reportExcelRows(view,{kind:'cards',hideIdentity:true,order:'name'});assert.equal(rows[1][rows[0].indexOf('Puan')],summary[0].score);
 fs.mkdirSync('output/pdf/v126',{recursive:true});fs.writeFileSync('output/pdf/v126/o8126-anonymous-reference-card.pdf',bytes);
});
