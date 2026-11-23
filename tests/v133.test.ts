import test from "node:test";
import assert from "node:assert/strict";
import { resultRankings } from "../apps/api/src/result-rankings";
import { resultGrade } from "../apps/api/lib/result-grade";
import { selectedStudents, reportExcelRows } from "../apps/api/src/result-pdf";
import { safeWorkbookRead, inspectWorkbookBytes } from "../apps/api/src/upload-security";
import { analyticsPages as backendPages } from "../apps/api/src/analytics";
import { analyticsPages as frontendPages } from "../apps/web/lib/analytics-policy";
import { prisma } from "../apps/api/src/db";
import { requireAuth, credentialVersion } from "../apps/api/src/auth";
import { env } from "../apps/api/src/config";
import { assertFreshAdmin } from "../apps/api/src/auth-sessions";
import jwt from "jsonwebtoken";

function cohort(schoolId:string,n:number){
 const students=Array.from({length:n},(_,i)=>({id:String(i),name:`Öğrenci ${i}`,branch:`${i%3===0?7:8}-${i%2?'B':'A'}`}));
 return {schoolId,data:{students},summary:students.map((s,i)=>({id:s.id,score:i%11===0?null:i%5===0?300+1e-9:100+(i*73)%400}))};
}
test("v133 sıralama eski bağımsız tarama hesabıyla aynı: eşitlik, 1e-8 tolerans, boş puan, sınıf, il ve ilçe",()=>{
 const cohorts=Array.from({length:12},(_,i)=>cohort(`s${i}`,80+i)),locations=cohorts.map((v,i)=>({id:v.schoolId,city:i===0?null:i%2?'İstanbul':'Ankara',district:i%3?'Merkez':null}));
 const members=cohorts.flatMap(c=>c.data.students.map(s=>({schoolId:c.schoolId,grade:resultGrade(s.branch),branch:s.branch,score:c.summary.find(r=>r.id===s.id)!.score})));
 for(const view of cohorts){const actual=resultRankings(view,cohorts,locations);assert.equal(actual.generalCount,members.length);
  for(const person of view.data.students){const score=view.summary.find(r=>r.id===person.id)!.score,grade=resultGrade(person.branch),place=locations.find(p=>p.id===view.schoolId)!;
   const general=members.filter(m=>m.grade===grade),school=general.filter(m=>m.schoolId===view.schoolId),branch=school.filter(m=>m.branch===person.branch),city=place.city?general.filter(m=>locations.find(l=>l.id===m.schoolId)?.city===place.city):null,district=place.city&&place.district?city!.filter(m=>locations.find(l=>l.id===m.schoolId)?.district===place.district):null;
   const rank=(rows:typeof members)=>score===null?null:1+rows.filter(m=>m.score!==null&&m.score>score+1e-8).length;
   assert.deepEqual(actual.rankings[person.id],{generalRank:rank(general),generalCount:general.length,cityRank:city?rank(city):null,cityCount:city?.length??null,districtRank:district?rank(district):null,districtCount:district?.length??null,schoolRank:rank(school),schoolCount:school.length,classRank:rank(branch),classCount:branch.length});
  }
 }
});
test("v133 Excel sınırı aşan CSV/XLSX kısmi okunmaz; boş hücre, Türkçe, sıfırlı numara ve eski XLS korunur",()=>{
 const x=require('xlsx');
 assert.throws(()=>inspectWorkbookBytes(Buffer.alloc(2)),/eksik/);
 assert.throws(()=>safeWorkbookRead('Başlık\n'+'veri\n'.repeat(10001),{type:'string'}),/10.000/);
 const wide=x.utils.book_new();x.utils.book_append_sheet(wide,{A1:{t:'s',v:'Ad'},IW2:{t:'s',v:'taşma'},'!ref':'A1:IW2'},'Tablo');
 assert.throws(()=>safeWorkbookRead(x.write(wide,{type:'buffer',bookType:'xlsx'}),{type:'buffer'}),/256/);
 for(const bookType of ['xlsx','xls']){const book=x.utils.book_new();x.utils.book_append_sheet(book,x.utils.aoa_to_sheet([['Numara','Ad','Boş','Cevap'],['00001','Şükrü İğdır','','A']]),'Sınav');const read=safeWorkbookRead(x.write(book,{type:'buffer',bookType}),{type:'buffer'});assert.deepEqual(x.utils.sheet_to_json(read.Sheets['Sınav'],{header:1,defval:''})[1],['00001','Şükrü İğdır','','A']);}
});
test("v133 Excel ve PDF öğrenci sırası eşit/boş/sıfır/negatif puanlarda aynı kalır",()=>{
 const view:any=cohort('s1',50);view.summary[2].score=0;view.summary[3].score=-1;
 const options:any={kind:'school',order:'score',hideIdentity:true};
 const expected=[...view.data.students].sort((a:any,b:any)=>(view.summary.find((r:any)=>r.id===b.id).score-view.summary.find((r:any)=>r.id===a.id).score||a.name.localeCompare(b.name,'tr')));
 assert.deepEqual(selectedStudents(view,options).map(s=>s.id),expected.map((s:any)=>s.id));
 view.data.questions=[];view.rankings=resultRankings(view,[view],[]).rankings;view.summary.forEach((r:any)=>{r.lessons=[];r.net=0;});
 const rows=reportExcelRows(view,options);assert.equal(rows.length,51);assert.deepEqual(rows.slice(1).map((r:any)=>r[3]),expected.map((s:any)=>s.name));
});
test("v133 analitik sunucu allowlist istemciyle aynı; özel bağlantılar ve rastgele yollar alınmaz",()=>{
 assert.deepEqual([...backendPages].sort(),[...frontendPages].sort());
 for(const path of ['/sonuclar','/sonuclarim','/pdf-paylasim/secret','/blog/private','/panel','/rastgele'])assert.equal(backendPages.has(path),false);
});
test("v133 temsil oturumu yönetici cihazı iptal/süre sonu/yanlış sahiplik veya MFA kanıtı yokken reddedilir",async()=>{
 const originalUser=prisma.user.findUnique,originalSession=prisma.authSession.findUnique,originalDevice=prisma.trustedDevice.findUnique;
 const version=credentialVersion('fake-hash'),expiresAt=new Date(Date.now()+60000);
 const actor={id:'admin',role:'SUPER_ADMIN',active:true,twoFactorEnabled:true,passwordHash:'fake-hash'};
 const dealer={id:'dealer',role:'DEALER',active:true,dealerId:'d',dealer:{active:true},passwordHash:'fake-hash',twoFactorEnabled:true};
 const child={id:'child',userId:'dealer',role:'DEALER',credentialVersion:version,expiresAt,actorAdminId:'admin',parentSessionId:'parent'};
 let parent:any={id:'parent',userId:'admin',role:'SUPER_ADMIN',credentialVersion:version,expiresAt,trustedDeviceId:'device'};
 let device:any={id:'device',userId:'admin',credentialVersion:version,expiresAt};
 prisma.user.findUnique=(async({where}:any)=>where.id==='admin'?actor:dealer)as any;
 prisma.authSession.findUnique=(async({where}:any)=>where.id==='child'?child:parent)as any;
 prisma.trustedDevice.findUnique=(async()=>device)as any;
 const token=jwt.sign({jti:'child',dealerId:'d',role:'DEALER',credentialVersion:version},env.JWT_SECRET,{subject:'dealer',expiresIn:'1m'});
 async function check(){let status=200,allowed=false;await requireAuth({header:()=>`Bearer ${token}`}as any,{status(n:number){status=n;return this;},json(){}}as any,(e?:any)=>{if(e)throw e;allowed=true;});return{status,allowed};}
 try{
  assert.deepEqual(await check(),{status:200,allowed:true});
  device={...device,revokedAt:new Date()};assert.equal((await check()).status,401);
  device={...device,revokedAt:null,expiresAt:new Date(0)};assert.equal((await check()).status,401);
  device={...device,expiresAt,userId:'other'};assert.equal((await check()).status,401);
  parent={...parent,trustedDeviceId:null};assert.equal((await check()).status,401);
  parent={...parent,mfaVerifiedAt:new Date()};assert.equal((await check()).allowed,true);
 }finally{prisma.user.findUnique=originalUser;prisma.authSession.findUnique=originalSession;prisma.trustedDevice.findUnique=originalDevice;}
});
test("v133 güncel yönetici doğrulaması başka kullanıcı veya temsil oturumuyla kullanılamaz",async()=>{
 const session={userId:'other',role:'SUPER_ADMIN',expiresAt:new Date(Date.now()+60000),mfaVerifiedAt:new Date()};
 const user={id:'admin',role:'SUPER_ADMIN',sessionId:'s'};
 await assert.rejects(()=>assertFreshAdmin(user,{authSession:{findUnique:async()=>session}}),/güncel/);
 await assert.rejects(()=>assertFreshAdmin(user,{authSession:{findUnique:async()=>({...session,userId:'admin',actorAdminId:'other'})}}),/güncel/);
});
