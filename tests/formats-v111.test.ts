import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fernus from "./fixtures/fernus-082701.json";
import okulizyon from "./fixtures/okulizyon-ankara.json";
import { parseWorkbook } from "../apps/web/lib/optical-import";
import { evaluationQuestions,readEvaluationExcel,prepareEvaluation } from "../apps/api/src/optical-catalog";
import { completeFormatUploads } from "../apps/api/src/format-upload";
import { bulkTemplatesInput } from "../apps/api/src/fmt-bulk";
import { layout7108 } from "../apps/api/src/optical-core";
import { fmtProof } from "../apps/api/src/fmt-verification";
import fmt7108 from "../apps/web/data/optical-7108.json";
import { SITE_VERSION } from "../apps/web/config/site";
test("F gerçek 082701: 90 soru, 6 ders; B çaprazı ayrı kitapçıkla tutarlı; kodsuz kazanım korunur",()=>{
  const r=parseWorkbook(fernus,"f");assert.equal(r.format,"f");assert.equal(r.questions.length,90);assert.equal(new Set(r.questions.map(q=>q.lesson)).size,6);evaluationQuestions(r.questions);
  assert.equal(r.questions[0].answer,"C");assert.deepEqual(r.questions[0].positions,{A:1,B:13});assert.equal(r.questions[0].outcomeCode,"T.8.3.5");assert.equal(r.questions.filter(q=>q.lesson==="SOSYAL").length,10);assert.equal(r.questions.filter(q=>q.lesson==="DİN").length,10);
  assert.equal(r.questions.find(q=>q.lesson==="İNGİLİZCE")!.outcomeCode,"E8.1.R1");const unnumbered=r.questions.find(q=>q.outcomeName==="Yazım Kuralları")!;assert.ok(unnumbered.outcomeCode?.startsWith("METİN-"));assert.equal(r.warnings.length,1);assert.equal(r.examName,"LGS SÜREÇ DEĞERLENDİRME -1 (082701)");
  const b=fernus[1].rows.slice(2).filter(row=>row[0]);for(const q of r.questions){const names:Record<string,string>={SOSYAL:"T.C. İNK. TAR. VE ATATÜRKÇÜLÜK",DİN:"DİN KÜLTÜRÜ AHL. BİL.",FEN:"FEN BİLİMLERİ"};const row=b.find(row=>row[0]===(names[q.lesson]??q.lesson)&&Number(row[1])===q.positions.B)!;assert.equal(row[2],q.answer);}
});
test("O gerçek Ankara: başlık öncesi satırlar, 90 soru, A/B eşleştirmesi ve tüm kazanım sütunları",()=>{
  const r=parseWorkbook(okulizyon,"o");evaluationQuestions(r.questions);assert.equal(r.questions.length,90);assert.equal(r.examName,"8. SINIF LGS 1.DENEME");assert.equal(r.publisher,"ANKARA");assert.equal(r.grade,8);assert.deepEqual(r.questions[0].positions,{A:1,B:20});assert.equal(r.questions[0].answer,"B");
  const q=r.questions.find(q=>q.lesson==="FEN"&&q.number===17)!;assert.equal(q.outcomeCode,"8.1.2.1.2,8.1.2.1.3,8.1.2.1.4,8.1.2.1.15");assert.ok(q.outcomeName?.includes("Günlük sıcaklık"));assert.equal(q.outcomeName?.split(" | ").length,4);assert.deepEqual(parseWorkbook(okulizyon).questions,r.questions);
});
test("F/O yanlış seçim ve bozuk çapraz cevap/soru kayıtları sessizce kabul edilmez",()=>{
  assert.throws(()=>parseWorkbook(fernus,"o"),/O Excel/);assert.throws(()=>parseWorkbook(okulizyon,"f"),/F Excel/);
  const bad=structuredClone(fernus);bad[0].rows[2][3]=14;assert.throws(()=>parseWorkbook(bad,"f"),/yinelenmiş/);
  const mismatch=structuredClone(fernus);mismatch[1].rows[2][2]="E";assert.throws(()=>parseWorkbook(mismatch,"f"),/çelişiyor/);
  const missing=structuredClone(okulizyon);missing[0].rows[3][7]="";assert.equal(parseWorkbook(missing,"o").questions.length,90);
});
test("tek F/O kazanımı fiziksel olarak ayrı cevap/kazanım kopyalarıyla arşivlenir; mevcut cevap korunur",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"format-archive-")),file=path.join(dir,"source.xls");fs.writeFileSync(file,"content");const source={fieldname:"learningOutcomesFile",originalname:"source.xls",path:file,size:7} as Express.Multer.File;
  try{const files=[source];completeFormatUploads(files,"f");assert.equal(files.length,2);assert.notEqual(files[0].path,files[1].path);assert.equal(files[1].fieldname,"answerKeyFile");assert.equal(fs.readFileSync(files[1].path,"utf8"),"content");const original=[source,{...source,fieldname:"answerKeyFile"}];completeFormatUploads(original,"o");assert.equal(original.length,2);const standard=[source];completeFormatUploads(standard,"auto");assert.equal(standard.length,1);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("sunucu XLS/XLSX içe aktarma tarayıcıyla aynı F/O sonucunu üretir",()=>{
  const x=require("../apps/web/public/vendor/xlsx.full.min.js"),dir=fs.mkdtempSync(path.join(os.tmpdir(),"format-workbook-"));
  try{for(const [format,sheets]of [["f",fernus],["o",okulizyon]] as const){const w=x.utils.book_new();for(const s of sheets)x.utils.book_append_sheet(w,x.utils.aoa_to_sheet(s.rows),s.name);const file=path.join(dir,format+".xlsx");fs.writeFileSync(file,x.write(w,{type:"buffer",bookType:"xlsx"}));assert.deepEqual(readEvaluationExcel(file,format),parseWorkbook(sheets,format).questions);const files=[{category:"ANSWER_KEY",storagePath:file,originalFileName:"answers.xlsx"},{category:"LEARNING_OUTCOMES",storagePath:file,originalFileName:"outcomes.xlsx"}];assert.equal(prepareEvaluation(files,true,null,true,format)?.length,90);}}
  finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("toplu FMT: yinelenen isim, bozuk yerleşim ve özgün bayt uyuşmazlığı reddedilir",()=>{
  const item={name:"7108",originalFmt:"7108",layout:layout7108};assert.equal(bulkTemplatesInput.safeParse({templates:[item]}).success,true);assert.equal(bulkTemplatesInput.safeParse({templates:[item,{...item,name:" 7108 "}]}).success,false);assert.equal(bulkTemplatesInput.safeParse({templates:[{...item,originalBase64:Buffer.from("wrong").toString("base64")}]}).success,false);assert.equal(bulkTemplatesInput.safeParse({templates:[{...item,layout:{...layout7108,lineLength:20}}]}).success,false);assert.equal(bulkTemplatesInput.safeParse({templates:Array.from({length:31},(_,i)=>({...item,name:`FMT ${i}`}))}).success,false);
});
test("toplu FMT API: admin sınırı, mevcut isim kontrolü ve tek işlem içinde grup kaydı",async()=>{
  const {opticalRouter}=await import("../apps/api/src/optical-routes"),{prisma}=await import("../apps/api/src/db");const original=prisma.$transaction;let existing=false,writes=0;
  const route=(opticalRouter as any).stack.find((l:any)=>l.route?.path==="/templates/bulk").route.stack;
  let denied=200;route[0].handle({user:{role:"DEALER"}},{status(n:number){denied=n;return this;},json(){}},()=>{});assert.equal(denied,403);
  prisma.$transaction=(async(fn:any)=>fn({opticalTemplate:{findMany:async()=>existing?[{name:"7108"}]:[],create:async({data}:any)=>{writes++;return{id:`fmt-${writes}`,...data};}}})) as any;
  async function invoke(){let status=200,body:any;await route.at(-1).handle({user:{id:"admin"},body:{templates:[{name:"FMT A",originalFmt:fmt7108.originalFmt,layout:layout7108,verification:{readerName:"QA Reader",readerConfirmed:true,encoding:"auto",token:fmtProof("admin",fmt7108.originalFmt,layout7108,"QA Reader","auto")}},{name:"FMT B",originalFmt:fmt7108.originalFmt.replace("53=42","53=43"),layout:layout7108,verification:{readerName:"QA Reader",readerConfirmed:true,encoding:"auto",token:fmtProof("admin",fmt7108.originalFmt.replace("53=42","53=43"),layout7108,"QA Reader","auto")}}]}},{status(n:number){status=n;return this;},json(v:any){body=v;}},(e:any)=>{if(e)throw e;});return{status,body};}
  try{existing=true;assert.equal((await invoke()).status,409);assert.equal(writes,0);existing=false;const result=await invoke();assert.equal(result.status,201);assert.equal(result.body.length,2);assert.equal(writes,2);}finally{prisma.$transaction=original;}
});
test("v1.2.2 RC ana sayfa, uygulama ve favicon sürümleri tutarlı",()=>{assert.equal(SITE_VERSION,"v1.2.2 RC");assert.ok(fs.readFileSync(path.join(__dirname,"../index.html"),"utf8").includes("Versiyon: v1.2.2 RC"));assert.ok(fs.readFileSync(path.join(__dirname,"../apps/web/app/layout.tsx"),"utf8").includes("v=1.2.2-rc.1"));});
