import test from 'node:test';
import assert from 'node:assert/strict';
import {answerKeyRows} from '../apps/api/lib/answer-key-rows';
import {opticalQuestionsSchema,opticalSummary,parseOptical,layout7108,type OpticalQuestion} from '../apps/api/src/optical-core';
import {keyFingerprint,reEvaluate} from '../apps/api/src/optical-review';
import {describeKeyChanges} from '../apps/api/lib/key-changes';
import {requireKeyConfirmation,revisionFingerprint,recordKeyRevision} from '../apps/api/src/key-revision';
import {examStructure,builtinExamTemplates} from '../apps/api/src/exam-template-core';
import {publisherPage} from '../apps/api/src/publisher-pagination';
import {importReleaseHistory} from '../apps/api/src/announcement-import';
import {releaseHistory} from '../apps/api/src/announcement-history';
import {csvCell,exportDigest,exportName,validateExport,exportInput} from '../apps/api/src/export-core';
import {expiredAudit,retentionDays} from '../apps/api/src/audit-retention';
import {controlKey,controlLabel} from '../apps/web/lib/help-control';
const {parseWorkbook}=require('../apps/api/lib/optical-import'),x=require('xlsx');
const questions:OpticalQuestion[]=[{lesson:'Türkçe Özel Şğüıöç',number:1,answer:'A',weight:2,positions:{A:1,B:2,C:1,D:2},outcomeCode:'001',outcomeName:'Çıkarım yapar; ğüşİ.',optionCount:3,scoreBase:100,multipleMark:'blank',source:{system:'general',sheet:'Şablon',row:3,columns:['Numara','Ad'],values:['00007','Şükrü']}},{lesson:'Türkçe Özel Şğüıöç',number:2,answer:'X',weight:2,positions:{A:2,B:1,C:2,D:1},outcomeCode:'',outcomeName:'',optionCount:3,scoreBase:100,multipleMark:'blank'}];
test('v140 Excel roundtrip preserves crosses, Turkish labels, outcomes, source, profile and cancellations',()=>{
 const book=x.utils.book_new();x.utils.book_append_sheet(book,x.utils.aoa_to_sheet(answerKeyRows(questions)),'Cevap Anahtarı');const bytes=x.write(book,{type:'buffer',bookType:'xlsx'}),read=x.read(bytes,{type:'buffer',raw:true});const actual=opticalQuestionsSchema.parse(parseWorkbook(read.SheetNames.map((name:string)=>({name,rows:x.utils.sheet_to_json(read.Sheets[name],{header:1,defval:''})})),'standard').questions);
 for(let i=0;i<questions.length;i++){const {source,...a}=actual[i],{source:original,...b}=questions[i];assert.deepEqual(a,b);if(original)assert.deepEqual(source,original);}
 assert.equal(actual[0].source!.values[0],'00007');
});
test('v140 single booklet, H, 3/4/5 choices and missing answers retain current validation meanings',()=>{
 for(const optionCount of [3,4,5] as const){const q={...questions[0],positions:{A:1},optionCount,answer:'H'};assert.equal(opticalQuestionsSchema.parse([q])[0].answer,'H');assert.equal(opticalQuestionsSchema.safeParse([{...q,answer:''}]).success,false);}
 assert.equal(opticalQuestionsSchema.safeParse([{...questions[0],positions:{A:1},answer:'E',optionCount:3}]).success,false);
 assert.throws(()=>parseWorkbook([{name:'Bozuk',rows:[['Ders','A Soru No','Doğru Cevap'],['Türkçe',1,'']]}],'standard'));
});
test('v140 A to B direction, absent sessions and edited student numbers survive reevaluation',()=>{
 const old=opticalQuestionsSchema.parse([{...questions[0],lesson:'TÜRKÇE',answer:'A'},{...questions[1],lesson:'TÜRKÇE',answer:'B'}]);
 const data:any={questions:old,students:[{id:'s',studentNo:'00007',name:'Düzeltilmiş Ad',school:'Kurum',branch:'8-A',booklets:{TÜRKÇE:'B'},sourceLines:[1],answers:['A','B']}],lineCount:1,warnings:[]},snapshot:any={data,summary:opticalSummary(data,3),penalty:3,keyName:'Sınav',schoolName:'Kurum',templateName:'FMT'};
 const next=old.map((q,i)=>({...q,positions:{...q.positions,B:i+1}})),result=reEvaluate(snapshot,next,3);assert.deepEqual(result.data.students[0].answers,['B','A']);assert.equal(result.data.students[0].studentNo,'00007');assert.equal(result.data.students[0].name,'Düzeltilmiş Ad');assert.deepEqual(snapshot.data.students[0].answers,['A','B']);
 assert.throws(()=>reEvaluate({...snapshot,data:{...data,students:[{...data.students[0],booklets:{}}]}},next,3),/kitapçık/);
 assert.throws(()=>reEvaluate(snapshot,next.slice(0,1),3));
});
test('v140 duplicate and wrong booklet destinations fail before saving',()=>{const duplicate=questions.map(q=>({...q,positions:{A:q.number,B:1}}));assert.equal(opticalQuestionsSchema.safeParse(duplicate).success,false);});
test('v140 change summary separates score effects from outcome text and requires typed approval',()=>{
 const onlyText=questions.map(q=>({...q,outcomeName:'Yeni açıklama'}));assert.equal(describeKeyChanges(questions,onlyText,3,3).affectsScoring,false);assert.equal(describeKeyChanges(questions,questions.map(q=>({...q,answer:'C'})),3,3).affectsScoring,true);
 assert.throws(()=>requireKeyConfirmation(true,'ONAYLA','x'));assert.throws(()=>requireKeyConfirmation(true,'onayla','Düzeltme'));requireKeyConfirmation(true,'ONAYLA','Kaynak doğrulandı');requireKeyConfirmation(false);
 assert.notEqual(keyFingerprint(questions,3),keyFingerprint(onlyText,3));
});
test('v140 immutable exam structures accept custom lesson counts and reject unsupported structures',()=>{assert.equal(examStructure.parse(builtinExamTemplates[0].structure).lessons.reduce((n,l)=>n+l.count,0),90);assert.equal(examStructure.parse({optionCount:3,booklets:['A','B'],lessons:[{name:'Türkçe',count:15},{name:'Matematik',count:25},{name:'Fen',count:15}]}).lessons.length,3);assert.equal(examStructure.safeParse({optionCount:6,booklets:['B'],lessons:[{name:'Ders',count:301}]}).success,false);});
test('v140 publisher paging is bounded, normalized and never widens public active scope',()=>{const p=publisherPage({page:'2',pageSize:'25',search:' Şükrü ',status:'inactive'},false,v=>v.toLocaleLowerCase('tr'));assert.equal(p.skip,25);assert.equal(p.take,25);assert.equal(p.where.active,true);assert.throws(()=>publisherPage({page:'-1'},true,v=>v));assert.throws(()=>publisherPage({page:'1',pageSize:'10000'},true,v=>v));});
test('v140 history import reports existing and failed events without losing successes or guessing dates',async()=>{let i=0;const result=await importReleaseHistory(async()=>{i++;if(i===2)throw Error('private technical failure');return i!==1;});assert.equal(result.imported,releaseHistory.length-2);assert.equal(result.existing,1);assert.equal(result.failed,1);assert.equal(result.skipped,0);assert.doesNotMatch(result.errors.join(),/private/);});
test('v140 guide identities deduplicate record rows and preserve explicit semantic variants',()=>{assert.equal(new Set(Array.from({length:5000},()=>controlKey('file-select'))).size,1);assert.notEqual(controlKey('field','title'),controlKey('field','summary'));assert.equal(controlLabel({id:'file-select',label:'TXT dosyasını seç'}),'TXT dosyasını seç');});
test('v140 CSV formula starters and paths are safe; numeric identifiers remain text',()=>{for(const v of ['=HYPERLINK("bad")','+cmd','-12','@SUM(1)','\t=1'])assert.ok(csvCell(v).startsWith('"\''));assert.equal(csvCell('00007'),'"00007"');assert.doesNotMatch(exportName('../../okul\\a.txt'),/[\\/]/);assert.equal(exportDigest({a:1,b:2}),exportDigest({b:2,a:1}));});
test('v140 export filters cannot cross data types or accept invalid dates/grades',()=>{assert.throws(()=>validateExport(exportInput.parse({type:'publishers',format:'json',filters:{dealerId:'x'}})));assert.throws(()=>validateExport(exportInput.parse({type:'txt',format:'json'})));assert.throws(()=>validateExport(exportInput.parse({type:'audit',format:'csv',filters:{from:'2026-02-30'}})));validateExport(exportInput.parse({type:'keys',format:'zip',filters:{grade:'8'}}));});
test('v140 retention protects key revision history and cleanup, enforces critical age',()=>{const now=new Date('2026-11-20T00:00:00Z');assert.equal(retentionDays('ANSWER_KEY_REVISION'),null);assert.equal(expiredAudit({action:'ANSWER_KEY_REVISION',createdAt:new Date(0)},now),false);assert.equal(expiredAudit({action:'AUDIT_CLEANUP',createdAt:new Date(0)},now),false);assert.equal(expiredAudit({action:'DELETE /results/:id',createdAt:new Date('2025-11-19')},now),false);assert.equal(expiredAudit({action:'CLIENT_NAVIGATION',createdAt:new Date('2026-11-01')},now),true);});

test('v140 legacy empty keys remain editable and their original JSON is retained in revision audit',async()=>{let saved:any;const tx:any={auditLog:{create:async({data}:any)=>{saved=data;}}};assert.equal(revisionFingerprint([],3).length,64);await recordKeyRevision(tx,{id:'legacy',questions:[],penalty:3},{questions,penalty:3},'actor','Eski boş anahtar tamamlandı');const summary=JSON.parse(saved.summary);assert.deepEqual(summary.before.questions,[]);assert.deepEqual(summary.after.questions,questions);});

test('v140 custom optical structures cannot bypass physical FMT capacity through permissive row mode',()=>{const q=Array.from({length:25},(_,i)=>({lesson:'MATEMATİK',number:i+1,answer:'A',weight:null,positions:{A:i+1},optionCount:4 as const}));assert.throws(()=>parseOptical('synthetic',layout7108,q,'Kurum',{allowMismatch:true}),/FMT alan kapasitesi 20/);const unmatched=[{...q[0],lesson:'Özel Ders'}];assert.throws(()=>parseOptical('synthetic',layout7108,unmatched,'Kurum',{allowMismatch:true}),/FMT alan kapasitesi 0/);});
