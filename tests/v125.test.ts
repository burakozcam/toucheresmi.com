import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import {parseOptical,opticalSummary,decodeOptical,layout7108} from "../apps/api/src/optical-core";
import {layoutOzdebirSingle as layout} from "../apps/api/src/ozdebir-layout";
import {evaluationReader} from "../apps/api/src/evaluation-reader";
import {systemEvaluationTemplates} from "../apps/api/src/evaluation-templates";
async function merging(){process.env.DATABASE_URL??="postgresql://test:test@127.0.0.1:1/test";process.env.JWT_SECRET??="v125-unit-test-secret-at-least-32-characters";return import("../apps/api/src/result-data");}
import {evaluate,scaledScore} from "../apps/web/lib/evaluation";
const read=(f:string)=>decodeOptical(fs.readFileSync(new URL(`./fixtures/ozdebir/${f}`,import.meta.url)));
const lines=read("split-anonymous.txt").replace(/\n$/,"").split("\n");
// Test key only: no official answer key was supplied. These tests verify extraction, not official scores.
const qs=layout.lessons.flatMap(l=>Array.from({length:["SOSYAL","DİN","İNGİLİZCE"].includes(l.name)?10:20},(_,i)=>({lesson:l.name,number:i+1,answer:"A",weight:1,positions:{A:i+1,B:i+1},outcomeCode:`${l.name}.${i+1}`,outcomeName:`Test kazanımı ${i+1}`})));
const parse=(text:string,extra={})=>parseOptical(text,layout,qs,"Anonim Kurum",{allowMismatch:true,hashIdentity:(v:string)=>crypto.createHash("sha256").update(v).digest("hex"),...extra});
const verbal=lines.find(l=>l[0]==="1")!,numeric=lines.find(l=>l[0]==="2"&&l.slice(9,14)===verbal.slice(9,14))!;
const put=(r:string,start:number,length:number,v:string)=>r.slice(0,start-1)+v.padEnd(length).slice(0,length)+r.slice(start-1+length);
test("v125 gerçek dosyadan anonimleştirilmiş 209 kayıt: 105 öğrenci, 104 çift, 1 sözel",()=>{
 const d=parse(lines.join("\n"));assert.equal(d.lineCount,209);assert.equal(d.students.length,105);assert.equal(d.diagnostics?.missingNumeric,1);assert.equal(d.diagnostics?.missingVerbal,0);assert.equal(d.diagnostics?.rejectedLines.length,0);
 const missing=d.students.find(s=>s.missingLessons?.length)!;assert.deepEqual(missing.missingLessons,["MATEMATİK","FEN"]);
 const summary=opticalSummary(d,3).find(r=>r.id===missing.id)!;assert.equal(summary.score,null);assert.deepEqual(summary.lessons.filter(l=>l.missing).map(l=>l.net),[null,null]);
 for(const s of d.students){assert.deepEqual(evaluate(d.questions,s,3),opticalSummary(d,3).find(r=>r.id===s.id)!.lessons);assert.equal(scaledScore(d.questions,s,3,{},500),opticalSummary(d,3).find(r=>r.id===s.id)!.score);}
});
test("v125 gerçek tek optik: boş kitapçık uydurulmaz; açık kitapçık seçimiyle altı ders sabit konumundan okunur",()=>{
 const text=read("single-anonymous.txt");assert.equal(parse(text).status,"failed");
 const d=parse(text,{missingBooklet:"A"});assert.equal(d.students.length,1);assert.equal(Object.keys(d.students[0].booklets).length,6);
 for(const l of layout.lessons){const count=qs.filter(q=>q.lesson===l.name).length;assert.deepEqual(d.questions.flatMap((q,i)=>q.lesson===l.name?[d.students[0].answers[i]]:[]),text.slice(l.start-1,l.start-1+count).split("").map(c=>c.trim()));}
 assert.ok(d.warnings.some(w=>w.includes("kullanıcı tarafından A")));
});
test("v125 yalnız sözel / yalnız sayısal: olmayan oturum null, mevcut boş cevap ise sıfır nettir",()=>{
 for(const [row,missing]of [[verbal,["MATEMATİK","FEN"]],[numeric,["TÜRKÇE","SOSYAL","İNGİLİZCE","DİN"]]]as const){const d=parse(row),s=d.students[0];assert.deepEqual(new Set(s.missingLessons),new Set(missing));assert.equal(opticalSummary(d,3)[0].score,null);}
 const blank=verbal.slice(0,51)+" ".repeat(80),d=parse(blank);assert.equal(opticalSummary(d,3)[0].lessons.find(l=>l.lesson==="TÜRKÇE")!.net,0);
});
test("v125 mükerrer oturumda bütün kayıt seçilir; farklı dersler iki satırdan karıştırılmaz",async()=>{
 const {mergeStudentData}=await merging();
 let a=verbal.slice(0,51)+"A".repeat(20)+" ".repeat(60),b=verbal.slice(0,51)+" ".repeat(20)+"B".repeat(10)+" ".repeat(10)+"C".repeat(10)+" ".repeat(10)+"D".repeat(10)+" ".repeat(10);
 const d=parse(a+"\n"+b+"\n"+numeric);assert.equal(d.students.length,1);assert.equal(d.diagnostics?.duplicateRecords,1);assert.equal(d.students[0].answers[0],"");assert.equal(d.students[0].booklets.TÜRKÇE,verbal[27]);
 assert.deepEqual(mergeStudentData(parse(a),parse(b)).students[0].answers,parse(b).students[0].answers);
 const tie=put(a,52,20,"B".repeat(20));assert.deepEqual(parse(a+"\n"+tie).students[0].answers,parse(a).students[0].answers);
});
test("v125 aynı numara: kurum, TC ve ad çelişkileri ayrı tutulur; belirsizlik başkalarını durdurmaz",async()=>{
 const {mergeStudentData}=await merging();
 for(const changed of [put(numeric,2,8,"99999999"),put(numeric,15,11,"99999999999"),put(put(numeric,15,11,""),30,22,"FARKLI OGRENCI")]){
  const a=changed.includes("99999999")&&!changed.includes("99999999999")?put(verbal,2,8,"11111111"):changed.includes("FARKLI")?put(verbal,15,11,""):verbal,d=parse(a+"\n"+changed);assert.equal(d.students.length,2);assert.equal(new Set(d.students.map(s=>s.id)).size,2);assert.ok(d.warnings.some(w=>w.includes("ayrı tutuldu")));
  assert.equal(mergeStudentData(parse(a),parse(changed)).students.length,2);
 }
});
test("v125 yanlış FMT: doğrulanmış yapısal alternatif kullanılır, bozuk / kısa satırlar ayrıntıyla bildirilir",()=>{
 const r=evaluationReader(lines.join("\n"),layout7108,systemEvaluationTemplates());assert.ok(r.warning);assert.deepEqual(r.layout,layout);
 const d=parse(verbal+"\nbozuk\n\n"+numeric.slice(0,70)+"\n"+numeric);assert.equal(d.students.length,1);assert.equal(d.diagnostics?.rejectedLines.length,3);assert.equal(d.status,"completed_with_warnings");
 assert.deepEqual(d.students[0].answers,parse(verbal+"\n"+numeric).students[0].answers);assert.equal(parse("bozuk").status,"failed");
});
test("v125 çelişen öğrenciler kurum sonuçlarında da birleşmez; karneler engellenmez",async()=>{
 const {aggregateResults}=await merging();
 const a=parse(verbal),b=parse(put(numeric,15,11,"99999999999"));
 const snapshot=(data:any)=>({data,penalty:3,summary:opticalSummary(data,3),schoolName:"Anonim Kurum",keyName:"Test",templateName:"Özdebir"});
 const view=aggregateResults([{id:"1",schoolId:"s",snapshot:snapshot(a),createdAt:new Date(1)},{id:"2",schoolId:"s",snapshot:snapshot(b),createdAt:new Date(2)}])!;assert.equal(view.data.students.length,2);
});

