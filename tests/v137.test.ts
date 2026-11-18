import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {auditSummaryText} from '../apps/web/lib/audit-summary';
import {readResultSnapshot} from '../apps/api/src/result-snapshot-validation';
import {safeSearchTerm} from '../apps/api/src/search-history-core';
import {ownerGameAccess} from '../apps/api/src/game-access';
import {planWrongQuestions,zeroErrorBookletEnabled} from '../apps/api/src/question-archive-core';
import {parseOptical,layout7108,opticalSummary} from '../apps/api/src/optical-core';
import {mergeStudentData} from '../apps/api/src/result-data';
const text=fs.readFileSync('tests/fixtures/7108-v128/ankara-anonymous.txt','utf8'),questions=JSON.parse(fs.readFileSync('tests/fixtures/7108-v128/ankara-key.json','utf8'));
test('v137 plain audit descriptions, JSON and malformed legacy history remain renderable',()=>{
 for(const value of ['Sonuç verileri düzenlendi.','{"changeCount":3}','{broken',null,undefined,{fields:['answer']}])assert.equal(typeof auditSummaryText(value),'string');
 assert.equal(auditSummaryText('Sonuç verileri düzenlendi.'),'Sonuç verileri düzenlendi.');
 assert.match(auditSummaryText('{broken'),/broken/);
});
test('v137 object, text transport and legacy encoded snapshots retain every answer; corrupt snapshots cannot become empty edits',()=>{
 const data=parseOptical(text,layout7108,questions,'QA',{allowMismatch:true}),snapshot={data,summary:opticalSummary(data,3),penalty:3};
 for(const input of [snapshot,JSON.stringify(snapshot),JSON.stringify(JSON.stringify(snapshot))])assert.deepEqual(readResultSnapshot(input),snapshot);
 for(const input of ['Sonuç verisi okunamadı','{}',{...snapshot,data:{...data,students:undefined}},{...snapshot,data:{...data,students:[{...data.students[0],answers:[]}]}}])assert.throws(()=>readResultSnapshot(input),{code:'RESULT_SNAPSHOT_UNREADABLE'});
 assert.ok(snapshot.data.students.length>0);
});
test('v137 full and already merged imports preserve answers when merging is enabled or disabled',()=>{
 for(const mergeSessions of [true,false]){
  const data=parseOptical(text,layout7108,questions,'QA',{mergeSessions,allowMismatch:true});
  const merged=mergeStudentData({...data,students:[],warnings:[],lineCount:0},data);
  assert.deepEqual(merged.students.map(s=>s.answers),data.students.map(s=>s.answers));
  const duplicate=mergeStudentData(data,data);if(mergeSessions){assert.ok(duplicate.students.length>=data.students.length);assert.deepEqual(duplicate.students.slice(0,data.students.length).map(s=>s.answers),data.students.map(s=>s.answers));}else assert.equal(duplicate.students.length,data.students.length*2);
 }
});
test('v137 search minimization filters sensitive submissions without changing search behavior',()=>{
 assert.equal(safeSearchTerm('  ALAN   8. Sınıf  '),'alan 8. sınıf');
 for(const input of ['x','a'.repeat(121),'admin@example.test','0555 123 45 67','12345678901','Bearer secret','<script>x</script>','https://example.test','şifre denemesi'])assert.equal(safeSearchTerm(input),null);
});
test('v137 only designated direct owner may access games',()=>{
 const user={id:'owner',email:'admin@kurumsalsinav.com',role:'SUPER_ADMIN',active:true};assert.equal(ownerGameAccess(user),true);
 assert.equal(ownerGameAccess({...user,email:'other@example.test'}),false);assert.equal(ownerGameAccess({...user,role:'DEALER'}),false);assert.equal(ownerGameAccess({...user,active:false}),false);assert.equal(ownerGameAccess(user,'admin'),false);
});
test('v137 hidden booklet foundation keeps original source and refuses different versions, answers and missing rights',()=>{
 assert.equal(zeroErrorBookletEnabled,false);
 const source={examId:'exam',publisherId:'pub',examVersion:'fingerprint',publisherName:'A Yayınları',examName:'TG-1',grade:8};
 const q={lesson:'Türkçe',number:1,answer:'A',positions:{A:1,B:4}},student={answers:['B'],booklets:{Türkçe:'B'}};
 const a={id:'a',examId:'exam',publisherId:'pub',examVersion:'fingerprint',grade:8,lesson:'Türkçe',session:'single',booklet:'B',originalNumber:4,canonicalNumber:1,correctAnswer:'A',storageKey:'private/a',rightsStatus:'LICENSED'};
 const plan=planWrongQuestions(source,[q],student,[a]);assert.equal(plan.items[0].originalNumber,4);assert.deepEqual(plan.answerKey,[{number:1,answer:'A'}]);assert.equal(plan.blankPolicy,'UNDECIDED');
 for(const archive of [[{...a,examVersion:'new'}],[{...a,correctAnswer:'B'}],[{...a,rightsStatus:'PENDING'}],[{...a,session:'numeric'}],[{...a,publisherId:'another-publisher'}],[{...a,rightsExpiresAt:new Date(0)}],[]]){const result=planWrongQuestions(source,[q],student,archive);assert.equal(result.items.length,0);assert.equal(result.missing.length,1);}
});
test('v137 CPU pool rejects a third simultaneous job and preserves canonical answers',async()=>{
 const {cpuParse}=await import('../apps/api/src/cpu-jobs');
 const row=text.split(/\r?\n/)[0],expected=parseOptical(row,layout7108,questions,'QA',{allowMismatch:true});
 const first=cpuParse(row,layout7108,questions,'QA',{allowMismatch:true},false),second=cpuParse(row,layout7108,questions,'QA',{allowMismatch:true},false);
 await assert.rejects(()=>cpuParse(row,layout7108,questions,'QA',{allowMismatch:true},false),{code:'CPU_CAPACITY'});
 for(const result of await Promise.all([first,second]))assert.deepEqual(result.students.map(s=>s.answers),expected.students.map(s=>s.answers));
});
