import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { layout7108,opticalQuestionsSchema } from "../apps/api/src/optical-core";
import { previewFmt } from "../apps/api/src/fmt-preview";
import { keyTemplateRows,layoutProblems,questionProblems } from "../apps/web/lib/optical-admin-validation";
import { parseOpticalKeyRows } from "../apps/web/lib/optical";
import { keyFingerprint } from "../apps/api/src/optical-review";
import { readEvaluationExcel } from "../apps/api/src/optical-catalog";
const txt=fs.readFileSync(path.join(__dirname,"fixtures/7108-anonymous.txt"),"utf8");
test("FMT alan kontrolü çakışma, uzunluk ve yinelenen dersleri adlarıyla bildirir",()=>{
  assert.deepEqual(layoutProblems(layout7108),[]);const layout=structuredClone(layout7108);layout.fields.name.start=11;layout.lessons[0].length=301;layout.lessons[1].name=layout.lessons[0].name;
  const errors=layoutProblems(layout);assert.ok(errors.some(e=>e.includes("Ad / tam ad")&&e.includes("Öğrenci no")));assert.ok(errors.some(e=>e.includes("1–300")));assert.ok(errors.some(e=>e.includes("benzersiz")));
});
test("FMT örnek TXT tüm satırları inceler; kimlik alanını gizler ve bozuk satırları raporlar",()=>{
  const result=previewFmt(txt,layout7108);assert.equal(result.canSave,true);assert.equal(result.lineCount,4);assert.equal(result.rows[0].fields.id,"00001");assert.equal(result.rows[0].fields.identity,"•••••• (gizlendi)");assert.ok(!JSON.stringify(result).includes("SAMPLE00001"));
  const bad=txt.split(/\r?\n/);bad[0]="x";bad[1]=bad[1].slice(0,50)+"Z"+bad[1].slice(51);const r=previewFmt(bad.join("\r\n"),layout7108);assert.equal(r.canSave,false);assert.ok(r.errors.some(e=>e.includes("Satır 1")));assert.ok(r.errors.some(e=>e.includes("kitapçık")));assert.throws(()=>previewFmt("",layout7108),/1–2000/);
});
test("anahtar şablonu kullanıma hazırdır; C/D içe aktarımı sunucu ve tarayıcıda aynıdır",()=>{
  const rows=structuredClone(keyTemplateRows);rows[1][7]=2;rows[1][8]=1;rows[2][7]=1;rows[2][8]=2;
  const questions=parseOpticalKeyRows(rows);assert.deepEqual(questionProblems(questions),[]);assert.equal(opticalQuestionsSchema.safeParse(questions).success,true);assert.deepEqual(questions[0].positions,{A:1,B:2,C:2,D:1});
  const x=require("../apps/web/public/vendor/xlsx.full.min.js"),w=x.utils.book_new();x.utils.book_append_sheet(w,x.utils.aoa_to_sheet(rows),"Cevap Anahtarı");const dir=fs.mkdtempSync(path.join(os.tmpdir(),"key-import-")),file=path.join(dir,"key.xlsx");
  try{fs.writeFileSync(file,x.write(w,{type:"buffer",bookType:"xlsx"}));assert.deepEqual(readEvaluationExcel(file),questions.map(q=>({...q,source:{...q.source!,sheet:"Cevap Anahtarı"}})));}finally{fs.rmSync(dir,{recursive:true,force:true});}
  questions[1].positions.B=2;questions[0].outcomeCode="";assert.ok(questionProblems(questions).some(e=>e.includes("tekrarsız")));assert.ok(!questionProblems(questions).some(e=>e.includes("kazanım")));
});
test("anahtar kontrolü dersler arasında farklı kitapçık kümelerini ve eksik cevapları reddeder",()=>{
  const q=parseOpticalKeyRows(keyTemplateRows);q.push({...q[0],lesson:"FEN",number:1,answer:"",positions:{A:1}});const errors=questionProblems(q);assert.ok(errors.some(e=>e.includes("FEN")&&e.includes("kitapçıkları")));assert.ok(errors.some(e=>e.includes("cevap")));
});
test("kayıtlı anahtar API: admin detayına erişir; eski sürümle yazma reddedilir, eksik kazanım kabul edilir",async()=>{
  const {prisma}=await import("../apps/api/src/db"),{opticalRouter}=await import("../apps/api/src/optical-routes");const originals:Array<[any,string,any]>=[],patch=(o:any,k:string,v:any)=>{originals.push([o,k,o[k]]);o[k]=v;};
  const key:any={id:"key",name:"Deneme",publicationId:"publication",questions:parseOpticalKeyRows(keyTemplateRows),penalty:3,active:true};let writes=0;
  patch(prisma.opticalKey,"findUnique",async()=>structuredClone(key));patch(prisma.opticalKey,"update",async({data}:any)=>{writes++;Object.assign(key,data);return key;});patch(prisma,"$transaction",async(fn:any)=>fn(prisma));
  patch(prisma.publishedAnswerKey,"findUnique",async()=>null);
  const route=(p:string,method:string)=>(opticalRouter as any).stack.find((l:any)=>l.route?.path===p&&l.route.methods[method]).route.stack;
  async function invoke(body:any){let status=200,result:any;await route("/keys/:id","patch").at(-1).handle({params:{id:"key"},body:{confirmImport:true,...body},user:{role:"SUPER_ADMIN"}},{status(n:number){status=n;return this;},json(v:any){result=v;}},(e:any)=>{if(e)throw e;});return{status,result};}
  try{
    let denied=200;route("/keys/:id","get")[0].handle({user:{role:"DEALER"}},{status(n:number){denied=n;return this;},json(){}},()=>{});assert.equal(denied,403);
    const originalFingerprint=keyFingerprint(key.questions,key.penalty),q=structuredClone(key.questions);q[0].answer="H";
    assert.equal((await invoke({questions:q,expectedFingerprint:"stale"})).status,409);assert.equal(writes,0);
    const incomplete=structuredClone(q);incomplete[0].answer="";assert.equal((await invoke({questions:incomplete,expectedFingerprint:originalFingerprint})).status,400);
    assert.equal((await invoke({questions:q,penalty:4,expectedFingerprint:originalFingerprint})).status,200);assert.equal(writes,1);assert.equal(key.questions[0].answer,"H");assert.equal(key.penalty,4);
    assert.equal((await invoke({questions:q,expectedFingerprint:originalFingerprint})).status,409);
  }finally{for(const[o,k,v]of originals.reverse())o[k]=v;}
});
