import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import rows from "../apps/web/data/nartest-8-optical.json";
import { parseOpticalKeyRows } from "../apps/web/lib/optical";
import { evaluationPublicationWhere, evaluationQuestions, prepareEvaluation, readEvaluationExcel } from "../apps/api/src/optical-catalog";

test("birleşik katalog: Nartest kazanım Excel’i cevapları ve A/B eşleştirmelerini tek sınava aktarır",()=>{
  const lib=require("../apps/web/public/vendor/xlsx.full.min.js");
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"optical-catalog-")),file=path.join(dir,"key.xlsx");
  try{
    const book=lib.utils.book_new();lib.utils.book_append_sheet(book,lib.utils.aoa_to_sheet(rows),"kznm");fs.writeFileSync(file,lib.write(book,{type:"buffer",bookType:"xlsx"}));
    assert.deepEqual(readEvaluationExcel(file),parseOpticalKeyRows(rows));
    const files=[{category:"ANSWER_KEY",storagePath:"unused.pdf",originalFileName:"key.pdf"},{category:"LEARNING_OUTCOMES",storagePath:file,originalFileName:"outcomes.xlsx"}];
    assert.equal(prepareEvaluation(files,true,null,true)?.length,90);
    assert.throws(()=>prepareEvaluation(files.slice(1),true,null,true),/hem cevap anahtarı hem kazanım/);
    const noOutcomes=parseOpticalKeyRows(rows).map(q=>({...q,outcomeCode:""}));assert.throws(()=>evaluationQuestions(noOutcomes),/kazanım/);
    const pdfOnly=files.map(f=>({...f,originalFileName:"file.pdf"}));
    assert.throws(()=>prepareEvaluation(pdfOnly,true,null,true),/Excel/);
    assert.equal(prepareEvaluation(pdfOnly,false,null,true),null);
    assert.equal(prepareEvaluation(pdfOnly,true,parseOpticalKeyRows(rows),false)?.length,90);
    assert.throws(()=>prepareEvaluation(pdfOnly,true,parseOpticalKeyRows(rows),true),/Excel/);
  } finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("birleşik katalog: bayi listesi yayın bayrağından bağımsız, yalnızca hazır ve izinli sınavları döndürür",async()=>{
  const {opticalRouter}=await import("../apps/api/src/optical-routes");const {prisma}=await import("../apps/api/src/db");
  const original=prisma.opticalKey.findMany;
  try{
    prisma.opticalKey.findMany=(async({where}:any)=>{
      assert.equal(where.active,true);assert.deepEqual(where.publication,evaluationPublicationWhere);assert.equal(where.publication.published,undefined);
      return[{id:"opt",name:"legacy-name",active:true,penalty:3,questions:parseOpticalKeyRows(rows),publicationId:"exam",publication:{examName:"Deneme 1",grade:8,publisher:{id:"pub",name:"Nartest"}}}];
    }) as any;
    const handler=(opticalRouter as any).stack.find((x:any)=>x.route?.path==="/keys"&&x.route.methods.get).route.stack.at(-1).handle;
    let result:any;await handler({user:{role:"DEALER"},query:{}},{json(v:any){result=v;}},(e:any)=>{if(e)throw e;});
    assert.equal(result[0].name,"Deneme 1");assert.equal(result[0].publisher.id,"pub");assert.equal(result[0].grade,8);assert.equal(result[0].questions,undefined);
  }finally{prisma.opticalKey.findMany=original;}
});
test("sınav düzenleme: görünürlükler bağımsız değişir, gönderilmeyen seçenek ve ceza korunur",async()=>{
  const {app}=await import("../apps/api/src/server");const {prisma}=await import("../apps/api/src/db");
  const originalFind=prisma.publishedAnswerKey.findUnique,originalTransaction=prisma.$transaction;
  const current:any={id:"publication",publisherId:"pub",grade:8,examName:"Deneme",published:true,showInEvaluation:true,files:[{category:"ANSWER_KEY",storagePath:"unused.pdf",originalFileName:"key.pdf"},{category:"LEARNING_OUTCOMES",storagePath:"unused2.pdf",originalFileName:"outcomes.pdf"}],opticalKey:{questions:parseOpticalKeyRows(rows),penalty:4}};
  let updates=0;
  prisma.publishedAnswerKey.findUnique=(async()=>current) as any;
  prisma.$transaction=(async(fn:any)=>fn({publishedAnswerKey:{update:async({data}:any)=>{updates++;assert.equal(data.opticalKey.upsert.update.penalty,4);const{opticalKey,...rest}=data;Object.assign(current,rest);return current;}}})) as any;
  const handler=(app as any).router.stack.find((x:any)=>x.route?.path==="/api/admin/answer-keys/:id"&&x.route.methods.patch).route.stack.at(-1).handle;
  async function invoke(changes:any){let status=200;await handler({params:{id:"publication"},body:{publisherId:"pub",grade:"8",examName:"Deneme",confirmPublication:"true",...changes},files:{}},{status(n:number){status=n;return this;},json(){}},(e:any)=>{if(e)throw e;});return status;}
  try{
    assert.equal(await invoke({published:"false"}),200);assert.equal(current.published,false);assert.equal(current.showInEvaluation,true);
    assert.equal(await invoke({showInEvaluation:"false"}),200);assert.equal(current.published,false);assert.equal(current.showInEvaluation,false);
    assert.equal(await invoke({showInEvaluation:"true"}),200);assert.equal(current.published,false);assert.equal(current.showInEvaluation,true);
    current.files.pop();assert.equal(await invoke({showInEvaluation:"true"}),400);assert.equal(updates,3);
  }finally{prisma.publishedAnswerKey.findUnique=originalFind;prisma.$transaction=originalTransaction;}
});

