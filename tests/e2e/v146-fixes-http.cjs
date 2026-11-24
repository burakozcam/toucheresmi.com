// Uses the disposable localhost DB guarded by v146-env; never load production DB.
require('./v146-env.cjs');
const A=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {mock}=require('node:test');
const {prisma}=require('../../apps/api/src/db.ts'),{app}=require('../../apps/api/src/server.ts'),{issueSession}=require('../../apps/api/src/auth-sessions.ts');
const out='test-results/v146-fixes';fs.mkdirSync(out,{recursive:true});const checks=[];let server;
const pass=name=>{checks.push(name);console.log('PASS',name);},status=(r,n=200)=>A.equal(r.status,n,JSON.stringify(r.data).slice(0,800));
(async()=>{
 const run=crypto.randomBytes(4).toString('hex');
 const dealer=await prisma.dealer.create({data:{name:'Sentetik Yetkili Bayi '+run}}),other=await prisma.dealer.create({data:{name:'Başka Bayi '+run}});
 const school=await prisma.school.create({data:{name:'Sentetik Kurum '+run,dealerId:dealer.id,city:'Ankara',district:'Çankaya',duplicateKey:'fix-a-'+run}}),foreign=await prisma.school.create({data:{name:'Yabancı Kurum '+run,dealerId:other.id,duplicateKey:'fix-b-'+run}});
 const admin=await prisma.user.create({data:{email:`fix-admin-${run}@example.test`,firstName:'Sentetik',lastName:'Yönetici',passwordHash:'synthetic-only',role:'SUPER_ADMIN',twoFactorEnabled:true}});
 const regular=await prisma.user.create({data:{email:`fix-dealer-${run}@example.test`,firstName:'Normal',lastName:'Bayi',passwordHash:'synthetic-only',role:'DEALER',dealerId:dealer.id}});
 const adminToken=(await issueSession(admin,undefined,{mfaVerifiedAt:new Date()})).token,regularToken=(await issueSession(regular)).token;
 const publisher=await prisma.publisher.create({data:{name:'Sentetik Yayın '+run,normalizedName:'fix-'+run}});
 const questions=Array.from({length:5},(_,i)=>({lesson:'MATEMATİK',number:i+1,answer:'A',positions:{A:i+1},weight:1,optionCount:4}));
 const template=await prisma.opticalTemplate.create({data:{name:'Sentetik FMT '+run,active:true,grade:8,layout:{lineLength:30,fields:{id:{start:1,length:2},name:{start:3,length:12},booklet:{start:15,length:1},grade:{start:21,length:1},branch:{start:22,length:1}},lessons:[{name:'MATEMATİK',start:16,length:5}]},originalFmt:'synthetic-only'}});
 const key=await prisma.opticalKey.create({data:{name:'Sentetik Sınav '+run,questions,penalty:3}});
 const PDFDocument=require('pdfkit');const pdf=await new Promise(resolve=>{const d=new PDFDocument(),chunks=[];d.on('data',c=>chunks.push(c));d.on('end',()=>resolve(Buffer.concat(chunks)));d.text('Synthetic answer key: AAAAA');d.end();});
 fs.mkdirSync(process.env.STORAGE_DIR,{recursive:true});const answerPath=process.env.STORAGE_DIR+'/fix-answer-'+run+'.pdf';fs.writeFileSync(answerPath,pdf);
 await prisma.publishedAnswerKey.create({data:{publisherId:publisher.id,examName:key.name,grade:8,published:true,showInEvaluation:true,createdByUserId:admin.id,opticalKey:{connect:{id:key.id}},files:{create:{category:'ANSWER_KEY',originalFileName:'sentetik.pdf',storedFileName:'fix-answer-'+run+'.pdf',mimeType:'application/pdf',size:pdf.length,storagePath:answerPath}}}});
 const txt=['01'+ 'ÇAĞRI ŞİMŞEK'.padEnd(12)+'A'+'AAAAA'+'8A'+' '.repeat(8),'02'+'ÖZGÜR GÜÇLÜ'.padEnd(12)+'A'+'AAAAB'+'8A'+' '.repeat(8)].join('\r\n');
 fs.writeFileSync(out+'/synthetic.txt',txt);
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 async function req(path,token=adminToken,body,method=body?'POST':'GET'){
  const r=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});
  return {status:r.status,data:r.headers.get('content-type')?.includes('json')?await r.json():Buffer.from(await r.arrayBuffer())};
 }
 const create=async(scopes=['DEALER_EXAMS'],extra={dealerId:dealer.id})=>req('/api/admin/temporary-access',adminToken,{note:'Sentetik Geçici '+run,unit:'hour',value:2,scopes,...extra});
 status(await create(['DEALER_EXAMS'],{}),400);status(await create(['PDF_TOOLS']),400);status(await create(['DEALER_EXAMS'],{dealerId:'missing'}),400);
 status(await req('/api/admin/temporary-access/dealers',regularToken),403);
 const created=await create();status(created,201);const grant=created.data;
 const login=await req('/api/temporary/login','',{code:grant.code});status(login);const token=login.data.token;
 let account=await req('/api/account',token);status(account);A.equal(account.data.role,'TEMPORARY');A.equal(account.data.dealerId,dealer.id);A.notEqual(account.data.id,regular.id);
 A.equal((await prisma.user.findUnique({where:{id:account.data.id}})).role,'TEMPORARY');
 pass('Explicit active dealer required; separate TEMPORARY identity/session preserved');
 const keySecret=new URL(grant.link).hash.slice(5);
 const previewGet=await req('/api/temporary/login','',undefined,'GET');status(previewGet,401);
 A.equal((await prisma.temporaryAccess.findUnique({where:{id:grant.id}})).linkUsedAt,null);
 const linkLogin=await req('/api/temporary/login','',{key:keySecret});status(linkLogin);status(await req('/api/temporary/login','',{key:keySecret}),409);
 status(await req('/api/optical/result-catalog',linkLogin.data.token));
 pass('One-use direct link still authenticates; preview GET cannot consume it and replay fails');
 const legacy=await create(['FMT_DEMO'],{});status(legacy,201);const legacyToken=(await req('/api/temporary/login','',{code:legacy.data.code})).data.token;
 status(await req('/api/optical/evaluate',legacyToken,{}),403);status(await req('/api/optical/result-catalog',legacyToken),403);
 const rotated=await req('/api/admin/temporary-access/'+legacy.data.id+'/rotate',adminToken,{});status(rotated);A.deepEqual(rotated.data.scopes,['FMT_DEMO']);A.equal(rotated.data.user.dealerId,null);
 for(const [path,body,method]of [['/api/admin/users'],['/api/admin/temporary-access'],['/api/optical/exam-templates'],['/api/account',{firstName:'yetkisiz'},'PATCH']])status(await req(path,token,body,method),403);
 pass('Legacy grants/rotation do not gain permissions; Super Admin and account mutations denied');
 const schools=await req('/api/schools?compact=true',token);status(schools);A.deepEqual(schools.data.map(s=>s.id),[school.id]);
 function form(){const f=new FormData();f.append('files',new Blob([txt],{type:'text/plain'}),'sentetik.txt');return f;}
 const archived=await req('/api/optical/txt-files',token,form());status(archived,201);const fileIds=archived.data.map(f=>f.id);
 const input={fileIds,schoolId:school.id,templateId:template.id,keyId:key.id,encoding:'utf-8',mergeSessions:'true'};
 status(await req('/api/optical/preview',token,{...input,schoolId:foreign.id}),403);
 await prisma.dealer.update({where:{id:dealer.id},data:{canEvaluate:false}});status(await req('/api/optical/preview',token,input),403);await prisma.dealer.update({where:{id:dealer.id},data:{canEvaluate:true,dailyStudentLimit:1}});
 await prisma.dealer.update({where:{id:dealer.id},data:{restrictedRegions:true}});status(await req('/api/optical/preview',token,input),403);await prisma.dealer.update({where:{id:dealer.id},data:{restrictedRegions:false}});
 let preview=await req('/api/optical/preview',token,input);status(preview);A.equal(preview.data.data.students.length,2);
 status(await req('/api/optical/evaluate',token,{...input,previewToken:preview.data.previewToken,confirmWarnings:'true'}),403);
 await prisma.dealer.update({where:{id:dealer.id},data:{dailyStudentLimit:20}});
 const evaluated=await req('/api/optical/evaluate',token,{...input,previewToken:preview.data.previewToken,confirmWarnings:'true'});status(evaluated,201);A.equal(evaluated.data.data.students.length,2);
 A.equal((await prisma.opticalResult.findUnique({where:{id:evaluated.data.id}})).createdById,account.data.id);
 A.equal((await prisma.dealerActivity.findFirst({where:{resultId:evaluated.data.id,action:'EVALUATE'}})).actorUserId,account.data.id);
 pass('Real TXT archive → preview → evaluation; dealer permission/quota/foreign school enforced, distinct audit actor');
 // Store actual results in the other dealer too: isolation must hold with data present.
 const foreignUpload=await req('/api/optical/txt-files',adminToken,form());status(foreignUpload,201);
 const foreignInput={...input,schoolId:foreign.id,fileIds:foreignUpload.data.map(f=>f.id)};
 const foreignPreview=await req('/api/optical/preview',adminToken,foreignInput);status(foreignPreview);
 const foreignResult=await req('/api/optical/evaluate',adminToken,{...foreignInput,previewToken:foreignPreview.data.previewToken,confirmWarnings:'true'});status(foreignResult,201);
 status(await req('/api/optical/results/'+foreignResult.data.id,token),404);
 const catalog=await req('/api/optical/result-catalog',token);status(catalog);A.deepEqual(catalog.data.schools.map(s=>s.id),[school.id]);A(catalog.data.exams.every(e=>e.schoolIds.every(id=>id===school.id)));
 const exportPath='/api/optical/result-exams/'+key.id+'/export?schoolId='+school.id;
 const view=await req('/api/optical/result-exams/'+key.id+'?schoolId='+school.id,token);status(view);A.equal(view.data.data.students.length,2);
 for(const format of ['pdf','xlsx','zip']){const response=await req(exportPath+'&format='+format,token);status(response);A.equal(response.data.subarray(0,format==='pdf'?4:2).toString(),format==='pdf'?'%PDF':'PK');fs.writeFileSync(out+'/temporary-cards.'+format,response.data);}
 await prisma.dealer.update({where:{id:dealer.id},data:{canExport:false}});status(await req(exportPath,token),403);await prisma.dealer.update({where:{id:dealer.id},data:{canExport:true}});
 for(const suffix of ['','/export','/report-logo','/access-codes']){const r=await req('/api/optical/result-exams/'+key.id+suffix+'?schoolId='+foreign.id,token);A([403,404].includes(r.status));}
 const foreignTxt=await req('/api/optical/txt-files',regularToken,form());status(foreignTxt,201);status(await req('/api/optical/preview',token,{...input,fileIds:foreignTxt.data.map(f=>f.id)}),404);
 status(await req(exportPath,regularToken));
 pass('Scoped results and real PDF/Excel/ZIP downloads; other institution/archive denied; regular dealer unchanged');
 status(await req('/api/admin/temporary-access/'+grant.id+'/revoke',adminToken,{}));
 for(const t of [token,linkLogin.data.token]){status(await req('/api/optical/evaluate',t,{...input,previewToken:preview.data.previewToken}),401);status(await req(exportPath,t),401);status(await req('/api/optical/txt-files',t,form()),401);}
 pass('Revoked already-open code/link sessions reject evaluation, upload and report requests');
 const exp=await create();status(exp,201);const expToken=(await req('/api/temporary/login','',{code:exp.data.code})).data.token;
 // Simulate a grant expiring before its JWT; authority must come from the DB too.
 await prisma.temporaryAccess.update({where:{id:exp.data.id},data:{expiresAt:new Date(Date.now()-1000)}});
 status(await req('/api/optical/evaluate',expToken,input),401);status(await req(exportPath,expToken),401);
 const timed=await req('/api/admin/temporary-access',adminToken,{note:'Saat sınırı',unit:'minute',value:5,scopes:['DEALER_EXAMS'],dealerId:dealer.id});status(timed,201);const timedToken=(await req('/api/temporary/login','',{code:timed.data.code})).data.token;
 const now=Date.now();mock.timers.enable({apis:['Date'],now});mock.timers.setTime(now+6*60_000);status(await req('/api/optical/evaluate',timedToken,input),401);status(await req(exportPath,timedToken),401);mock.timers.reset();
 pass('DB expiry and elapsed-time JWT expiry both reject evaluation and reports from open panels');
 const disabled=await create();status(disabled,201);const disabledToken=(await req('/api/temporary/login','',{code:disabled.data.code})).data.token;
 await prisma.dealer.update({where:{id:dealer.id},data:{active:false}});status(await req(exportPath,disabledToken),401);status(await req('/api/temporary/login','',{code:disabled.data.code}),401);await prisma.dealer.update({where:{id:dealer.id},data:{active:true}});
 pass('Deactivated dealer immediately closes both session access and new temporary login');
 const ui=await create();status(ui,201);
 fs.writeFileSync(out+'/ui-seed.json',JSON.stringify({adminToken,regularToken,dealerId:dealer.id,dealerName:dealer.name,schoolId:school.id,schoolName:school.name,foreignId:foreign.id,keyId:key.id,keyName:key.name,publisherName:publisher.name,templateId:template.id,templateName:template.name,grant:ui.data}),{mode:0o600});
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{mock.timers.reset();fs.writeFileSync(out+'/http-checks.json',JSON.stringify({checks},null,2));if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await prisma.$disconnect();});
