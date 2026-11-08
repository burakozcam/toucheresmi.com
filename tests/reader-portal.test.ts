import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fmtBytes } from "../apps/api/src/fmt-download";
import { privateResult, resultStudent } from "../apps/api/src/reader-core";
import { layout7108, parseOptical, opticalSummary } from "../apps/api/src/optical-core";
import { parseOpticalKeyRows } from "../apps/web/lib/optical";
import rows from "../apps/web/data/nartest-8-optical.json";
import fmt from "../apps/web/data/optical-7108.json";
const data=parseOptical(fs.readFileSync(path.join(__dirname,"fixtures/7108-anonymous.txt"),"utf8"),layout7108,parseOpticalKeyRows(rows),"Örnek Kurum");
const snapshot={data,summary:opticalSummary(data,3),penalty:3,schoolName:"Örnek Kurum",keyName:"Nartest",templateName:"7108"};
test("öğrenci karnesi yalnızca kendi cevaplarını ve toplu sıralamayı içerir; diğer öğrenci kaydı sızmaz",()=>{
  const own=privateResult(snapshot,"00001"),serialized=JSON.stringify(own);
  assert.equal(own.data.students.length,1);assert.equal(own.summary.length,1);assert.equal(own.summary[0].net,78);
  assert.equal(own.comparison.schoolCount,2);assert.equal(own.comparison.schoolRank,1);assert.equal(own.comparison.branchCount,2);
  assert.ok(!serialized.includes("ORNEK IKI"));assert.ok(!serialized.includes('"00002"'));assert.ok(!serialized.includes("sourceLines"));assert.ok(!serialized.includes("warnings"));
  assert.equal(privateResult(snapshot,"00002").comparison.schoolRank,2);
  assert.throws(()=>privateResult(snapshot,"99999"),/tek bir öğrenci/);
  assert.throws(()=>resultStudent({...snapshot,data:{...data,students:[...data.students,data.students[0]]}},"00001"),/tek bir öğrenci/);
});
test("FMT indirme Türkçe Windows karakterlerini ve yeni yüklemelerin özgün baytlarını korur",()=>{
  const bytes=fmtBytes(fmt.originalFmt);assert.equal(new TextDecoder("windows-1254").decode(bytes),fmt.originalFmt);
  assert.ok(bytes.includes(0xdd));
  const utf8=Buffer.from("\ufeffÖZGÜN FMT\r\n","utf8");assert.deepEqual(fmtBytes("ÖZGÜN FMT\r\n",utf8.toString("base64")),utf8);
});
async function router(){return(await import("../apps/api/src/reader-routes")).readerRouter as any;}
const route=(r:any,url:string,method="get")=>r.stack.find((l:any)=>l.route?.path===url&&l.route.methods[method]).route.stack;
async function invoke(r:any,url:string,req:any,method="get"){
  let status=200,body:any;const response:any={status(n:number){status=n;return this;},json(v:any){body=v;return this;},setHeader(){},end(){}};
  await route(r,url,method).at(-1).handle({user:{id:"reader",role:"STUDENT"},query:{},params:{id:"access"},...req},response,(e:any)=>{if(e)throw e;});return{status,body};
}
test("öğrenci/veli uçları oturum ister ve öğrenci hesabı yönetim işlemlerini yapamaz",async()=>{
  const r=await router();let status=200,passed=false;
  await r.stack[0].handle({header:()=>undefined},{status(n:number){status=n;return this;},json(){}},()=>passed=true);assert.equal(status,401);assert.equal(passed,false);
  for(const [url,method]of[["/reader-accounts","post"],["/reader-accounts/:id/access","post"],["/reader-accounts/:id/invitation","post"],["/reader-access/:id","delete"]]){
    let code=200,next=false;route(r,url,method)[0].handle({user:{role:"STUDENT"}},{status(n:number){code=n;return this;},json(){}},()=>next=true);assert.equal(code,403);assert.equal(next,false);
  }
});
test("sonuç listesi ve detayda kullanıcı ve yayın durumu veritabanında birlikte sınırlandırılır",async()=>{
  const r=await router(),{prisma}=await import("../apps/api/src/db"),original=prisma.studentResultAccess.findFirst,originalList=prisma.studentResultAccess.findMany;
  try{
    prisma.studentResultAccess.findFirst=(async({where}:any)=>{assert.equal(where.userId,"reader");assert.equal(where.result.studentPublished,true);return where.id==="own"?{studentNo:"00001",result:{snapshot,createdAt:new Date()}}:null;}) as any;
    assert.equal((await invoke(r,"/my-results/:id",{params:{id:"foreign"}})).status,404);
    const own=await invoke(r,"/my-results/:id",{params:{id:"own"}});assert.equal(own.status,200);assert.equal(own.body.data.students.length,1);
    prisma.studentResultAccess.findMany=(async({where}:any)=>{assert.equal(where.userId,"reader");assert.equal(where.result.studentPublished,true);return[];}) as any;
    assert.deepEqual((await invoke(r,"/my-results",{})).body,[]);
  }finally{prisma.studentResultAccess.findFirst=original;prisma.studentResultAccess.findMany=originalList;}
});
test("bayi yalnızca kendi yönettiği hesaba ve kendi kurumundaki sonuca bağlantı verebilir; öğrenciye başka çocuk bağlanmaz",async()=>{
  const r=await router(),{prisma}=await import("../apps/api/src/db"),original=prisma.$transaction;let role="STUDENT",owned=true,grantCount=0;
  prisma.$transaction=(async(fn:any)=>fn({user:{findFirst:async({where}:any)=>{assert.equal(where.readerManagerId,"dealer-user");assert.deepEqual(where.role.in,["STUDENT","PARENT"]);return owned?{id:"account",role,readerStudentNo:role==="STUDENT"?"00001":null,schoolId:"school",studentResultAccess:[]}:null;}},opticalResult:{findFirst:async({where}:any)=>{assert.equal(where.school.dealerId,"dealer-1");return{snapshot,schoolId:"school"};}},studentResultAccess:{upsert:async({create}:any)=>{grantCount++;return create;}}})) as any;
  const req={user:{id:"dealer-user",role:"DEALER",dealerId:"dealer-1"},params:{id:"account"},body:{resultId:"result",studentNo:"00002"}};
  try{
    assert.equal((await invoke(r,"/reader-accounts/:id/access",req,"post")).status,400);assert.equal(grantCount,0);
    role="PARENT";assert.equal((await invoke(r,"/reader-accounts/:id/access",req,"post")).status,201);assert.equal(grantCount,1);
    owned=false;assert.equal((await invoke(r,"/reader-accounts/:id/access",req,"post")).status,404);assert.equal(grantCount,1);
  }finally{prisma.$transaction=original;}
});
test("veli hesabı yalnızca seçili öğrenciye bağlanır, davet özeti saklanır ve geçici parola gösterilmez",async()=>{
  const r=await router(),{prisma}=await import("../apps/api/src/db"),originalFind=prisma.opticalResult.findFirst,originalTx=prisma.$transaction;let created:any;
  prisma.opticalResult.findFirst=(async({where}:any)=>{assert.equal(where.school.dealerId,"dealer-1");return{snapshot};}) as any;
  prisma.$transaction=(async(fn:any)=>fn({opticalResult:{findFirst:async()=>({schoolId:"school"})},user:{create:async({data}:any)=>{created=data;return{id:"parent",role:data.role};}}})) as any;
  try{
    const result=await invoke(r,"/reader-accounts",{user:{id:"dealer-user",role:"DEALER",dealerId:"dealer-1"},body:{resultId:"result",studentNo:"00001",role:"PARENT",email:"VELI@example.test",firstName:"Örnek",lastName:"Veli"}},"post");
    assert.equal(result.status,201);assert.equal(created.readerManagerId,"dealer-user");assert.equal(created.email,"veli@example.test");assert.equal(created.role,"PARENT");assert.equal(created.studentResultAccess.create.studentNo,"00001");
    const token=result.body.setupUrl.split("#")[1];assert.equal(created.setupTokenHash,crypto.createHash("sha256").update(token).digest("hex"));assert.ok(!JSON.stringify(created).includes(token));assert.equal(result.body.temporaryPassword,undefined);assert.equal(created.mustChangePassword,true);
  }finally{prisma.opticalResult.findFirst=originalFind;prisma.$transaction=originalTx;}
});
test("bağlantı kaldırma ve hesap kapatma diğer bayinin kullanıcılarına uygulanamaz",async()=>{
  const r=await router(),{prisma}=await import("../apps/api/src/db"),originalTx=prisma.$transaction,originalRemove=prisma.studentResultAccess.findFirst,originalUpdate=prisma.user.updateMany;
  prisma.$transaction=(async(fn:any)=>fn(prisma)) as any;
  prisma.studentResultAccess.findFirst=(async({where}:any)=>{assert.equal(where.user.readerManagerId,"dealer-user");assert.equal(where.result.school.dealerId,"dealer-1");return null;}) as any;
  prisma.user.updateMany=(async({where,data}:any)=>{assert.equal(where.readerManagerId,"dealer-user");assert.equal(data.active,false);assert.equal(data.setupTokenHash,null);assert.ok(data.passwordHash);return{count:0};}) as any;
  try{const req={user:{id:"dealer-user",role:"DEALER",dealerId:"dealer-1"},body:{active:false}};assert.equal((await invoke(r,"/reader-access/:id",req,"delete")).status,404);assert.equal((await invoke(r,"/reader-accounts/:id",req,"patch")).status,404);}finally{prisma.$transaction=originalTx;prisma.studentResultAccess.findFirst=originalRemove;prisma.user.updateMany=originalUpdate;}
});
test("FMT indirme ve sonuç yayımlama API'de etkin şablon ve bayi kurumuyla sınırlandırılır",async()=>{
  const{opticalRouter}=await import("../apps/api/src/optical-routes"),{prisma}=await import("../apps/api/src/db");const r:any=opticalRouter;
  const original=prisma.opticalTemplate.findFirst,originalUpdate=prisma.opticalResult.updateMany;let content:Buffer|undefined;
  prisma.opticalTemplate.findFirst=(async({where}:any)=>{assert.equal(where.active,true);return{id:"fmt",name:"7108",originalFmt:fmt.originalFmt};}) as any;
  prisma.opticalResult.updateMany=(async({where,data}:any)=>{assert.equal(where.school.dealerId,"dealer-1");assert.equal(data.studentPublished,false);return{count:0};}) as any;
  try{await route(r,"/templates/:id/download").at(-1).handle({user:{role:"DEALER"},params:{id:"fmt"}},{setHeader(){},attachment(){return this;},type(){return this;},send(b:Buffer){content=b;}},(e:any)=>{if(e)throw e;});assert.equal(new TextDecoder("windows-1254").decode(content),fmt.originalFmt);assert.equal((await invoke(r,"/results/:id/publication",{user:{id:"dealer-user",role:"DEALER",dealerId:"dealer-1"},body:{published:false}},"patch")).status,404);}finally{prisma.opticalTemplate.findFirst=original;prisma.opticalResult.updateMany=originalUpdate;}
});
