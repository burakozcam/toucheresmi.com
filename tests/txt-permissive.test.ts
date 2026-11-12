import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {layout7108, parseOptical, opticalSummary} from "../apps/api/src/optical-core";
import {matchExamAnswers} from "../apps/api/src/optical-exam-matching";
import {reviewSnapshot} from "../apps/api/src/optical-review";
const original=fs.readFileSync(new URL("./fixtures/7108-anonymous.txt",import.meta.url),"utf8").trimEnd().split(/\r?\n/)[0].padEnd(171);
const questions=Array.from({length:10},(_,i)=>({lesson:"TÜRKÇE",number:i+1,answer:"A",weight:null,positions:{A:i+1,B:10-i}}));
const put=(txt:string,start:number,value:string)=>txt.slice(0,start-1)+value+txt.slice(start-1+value.length);
const line=put(put(original,51,"B"),52,"AAAAAAAAAAAAAAAAAAAA");
test("TXT soru dağılımı farkı uyarıyla değerlendirilir; eşleşmeyen ders ve taşan sorular boş kalır",()=>{
 assert.throws(()=>parseOptical(line,layout7108,questions,"Kurum"),/uyumsuz/);
 const data=parseOptical(line,layout7108,questions,"Kurum",{allowMismatch:true});
 assert.deepEqual(data.students[0].answers,Array(10).fill("A"));
 assert.ok(data.warnings.some(w=>w.includes("sonraki işaretlemeler")));
 const extra=[...questions,...Array.from({length:21},(_,i)=>({lesson:"Biyoloji",number:i+1,answer:"A",weight:null,positions:{A:i+1,B:i+1}}))];
 const unmapped=parseOptical(line,layout7108,extra,"Kurum",{allowMismatch:true});
 assert.deepEqual(unmapped.students[0].answers.slice(10),Array(21).fill(""));
 const oversized=Array.from({length:21},(_,i)=>({...questions[0],number:i+1,positions:{A:i+1,B:i+1}}));
 assert.equal(parseOptical(line,layout7108,oversized,"Kurum",{allowMismatch:true}).students[0].answers[20],"");
 const checks=reviewSnapshot({data,summary:opticalSummary(data,3),penalty:3,schoolName:"Kurum",templateName:"7108",keyName:"Deneme",expectedGrade:99});
 assert.equal(checks.blockers.length,0);assert.ok(checks.warnings.some(w=>w.includes("TXT sınıfı")));
});
test("sınav önerisi kısa anahtarı, B kitapçığını ve kimliksiz/yinelenen satırları karşılaştırır",()=>{
 const anonymous=put(put(put(line,11,"     "),16,"                    "),38,"           ");
 assert.deepEqual(matchExamAnswers(anonymous+"\n"+anonymous,layout7108,questions),{matchPercent:100,matched:10,compared:10});
 const reverse=questions.map((q,i)=>({...q,answer:"ABCDEABCDE"[i]}));
 const bLine=put(anonymous,52,"EDCBAEDCBAAAAAAAAAAA");
 assert.equal(matchExamAnswers(bLine,layout7108,reverse)?.matchPercent,100);
 assert.equal(matchExamAnswers("wrong format",layout7108,questions),null);
});

