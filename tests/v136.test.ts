import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {parseOptical,layout7108} from '../apps/api/src/optical-core';
const ts=require('typescript');
const source=fs.readFileSync('tests/fixtures/v135-optical-core.txt','utf8');
const previous:any={};
new Function('exports','require',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(previous,createRequire(path.resolve('apps/api/src/optical-core.ts')));
test('v136 parser optimization preserves 7108 identities, conflicts, sessions, warnings and scores',()=>{
 const txt=fs.readFileSync('tests/fixtures/7108-v128/ankara-anonymous.txt','utf8'),questions=JSON.parse(fs.readFileSync('tests/fixtures/7108-v128/ankara-key.json','utf8'));
 for(const mergeSessions of [true,false])assert.deepEqual(parseOptical(txt,layout7108,questions,'QA',{mergeSessions,allowMismatch:true}),previous.parseOptical(txt,layout7108,questions,'QA',{mergeSessions,allowMismatch:true}));
 const rows=txt.split(/\r?\n/).filter(Boolean).slice(0,30),conflicts=rows.flatMap((row,i)=>[row,row,...(i<5?[row.slice(0,15)+'DIGER ISIM'+row.slice(25)]:[])]).join('\n');
 assert.deepEqual(parseOptical(conflicts,layout7108,questions,'QA',{allowMismatch:true}),previous.parseOptical(conflicts,layout7108,questions,'QA',{allowMismatch:true}));
});
test('v136 4995 row complete 7108 is evaluated with all questions',()=>{
 const row=fs.readFileSync('tests/fixtures/7108-v128/ankara-anonymous.txt','utf8').split(/\r?\n/)[0],questions=JSON.parse(fs.readFileSync('tests/fixtures/7108-v128/ankara-key.json','utf8'));
 const txt=Array.from({length:4995},(_,i)=>row.slice(0,10)+String(i+1).padStart(5,'0')+row.slice(15,25)+('QA'+String(i+1)).padEnd(10)+row.slice(35)).join('\n');
 const result=parseOptical(txt,layout7108,questions,'QA',{allowMismatch:true});assert.equal(result.students.length,4995);assert.equal(result.lineCount,4995);assert.ok(result.students.every(s=>s.answers.length===questions.length));
});

test('v136 indexed merging preserves full and split sessions, duplicates and conflicts',()=>{
 const previousResults:any={};new Function('exports','require',ts.transpileModule(fs.readFileSync('tests/fixtures/v135-result-data.txt','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(previousResults,createRequire(path.resolve('apps/api/src/result-data.ts')));
 const {mergeStudentData,studentMatcher,compatibleStudent}=require('../apps/api/src/result-data');
 const txt=fs.readFileSync('tests/fixtures/7108-v128/ankara-anonymous.txt','utf8'),questions=JSON.parse(fs.readFileSync('tests/fixtures/7108-v128/ankara-key.json','utf8'));
 const data=parseOptical(txt,layout7108,questions,'QA',{allowMismatch:true});
 const next={...data,students:data.students.slice(0,40).map((s,i)=>({...s,name:i%5===0?'DIGER KISI':s.name}))};
 assert.deepEqual(mergeStudentData(data,next),previousResults.mergeStudentData(data,next));
 const candidates=[...data.students.slice(0,15),...data.students.slice(0,15).map(s=>({...s,name:'DIGER KISI'}))],matcher=studentMatcher(candidates);
 for(const student of candidates)assert.deepEqual(matcher.matches(student),candidates.filter(s=>compatibleStudent(s,student)));
});

test('v136 transport messages reflect HTTP, network and timeout; cancellation stays cancellation',async()=>{
 const {opticalRequest}=await import('../apps/web/lib/optical-api');const original=globalThis.fetch;
 try{
  for(const [status,message]of [[413,'boyutu'],[504,'zaman aşımına'],[500,'sunucu hatası']] as const){globalThis.fetch=async()=>new Response('<html>proxy error</html>',{status});await assert.rejects(()=>opticalRequest('test','/evaluate'),new RegExp(message));}
  globalThis.fetch=async()=>new Response(JSON.stringify({error:'TXT 1–5.000 kayıt satırı içermelidir.'}),{status:400});await assert.rejects(()=>opticalRequest('test','/infer-fmt'),/5.000/);
  globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};await assert.rejects(()=>opticalRequest('test','/evaluate'),/Sunucuya ulaşılamadı/);
  const timeout=new AbortController();timeout.abort(new DOMException('timeout','TimeoutError'));await assert.rejects(()=>opticalRequest('test','/evaluate',{signal:timeout.signal}),/zaman aşımına/);
  const cancel=new AbortController();cancel.abort();globalThis.fetch=async()=>{throw cancel.signal.reason;};await assert.rejects(()=>opticalRequest('test','/infer-fmt',{signal:cancel.signal}),{name:'AbortError'});
 }finally{globalThis.fetch=original;}
});

test('v136 exam matching field plans preserve exact percentages and compared counts',()=>{
 const old:any={};new Function('exports','require',ts.transpileModule(fs.readFileSync('tests/fixtures/v135-optical-exam-matching.txt','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(old,createRequire(path.resolve('apps/api/src/optical-exam-matching.ts')));
 const {matchExamAnswers}=require('../apps/api/src/optical-exam-matching');
 const txt=fs.readFileSync('tests/fixtures/7108-v128/ankara-anonymous.txt','utf8'),qs=JSON.parse(fs.readFileSync('tests/fixtures/7108-v128/ankara-key.json','utf8'));
 const rows=txt.split(/\r?\n/).filter(Boolean),short=rows.map((row,i)=>i%3===0?row.slice(0,90):row).join('\n');
 for(const input of [txt,short,rows.map(row=>row.slice(0,50)+' '+row.slice(51)).join('\n')])assert.deepEqual(matchExamAnswers(input,layout7108,qs),old.matchExamAnswers(input,layout7108,qs));
 const {layoutOzdebirSingle}=require('../apps/api/src/ozdebir-layout');
 const oz=fs.readFileSync('tests/fixtures/ozdebir/split-anonymous.txt','utf8');assert.deepEqual(matchExamAnswers(oz,layoutOzdebirSingle,qs),old.matchExamAnswers(oz,layoutOzdebirSingle,qs));
});
