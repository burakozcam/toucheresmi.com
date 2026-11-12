import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseOptical, layout7108, opticalSummary } from "../apps/api/src/optical-core";
import { parseOpticalKeyRows } from "../apps/web/lib/optical";
import rows from "../apps/web/data/nartest-8-optical.json";
import { canonicalJson } from "../apps/api/src/canonical-json";
import { compatibleEvaluation } from "../apps/api/lib/evaluation-compatibility";

const txt=fs.readFileSync(new URL("./fixtures/7108-anonymous.txt",import.meta.url),"utf8");
const questions=parseOpticalKeyRows(rows);
const names:Record<string,string>={SOSYAL:"T.C. İnkılap Tarihi ve Atatürkçülük",DİN:"Din Kültürü ve Ahlak Bilgisi",FEN:"Fen Bilimleri"};
const renamed=questions.map(q=>({...q,lesson:names[q.lesson]??q.lesson}));

test("FMT ve sınav ders adları eşleşir; soru sayısı ve sınıf denetimleri korunur",()=>{
  const key={grade:8,lessonCounts:Object.fromEntries([...new Set(renamed.map(q=>q.lesson))].map(name=>[name,renamed.filter(q=>q.lesson===name).length])),booklets:["A","B"]};
  assert.equal(compatibleEvaluation({layout:layout7108},key),true);
  assert.equal(compatibleEvaluation({layout:layout7108,grade:7},key),false);
  assert.equal(compatibleEvaluation({layout:layout7108},{...key,lessonCounts:{...key.lessonCounts,TÜRKÇE:21}}),false);
  const actual=parseOptical(txt,layout7108,renamed,"Kurum"),expected=parseOptical(txt,layout7108,questions,"Kurum");
  assert.deepEqual(actual.students.map(s=>s.answers),expected.students.map(s=>s.answers));
  assert.deepEqual(opticalSummary(actual,3).map(s=>s.net),opticalSummary(expected,3).map(s=>s.net));
  assert.ok(actual.students.every(s=>s.booklets["Fen Bilimleri"]));
  assert.throws(()=>parseOptical(txt,layout7108,questions.map(q=>({...q,lesson:q.lesson==="FEN"?"Biyoloji":q.lesson})),"Kurum"),/eşleşmiyor/);
});

