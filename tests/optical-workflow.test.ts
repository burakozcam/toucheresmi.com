import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import rows from "../apps/web/data/nartest-8-optical.json";
import { parseOpticalKeyRows } from "../apps/web/lib/optical";
import { layout7108,parseOptical,opticalSummary } from "../apps/api/src/optical-core";
import { reviewSnapshot,reEvaluate,keyFingerprint,scoreChanges,checksum,type Snapshot } from "../apps/api/src/optical-review";
import { analyzeSnapshot } from "../apps/api/src/optical-analysis";
const txt=fs.readFileSync(new URL("./fixtures/7108-anonymous.txt",import.meta.url),"utf8");
const questions=()=>parseOpticalKeyRows(rows);
function snapshot():Snapshot{const data=parseOptical(txt,layout7108,questions(),"Kurum");return {data,summary:opticalSummary(data,3),penalty:3,schoolName:"Kurum",keyName:"Deneme",templateName:"7108",expectedGrade:8};}
test("kontrol özeti: numara tekrarı ve sınıf uyuşmazlığı durdurur; boş ders ve çoklu işaret uyarıdır",()=>{
  const s=snapshot();s.data.students[1].id=s.data.students[0].id;s.data.students[1].branch="6-B";s.data.students[0].answers[0]="*";s.data.warnings.push("Eksik oturum");
  const r=reviewSnapshot(s);assert.equal(r.studentCount,2);assert.equal(r.questionCount,90);assert.equal(r.multipleMarks,1);assert.ok(r.blockers.some(w=>w.includes("birden fazla")));assert.ok(r.warnings.some(w=>w.includes("6")));assert.ok(r.warnings.includes("Eksik oturum"));
});
test("kontrol özeti: olası yanlış kitapçık yalnızca uyarılır, cevaplar değiştirilmez",()=>{
  const s=snapshot(),student=s.data.students[0];student.booklets.TÜRKÇE="B";
  const qs=s.data.questions.filter(q=>q.lesson==="TÜRKÇE");
  qs.forEach((q,i)=>{const rawAnswer=qs.find(other=>other.positions.A===q.positions.B)!.answer;student.answers[s.data.questions.indexOf(q)]=rawAnswer;});
  const before=structuredClone(s.data.students),r=reviewSnapshot(s);assert.ok(r.warnings.some(w=>w.includes("kitapçığını kontrol")));assert.deepEqual(s.data.students,before);
});
test("yeniden değerlendirme: B sırası, cevap, H/X, katsayı ve ceza düzeltmeleri ham TXT ile aynı sonucu verir",()=>{
  const original=snapshot(),immutable=structuredClone(original),next=questions();
  const math=next.filter(q=>q.lesson==="MATEMATİK");[math[0].positions.B,math[1].positions.B]=[math[1].positions.B,math[0].positions.B];
  math.forEach(q=>q.weight=2);math[0].answer="X";next[0].answer="B";next[1].answer="H";
  const updated=reEvaluate(original,next,4),fresh=parseOptical(txt,layout7108,next,"Kurum");
  assert.deepEqual(updated.data.students,fresh.students);assert.deepEqual(updated.summary,opticalSummary(fresh,4));assert.deepEqual(original,immutable);assert.ok(scoreChanges(original,updated).some(c=>c.changed));assert.notEqual(updated.keyFingerprint,keyFingerprint(original.data.questions,3));
  assert.throws(()=>reEvaluate(original,next.filter(q=>q.lesson!=="FEN"),3),/soru sayısı/);
  const missingBook=questions();missingBook.forEach(q=>delete q.positions.B);assert.throws(()=>reEvaluate(original,missingBook,3),/kitapçığı/);
});
test("soru analizi: dağılımlar, sınıf ortalamaları, kazanım ve H/X istisnaları tutarlıdır",()=>{
  const s=snapshot();s.data.students[0].branch="8-A";s.data.students[1].branch="8-B";s.data.questions[0].answer="H";s.data.questions[1].answer="X";
  const r=analyzeSnapshot(s);assert.equal(r.studentCount,2);assert.equal(r.classes.length,2);assert.equal(r.questions[0].correct,2);assert.equal(r.questions[1].correct,0);assert.ok(r.hardest.every(q=>!/[HX]/.test(q.answer)));assert.equal(r.outcomes.reduce((n,o)=>n+o.questionCount,0),s.data.questions.filter(q=>!/[HX]/.test(q.answer)).length);
  for(const q of r.questions){assert.equal(Object.values(q.distribution).reduce((a,b)=>a+b,0),2);if(q.diagnostic)assert.equal(q.correct+q.wrong+q.blank,2);}
  const filtered=analyzeSnapshot(s,"8-B");assert.equal(filtered.studentCount,1);assert.equal(filtered.meanNet,opticalSummary({...s.data,students:[s.data.students[1]]},3)[0].net);assert.equal(analyzeSnapshot(s,"9-Z").meanScore,null);
});
test("anahtar ve TXT parmak izi sıralama/kodlama satır sonu farkına dayanıklıdır",()=>{
  const q=questions();assert.equal(keyFingerprint(q,3),keyFingerprint([...q].reverse(),3));assert.notEqual(keyFingerprint(q,3),keyFingerprint(q,4));assert.equal(checksum(txt),checksum(txt.replace(/\r\n/g,"\n")+"\n"));
});

