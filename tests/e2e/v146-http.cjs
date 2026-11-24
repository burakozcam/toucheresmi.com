require('./v146-env.cjs');
const A=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {mock}=require('node:test');
const {prisma}=require('../../apps/api/src/db.ts'),{app}=require('../../apps/api/src/server.ts'),{issueSession}=require('../../apps/api/src/auth-sessions.ts'),{hashPassword}=require('../../apps/api/src/passwords.ts');
const {accessHash,accessExpiry}=require('../../apps/api/src/temporary-core.ts');
const out='test-results/v146';fs.mkdirSync(out,{recursive:true});const checks=[];let server;
const pass=name=>{checks.push(name);console.log('PASS',name);fs.writeFileSync(out+'/http-checks.json',JSON.stringify({checks},null,2));};
const status=(r,n=200)=>A.equal(r.status,n,JSON.stringify(r.data).slice(0,200));
(async()=>{
 const run=crypto.randomBytes(5).toString('hex'),password='Sentetik!146 test parola cumlesi',passwordHash=await hashPassword(password);
 const dealer=await prisma.dealer.create({data:{name:'Sentetik 146 Bayisi '+run}}),school=await prisma.school.create({data:{name:'Sentetik 146 Kurumu '+run,duplicateKey:'v146-'+run,dealerId:dealer.id}});
 async function user(name,role,extra={}){return prisma.user.create({data:{email:`v146-${name.toLowerCase()}-${run}@example.test`,firstName:'Sentetik',lastName:name,passwordHash,role,...extra}});}
 const admin=await user('Admin','SUPER_ADMIN',{twoFactorEnabled:true}),a=await user('A','DEALER',{dealerId:dealer.id}),b=await user('B','SCHOOL_ADMIN',{schoolId:school.id});
 const adminToken=(await issueSession(admin,undefined,{mfaVerifiedAt:new Date()})).token,aToken=(await issueSession(a)).token,bToken=(await issueSession(b)).token;
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 async function req(path,token=adminToken,body,method=body?'POST':'GET') {const response=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});return{status:response.status,data:response.headers.get('content-type')?.includes('json')?await response.json():Buffer.from(await response.arrayBuffer())};}
 // Existing real password login for both account types.
 for(const u of [a,b]){const r=await req('/api/auth/login','',{email:u.email,password,role:u.role});status(r);status(await req('/api/account',r.data.token));}
 pass('Existing dealer and institution password sessions still work');
 const image=await require('sharp')({create:{width:60,height:40,channels:3,background:'#2465ae'}}).png().toBuffer();
 function form(bytes=image,name='proof.png',mime='image/png'){const f=new FormData();f.set('category','Teknik Sorun');f.set('subject','Sentetik Destek '+run);f.set('description','Yalnız sentetik destek açıklaması.');f.set('image',new Blob([bytes],{type:mime}),name);return f;}
 const created=await req('/api/support',aToken,form());status(created,201);const id=created.data.id;
 status(await req('/api/support/'+id,bToken),404);status(await req('/api/support/'+id+'/image',bToken),404);status(await req('/api/support/'+id+'/image',''),401);
 const own=await req('/api/support/'+id,aToken);status(own);A.equal(own.data.user.dealer.name,dealer.name);A.equal(own.data.technical.country,'Belirlenemedi');status(await req('/api/support/'+id+'/image',aToken));status(await req('/api/support/'+id+'/image',adminToken));
 pass('A owns support ticket/image; B and anonymous direct requests cannot read either; admin can');
 status(await req('/api/support',aToken,form(Buffer.alloc(5*1024*1024+1))),413);
 status(await req('/api/support',aToken,form(Buffer.from('<svg>bad</svg>'))),400);
 status(await req('/api/support',aToken,form(image,'proof.png','image/jpeg')),400);
 const two=form();two.append('image',new Blob([image],{type:'image/png'}),'second.png');status(await req('/api/support',aToken,two),400);
 pass('Support rejects over 5 MB, forged content/MIME and second image');
 status(await req('/api/support/'+id+'/reply',aToken,{body:'Yanıt',status:'RESOLVED'}),403);
 status(await req('/api/support/'+id+'/reply',adminToken,{body:'Yanıtınızı aldık.',status:'IN_PROGRESS'}));
 let notice=await req('/api/panel-notifications',aToken);A.equal(notice.data.notifications.filter(n=>n.section==='support-mine').length,1);
 let detail=await req('/api/support/'+id,aToken);A.equal(detail.data.status,'IN_PROGRESS');A.equal(detail.data.updates.length,2);
 status(await req('/api/support/'+id+'/read',aToken,{version:detail.data.version}));
 A.equal((await req('/api/panel-notifications',aToken)).data.notifications.filter(n=>n.section==='support-mine').length,0);
 // Old read acknowledgement must not swallow a concurrent new reply.
 status(await req('/api/support/'+id+'/reply',adminToken,{body:'Çözüldü.',status:'RESOLVED'}));
 status(await req('/api/support/'+id+'/read',aToken,{version:detail.data.version}));
 A.equal((await req('/api/panel-notifications',aToken)).data.notifications.filter(n=>n.section==='support-mine').length,1);
 const filtered=await req('/api/support?inbox=true&category=Teknik%20Sorun&status=RESOLVED');status(filtered);A(filtered.data.rows.some(t=>t.id===id));
 pass('Admin replies/state history, owner unread badges, monotonic read and inbox filters');
 // Three announcements, exactly one destination each.
 for(const [i,section] of ['announcements','announcements','calendar'].entries())await prisma.announcement.create({data:{title:`146 Bildirim ${i} ${run}`,summary:'Sentetik',content:'Sentetik duyuru',category:'GENERAL',startsAt:new Date(Date.now()-1000),createdById:admin.id,section,audience:'USER_IDS',targets:{create:{targetId:a.id}}}});
 notice=await req('/api/panel-notifications',aToken);const anns=notice.data.notifications.filter(n=>n.id.startsWith('announcement:'));A.equal(anns.length,3);A.equal(new Set(anns.map(n=>n.id)).size,3);A.equal(anns.filter(n=>n.section==='announcements').length,2);
 status(await req('/api/announcements/'+anns[0].id.split(':')[1]+'/read',aToken,{}));A.equal((await req('/api/panel-notifications',aToken)).data.notifications.filter(n=>n.id.startsWith('announcement:')).length,2);
 pass('Tools notifications are unique, section-specific, and update after reading');
 const grant=await req('/api/admin/temporary-access',adminToken,{note:'Sentetik Geçici '+run,unit:'minute',value:15,scopes:['FMT_DEMO']});status(grant,201);
 const g=grant.data;A.match(g.code,/^[A-HJ-NP-Z2-9]{12}$/);const key=new URL(g.link).hash.slice(5),stored=await prisma.temporaryAccess.findUniqueOrThrow({where:{id:g.id}});
 A.notEqual(stored.codeHash,g.code);A.equal(stored.codeHash,accessHash('code',g.code));A(!JSON.stringify(stored).includes(key));
 status(await req('/api/admin/temporary-access',aToken),403);
 A(!(await req('/api/admin/users')).data.some(u=>u.id===stored.userId));
 const codeLogin=await req('/api/temporary/login','',{code:g.code});status(codeLogin);const temp=codeLogin.data.token;
 const account=await req('/api/account',temp);status(account);A.equal(account.data.role,'TEMPORARY');A.deepEqual(account.data.temporary.scopes,['FMT_DEMO']);
 for(const [path,body,method] of [['/api/admin/users'],['/api/optical/templates'],['/api/optical/result-catalog'],['/api/support'],['/api/account',{firstName:'Hack'},'PATCH'],['/api/admin/temporary-access']])status(await req(path,temp,body,method),403);
 status(await req('/api/temporary/demo/fmt',temp));status(await req('/api/temporary/demo/fmt',aToken),403);
 const sample=(await req('/api/temporary/demo/fmt',temp)).data.sample;const parsedDemo=await req('/api/temporary/demo/fmt',temp,{text:sample});status(parsedDemo);A.equal(parsedDemo.data.coordinates.valid,true);A.equal(parsedDemo.data.issues.length,0);
 status(await req('/api/temporary/login','',{code:g.code}));
 pass('Hashed random reusable code, separate temporary list, verified role/scopes, deny-by-default direct APIs, isolated FMT parser');
 // Preview GET goes to the browser route, never to the exchange endpoint. API GET cannot consume.
 status(await req('/api/temporary/login','',undefined,'GET'),401);A.equal((await prisma.temporaryAccess.findUnique({where:{id:g.id}})).linkUsedAt,null);
 const simultaneous=await Promise.all([req('/api/temporary/login','',{key}),req('/api/temporary/login','',{key})]);A.deepEqual(simultaneous.map(r=>r.status).sort(),[200,409]);
 status(await req('/api/temporary/login','',{key}),409);
 pass('Preview GET does not consume; concurrent one-time POST yields exactly one session; replay fails');
 const rotated=await req('/api/admin/temporary-access/'+g.id+'/rotate',adminToken,{});status(rotated);A.equal(rotated.data.expiresAt,g.expiresAt);status(await req('/api/temporary/login','',{code:g.code}),401);
 status(await req('/api/admin/temporary-access/'+g.id+'/revoke',adminToken,{}));status(await req('/api/account',temp),401);status(await req('/api/account',simultaneous.find(r=>r.status===200).data.token),401);status(await req('/api/temporary/login','',{code:rotated.data.code}),401);status(await req('/api/temporary/login','',{key:new URL(rotated.data.link).hash.slice(5)}),401);
 pass('Explicit rotation preserves expiry; revocation invalidates code, link and already-open session');
 const expires=(await req('/api/admin/temporary-access',adminToken,{note:'Saat Testi',unit:'minute',value:5,scopes:['PDF_TOOLS']})).data;
 const expiresSession=await req('/api/temporary/login','',{code:expires.code});status(expiresSession);
 const realNow=Date.now();mock.timers.enable({apis:['Date'],now:realNow});mock.timers.setTime(realNow+6*60_000);
 status(await req('/api/account',expiresSession.data.token),401);status(await req('/api/temporary/login','',{code:expires.code}),401);status(await req('/api/temporary/login','',{key:new URL(expires.link).hash.slice(5)}),401);mock.timers.reset();
 A.equal(accessExpiry('month',1,new Date('2026-01-31T12:00:00Z')).toISOString(),'2026-02-28T12:00:00.000Z');
 pass('Mock clock expiry invalidates live session/code; calendar-month duration clamps month end');
 // Create a fresh UI access; no raw credential is stored in application database or audit.
 const uiGrant=(await req('/api/admin/temporary-access',adminToken,{note:'Tarayıcı Denemesi',unit:'hour',value:2,scopes:['FMT_DEMO','PDF_TOOLS']})).data;
 const audit=await prisma.auditLog.findMany({where:{targetId:g.id}});A(!JSON.stringify(audit).includes(g.code));A(!JSON.stringify(audit).includes(key));
 fs.writeFileSync(out+'/ui-seed.json',JSON.stringify({adminToken,aToken,bToken,adminId:admin.id,aId:a.id,supportId:id,grant:uiGrant}),{mode:0o600});
 let limited=false;for(let i=0;i<25;i++){const response=await req('/api/temporary/login','',{code:'AAAAAAAAAAAA'});if(response.status===429){limited=true;break;}}A(limited);
 pass('Login brute force limited on server; audit/DB contain no plaintext code or link key');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{mock.timers.reset();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await prisma.$disconnect();});
