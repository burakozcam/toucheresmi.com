import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {parseOptical,layout7108,opticalSummary} from "../apps/api/src/optical-core";
import {parseOpticalKeyRows} from "../apps/web/lib/optical";
import rows from "../apps/web/data/nartest-8-optical.json";



import {keyFingerprint} from "../apps/api/src/optical-review";
const lines=fs.readFileSync(new URL("./fixtures/7108-anonymous.txt",import.meta.url),"utf8").trimEnd().split(/\r?\n/);
const questions=parseOpticalKeyRows(rows);
async function modules(){process.env.DATABASE_URL??="postgresql://test:test@127.0.0.1:1/test";process.env.JWT_SECRET??="result-workflow-test-only-secret-at-least-32-characters";return {...await import("../apps/api/src/result-data"),...await import("../apps/api/src/result-identity"),...await import("../apps/api/src/result-pdf")};}
const snapshot=(data:any)=>({data,summary:opticalSummary(data,3),penalty:3,schoolName:"Örnek Kurum",keyName:"Örnek Deneme",templateName:"7108",keyFingerprint:keyFingerprint(questions,3)});
test("iki ayrı dosyadaki oturumlar TC veya numara ile birleşir; tekrar ders ve kimlik çelişkisi uyarıyla birleştirilir",async()=>{
 const {identityHash,encryptIdentity,decryptIdentity,resultAccessCode,mergeStudentData,safeSnapshot}=await modules(),options={hashIdentity:identityHash,encryptIdentity};
 const numeric=parseOptical([lines[0],lines[3]].join("\n"),layout7108,questions,"Kurum",options),verbal=parseOptical([lines[1],lines[2]].join("\n"),layout7108,questions,"Kurum",options);
 assert.equal(verbal.students.length,2);const merged=mergeStudentData(verbal,numeric),together=parseOptical(lines.join("\n"),layout7108,questions,"Kurum",options);
 assert.deepEqual(merged.students.map(s=>s.answers),together.students.map(s=>s.answers));assert.equal(merged.students[1].id,"00002");const repeated=mergeStudentData(merged,numeric);assert.deepEqual(repeated.students.map(s=>s.answers),merged.students.map(s=>s.answers));assert.ok(repeated.warnings.some(w=>w.includes("daha çok işaretlemeli")));
 const separate=parseOptical(lines.join("\n"),layout7108,questions,"Kurum",{...options,mergeSessions:false});assert.equal(separate.students.length,4);assert.equal(new Set(separate.students.map(s=>s.id)).size,4);
 const conflict=structuredClone(numeric);conflict.students[0].identityHash=identityHash("other");assert.ok(mergeStudentData(merged,conflict).warnings.some(w=>w.includes("farklı TC")));
 assert.ok(!JSON.stringify(safeSnapshot(snapshot(merged))).includes("identityEncrypted"));assert.ok(!JSON.stringify(safeSnapshot(snapshot(merged))).includes("identityHash"));
 assert.equal(decryptIdentity(encryptIdentity("11111111110")),"11111111110");assert.notEqual(resultAccessCode("a","1"),resultAccessCode("a","2"));
 const first=parseOptical(lines[0],layout7108,questions,"Kurum",options),newStudent=parseOptical(lines[3],layout7108,questions,"Kurum",options);assert.deepEqual(mergeStudentData(first,newStudent).students[1].sourceLines,[2]);
 const byNumber=lines.slice(0,2).map(line=>line.slice(0,37)+" ".repeat(11)+line.slice(48)).join("\n");assert.equal(parseOptical(byNumber,layout7108,questions,"Kurum",options).students.length,1);
});
test("aynı sınavdaki yüklemeler kurum raporunda toplanır; eski sürüm/deleted veri toplamı şişirmez",async()=>{
 const {identityHash,encryptIdentity,aggregateResults}=await modules(),options={hashIdentity:identityHash,encryptIdentity};
 const data=parseOptical(lines.join("\n"),layout7108,questions,"Kurum",options),s=snapshot(data),r={id:"r",schoolId:"s",snapshot:s,createdAt:new Date()};
 const view=aggregateResults([r,{...r,id:"new",createdAt:new Date(Date.now()+1000)},{...r,id:"deleted",snapshot:{...s,deletedAt:new Date().toISOString()}}])!;assert.equal(view.data.students.length,2);assert.equal(view.sourceResultIds.length,2);assert.equal(view.summary[0].net,s.summary[0].net);
 const separate=parseOptical(lines.join("\n"),layout7108,questions,"Kurum",{...options,mergeSessions:false});assert.equal(aggregateResults([{...r,snapshot:snapshot(separate)}])!.data.students.length,4);
 const noIdentity=structuredClone(data);delete noIdentity.students[0].identityHash;delete noIdentity.students[0].identityEncrypted;const mixed=aggregateResults([{...r,snapshot:snapshot(noIdentity)},{...r,id:"with-tc",createdAt:new Date(Date.now()+1000)}])!;assert.equal(mixed.data.students.length,2);
});
test("PDF ve Excel: gerçek karne, kazanım, üç sıralama ve TC gizleme uygulanır",async()=>{
 const {identityHash,encryptIdentity,reportPdf,reportExcelRows}=await modules(),options={hashIdentity:identityHash,encryptIdentity};
 const data=parseOptical(lines.join("\n"),layout7108,questions,"Kurum",options);data.students[0].identityEncrypted=encryptIdentity("11111111110");
 const view:any={...snapshot(data),generalCount:999,rankings:Object.fromEntries(data.students.map(s=>[s.id,{generalRank:321,generalCount:999,schoolRank:1,schoolCount:2,classRank:1,classCount:2}]))};
 const hidden=reportExcelRows(view,{kind:"cards",order:"score",hideIdentity:true});assert.ok(!hidden[0].includes("TC"));assert.ok(!JSON.stringify(hidden).includes("11111111110"));
 const shown=reportExcelRows(view,{kind:"cards",order:"name",hideIdentity:false});assert.ok(shown[0].includes("TC"));assert.ok(JSON.stringify(shown).includes("11111111110"));
 const pdf=await reportPdf(view,{kind:"cards",order:"score",hideIdentity:true});assert.equal(pdf.subarray(0,5).toString(),"%PDF-");fs.writeFileSync("/tmp/ks-result-card.pdf",pdf);
 const list=await reportPdf(view,{kind:"school",order:"name",hideIdentity:false});fs.writeFileSync("/tmp/ks-result-list.pdf",list);
});
