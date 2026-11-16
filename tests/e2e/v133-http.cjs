// Real HTTP + isolated synthetic PostgreSQL only. Does not read the workspace .env database URL.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const database='postgresql://ks132@127.0.0.1:55442/ks_v132';
if(process.env.DATABASE_URL&&process.env.DATABASE_URL!==database)throw Error('Only disposable localhost ks_v132 is allowed.');
Object.assign(process.env,{NODE_ENV:'test',DATABASE_URL:database,JWT_SECRET:'v133-isolated-test-signing-key-not-for-production',MFA_ENCRYPTION_KEY:'b1'.repeat(32),STORAGE_DIR:'/tmp/ks-v133-http',WEB_ORIGIN:'http://localhost:3110',RECAPTCHA_ENABLED:'false',TURNSTILE_ENABLED:'false',RATE_LIMIT_STORE:'database'});
const {prisma}=require('../../apps/api/src/db.ts'),{app}=require('../../apps/api/src/server.ts'),{hashPassword}=require('../../apps/api/src/passwords.ts'),{flushAnalytics}=require('../../apps/api/src/analytics.ts');
(async()=>{
 const run=crypto.randomBytes(5).toString('hex'),password='Yerel kurum yöneticisi test parolası 2026',passwordHash=await hashPassword(password),checks=[];
 const dealer=await prisma.dealer.create({data:{name:'v133 test '+run}});
 const schools=[];for(let i=0;i<2;i++)schools.push(await prisma.school.create({data:{name:`v133 kurum ${i} ${run}`,duplicateKey:`v133-${i}-${run}`,dealerId:dealer.id}}));
 const manager=await prisma.user.create({data:{role:'SCHOOL_ADMIN',email:`v133-${run}@example.test`,firstName:'Sentetik',lastName:'Yönetici',schoolId:schools[0].id,passwordHash}});
 const exams=[];for(const school of schools)exams.push(await prisma.exam.create({data:{schoolId:school.id,name:'v133 deneme '+run,examDate:new Date()}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 async function request(path,body,token){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,data:r.status===204?null:await r.json()};}
 try{
  const login=await request('/api/auth/login',{email:manager.email,password,role:'SCHOOL_ADMIN'});assert.equal(login.status,200);const token=login.data.token;assert.ok(token);
  const own=await request('/api/exams?schoolId='+schools[1].id,null,token);assert.equal(own.status,200);assert.deepEqual(own.data.map(e=>e.id),[exams[0].id]);checks.push('SCHOOL_ADMIN login and authoritative own-school exam list');
  const before=await prisma.exam.count({where:{schoolId:schools[0].id}});
  const foreign=await request('/api/exams',{schoolId:schools[1].id,name:'Yetkisiz kurum isteği',examDate:new Date().toISOString()},token);assert.equal(foreign.status,404);assert.equal(await prisma.exam.count({where:{schoolId:schools[0].id}}),before);checks.push('Foreign school creation rejected without silently creating in own school');
  const created=await request('/api/exams',{schoolId:schools[0].id,name:'İzinli sınav '+run,examDate:new Date().toISOString()},token);assert.equal(created.status,201);assert.equal(created.data.schoolId,schools[0].id);checks.push('Own-school exam creation preserved');
  for(const path of ['/api/schools','/api/optical/result-exams?schoolId='+schools[0].id,'/api/admin/users'])assert.equal((await request(path,null,token)).status,403);checks.push('SCHOOL_ADMIN cannot enter dealer optical or administrator panels');
  await prisma.school.update({where:{id:schools[0].id},data:{active:false}});assert.equal((await request('/api/exams',null,token)).status,401);
  await prisma.school.update({where:{id:schools[0].id},data:{active:true}});await prisma.user.update({where:{id:manager.id},data:{schoolId:null}});assert.equal((await request('/api/exams',null,token)).status,401);checks.push('Inactive or detached institution invalidates existing school-manager access');
  const {issueSession}=require('../../apps/api/src/auth-sessions.ts'),{credentialVersion}=require('../../apps/api/src/credentials.ts');
  const actor=await prisma.user.create({data:{role:'SUPER_ADMIN',email:`v133-admin-${run}@example.test`,firstName:'Sentetik',lastName:'Yönetici',passwordHash,twoFactorEnabled:true}});
  const employee=await prisma.user.create({data:{role:'DEALER',email:`v133-dealer-${run}@example.test`,firstName:'Sentetik',lastName:'Bayi',dealerId:dealer.id,passwordHash}});
  const device=await prisma.trustedDevice.create({data:{userId:actor.id,tokenHash:crypto.randomBytes(32).toString('hex'),credentialVersion:credentialVersion(passwordHash),label:'Test',expiresAt:new Date(Date.now()+60000)}});
  const parent=await issueSession(actor,undefined,{trustedDeviceId:device.id}),parentId=require('jsonwebtoken').decode(parent.token).jti;
  const represented=await issueSession(employee,undefined,{actorAdminId:actor.id,parentSessionId:parentId,expiresAt:new Date(Date.now()+60000)});
  assert.equal((await request('/api/account',null,represented.token)).status,200);
  await prisma.trustedDevice.update({where:{id:device.id},data:{revokedAt:new Date()}});
  assert.equal((await request('/api/account',null,parent.token)).status,401);assert.equal((await request('/api/account',null,represented.token)).status,401);checks.push('Revoking administrator trusted device invalidates both real parent and representation sessions');
  const page='/private-v133-'+run;assert.equal((await request('/api/analytics/page',{page,visitor:crypto.randomUUID()})).status,204);await flushAnalytics();assert.equal(await prisma.analyticsMetric.count({where:{page}}),0);checks.push('Arbitrary analytics paths are discarded server-side');
  console.log(JSON.stringify({passed:checks.length,failed:0,checks},null,2));
 }finally{await new Promise(r=>server.close(r));await prisma.$disconnect();}
})().catch(e=>{console.error(e);process.exit(1)});
