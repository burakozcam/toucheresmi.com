import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {parseOptical,opticalSummary} from "../apps/api/src/optical-core";
import {layoutOzdebirSingle as layout} from "../apps/api/src/ozdebir-layout";
import {evaluate} from "../apps/web/lib/evaluation";
const rows=fs.readFileSync(new URL("./fixtures/ozdebir/split-anonymous.txt",import.meta.url),"utf8").split("\n"),first=rows[0],second=rows.find(r=>r[0]==="2"&&r.slice(9,14)===first.slice(9,14))!;
const questions=layout.lessons.flatMap(l=>Array.from({length:["SOSYAL","DİN","İNGİLİZCE"].includes(l.name)?10:20},(_,i)=>({lesson:l.name,number:i+1,answer:"A",weight:1,positions:{A:i+1,B:i+1},outcomeCode:l.name,outcomeName:`${l.name} örnek kazanımı`}))); // synthetic key, not official scores
async function pdfModule(){process.env.DATABASE_URL??="postgresql://test:test@127.0.0.1:1/test";process.env.JWT_SECRET??="v125-pdf-test-secret-at-least-32-characters";return import("../apps/api/src/result-pdf");}
test("v125 90 soruluk tam / eksik oturum: 1, 2, kazanımlı PDF ve Excel ekranla aynı sonuçları kullanır",async()=>{
 const {reportPdf,reportExcelRows}=await pdfModule(),{readPdfText}=require("../apps/api/lib/pdf-text.cjs");
 fs.mkdirSync("output/pdf/v125",{recursive:true});
 for(const [label,source]of [["complete",first+"\n"+second],["missing",first]]){
  const data=parseOptical(source,layout,questions,"Anonim Kurum",{allowMismatch:true}),summary=opticalSummary(data,3),s=data.students[0],view:any={data,summary,keyName:"Özdebir · v1.2.5 Test Karnesi",schoolName:"Anonim Kurum",penalty:3,generalCount:1,rankings:{[s.id]:{generalRank:summary[0].score===null?null:1,schoolRank:summary[0].score===null?null:1,classRank:summary[0].score===null?null:1,generalCount:1,schoolCount:1,classCount:1}}};
  assert.deepEqual(evaluate(data.questions,s,3),summary[0].lessons);
  const excel=reportExcelRows(view,{kind:"cards",hideIdentity:true,order:"name"});
  if(label==="missing"){assert.equal(excel[1][excel[0].indexOf("MATEMATİK Net")],null);assert.equal(excel[1][excel[0].indexOf("Puan")],null);}
  if(label==="missing")for(const templateId of ["classic-card","analysis-card","table-card"]){const bytes=await reportPdf(view,{kind:"cards",hideIdentity:true,order:"name",templateId}),text=(await readPdfText(bytes)).flat().map((v:any)=>v.text).join(" ");assert.match(text,/Oturum yok/);assert.ok(!/NaN|undefined/.test(text));}
  for(const [templateId,count]of [["summary-card",1],["two-page-card",2],["detailed-card",2]]as const){
   const bytes=await reportPdf(view,{kind:"cards",hideIdentity:true,order:"name",templateId}),pages=await readPdfText(bytes),text=pages.flat().map((v:any)=>v.text).join(" ");
   assert.equal(pages.length,count);assert.ok(!/[\x00]|NaN|undefined/.test(text));assert.ok(text.includes(s.name));
   if(label==="missing")assert.match(text,/Eksik oturum|Oturum yok/);
   fs.writeFileSync(`output/pdf/v125/${label}-${templateId}.pdf`,bytes);
  }
 }
});