test("yükleme API: boş FMT deposunda sistem FMT seçilir, sınıf/soru dağılımı farkıyla önizleme kaydedilir ve sonuç yeniden açılır",async()=>{
  const {prisma}=await import("../apps/api/src/db");
  const {opticalRouter}=await import("../apps/api/src/optical-routes");
  const originals:Array<[any,string,any]>=[];
  const patch=(obj:any,k:string,v:any)=>{originals.push([obj,k,obj[k]]);obj[k]=v;};
  const templates:any[]=[],results:any[]=[];
  const school={id:"school",name:"Kurum",active:true,dealerId:"dealer"};
  const key={id:"key",name:"Deneme",active:true,penalty:3,questions:renamed.filter(q=>q.number<=10).map(q=>({...q,positions:{A:q.number,B:11-q.number}})),publication:{grade:7,examName:"Deneme"}};
  patch(prisma.opticalTemplate,"findMany",async()=>templates);
  patch(prisma.opticalTemplate,"findFirst",async({where}:any)=>templates.find(t=>t.id===where.id)??null);
  patch(prisma.opticalTemplate,"upsert",async({create}:any)=>{const stored=JSON.parse(canonicalJson(create));templates.push(stored);return stored;});
  patch(prisma.school,"findFirst",async({where}:any)=>where.schoolId==="forbidden"||where.id!==school.id?null:school);
  patch(prisma.opticalKey,"findFirst",async({where}:any)=>{assert.equal(where.active,undefined);assert.equal(where.publication.showInEvaluation,undefined);return {...key,active:false};});
  patch(prisma.opticalResult,"findMany",async()=>results);
  patch(prisma.opticalResult,"findFirst",async({where}:any)=>{const found=results.find(r=>where.id?r.id===where.id:r.uploadChecksum===where.uploadChecksum);return found?{...found,key}:null;});
  patch(prisma.opticalResult,"create",async({data}:any)=>{const r={id:"result",revision:1,seriesId:"series",createdAt:new Date(),studentPublished:false,...data};results.push(r);return r;});
  patch(prisma,"$transaction",async(fn:any)=>fn(prisma));
  const body={schoolId:school.id,templateId:"system-fmt-7108",keyId:key.id,encoding:"auto",confirmWarnings:"true"};
  async function call(path:string,input:any=body){
    const handler=(opticalRouter as any).stack.find((l:any)=>l.route?.path===path).route.stack.at(-1).handle;
    let status=200,value:any;
    await handler({body:input,params:{id:"result"},query:{},file:{originalname:"results.txt",buffer:Buffer.from(txt)},user:{id:"user",role:"DEALER",dealerId:"dealer"}},
      {status(n:number){status=n;return this;},json(v:any){value=v;}},(e:any)=>{if(e)throw e;});
    return{status,body:value};
  }
  try{
    const library=await call("/evaluation-templates");assert.deepEqual(library.body.map((t:any)=>t.id),["system-fmt-7108","system-fmt-8050","system-fmt-ozdebir-ortaokul-tek-oturum"]);
    const preview=await call("/preview");assert.equal(preview.status,200);assert.equal(results.length,0);assert.equal(templates.length,0);assert.equal(preview.body.data.students.length,2);assert.equal(preview.body.checks.blockers.length,0);assert.ok(preview.body.checks.warnings.some((w:string)=>w.includes("TXT sınıfı")));assert.ok(preview.body.checks.warnings.some((w:string)=>w.includes("sonraki işaretlemeler")));
    assert.equal((await call("/evaluate")).status,409);
    assert.equal((await call("/evaluate",{...body,schoolId:"forbidden",previewToken:preview.body.previewToken})).status,403);
    const saved=await call("/evaluate",{...body,previewToken:preview.body.previewToken});assert.equal(saved.status,201);assert.equal(results.length,1);assert.equal(templates.length,1);
    const opened=await call("/results/:id");assert.deepEqual(opened.body.data,saved.body.data);assert.deepEqual(opened.body.summary,opticalSummary(opened.body.data,3));
    assert.equal((await call("/preview")).body.checks.blockers.length,1);
    const previousSummary=structuredClone(opened.body.summary);key.questions=[];
    const missingKey=await call("/results/:id/checks");assert.equal(missingKey.status,200);assert.ok(missingKey.body.blockers.some((message:string)=>message.includes("Güncel cevap anahtarı")));
    assert.deepEqual((await call("/results/:id")).body.summary,previousSummary);
    templates[0].active=false;assert.deepEqual((await call("/evaluation-templates")).body.map((t:any)=>t.id),["system-fmt-8050","system-fmt-ozdebir-ortaokul-tek-oturum"]);assert.equal((await call("/preview")).status,400);
  }finally{for(const [o,k,v]of originals.reverse())o[k]=v;}
});


test("sınav kataloğu: yayınevi/sınav, görünürlükten bağımsız; yalnız PDF kaydı da eksik açıklamasıyla listelenir",async()=>{
  const {evaluationExamChoice,evaluationPublicationWhere}=await import("../apps/api/src/optical-catalog");
  const base={id:"exam",examName:"Ankara Yayınları 1. Sınav",grade:8,publisher:{id:"ankara",name:"Ankara Yayınları"},createdAt:new Date()};
  assert.equal(evaluationPublicationWhere.showInEvaluation,undefined);assert.equal(evaluationPublicationWhere.published,undefined);assert.equal(evaluationPublicationWhere.publisher,undefined);
  const ready=evaluationExamChoice({...base,opticalKey:{id:"key",questions,penalty:3}});
  assert.equal(ready.evaluationReady,true);assert.equal(ready.questionCount,90);assert.equal(ready.publisher.name,"Ankara Yayınları");
  const pdf=evaluationExamChoice({...base,opticalKey:null});assert.equal(pdf.evaluationReady,false);assert.match(pdf.evaluationIssue!,/kitapçık/);
  const {prisma}=await import("../apps/api/src/db"),{opticalRouter}=await import("../apps/api/src/optical-routes");const original=prisma.publishedAnswerKey.findMany;
  prisma.publishedAnswerKey.findMany=(async({where}:any)=>{assert.deepEqual(where,{files:{some:{category:"ANSWER_KEY"}}});return[{...base,published:false,showInEvaluation:false,opticalKey:{id:"key",active:false,questions,penalty:3}},{...base,id:"pdf",opticalKey:null}];}) as any;
  try{const handler=(opticalRouter as any).stack.find((layer:any)=>layer.route?.path==="/evaluation-exams").route.stack.at(-1).handle;let list:any;await handler({user:{role:"DEALER"}},{json(value:any){list=value;}},(error:any)=>{if(error)throw error;});assert.equal(list.length,2);assert.equal(list[0].evaluationReady,true);assert.equal(list[1].evaluationReady,false);}finally{prisma.publishedAnswerKey.findMany=original;}
});