test("v125 üç özgün SEKONIC FMT: S alanları, sabit kayıt türü, sınıf, kitapçık ve ders konumları doğrulanır",async()=>{
 const {analyzeFmt}=await import("../apps/api/src/fmt-analyze"),{previewFmt}=await import("../apps/api/src/fmt-preview"),{layoutOzdebirVerbal,layoutOzdebirNumeric}=await import("../apps/api/src/ozdebir-layout");
 for(const [file,expected]of [["single.fmt",layout],["verbal.fmt",layoutOzdebirVerbal],["numeric.fmt",layoutOzdebirNumeric]]as const){const r=analyzeFmt(read(file));assert.deepEqual(r.issues,[]);assert.deepEqual(r.layout,expected);assert.equal(r.coordinates.valid,true);assert.equal(r.layout.fields.grade?.start,26);assert.equal(r.layout.fields.booklet.start,28);assert.equal(r.layout.fields.gender?.start,29);}
 const d=previewFmt(lines.join("\n"),layout);assert.equal(d.canSave,true);assert.deepEqual(d.lengths,[{length:131,count:105},{length:91,count:104}]);
});

test("v125 API gerçek kayıt düzenleriyle önizler: yanlış FMT düzeltilir, tek bozuk kayıt diğer 105 karneyi engellemez",async()=>{
 process.env.DATABASE_URL??="postgresql://test:test@127.0.0.1:1/test";process.env.JWT_SECRET??="v125-api-test-secret-at-least-32-characters";
 const {prisma}=await import("../apps/api/src/db"),{opticalRouter}=await import("../apps/api/src/optical-routes");
 const originals=[prisma.school.findFirst,prisma.opticalKey.findFirst,prisma.opticalResult.findFirst,prisma.opticalResult.findMany,prisma.opticalResult.create,prisma.opticalTemplate.findMany,prisma.opticalTemplate.findFirst];let writes=0;
 prisma.opticalTemplate.findFirst=(async()=>null)as any;prisma.opticalTemplate.findMany=(async()=>[])as any;prisma.school.findFirst=(async()=>({id:"school",name:"Anonim Kurum"}))as any;prisma.opticalKey.findFirst=(async()=>({id:"key",questions:qs,penalty:3,publication:{grade:8}}))as any;prisma.opticalResult.findFirst=(async()=>null)as any;prisma.opticalResult.findMany=(async()=>[])as any;prisma.opticalResult.create=(async()=>{writes++;})as any;
 const handle=(opticalRouter as any).stack.find((l:any)=>l.route?.path==="/preview").route.stack.at(-1).handle;
 async function preview(text:string,missingBooklet?:string){let status=200,value:any;await handle({user:{id:"user",role:"DEALER",dealerId:"dealer"},body:{schoolId:"school",keyId:"key",templateId:"system-fmt-7108",...(missingBooklet?{missingBooklet}:{})},file:{originalname:"anonim.txt",buffer:Buffer.from(text)}},{status(n:number){status=n;return this;},json(v:any){value=v;}},(e:any)=>{if(e)throw e;});return {status,value};}
 try{
  const good=await preview(lines.join("\n")+"\nbozuk");assert.equal(good.status,200);assert.equal(good.value.data.students.length,105);assert.equal(good.value.data.diagnostics.rejectedLines.length,1);assert.equal(good.value.data.diagnostics.missingNumeric,1);assert.equal(good.value.data.status,"completed_with_warnings");assert.ok(good.value.previewToken);
  const empty=await preview("bozuk");assert.equal(empty.status,422);assert.equal(empty.value.status,"failed");assert.match(empty.value.error,/satır 1/);
  const single=await preview(read("single-anonymous.txt"),"A");assert.equal(single.status,200);assert.equal(single.value.data.students.length,1);assert.equal(single.value.data.students[0].missingLessons.length,0);
  assert.equal(writes,0);
 }finally{[prisma.school.findFirst,prisma.opticalKey.findFirst,prisma.opticalResult.findFirst,prisma.opticalResult.findMany,prisma.opticalResult.create,prisma.opticalTemplate.findMany,prisma.opticalTemplate.findFirst]=originals as any;}
});