test("v123: 131 karakterlik satır durmaz; eksik cevaplar boş, konumlar sabit kalır",()=>{
 const short=line.slice(0,131),data=parseOptical(short,layout7108,questions,"Kurum",{allowMismatch:true});
 assert.equal(data.students.length,1);assert.deepEqual(data.students[0].answers,Array(10).fill("A"));
 assert.ok(data.warnings.some(w=>w.includes("131 bulundu")&&w.includes("yanlış konum")));
 const fullQuestions=Array.from({length:20},(_,i)=>({lesson:"FEN",number:i+1,answer:"B",weight:null,positions:{A:i+1,B:i+1}}));
 const missing=parseOptical(short,layout7108,fullQuestions,"Kurum",{allowMismatch:true});
 assert.deepEqual(missing.students[0].answers,Array(20).fill(""));
});
test("v123: kimliği çelişen oturumlarda daha dolu ders, kendi kitapçığıyla kullanılır; eşitlikte ilk kalır",()=>{
 let sparse=put(put(line,51,"A"),52,"A         "+" ".repeat(10));
 let dense=put(put(put(line,16,"YENI AD   "),51,"B"),52,"BBBBBBBBBB"+" ".repeat(10));
 const data=parseOptical(sparse+"\n"+dense+"\n"+dense,layout7108,questions,"Kurum",{allowMismatch:true});
 assert.equal(data.students.length,1);assert.deepEqual(data.students[0].answers,Array(10).fill("B"));
 assert.equal(data.students[0].booklets.TÜRKÇE,"B");assert.ok(data.students[0].name.startsWith("YENI AD"));
 assert.deepEqual(data.students[0].sourceLines,[1,2]);assert.ok(data.warnings.some(w=>w.includes("kimlik bilgileri çelişiyor")));assert.ok(data.warnings.some(w=>w.includes("yinelenen TXT satırı atlandı")));
 const tied=put(dense,52,"CCCCCCCCCC"+" ".repeat(10));
 assert.deepEqual(parseOptical(dense+"\n"+tied,layout7108,questions,"Kurum",{allowMismatch:true}).students[0].answers,Array(10).fill("B"));
 const separate=parseOptical(sparse+"\n"+dense,layout7108,questions,"Kurum",{allowMismatch:true,mergeSessions:false});assert.equal(separate.students.length,2);
});
test("v123: ayrı yüklemelerde daha dolu ders korunur, oturum kitapçığı ve uyarılar kaybolmaz",async()=>{
 const {mergeStudentData}=await import("../apps/api/src/result-data");
 const sparse=parseOptical(put(line,52,"B         "+" ".repeat(10)),layout7108,questions,"Kurum",{allowMismatch:true});
 const dense=parseOptical(put(line,52,"CCCCCCCCCC"+" ".repeat(10)),layout7108,questions,"Kurum",{allowMismatch:true});
 sparse.warnings.push("Önceki satır uzunluğu uyarısı");dense.warnings.push("Yeni kodlama uyarısı");
 const merged=mergeStudentData(sparse,dense);assert.deepEqual(merged.students[0].answers,Array(10).fill("C"));
 assert.ok(merged.warnings.includes("Önceki satır uzunluğu uyarısı"));assert.ok(merged.warnings.includes("Yeni kodlama uyarısı"));
 assert.deepEqual(mergeStudentData(dense,sparse).students[0].answers,Array(10).fill("C"));
});
test("v123: TXT arşivinde Admin/bayi gösterilir; silme kullanıcı kapsamıyla sınırlıdır",async()=>{
 const {archiveDto}=await import("../apps/api/src/txt-archive");const row={id:"txt",name:"test.txt",size:10,createdAt:new Date(),evaluatedAt:null,resultId:null};
 assert.equal(archiveDto({...row,createdBy:{role:"SUPER_ADMIN",firstName:"Test",lastName:"Admin"}}).uploadedBy,"Admin");
 assert.equal(archiveDto({...row,createdBy:{role:"DEALER",firstName:"Test",lastName:"Bayi",dealer:{name:"Örnek Bayi"}}}).uploadedBy,"Örnek Bayi");
 const {prisma}=await import("../apps/api/src/db"),{txtArchiveRouter}=await import("../apps/api/src/txt-archive-routes");
 const original=prisma.opticalTxtFile.updateMany;let status=200,value:any;
 prisma.opticalTxtFile.updateMany=(async({where,data}:any)=>{assert.equal(where.id,"foreign");assert.equal(where.createdById,"owner");assert.equal(where.deletedAt,null);assert.ok(data.deletedAt instanceof Date);return {count:0};}) as any;
 try{const handle=(txtArchiveRouter as any).stack.find((l:any)=>l.route?.path==="/txt-files/:id").route.stack.at(-1).handle;
 await handle({params:{id:"foreign"},user:{id:"owner",role:"DEALER"}},{status(n:number){status=n;return this;},json(v:any){value=v;}},(e:any)=>{if(e)throw e;});assert.equal(status,404);assert.ok(value.error);
 }finally{prisma.opticalTxtFile.updateMany=original;}
});

