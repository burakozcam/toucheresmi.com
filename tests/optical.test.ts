import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import rows from "../apps/web/data/nartest-8-optical.json";
import { layout7108 as clientLayout, parseOpticalKeyRows } from "../apps/web/lib/optical";
import { evaluate, scaledScore } from "../apps/web/lib/evaluation";
import { decodeOptical, layout7108, opticalLayoutSchema, opticalQuestionsSchema, opticalSummary, parseOptical } from "../apps/api/src/optical-core";

const txt=fs.readFileSync(path.join(__dirname,"fixtures/7108-anonymous.txt"),"utf8");
const questions=()=>parseOpticalKeyRows(rows);
const parse=(text=txt,qs=questions())=>parseOptical(text,layout7108,qs,"Örnek Kurum");
const replace=(line:number,start:number,value:string)=>{const ls=txt.split(/\r?\n/);ls[line]=ls[line].slice(0,start-1)+value+ls[line].slice(start-1+value.length);return ls.join("\r\n");};
test("7108: dört satır iki öğrenciye birleşir; karma A/B ve B kazanım eşleştirmesi örnek karne netlerini verir",()=>{
  assert.deepEqual(clientLayout,layout7108);
  const data=parse(),summary=opticalSummary(data,3);
  assert.equal(data.lineCount,4);assert.equal(data.students.length,2);assert.deepEqual(data.warnings,[]);
  assert.deepEqual(data.students.map(s=>s.id),["00001","00002"]);
  assert.equal(data.students[0].booklets.TÜRKÇE,"A");assert.equal(data.students[0].booklets.MATEMATİK,"B");
  assert.deepEqual(summary[0].lessons.map(l=>[l.correct,l.wrong,l.blank]),[[19,1,0],[10,0,0],[10,0,0],[9,1,0],[15,5,0],[18,2,0]]);
  assert.deepEqual(summary[1].lessons.map(l=>[l.correct,l.wrong,l.blank]),[[17,3,0],[8,2,0],[7,3,0],[5,5,0],[9,5,6],[15,5,0]]);
  assert.equal(summary[0].net,78);assert.ok(Math.abs(summary[1].net-53.3333333333)<1e-8);
  for(const s of data.students){
    const r=summary.find(x=>x.id===s.id)!;
    assert.deepEqual(evaluate(data.questions,s,3),r.lessons);
    assert.ok(Math.abs(scaledScore(data.questions,s,3,{},500)-r.score)<1e-8);
  }
  assert.ok(data.questions.every(q=>q.outcomeCode&&q.outcomeName));
  assert.ok(!JSON.stringify(data).includes("SAMPLE00001"));
});
test("7108: bozuk uzunluk, kitapçık, cevap ve ders alanı taşması reddedilir",()=>{
  assert.throws(()=>parse(txt.slice(1)),/karakter/);
  assert.throws(()=>parse(replace(0,51,"Z")),/kitapçık/);
  assert.throws(()=>parse(replace(0,132,"?")),/geçersiz karakter/);
  assert.throws(()=>parse(replace(1,82,"A")),/soru sayısından sonra/);
  assert.throws(()=>parse(replace(0,51,"C")),/anahtarda tanımlı değil/);
});
test("7108: yinelenen kayıt, çelişkili oturum ve numarasız öğrenci durdurulur",()=>{
  const ls=txt.trimEnd().split(/\r?\n/); // Keep original fixed-width records for duplicate test.
  const first=txt.split(/\r?\n/)[0];
  assert.throws(()=>parse(txt+first+"\r\n"),/yinelenen/);
  assert.throws(()=>parse(replace(0,16,"FARKLI    ")),/çelişiyor/);
  assert.throws(()=>parse(replace(3,11,"00001")),/farklı kimlikler/);
  assert.throws(()=>parse(replace(3,11,"     ")),/numarası bulunamadı/);
  assert.equal(ls.length,4);
});
test("7108: eksik oturum boş ders uyarısı üretir, H boş dahil doğru, X iptal, çoklu işaret yanlış sayılır",()=>{
  const qs=questions();qs[0].answer="H";qs[1].answer="X";
  const d=parse(replace(1,52," "),qs),r=opticalSummary(d,3)[0].lessons[0];
  assert.equal(r.correct,19); // The sole original wrong answer is now cancelled, H remains correct.
  assert.equal(r.cancelled,1);
  const missing=parse(txt.split(/\r?\n/).slice(1).join("\r\n"));
  assert.ok(missing.warnings.some(w=>w.includes("00001")&&w.includes("MATEMATİK")));
  const multi=parse(replace(1,54,"*"));assert.equal(opticalSummary(multi,3)[0].lessons[0].wrong,2);
});
test("FMT ve cevap anahtarında çakışma, eksik/yinelenen kitapçık ve tutarsız katsayı reddedilir",()=>{
  const layout=structuredClone(layout7108);layout.lessons[0].start=51;assert.equal(opticalLayoutSchema.safeParse(layout).success,false);
  const qs=questions();qs[0].positions.B=qs[1].positions.B;assert.equal(opticalQuestionsSchema.safeParse(qs).success,false);
  const other=questions();other[0].weight=1;assert.equal(opticalQuestionsSchema.safeParse(other).success,false);
  const incomplete=questions();delete incomplete[0].positions.B;assert.equal(opticalQuestionsSchema.safeParse(incomplete).success,false);
});
test("Türkçe Windows ve UTF-8 çözülür; yanlış zorlanmış UTF-8 reddedilir",()=>{
  assert.equal(decodeOptical(Buffer.from([0xdd,0xde,0xd0,0xfd])),"İŞĞı");
  assert.equal(decodeOptical(Buffer.from("İŞĞı","utf8")),"İŞĞı");
  assert.throws(()=>decodeOptical(Buffer.from([0xdd]),"utf-8"));
});

