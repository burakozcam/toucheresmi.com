// Disposable localhost PostgreSQL only; never use an application/live database.
require('./v146-env.cjs');
const assert=require('node:assert/strict');
const {prisma}=require('../../apps/api/src/db.ts');
const {app}=require('../../apps/api/src/server.ts');
const {issueSession}=require('../../apps/api/src/auth-sessions.ts');
let server;
(async()=>{
 const suffix=require('node:crypto').randomUUID();
 const makeUser=(role,extra={})=>prisma.user.create({data:{email:`permissions-${role}-${suffix}@example.test`,passwordHash:'synthetic-local-permissions-hash',firstName:'Sentetik',lastName:'Test',role,...extra}});
 const admin=await makeUser('SUPER_ADMIN',{twoFactorEnabled:true});
 const dealer=await prisma.dealer.create({data:{name:'Yetki Test A'}});
 const other=await prisma.dealer.create({data:{name:'Yetki Test B'}});
 const inactive=await prisma.dealer.create({data:{name:'Pasif Yetki Testi',active:false}});
 const regular=await makeUser('DEALER',{dealerId:dealer.id});
 const adminToken=(await issueSession(admin,undefined,{mfaVerifiedAt:new Date()})).token;
 const regularToken=(await issueSession(regular)).token;
 server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 async function request(path,token=adminToken,body,method=body?'POST':'GET'){
  const response=await fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,data:await response.json()};
 }
 const status=(response,expected=200)=>assert.equal(response.status,expected,JSON.stringify(response.data));
 const create=await request('/api/admin/temporary-access',adminToken,{note:'Düzenlenecek kod',unit:'hour',value:2,scopes:['FMT_DEMO']});status(create,201);
 const grant=create.data,route=`/api/admin/temporary-access/${grant.id}`;
 const original=await prisma.temporaryAccess.findUniqueOrThrow({where:{id:grant.id}});
 const login=()=>request('/api/temporary/login','',{code:grant.code});
 const patch=(body,token=adminToken)=>request(route,token,body,'PATCH');
 const session=await login();status(session);
 status(await request('/api/temporary/demo/fmt',session.data.token));
 for(const token of ['',regularToken,session.data.token])status(await patch({scopes:['PDF_TOOLS']},token),token?403:401);
 for(const input of [{scopes:[]},{scopes:['SUPER_ADMIN']},{scopes:['DEALER_EXAMS']},{scopes:['PDF_TOOLS'],dealerId:dealer.id},{scopes:['PDF_TOOLS'],expiresAt:'2099-01-01'},{scopes:['PDF_TOOLS'],code:'CHANGED'}])status(await patch(input),400);
 for(const dealerId of [inactive.id,'missing-dealer'])status(await patch({scopes:['DEALER_EXAMS'],dealerId}),400);
 // Failed edits must leave both the grant and its open session intact.
 assert.deepEqual((await prisma.temporaryAccess.findUniqueOrThrow({where:{id:grant.id}})).scopes,['FMT_DEMO']);
 status(await request('/api/account',session.data.token));
 console.log('PASS: administrator-only edits; strict scopes/dealer validation; invalid edits preserve grant/session');

 const updated=await patch({scopes:['PDF_TOOLS','PDF_TOOLS']});status(updated);
 assert.deepEqual(updated.data.scopes,['PDF_TOOLS']);assert.equal(updated.data.expiresAt,grant.expiresAt);
 assert.equal(updated.data.code,undefined);assert.equal(updated.data.link,undefined);
 status(await request('/api/account',session.data.token),401);
 const pdfSession=await login();status(pdfSession);
 const account=await request('/api/account',pdfSession.data.token);status(account);assert.deepEqual(account.data.temporary.scopes,['PDF_TOOLS']);
 status(await request('/api/temporary/demo/fmt',pdfSession.data.token),403);
 console.log('PASS: scope removal/addition preserves code/expiry, ends open session and applies after same-code login');

 status(await patch({scopes:['FMT_DEMO','DEALER_EXAMS'],dealerId:dealer.id}));
 status(await request('/api/account',pdfSession.data.token),401);
 const dealerSession=await login();status(dealerSession);
 status(await request('/api/optical/result-catalog',dealerSession.data.token));
 status(await request('/api/admin/users',dealerSession.data.token),403);
 status(await patch({scopes:['DEALER_EXAMS'],dealerId:other.id}));
 status(await request('/api/account',dealerSession.data.token),401);
 const switched=await login();status(switched);
 assert.equal((await request('/api/account',switched.data.token)).data.dealerId,other.id);
 status(await patch({scopes:['FMT_DEMO']}));
 assert.equal((await prisma.user.findUniqueOrThrow({where:{id:original.userId}})).dealerId,null);
 status(await request('/api/account',switched.data.token),401);
 const finalLogin=await login();status(finalLogin);
 status(await request('/api/optical/result-catalog',finalLogin.data.token),403);
 status(await request('/api/temporary/demo/fmt',finalLogin.data.token));
 console.log('PASS: explicit dealer addition, reassignment and removal; old sessions and administrator routes denied');

 // An already-consumed link must remain consumed after an edit.
 const key=new URL(grant.link).hash.slice(5);
 status(await request('/api/temporary/login','',{key}));
 const consumed=await prisma.temporaryAccess.findUniqueOrThrow({where:{id:grant.id}});
 status(await patch({scopes:['FMT_DEMO','PDF_TOOLS']}));
 status(await request('/api/temporary/login','',{key}),409);
 const stored=await prisma.temporaryAccess.findUniqueOrThrow({where:{id:grant.id}});
 for(const field of ['codeHash','linkHash','expiresAt','createdAt','note'])assert.deepEqual(stored[field],original[field]);
 assert.deepEqual(stored.linkUsedAt,consumed.linkUsedAt);
 const logs=await prisma.auditLog.findMany({where:{targetId:grant.id,action:'TEMPORARY_PERMISSIONS_UPDATE'}});
 assert.equal(logs.length,5);assert(!JSON.stringify(logs).includes(grant.code));assert(!JSON.stringify(logs).includes(key));
 console.log('PASS: hashes, lifetime and one-use link state preserved; permission edits audited without secrets');

 status(await request('/api/admin/temporary-access/missing',adminToken,{scopes:['PDF_TOOLS']},'PATCH'),404);
 await prisma.temporaryAccess.update({where:{id:grant.id},data:{expiresAt:new Date(Date.now()-1000)}});
 status(await patch({scopes:['FMT_DEMO']}),409);
 await prisma.temporaryAccess.update({where:{id:grant.id},data:{expiresAt:original.expiresAt,revokedAt:new Date()}});
 status(await patch({scopes:['FMT_DEMO']}),409);
 assert.deepEqual((await prisma.temporaryAccess.findUniqueOrThrow({where:{id:grant.id}})).scopes,['FMT_DEMO','PDF_TOOLS']);
 console.log('PASS: missing, expired and revoked grants cannot be edited/reactivated');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
 if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 await prisma.$disconnect();
});