test("v123: sınav önerisi sunucuya yüklemeden yerel TXT ile de alınır",async()=>{
 const {prisma}=await import("../apps/api/src/db"),{opticalRouter}=await import("../apps/api/src/optical-routes");
 const original=[prisma.opticalTemplate.findFirst,prisma.publishedAnswerKey.findMany];
 prisma.opticalTemplate.findFirst=(async()=>({id:"fmt",name:"FMT",layout:layout7108,active:true})) as any;
 prisma.publishedAnswerKey.findMany=(async()=>[{id:"pub",examName:"Deneme",grade:8,publisher:{name:"Örnek Yayınları"},opticalKey:{id:"key",questions}}]) as any;
 try{const handle=(opticalRouter as any).stack.find((l:any)=>l.route?.path==="/suggest-exams").route.stack.at(-1).handle;let value:any;
 await handle({body:{templateId:"fmt"},user:{id:"owner",role:"DEALER"},file:{originalname:"yerel.txt",buffer:Buffer.from(line.slice(0,131))}},{json(v:any){value=v;},status(){return this;}},(e:any)=>{if(e)throw e;});
 assert.equal(value.items[0].id,"key");assert.equal(value.items[0].matchPercent,100);
 }finally{[prisma.opticalTemplate.findFirst,prisma.publishedAnswerKey.findMany]=original as any;}
});


test("v124: birleştirme katı okumada da durmaz; daha dolu kayıt, boş olmayan alanlar ve kitapçık korunur",async()=>{
 const layout={...layout7108,lessons:[layout7108.lessons[0]]};
 const qs=Array.from({length:20},(_,i)=>({...questions[0],number:i+1,positions:{A:i+1,B:20-i}}));
 let sparse=put(put(put(put(original,16,"KISA      "),37,"A"),51,"A"),52,"A"+" ".repeat(19));
 const dense=put(put(put(put(sparse,16,"UZUN AD   "),37," "),51,"B"),52,"BC"+" ".repeat(18));
 const parsed=parseOptical(sparse+"\n"+dense+"\n"+dense,layout,qs,"Kurum");
 assert.equal(parsed.students.length,1);assert.ok(parsed.students[0].name.startsWith("UZUN AD"));
 assert.equal(parsed.students[0].branch,"8-A");assert.equal(parsed.students[0].booklets.TÜRKÇE,"B");
 assert.deepEqual(parsed.students[0].answers.slice(-2),["C","B"]);assert.deepEqual(parsed.students[0].sourceLines,[1,2]);
 const {mergeStudentData}=await import("../apps/api/src/result-data");
 const first=parseOptical(sparse,layout,qs,"Kurum"),second=parseOptical(dense,layout,qs,"Kurum");
 const merged=mergeStudentData(first,second);
 assert.deepEqual(merged.students[0].answers,parsed.students[0].answers);assert.equal(merged.students[0].branch,"8-A");
 const blankName=put(sparse,16," ".repeat(20));
 assert.ok(parseOptical(blankName+"\n"+dense,layout,qs,"Kurum").students[0].name.startsWith("UZUN AD"));
 assert.equal(parseOptical(sparse+"\n"+dense,layout,qs,"Kurum",{mergeSessions:false}).students.length,2);
 const fullerName=put(sparse,16,"DAHA UZUN ");
 assert.ok(parseOptical(sparse+"\n"+fullerName,layout,qs,"Kurum").students[0].name.startsWith("DAHA UZUN"));
 assert.ok(parseOptical(fullerName+"\n"+sparse,layout,qs,"Kurum").students[0].name.startsWith("DAHA UZUN"));
});
