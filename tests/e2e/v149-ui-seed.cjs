// Local synthetic fixture only. Secrets are written to a private /tmp file and never printed.
require('./v149-env.cjs');
const fs=require('node:fs'),crypto=require('node:crypto'),bcrypt=require('bcryptjs');
const {prisma}=require('../../apps/api/src/db.ts'),{issueSession}=require('../../apps/api/src/auth-sessions.ts'),{digitalSnapshot}=require('../../apps/api/src/digital-exam-core.ts'),{layout7108}=require('../../apps/api/src/optical-core.ts'),{portalCode,portalHash,studentKey}=require('../../apps/api/src/student-portal.ts'),{studentReportAccessCode}=require('../../apps/api/src/result-identity.ts'),{publicCodeHash}=require('../../apps/api/src/public-result-codes.ts');
(async()=>{
 const suffix=crypto.randomBytes(4).toString('hex'),studentNo='00123';
 const passwordHash=await bcrypt.hash(crypto.randomBytes(24).toString('base64url'),4);
 async function user(role,name,schoolId){return prisma.user.create({data:{email:`ui-${role.toLowerCase()}-${name}-${suffix}@example.test`,firstName:'Sentetik',lastName:name,role,schoolId,passwordHash}});}
 const openSchool=await prisma.school.create({data:{name:'UI Açık Kurum '+suffix,city:'İstanbul',district:'Kadıköy',duplicateKey:'ui-open-'+suffix,publicNumberLookup:true}}),closedSchool=await prisma.school.create({data:{name:'UI Kapalı Kurum '+suffix,city:'İstanbul',district:'Kadıköy',duplicateKey:'ui-closed-'+suffix,publicNumberLookup:false}});
 const manager=await user('SCHOOL_ADMIN','Yönetici',closedSchool.id),student=await user('STUDENT','Kapalı',closedSchool.id);
 await prisma.user.update({where:{id:student.id},data:{readerStudentNo:studentNo}});
 const enrollment=await prisma.studentEnrollment.create({data:{schoolId:closedSchool.id,userId:student.id,studentNo,grade:8,branch:'A'}});
 const questions=[['TÜRKÇE',20],['SOSYAL',10],['DİN',10],['İNGİLİZCE',10],['MATEMATİK',20],['FEN',20]].flatMap(([lesson,count])=>Array.from({length:count},(_,i)=>({lesson,number:i+1,answer:'ABCD'[i%4],weight:4,scoreBase:100,optionCount:4,positions:{A:i+1,B:count-i},outcomeCode:'UI.1',outcomeName:'Sentetik kabul kazanımı'})));
 const template=await prisma.opticalTemplate.upsert({where:{name:'UI v149 sentetik şablon'},create:{name:'UI v149 sentetik şablon',originalFmt:'',layout:layout7108,active:false},update:{}});
 const results=[];
 for(const [school,label,name] of [[openSchool,'Açık','UI Açık Yayımlanmış Deneme'],[closedSchool,'Kapalı','UI Kapalı Yayımlanmış Deneme']]){
  const key=await prisma.opticalKey.create({data:{name:name+' '+suffix,questions,penalty:3}}),snapshot=digitalSnapshot({questions,penalty:3,name,grade:8},{studentNo,grade:8,branch:'A',user:{firstName:'Sentetik',lastName:label},school:{name:school.name}},questions.map((q,i)=>i%5===0?'':q.answer),Object.fromEntries(questions.map(q=>[q.lesson,'A'])));
  const result=await prisma.opticalResult.create({data:{schoolId:school.id,keyId:key.id,templateId:template.id,createdById:manager.id,filename:'ui-synthetic',snapshot,studentPublished:true}});results.push({key,result,snapshot});
 }
 const closed=results[1],own=closed.snapshot.data.students[0];
 await prisma.studentResultAccess.create({data:{userId:student.id,resultId:closed.result.id,studentNo,studentName:own.name}});
 const personalCode=portalCode();await prisma.studentPortal.create({data:{schoolId:closedSchool.id,academicYear:'2026-2027',studentNo,codeHash:portalHash(personalCode),enrollmentId:enrollment.id,grants:{create:{resultId:closed.result.id,studentId:studentNo,identityKey:studentKey(own)}}}});
 const examCode=studentReportAccessCode(closedSchool.id,closed.key.id,own);await prisma.publicResultCode.create({data:{codeHash:publicCodeHash(examCode),schoolId:closedSchool.id,keyId:closed.key.id}});
 const exam=await prisma.digitalExam.create({data:{schoolId:closedSchool.id,keyId:closed.key.id,creatorId:manager.id,name:'UI Dijital Optik · 90 Soru',questions,penalty:3,grade:8,durationMinutes:40,allowTimed:true,allowUntimed:true,attempts:{create:{enrollmentId:enrollment.id}}}});
 const state={suffix,openSchool:{id:openSchool.id,name:openSchool.name},closedSchool:{id:closedSchool.id,name:closedSchool.name},studentNo,examCode,personalCode,examId:exam.id,managerToken:(await issueSession(manager)).token,studentToken:(await issueSession(student)).token};
 fs.writeFileSync('/tmp/ks-v149-browser-fixture.json',JSON.stringify(state),{mode:0o600});console.log('Synthetic UI fixture ready; credentials withheld.');
})().catch(()=>{console.error('Synthetic UI fixture failed; sensitive diagnostic suppressed.');process.exitCode=1;}).finally(()=>prisma.$disconnect());