test("optik API: yalnızca admin FMT/anahtar yazar; sonuç ve yükleme kapsamı bayinin kurumlarına bağlıdır",async()=>{
  const {opticalRouter}=await import("../apps/api/src/optical-routes");
  const {prisma}=await import("../apps/api/src/db");
  const route=(url:string,method="get")=>(opticalRouter as any).stack.find((x:any)=>x.route?.path===url&&x.route.methods[method]).route.stack;
  let unauthenticatedCode=200,unauthenticatedPassed=false;
  await (opticalRouter as any).stack[1].handle({header:()=>undefined},{setHeader(){},status(n:number){unauthenticatedCode=n;return this;},json(){}},()=>unauthenticatedPassed=true);
  assert.equal(unauthenticatedCode,401);assert.equal(unauthenticatedPassed,false);
  for(const url of ["/templates","/keys"]){
    let code=200,passed=false;
    route(url,"post")[0].handle({user:{role:"DEALER"}},{status(n:number){code=n;return this;},json(){}},()=>passed=true);
    assert.equal(code,403);assert.equal(passed,false);
  }
  const originalSchool=prisma.school.findFirst,originalDetail=prisma.opticalResult.findFirst,originalList=prisma.opticalResult.findMany;
  async function invoke(url:string,req:any,method="get"){
    let status=200,body:any;const res:any={status(n:number){status=n;return this;},json(v:any){body=v;return this;}};
    await route(url,method).at(-1).handle({user:{id:"bayi",role:"DEALER",dealerId:"dealer-1"},params:{id:"foreign-result"},query:{},...req},res,(e:any)=>{if(e)throw e;});return{status,body};
  }
  try{
    prisma.school.findFirst=(async({where}:any)=>{assert.equal(where.dealerId,"dealer-1");assert.equal(where.id,"foreign-school");return null;}) as any;
    const denied=await invoke("/preview",{body:{schoolId:"foreign-school",templateId:"fmt",keyId:"key"},file:{originalname:"test.txt",buffer:Buffer.from(txt)}},"post");assert.equal(denied.status,403);
    prisma.opticalResult.findFirst=(async({where}:any)=>{assert.equal(where.school.dealerId,"dealer-1");return null;}) as any;
    assert.equal((await invoke("/results/:id",{})).status,404);
    prisma.opticalResult.findMany=(async({where,select}:any)=>{assert.equal(where.school.dealerId,"dealer-1");assert.equal(select.snapshot,undefined);return [];}) as any;
    assert.equal((await invoke("/results",{})).status,200);
  }finally{prisma.school.findFirst=originalSchool;prisma.opticalResult.findFirst=originalDetail;prisma.opticalResult.findMany=originalList;}
});

