import test from 'node:test';
import assert from 'node:assert/strict';
const route=(router:any,path:string,method:string)=>router.stack.find((l:any)=>l.route?.path===path&&l.route.methods[method]).route.stack.at(-1).handle;
async function invoke(handler:any,body:any,user:any={id:'owner',role:'DEALER'},id='link'){let status=200,result:any;await handler({params:{id},body,user},{setHeader(){},status(n:number){status=n;return this;},json(v:any){result=v;},attachment(){return this;},type(){return this;},send(v:any){result=v;}},(error:any)=>{if(error)throw error;});return{status,result};}
test('v126 PDF paylaşımı: token, süre, iptal, indirme ve sayaç; genel dosya URL yok',async()=>{
 const {prisma}=await import('../apps/api/src/db'),{fmtShareRouter,shareHash}=await import('../apps/api/src/fmt-share');
 const originals=[prisma.fmtShare.findFirst,prisma.fmtShare.update,prisma.publishedAnswerKey.findUnique];
 const token='p'.repeat(43),share:any={id:'link',category:'PDF',targetId:'key',tokenHash:shareHash(token),revokedAt:null,expiresAt:new Date(Date.now()+10000),views:0,downloads:0};
 prisma.fmtShare.findFirst=(async({where}:any)=>where.tokenHash===share.tokenHash?share:null)as any;
 prisma.fmtShare.update=(async({data}:any)=>{share.views+=data.views?.increment??0;share.downloads+=data.downloads?.increment??0;return share;})as any;
 prisma.publishedAnswerKey.findUnique=(async()=>({examName:'Anonim sınav',grade:8,publisher:{name:'Özdebir'},opticalKey:{questions:[{lesson:'TÜRKÇE',number:1,answer:'A',weight:1,positions:{A:1}}]}}))as any;
 try{
  for(const action of ['view','download']){
   const handler=route(fmtShareRouter,`/api/public/pdf-shares/:id/${action}`,'post');
   assert.equal((await invoke(handler,{token:'x'.repeat(43)})).status,410);
   share.revokedAt=new Date();assert.equal((await invoke(handler,{token})).status,410);share.revokedAt=null;
   share.expiresAt=new Date(0);assert.equal((await invoke(handler,{token})).status,410);share.expiresAt=null;
   const success=await invoke(handler,{token});assert.equal(success.status,200);if(action==='download')assert.equal(success.result.subarray(0,5).toString(),'%PDF-');else assert.equal('url' in success.result,false);
  }assert.equal(share.views,1);assert.equal(share.downloads,1);
 }finally{[prisma.fmtShare.findFirst,prisma.fmtShare.update,prisma.publishedAnswerKey.findUnique]=originals as any;}
});
test('v126 merkezi yönetim: başka bayinin bağlantısı değişmez, üyelik süresiz/yeniden etkin olmaz',async()=>{
 const {prisma}=await import('../apps/api/src/db'),{fmtShareRouter}=await import('../apps/api/src/fmt-share');const originals=[prisma.fmtShare.findFirst,prisma.fmtShare.updateMany,prisma.user.updateMany];
 let managed:any={id:'link',category:'FMT',createdById:'owner',usedAt:null,revokedAt:null},writes=0;
 prisma.fmtShare.findFirst=(async({where}:any)=>!where.createdById||where.createdById===managed.createdById?managed:null)as any;prisma.fmtShare.updateMany=(async()=>{writes++;return{count:1};})as any;prisma.user.updateMany=(async()=>{writes++;return{count:1};})as any;
 const handle=route(fmtShareRouter,'/api/shares/:id','patch');
 try{
  assert.equal((await invoke(handle,{revoked:true},{id:'other',role:'DEALER'})).status,404);assert.equal(writes,0);
  assert.equal((await invoke(handle,{expiresAt:null})).status,200);assert.equal(writes,1);
  managed={...managed,category:'MEMBERSHIP',targetId:'user',tokenHash:'hash'};
  for(const body of [{expiresAt:null},{revoked:false},{expiresAt:new Date(Date.now()+3600000).toISOString()}])assert.equal((await invoke(handle,body)).status,400);
  managed.usedAt=new Date();assert.equal((await invoke(handle,{revoked:true})).status,400);assert.equal(writes,1);
 }finally{[prisma.fmtShare.findFirst,prisma.fmtShare.updateMany,prisma.user.updateMany]=originals as any;}
});
test('v126 profil yönetimi ve merkezi paylaşım uçları kimlik doğrulaması ve rol denetimi içerir',async()=>{
 const {fmtShareRouter}=await import('../apps/api/src/fmt-share'),{opticalRouter}=await import('../apps/api/src/optical-routes');
 for(const path of ['/api/shares','/api/shares/:id','/api/answer-keys/:id/shares']){const handlers=(fmtShareRouter as any).stack.filter((l:any)=>l.route?.path===path);for(const l of handlers){assert.ok(l.route.stack.length>=3);assert.equal(l.route.stack[0].handle.name,'requireAuth');let status=200,called=false;l.route.stack[1].handle({user:{role:'STUDENT'}},{status(n:number){status=n;return this;},json(){}},()=>called=true);assert.equal(status,403);assert.equal(called,false);}}
 assert.ok((opticalRouter as any).stack.some((l:any)=>l.route?.path==='/score-profiles'&&l.route.stack.length>=2));
});