const pdfContext=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,"../apps/web/public/araclar/pdf-text-selection.js"),"utf8"),pdfContext);
const extract=pdfContext.PdfTextSelection.extractEntries;
function entry(text:string,x=0,y=0.4){let cursor=x;return{text,chars:[...text].map((c,i)=>{const w=/[0-9]/.test(c)?0.006:c==="I"?0.003:0.014;const r={text:c,start:i,end:i+1,xStart:cursor,xEnd:cursor+w,yStart:y,yEnd:y+0.02};cursor+=w;return r;})};}
test("PDF metin ayırma: değişken genişlikli NUMARASI:456 içinden yalnızca 456 alınır",()=>{
  const e=entry("ÖĞRENCİ NUMARASI:456"),first=e.chars[e.text.indexOf("456")],last=e.chars.at(-1)!;
  const anchor={segments:[{xStart:first.xStart,xEnd:last.xEnd,yStart:0.4,yEnd:0.42,text:"456",prefix:"ÖĞRENCİ NUMARASI:",suffix:"",numeric:true}]};
  assert.equal(extract([e],anchor),"456");
  assert.equal(extract([entry("ÖĞRENCİ NUMARASI:12345")],anchor),"12345");
  assert.equal(extract([entry("ÖĞRENCİ NUMARASI:"),entry("456",first.xStart)],anchor),"456");
  assert.equal(extract([entry("BAŞKA METİN",0,0.8)],anchor),"");
});
test("PDF metin ayırma: isimde etiket ve komşu sayılar alınmaz; birden fazla segment yinelenmez",()=>{
  const e=entry("AD SOYAD:ALİ VELİ"),start=e.text.indexOf("ALİ"),a={xStart:e.chars[start].xStart,xEnd:e.chars.at(-1)!.xEnd,yStart:0.4,yEnd:0.42,text:"ALİ VELİ",prefix:"AD SOYAD:",suffix:"",whole:false};
  assert.equal(extract([e],{segments:[a,a]}),"ALİ VELİ");
  assert.equal(extract([entry("AD SOYAD:MEHMET UZUNSOY")],{segments:[a]}),"MEHMET UZUNSOY");
  const n=entry("NO:456 SINIF:8"),i=n.text.indexOf("456");
  assert.equal(extract([n],{segments:[{xStart:n.chars[i].xStart,xEnd:n.chars[i+2].xEnd,yStart:0.4,yEnd:0.42,prefix:"NO:",suffix:" SINIF:7",numeric:true}]}),"456");
});