// Route tests use the real validation and transaction code with an isolated database double.
test("sonuç sürümleri API: eski anlık kopya korunur, önizleme bağlanır, yayın kontrolü ve erişim taşıma uygulanır",async()=>{
  const {prisma}=await import("../apps/api/src/db"),{opticalRouter}=await import("../apps/api/src/optical-routes");
  const originals:Array<[any,string,any]>=[],patch=(obj:any,key:string,value:any)=>{originals.push([obj,key,obj[key]]);obj[key]=value;};
  const initial=snapshot(),key:any={id:"key",name:"Deneme",questions:questions(),penalty:3,active:true,publication:{grade:8,examName:"Deneme"}};
  initial.keyFingerprint=keyFingerprint(key.questions,3);
  const results:any[]=[{id:"v1",seriesId:"series",revision:1,schoolId:"school",templateId:"fmt",keyId:"key",filename:"test.txt",snapshot:structuredClone(initial),studentPublished:true,nextRevision:null}];
  let copied:any[]=[];const calls:any[]=[];
  patch(prisma,"$transaction",async(fn:any)=>fn(prisma));
  patch(prisma.opticalResult,"findFirst",async({where}:any)=>{assert.equal(where.school.dealerId,"dealer");const r=results.find(r=>r.id===where.id);if(!r||where.nextRevision===null&&r.nextRevision)return null;return {...r,key};});
  patch(prisma.opticalKey,"findFirst",async()=>key);
  patch(prisma.opticalResult,"create",async({data}:any)=>{const created={id:"v"+(results.length+1),studentPublished:false,nextRevision:null,createdAt:new Date(),...data};results.find(r=>r.id===data.supersedesId).nextRevision={id:created.id};results.push(created);return created;});
  patch(prisma.opticalResult,"updateMany",async({where,data}:any)=>{calls.push({where,data});results.filter(r=>r.seriesId===where.seriesId).forEach(r=>Object.assign(r,data));return{count:1};});
  patch(prisma.opticalResult,"update",async({where,data}:any)=>Object.assign(results.find(r=>r.id===where.id),data));
  patch(prisma.studentResultAccess,"findMany",async()=>[{userId:"student",studentNo:"00001",studentName:"Örnek"}]);
  patch(prisma.studentResultAccess,"createMany",async({data}:any)=>{copied=data;return{count:data.length};});
  async function invoke(path:string,id="v1",body:any={},userId="manager"){
    const handler=(opticalRouter as any).stack.find((l:any)=>l.route?.path===path).route.stack.at(-1).handle;let status=200,response:any;
    await handler({params:{id},query:{},body,user:{id:userId,role:"DEALER",dealerId:"dealer"}},{status(n:number){status=n;return this;},json(v:any){response=v;}},(e:any)=>{if(e)throw e;});return{status,body:response};
  }
  try{
    assert.equal((await invoke("/results/:id/publication","v1",{published:true})).status,409);
    key.questions[0].answer=key.questions[0].answer==="B"?"C":"B";
    const preview=await invoke("/results/:id/re-evaluate/preview");assert.equal(preview.status,200);
    assert.equal((await invoke("/results/:id/re-evaluate","v1",{confirm:true,previewToken:preview.body.previewToken},"other")).status,409);
    const answer=key.questions[0].answer;key.questions[0].answer="H";
    assert.equal((await invoke("/results/:id/re-evaluate","v1",{confirm:true,previewToken:preview.body.previewToken})).status,409);key.questions[0].answer=answer;
    const saved=await invoke("/results/:id/re-evaluate","v1",{confirm:true,previewToken:preview.body.previewToken});assert.equal(saved.status,201);assert.equal(saved.body.revision,2);assert.equal(saved.body.studentPublished,false);assert.deepEqual(results[0].snapshot,initial);assert.equal(results[0].studentPublished,true);assert.equal(copied[0].resultId,"v2");
    assert.equal((await invoke("/results/:id/re-evaluate/preview")).status,409);
    const oldChecks=await invoke("/results/:id/checks");assert.ok(oldChecks.body.blockers.some((v:string)=>v.includes("yeni sürümü")));
    const checks=await invoke("/results/:id/checks","v2");assert.equal(checks.body.blockers.length,0);
    const publish=await invoke("/results/:id/publication","v2",{published:true,reviewToken:checks.body.reviewToken,confirmWarnings:true});assert.equal(publish.status,200);assert.equal(results[0].studentPublished,false);assert.equal(results[1].studentPublished,true);assert.ok(calls.every(c=>c.where.school.dealerId==="dealer"));
    const analysis=await invoke("/results/:id/analysis","v2");assert.equal(analysis.body.studentCount,2);
  }finally{for(const[o,k,v]of originals.reverse())o[k]=v;}
});
test("erişim iptali sınavın tüm sürümlerini kapsar ve bayi kapsamını korur",async()=>{
  const {prisma}=await import("../apps/api/src/db"),{readerRouter}=await import("../apps/api/src/reader-routes");const originalTx=prisma.$transaction,originalFind=prisma.studentResultAccess.findFirst,originalDelete=prisma.studentResultAccess.deleteMany;
  prisma.$transaction=(async(fn:any)=>fn(prisma)) as any;
  prisma.studentResultAccess.findFirst=(async({where}:any)=>{assert.equal(where.user.readerManagerId,"manager");assert.equal(where.result.school.dealerId,"dealer");return{userId:"student",studentNo:"01",result:{seriesId:"series"}};}) as any;
  prisma.studentResultAccess.deleteMany=(async({where}:any)=>{assert.equal(where.userId,"student");assert.equal(where.studentNo,"01");assert.equal(where.id,undefined);assert.equal(where.result.seriesId,"series");assert.equal(where.result.school.dealerId,"dealer");return{count:2};}) as any;
  try{let status=200;const handler=(readerRouter as any).stack.find((l:any)=>l.route?.path==="/reader-access/:id").route.stack.at(-1).handle;await handler({params:{id:"grant"},user:{id:"manager",role:"DEALER",dealerId:"dealer"}},{status(n:number){status=n;return this;},end(){}},(e:any)=>{if(e)throw e;});assert.equal(status,204);}finally{prisma.$transaction=originalTx;prisma.studentResultAccess.findFirst=originalFind;prisma.studentResultAccess.deleteMany=originalDelete;}
});
