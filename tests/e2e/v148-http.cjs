require('./v148-env.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),bcrypt=require('bcryptjs');
const {prisma}=require('../../apps/api/src/db.ts'),{app}=require('../../apps/api/src/server.ts'),{issueSession}=require('../../apps/api/src/auth-sessions.ts'),{layout7108}=require('../../apps/api/src/optical-core.ts'),{studentKey,portalCode,portalHash}=require('../../apps/api/src/student-portal.ts'),{studentNumberKey}=require('../../apps/api/src/result-identity.ts');
const out='test-results/v148';fs.mkdirSync(out,{recursive:true});let server;const checks=[],pass=name=>{checks.push(name);console.log('PASS',name);};
(async()=>{
 const run=crypto.randomBytes(5).toString('hex'),password='Local-synthetic-account-123!';
 const user=async(role,label,extra={})=>prisma.user.create({data:{email:`qa-${label}-${run}@example.test`.toLowerCase(),firstName:'Sentetik',lastName:label,role,passwordHash:await bcrypt.hash(password,4),...extra}});
 const admin=await user('SUPER_ADMIN','admin',{twoFactorEnabled:true}),adminToken=(await issueSession(admin,undefined,{mfaVerifiedAt:new Date()})).token;
 const school=await prisma.school.create({data:{name:'Öğrenci Test Kurumu '+run,city:'İstanbul',district:'Kadıköy',duplicateKey:'student-evaluation-'+run}}),other=await prisma.school.create({data:{name:'Diğer Kurum '+run,city:'İstanbul',district:'Üsküdar',duplicateKey:'student-evaluation-other-'+run}});
 const publisher=await prisma.publisher.create({data:{name:'Yerel Test '+run,normalizedName:'yereltest'+run}}),questions=JSON.parse(fs.readFileSync('tests/fixtures/7108-v128/ankara-key.json')).map(q=>({...q,answer:'A',weight:1,outcomeCode:'TEST.1',outcomeName:'Örnek kazanım'}));
 const publication=await prisma.publishedAnswerKey.create({data:{publisherId:publisher.id,grade:8,examName:'Örnek Deneme '+run,createdByUserId:admin.id,published:true,showInEvaluation:true,opticalKey:{create:{name:'Örnek Anahtar '+run,questions,penalty:3}}},include:{opticalKey:true}}),keyId=publication.opticalKey.id;
 await prisma.answerKeyFile.create({data:{answerKeyId:publication.id,category:'ANSWER_KEY',originalFileName:'synthetic.json',storedFileName:run+'.json',mimeType:'application/json',size:10,storagePath:'/tmp/unused-synthetic-'+run+'.json'}});
 function line(no,answer='A'){
  const row=Array(layout7108.lineLength).fill(' '),put=(f,value)=>{if(f)for(const [i,c]of String(value).padEnd(f.length).slice(0,f.length).split('').entries())row[f.start-1+i]=c;};
  for(const literal of layout7108.literals??[])put({start:literal.start,length:literal.text.length},literal.text);
  for(const [name,f]of Object.entries(layout7108.fields))put(f,{id:String(no).padStart(f.length,'0'),name:'SENTETIK',surname:'OGRENCI'+no,grade:'8',branch:'A',booklet:'A',schoolCode:'000001'}[name]??'');
  for(const lesson of layout7108.lessons)put(lesson,answer.repeat(lesson.length));return row.join('');
 }
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 async function req(path,token=adminToken,body,expected=200,method=body?'POST':'GET'){
  const r=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});
  const type=r.headers.get('content-type')??'',data=type.includes('json')?await r.json():Buffer.from(await r.arrayBuffer());assert.equal(r.status,expected,path+': '+JSON.stringify(data).slice(0,800));return data;
 }
 async function input(rows,schoolId=school.id){const f=new FormData();f.set('files',new Blob([rows.join('\r\n')]),'sentetik.txt');const files=await req('/api/optical/txt-files',adminToken,f,201);return {fileIds:files.map(f=>f.id),schoolId,keyId,templateId:'system-fmt-7108',encoding:'auto',mergeSessions:'true'};}
 async function evaluate(data,status=201){const preview=await req('/api/optical/preview',adminToken,data);assert.deepEqual(preview.checks.blockers,[]);return req('/api/optical/evaluate',adminToken,{...data,previewToken:preview.previewToken,confirmWarnings:'true'},status);}
 const initial=await evaluate(await input([line(555),line(345),line(234)]));assert.deepEqual(initial.changes,{added:3,updated:0,unchanged:0});
 const foreign=await evaluate(await input([line(555,'A')],other.id));
 const added=await evaluate(await input([line(777)]));assert.deepEqual(added.changes,{added:1,updated:0,unchanged:3});
 const mixedInput=await input([line(555,'B'),line(678)]),mixed=await evaluate(mixedInput);assert.deepEqual(mixed.changes,{added:1,updated:1,unchanged:3});
 assert.deepEqual(mixed.data.students.map(s=>studentNumberKey(s.studentNo??s.id)).sort(),['234','345','555','678','777']);
 const old555=initial.data.students.find(s=>studentNumberKey(s.studentNo??s.id)==='555'),new555=mixed.data.students.find(s=>studentNumberKey(s.studentNo??s.id)==='555');assert(new555.answers.every(a=>a==='B'));assert(mixed.summary.find(s=>s.id===new555.id).net<initial.summary.find(s=>s.id===old555.id).net);
 for(const no of ['345','234'])assert.deepEqual(mixed.data.students.find(s=>studentNumberKey(s.studentNo??s.id)===no).answers,initial.data.students.find(s=>studentNumberKey(s.studentNo??s.id)===no).answers);
 const repeated=await evaluate(mixedInput,200);assert.equal(repeated.id,mixed.id);assert.equal(repeated.reused,true);assert.deepEqual(repeated.changes,{added:0,updated:0,unchanged:5});assert.equal(await prisma.opticalResult.count({where:{schoolId:school.id}}),3);
 const reuploaded=await evaluate(await input([line(555,'B'),line(678)]),200);assert.equal(reuploaded.id,mixed.id);
 const foreignRow=await prisma.opticalResult.findUniqueOrThrow({where:{id:foreign.id}});assert(foreignRow.snapshot.data.students[0].answers.every(a=>a==='A'));
 const current=await req('/api/optical/result-exams/'+keyId+'?schoolId='+school.id);assert.equal(current.data.students.length,5);assert.equal(current.summary.find(s=>current.data.students.find(st=>studentNumberKey(st.studentNo??st.id)==='555').id===s.id).net,mixed.summary.find(s=>s.id===new555.id).net);assert.equal(Object.keys(current.rankings).length,5);const ranked555=current.data.students.find(s=>studentNumberKey(s.studentNo??s.id)==='555');assert.equal(current.rankings[ranked555.id].schoolRank,5);assert.equal(current.rankings[ranked555.id].schoolCount,5);
 pass('555 latest answer; 678 added; 345/234 retained; new-only import; repeated/reuploaded TXT reuses revision; other institution isolated; scores/ranks recalculated');
 // Fail the archive update after the result INSERT; all prior transaction writes must roll back.
 const rollbackInput=await input([line(555,'D'),line(888)]),preview=await req('/api/optical/preview',adminToken,rollbackInput);
 await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION qa_student_evaluation_failure() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'synthetic local rollback' USING ERRCODE='23503'; END; $$ LANGUAGE plpgsql`);
 await prisma.$executeRawUnsafe('CREATE TRIGGER qa_student_evaluation_failure BEFORE UPDATE ON "OpticalTxtFile" FOR EACH ROW EXECUTE FUNCTION qa_student_evaluation_failure()');
 const logged=[],originalError=console.error;console.error=(...args)=>{logged.push(args);originalError(...args);};
 try{const failed=await req('/api/optical/evaluate',adminToken,{...rollbackInput,previewToken:preview.previewToken,confirmWarnings:'true'},500);assert(failed.requestId);const log=logged.find(row=>row[0]==='API failure reference');assert.equal(log[1].requestId,failed.requestId);assert.equal(log[1].operationStep,'archive');assert.match(log[1].prismaCode,/^P\d{4}$/);assert.doesNotMatch(JSON.stringify(log),/synthetic local rollback|SENTETIK|postgresql|555|888/);}
 finally{console.error=originalError;await prisma.$executeRawUnsafe('DROP TRIGGER qa_student_evaluation_failure ON "OpticalTxtFile"');await prisma.$executeRawUnsafe('DROP FUNCTION qa_student_evaluation_failure()');}
 assert.equal(await prisma.opticalResult.count({where:{schoolId:school.id}}),3);assert.equal((await prisma.opticalTxtFile.findUniqueOrThrow({where:{id:rollbackInput.fileIds[0]}})).resultId,null);
 assert.equal((await prisma.opticalResult.findUniqueOrThrow({where:{id:mixed.id}})).snapshot.data.students.length,5);
 pass('Real PostgreSQL failure rolls back result/archive; correlated diagnostic exposes safe Prisma code + operation only');
 // Publication is explicit, including after answer changes.
 await prisma.opticalResult.update({where:{id:mixed.id},data:{studentPublished:true}});
 const snapshot=(await prisma.opticalResult.findUniqueOrThrow({where:{id:mixed.id}})).snapshot;
 const a=await user('STUDENT','A',{schoolId:school.id}),b=await user('STUDENT','B',{schoolId:school.id}),parent=await user('PARENT','Veli',{schoolId:school.id});
 const studentA=snapshot.data.students.find(s=>studentNumberKey(s.studentNo??s.id)==='555'),studentB=snapshot.data.students.find(s=>studentNumberKey(s.studentNo??s.id)==='678');
 for(const [account,student]of [[a,studentA],[b,studentB],[parent,studentA]])await prisma.studentResultAccess.create({data:{userId:account.id,resultId:mixed.id,studentNo:student.id,studentName:student.name}});
 const codes=[],portalTokens=[];
 for(const student of [studentA,studentB]){const code=portalCode();codes.push(code);await prisma.studentPortal.create({data:{schoolId:school.id,academicYear:'2026-2027',studentNo:student.studentNo??student.id,codeHash:portalHash(code),grants:{create:{resultId:mixed.id,studentId:student.id,identityKey:studentKey(student)}}}});const login=await req('/api/student-portal/login','',{code});portalTokens.push(login.token);}
 // A registered institution with no issued student codes must still appear.
 const schools=await req('/api/student-portal/schools?city='+encodeURIComponent('İstanbul')+'&district='+encodeURIComponent('Üsküdar'),'');assert(schools.some(s=>s.id===other.id));
 // Explicit sharing consent; no personal session from a number or legacy exam code.
 const numberInput={city:'İstanbul',district:'Kadıköy',schoolId:school.id,studentNo:'555'};
 await req('/api/student-portal/lookup-number','',numberInput,403);
 await req(`/api/student-portal-admin/schools/${school.id}/sharing`,adminToken,{publicNumberLookup:true},200,'PATCH');
 const lookup=await req('/api/student-portal/lookup-number','',numberInput);assert.equal(lookup.results.length,1);assert.equal(lookup.results[0].schoolName,school.name);assert.equal(studentNumberKey(lookup.results[0].student.studentNo),'555');assert(!lookup.token);assert.doesNotMatch(JSON.stringify(lookup),/identityEncrypted|identityHash|answers|codeHash/);
 await req('/api/student-portal/lookup-number','',{...numberInput,schoolId:other.id},400);
 await req(`/api/student-portal-admin/schools/${other.id}/sharing`,adminToken,{publicNumberLookup:true},200,'PATCH');
 const otherInput={...numberInput,district:'Üsküdar',schoolId:other.id};await req('/api/student-portal/lookup-number','',otherInput,404);
 await prisma.opticalResult.update({where:{id:foreign.id},data:{studentPublished:true}});
 const otherLookup=await req('/api/student-portal/lookup-number','',otherInput);assert.equal(otherLookup.results.length,1);assert.equal(otherLookup.results[0].schoolName,other.name);assert.notEqual(otherLookup.results[0].summary.net,lookup.results[0].summary.net);
 await req('/api/student-portal/lookup-number','',{...numberInput,studentNo:'no-such-number'},404);
 const legacyCodes=await req(`/api/optical/result-exams/${keyId}/access-codes?schoolId=${school.id}`),legacyCode=legacyCodes.find(v=>studentNumberKey(v.studentNo)==='555').accessCode;
 assert.equal(legacyCode.length,16);const legacy=await req('/api/public-results/resolve','',{accessCode:legacyCode});assert.equal(legacy.results.length,1);assert.equal(studentNumberKey(legacy.results[0].student.studentNo),'555');assert(!legacy.token);
 await req('/api/student-portal/login','',{code:legacyCode},400);
 await req('/api/public-results/lookup','',{schoolId:other.id,grade:'8',identifier:'555',accessCode:legacyCode},404);
 await req('/api/public-results/resolve','',{accessCode:'!'.repeat(16)},400);
 await req('/api/public-results/resolve','',{accessCode:'x'.repeat(16)},404);
 await prisma.publicResultCode.delete({where:{codeHash:require('../../apps/api/src/public-result-codes.ts').publicCodeHash(legacyCode)}});await req('/api/public-results/resolve','',{accessCode:legacyCode},404);await req(`/api/optical/result-exams/${keyId}/access-codes?schoolId=${school.id}`);
 await req('/api/student-portal/reports','',undefined,401);
 await req('/api/student-portal/assistant','',{message:'Son karnemi göster'},401);
 await prisma.opticalResult.update({where:{id:mixed.id},data:{studentPublished:false}});
 await req('/api/public-results/resolve','',{accessCode:legacyCode},404);await req('/api/student-portal/lookup-number','',numberInput,404);
 await prisma.opticalResult.update({where:{id:mixed.id},data:{studentPublished:true}});
 pass('Number lookup: default closed, explicit school consent, two institutions/same number, publication gates, safe summary, no session; 16-character code stays exam scoped');
 // Real management issue/renew/export/revoke and school/role boundaries.
 const managerRows=await req('/api/student-portal-admin/results?schoolId='+school.id);assert(managerRows.some(r=>r.students.some(s=>s.id===studentB.id)));
 const manageInput={schoolId:school.id,academicYear:'2026-2027',studentNo:studentB.studentNo??studentB.id,grants:[{resultId:mixed.id,studentId:studentB.id}],confirm:true};
 await req('/api/student-portal-admin/students',adminToken,{...manageInput,confirm:false},400);
 await req('/api/student-portal-admin/students',adminToken,{...manageInput,grants:[{resultId:foreign.id,studentId:studentB.id}]},400);
 const issued=await req('/api/student-portal-admin/students',adminToken,manageInput,201);assert.equal(issued.code.length,24);
 const issuedLogin=await req('/api/student-portal/login','',{code:'  '+issued.code+'  '});assert.equal((await req('/api/student-portal/reports',issuedLogin.token)).length,1);
 const renewed=await req('/api/student-portal-admin/students',adminToken,manageInput,201);await req('/api/student-portal/login','',{code:issued.code},404);await req('/api/student-portal/reports',issuedLogin.token,undefined,401);
 const schoolAdmin=await user('SCHOOL_ADMIN','school-admin',{schoolId:school.id}),schoolToken=(await issueSession(schoolAdmin)).token;
 const scopedSchools=await req('/api/student-portal-admin/schools',schoolToken);assert(scopedSchools.every(s=>s.id===school.id));assert.equal((await req('/api/student-portal-admin/results?schoolId='+other.id,schoolToken)).length,0);
 await req(`/api/student-portal-admin/schools/${other.id}/sharing`,schoolToken,{publicNumberLookup:true},404,'PATCH');
 await req('/api/student-portal-admin/export',schoolToken,{schoolId:other.id,academicYear:'2026-2027',confirmRotate:true,format:'xlsx'},404);
 await req('/api/student-portal-admin/export',adminToken,{schoolId:school.id,academicYear:'2026-2027',confirmRotate:false,format:'pdf'},400);
 const xlsx=await req('/api/student-portal-admin/export',adminToken,{schoolId:school.id,academicYear:'2026-2027',confirmRotate:true,format:'xlsx'}),book=require('xlsx').read(xlsx),exportRows=require('xlsx').utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1});assert.equal(exportRows.length,3);fs.writeFileSync(out+'/codes.xlsx',xlsx);
 const exportCode=exportRows.find(r=>r[0]===manageInput.studentNo)[2];const exportLogin=await req('/api/student-portal/login','',{code:exportCode});assert.equal((await req('/api/student-portal/reports',exportLogin.token)).length,1);
 await req('/api/student-portal/login','',{code:renewed.code},404);
 const codesPdf=await req('/api/student-portal-admin/export',adminToken,{schoolId:school.id,academicYear:'2026-2027',confirmRotate:true,format:'pdf'});assert.equal(codesPdf.subarray(0,4).toString(),'%PDF');fs.writeFileSync(out+'/codes.pdf',codesPdf);await req('/api/student-portal/reports',exportLogin.token,undefined,401);
 const portalForB=await prisma.studentPortal.findUniqueOrThrow({where:{schoolId_academicYear_studentNo:{schoolId:school.id,academicYear:'2026-2027',studentNo:manageInput.studentNo}}});
 await req('/api/student-portal-admin/students/'+portalForB.id,adminToken,{confirm:true},200,'DELETE');
 // Restore a usable synthetic B code for remaining regression and browser checks.
 const browserIssued=await req('/api/student-portal-admin/students',adminToken,manageInput,201);codes[1]=browserIssued.code;portalTokens[1]=(await req('/api/student-portal/login','',{code:codes[1]})).token;
 // Restore A after rotation too.
 const aPortal=await prisma.studentPortal.findUniqueOrThrow({where:{schoolId_academicYear_studentNo:{schoolId:school.id,academicYear:'2026-2027',studentNo:studentA.studentNo??studentA.id}}});codes[0]=portalCode();await prisma.studentPortal.update({where:{id:aPortal.id},data:{codeHash:portalHash(codes[0])}});portalTokens[0]=(await req('/api/student-portal/login','',{code:codes[0]})).token;
 const forbiddenStudentToken=(await issueSession(a)).token;await req('/api/student-portal-admin/schools',forbiddenStudentToken,undefined,403);
 pass('Management real HTTP/DB: issue/renew/revoke, confirmation, 24-character login, XLSX/PDF rotation and session invalidation, wrong institution and student-role denial');
 await req('/api/student-portal/login','',{code:'x'.repeat(24)},404);
 const reportA=await req('/api/student-portal/reports',portalTokens[0]),reportB=await req('/api/student-portal/reports',portalTokens[1]);assert.equal(reportA.length,1);assert.equal(reportB.length,1);assert.equal(reportA[0].report.data.students.length,1);assert.equal(reportB[0].report.data.students.length,1);assert.notEqual(reportA[0].report.data.students[0].id,reportB[0].report.data.students[0].id);
 await req('/api/student-portal/pdf',portalTokens[0],{grantId:reportB[0].grantId},404);
 const pdf=await req('/api/student-portal/pdf',portalTokens[0],{grantId:reportA[0].grantId,templateId:'detailed-card'});assert.equal(pdf.subarray(0,4).toString(),'%PDF');fs.writeFileSync(out+'/portal-report.pdf',pdf);
 for(const message of ['Son sınavdan kaç aldım?','Hangi kazanımlarda zorlanıyorum?','Son iki sınavı karşılaştır','Son karnemi göster']){const reply=await req('/api/student-portal/assistant',portalTokens[0],{message});assert(reply.text);assert(!JSON.stringify(reply).includes(studentB.name));if(message==='Son karnemi göster')assert(reply.actions.some(a=>a.kind==='report'));}
 pass('Code-only login resolves scope; institution directory without portals; number lookup requires school consent; two student JSON/PDF/assistant isolation');
 const accountTokens=[];
 for(const account of [a,b,parent]){const login=await req('/api/auth/login','',{email:account.email,password,role:account.role});accountTokens.push(login.token);const list=await req('/api/my-results',login.token);assert.equal(list.length,1);const own=await req('/api/my-results/'+list[0].id,login.token);assert.equal(own.data.students.length,1);assert.equal(own.data.students[0].name,account.id===b.id?studentB.name:studentA.name);}
 const bGrants=await req('/api/my-results',accountTokens[1]);await req('/api/my-results/'+bGrants[0].id,accountTokens[0],undefined,404);
 pass('Student A, student B and parent email/password logins; own results; cross-account access denied');
 const portalA=await prisma.studentPortal.findUniqueOrThrow({where:{codeHash:portalHash(codes[0])}});await prisma.studentPortal.update({where:{id:portalA.id},data:{version:{increment:1},codeHash:portalHash(portalCode())}});await req('/api/student-portal/reports',portalTokens[0],undefined,401);await req('/api/student-portal/login','',{code:codes[0]},404);
 const empty=await user('STUDENT','Bos',{schoolId:school.id}),emptyToken=(await issueSession(empty)).token,reply=await req('/api/student-assistant',emptyToken,{message:'Son sınavdan kaç aldım?'});assert.match(reply.text,/yayımlanmış|sonuç|veri/);assert.equal((await req('/api/my-results',emptyToken)).length,0);
 pass('Rotated code/session rejected; unpublished/empty student has an appropriate assistant/results empty state');
 fs.writeFileSync(out+'/ui-seed.json',JSON.stringify({adminToken,schoolId:school.id,otherSchoolId:other.id,keyId,examName:publication.examName,code:codes[1],legacyCode,studentNo:studentB.studentNo??studentB.id,studentName:studentB.name,a:{email:a.email,password},b:{email:b.email,password},parent:{email:parent.email,password},emptyToken}));
 fs.writeFileSync(out+'/http.json',JSON.stringify({checks,database:'disposable localhost PostgreSQL; no production access'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await prisma.$disconnect();});