test("optik API: önizleme yazmaz; değerlendirme kimliksiz anlık kopya saklar ve boş ders onayı ister",async()=>{
  const {opticalRouter}=await import("../apps/api/src/optical-routes");const {prisma}=await import("../apps/api/src/db");
  const originals:Array<[any,string,any]>=[];
  const patch=(object:any,key:string,value:any)=>{originals.push([object,key,object[key]]);object[key]=value;};
  let stored:any,writes=0,schoolChecks=0,previewToken="";
  patch(prisma.opticalResult,"findFirst",async()=>null);
  patch(prisma.opticalResult,"findMany",async()=>[]);
  patch(prisma.school,"findFirst",async({where}:any)=>{assert.equal(where.dealerId,"dealer-1");schoolChecks++;return{id:"school",name:"Örnek Kurum"};});
  patch(prisma.opticalTemplate,"findFirst",async()=>({id:"fmt",name:"7108",layout:layout7108}));
  patch(prisma.opticalKey,"findFirst",async()=>({id:"key",name:"Nartest",penalty:3,questions:questions()}));
  patch(prisma.opticalResult,"create",async({data}:any)=>{writes++;stored=data;return{id:"result",createdAt:new Date(),...data};});
  patch(prisma,"$transaction",async(fn:any)=>fn(prisma));
  const invoke=async(endpoint:string,content=txt,confirmWarnings="false")=>{
    const handler=(opticalRouter as any).stack.find((x:any)=>x.route?.path===endpoint).route.stack.at(-1).handle;
    let status=200,data:any;
    await handler({user:{id:"dealer-user",role:"DEALER",dealerId:"dealer-1"},body:{schoolId:"school",templateId:"fmt",keyId:"key",encoding:"auto",confirmWarnings,previewToken},file:{originalname:"optik.txt",buffer:Buffer.from(content)}},{status(n:number){status=n;return this;},json(v:any){data=v;}},(e:any)=>{if(e)throw e;});
    if(endpoint==="/preview")previewToken=data.previewToken;return{status,data};
  };
  try{
    const preview=await invoke("/preview");assert.equal(preview.status,200);assert.equal(writes,0);assert.equal(preview.data.data.students.length,2);
    const saved=await invoke("/evaluate",txt,"true");assert.equal(saved.status,201);assert.equal(writes,1);assert.equal(schoolChecks,3);
    assert.equal(stored.createdById,"dealer-user");assert.equal(stored.schoolId,"school");assert.equal(stored.snapshot.summary[0].net,78);
    assert.ok(!JSON.stringify(stored).includes("SAMPLE00001"));assert.equal(stored.snapshot.data.students[0].answers.length,90);
    const incomplete=txt.split(/\r?\n/).slice(1).join("\r\n");
    await invoke("/preview",incomplete);assert.equal((await invoke("/evaluate",incomplete)).status,400);assert.equal(writes,1);
    assert.equal((await invoke("/evaluate",incomplete,"true")).status,201);assert.equal(writes,2);
  }finally{for(const [object,key,value]of originals.reverse())object[key]=value;}
});