test('v126 eski yüklenmiş cevap PDF güvenli depolamadan paylaşılır; depo dışı yol reddedilir',async()=>{
 const fs=await import('node:fs'),path=await import('node:path'),{env}=await import('../apps/api/src/config'),{prisma}=await import('../apps/api/src/db'),{fmtShareRouter,shareHash}=await import('../apps/api/src/fmt-share');
 const originals=[prisma.fmtShare.findFirst,prisma.fmtShare.update,prisma.publishedAnswerKey.findUnique];const directory=path.resolve(env.STORAGE_DIR,'answer-keys','v126-anonymous-test');fs.mkdirSync(directory,{recursive:true});const location=path.join(directory,'key.pdf');fs.writeFileSync(location,'%PDF-1.4\n% anonymous test only');
 let storedPath=location;const token='z'.repeat(43);
 prisma.fmtShare.findFirst=(async({where}:any)=>where.tokenHash===shareHash(token)?{id:'link',targetId:'key',revokedAt:null,expiresAt:null}:null)as any;prisma.fmtShare.update=(async()=>({}))as any;
 prisma.publishedAnswerKey.findUnique=(async()=>({examName:'Anonim',grade:8,publisher:{name:'Test'},opticalKey:null,files:[{storagePath:storedPath,originalFileName:'key.pdf'}]}))as any;
 try{const handler=route(fmtShareRouter,'/api/public/pdf-shares/:id/download','post');const downloaded=await invoke(handler,{token});assert.equal(downloaded.status,200);assert.equal(downloaded.result.toString(),fs.readFileSync(location,'utf8'));storedPath='/tmp/outside-private-store.pdf';assert.equal((await invoke(handler,{token})).status,410);}
 finally{[prisma.fmtShare.findFirst,prisma.fmtShare.update,prisma.publishedAnswerKey.findUnique]=originals as any;fs.rmSync(directory,{recursive:true,force:true});}
});

test('v126 merkezi davet durumu: pasif hesap veya değişmiş token aktif gösterilmez; token özeti açığa çıkmaz',async()=>{
 const {prisma}=await import('../apps/api/src/db'),{fmtShareRouter}=await import('../apps/api/src/fmt-share');const original=[prisma.fmtShare.findMany,prisma.user.findMany];let active=false;
 prisma.fmtShare.findMany=(async()=>[{id:'invite',category:'MEMBERSHIP',targetId:'subject',createdById:'admin',tokenHash:'private-hash',tokenEncrypted:null,expiresAt:new Date(Date.now()+10000),revokedAt:null,usedAt:null}])as any;
 prisma.user.findMany=(async({where}:any)=>where.id?[{id:'admin',role:'SUPER_ADMIN',firstName:'Test',lastName:'Admin',active:true},{id:'subject',role:'DEALER',firstName:'Test',lastName:'User',active,setupTokenHash:'private-hash'}]:[])as any;
 try{const handler=route(fmtShareRouter,'/api/shares','get');let result=await invoke(handler,{}, {id:'admin',role:'SUPER_ADMIN'});assert.equal(result.result[0].status,'revoked');assert.ok(!JSON.stringify(result.result).includes('private-hash'));active=true;result=await invoke(handler,{}, {id:'admin',role:'SUPER_ADMIN'});assert.equal(result.result[0].status,'active');}
 finally{[prisma.fmtShare.findMany,prisma.user.findMany]=original as any;}
});