test("Özdebir üç ayrı sistem seçimi: özgün FMT indirme, doğru tekil öneri ve karma oturum birleştirme korunur",async()=>{
 const {libraryFmtBytes,fmtLibrary}=await import("../apps/api/src/fmt-library"),{inferFmt}=await import("../apps/api/src/fmt-inference");
 const templates=systemEvaluationTemplates(),oz=templates.filter(t=>t.id.includes("ozdebir"));
 assert.deepEqual(oz.map(t=>t.name),["Özdebir Tek Oturum","Özdebir Sözel","Özdebir Sayısal"]);assert.equal(fmtLibrary.filter(t=>t.code.startsWith("ozdebir")).length,3);
 for(const [code,fixture,prefix,width]of [["sozel","verbal.fmt","1",131],["sayisal","numeric.fmt","2",91]]as const){
  const t=oz.find(t=>t.id.endsWith(code))!;assert.equal(t.layout.lineLength,width);assert.deepEqual(libraryFmtBytes(`ozdebir-ortaokul-${code}`),fs.readFileSync(new URL(`./fixtures/ozdebir/${fixture}`,import.meta.url)));
  const suggestion=inferFmt(lines.filter(r=>r[0]===prefix).join("\n"),templates);assert.equal(suggestion.candidates[0].id,t.id);assert.equal(suggestion.confidence,"strong");
  assert.equal(parseOptical(lines.join("\n"),t.layout,qs,"Anonim Kurum",{allowMismatch:true}).students.length,105);
 }
 const mixed=inferFmt(lines.join("\n"),templates);assert.equal(mixed.confidence,"strong");assert.equal(mixed.candidates.filter(t=>t.id.includes("ozdebir")).length,1);
 const {opticalRouter}=await import("../apps/api/src/optical-routes"),handle=(opticalRouter as any).stack.find((r:any)=>r.route?.path==="/templates/examples/:code/download").route.stack.at(-1).handle;
 for(const code of ["ozdebir-ortaokul-sozel","ozdebir-ortaokul-sayisal"]){let filename="",bytes:any;await handle({params:{code},user:{role:"DEALER"}},{attachment(v:string){filename=v;return this;},type(){return this;},send(v:Buffer){bytes=v;}},(e:any)=>{if(e)throw e;});assert.ok(filename.endsWith(".fmt"));assert.deepEqual(bytes,libraryFmtBytes(code));}
});
