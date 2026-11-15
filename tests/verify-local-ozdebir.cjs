// Opt-in local verification. Raw sources stay outside Git; never connects to a DB.
// node --import tsx tests/verify-local-ozdebir.cjs <TXT> <XLSX> <FMT-or-BLDM>
const fs=require('node:fs'),assert=require('node:assert/strict');
process.env.NODE_ENV='test';process.env.DATABASE_URL='postgresql://test:test@127.0.0.1:1/isolated';process.env.JWT_SECRET='local-verification-only-never-deploy-this-secret';process.env.RECAPTCHA_ENABLED='false';process.env.TURNSTILE_ENABLED='false';
(async()=>{
 const [txt,xlsx,fmt]=process.argv.slice(2);if(!txt||!xlsx||!fmt)throw Error('TXT, XLSX ve FMT/BLDM yerel dosya yollarını verin.');
 const {decodeOptical,parseOptical,opticalSummary}=require('../apps/api/src/optical-core');
 const {inspectOutcomeFile}=require('../apps/api/src/outcome-file'),{analyzeFmt}=require('../apps/api/src/fmt-analyze'),{newExamProfile}=require('../apps/api/src/scoring-profile');
 const source=fs.readFileSync(txt),text=decodeOptical(source),template={id:'local-template',name:'Özdebir',active:true,layout:analyzeFmt(decodeOptical(fs.readFileSync(fmt))).layout};
 const imported=await inspectOutcomeFile(xlsx,'key.xlsx','auto',false);assert.equal(imported.issues.length,0);const questions=newExamProfile(imported.questions,'Özdebir',8);
 const school={id:'local-school',name:'Anonim Kurum'},key={id:'local-key',questions,penalty:3,publication:{examName:'O8126',grade:8}};
 const {prisma}=require('../apps/api/src/db'),{opticalRouter}=require('../apps/api/src/optical-routes');
 prisma.opticalTemplate.findFirst=async()=>template;prisma.school.findFirst=async()=>school;prisma.opticalKey.findFirst=async()=>key;prisma.opticalResult.findFirst=async()=>null;prisma.opticalResult.findMany=async()=>[];
 let writes=0;prisma.opticalResult.create=async({data})=>{writes++;return{id:'local-result',revision:1,seriesId:'local-series',...data};};prisma.$transaction=async fn=>fn(prisma);
 const body={schoolId:school.id,keyId:key.id,templateId:template.id};
 async function invoke(endpoint){let status=200,value;const handler=opticalRouter.stack.find(l=>l.route?.path==='/'+endpoint).route.stack.at(-1).handle;await handler({user:{id:'local-user',role:'DEALER',dealerId:'local-dealer'},body,file:{originalname:'local-source.txt',buffer:source}},{status(n){status=n;return this;},json(v){value=v;}},e=>{if(e)throw e;});assert.ok([200,201].includes(status),`API status ${status}`);return value;}
 const preview=await invoke('preview');assert.equal(writes,0);body.previewToken=preview.previewToken;body.confirmWarnings='true';const result=await invoke('evaluate');assert.equal(writes,1);assert.deepEqual(preview.summary,result.summary);
 const direct=parseOptical(text,template.layout,questions,'Anonim Kurum',{allowMismatch:true});assert.deepEqual(opticalSummary(direct,3).map(r=>r.score),result.summary.map(r=>r.score));
 const report={records:result.data.lineCount,students:result.data.students.length,mergedPairs:result.data.students.filter(s=>s.sessions?.verbal&&s.sessions?.numeric).length,missingVerbal:result.data.diagnostics.missingVerbal,missingNumeric:result.data.diagnostics.missingNumeric,rejectedLines:result.data.diagnostics.rejectedLines.length,duplicateRecords:result.data.diagnostics.duplicateRecords,previewStatus:'passed',evaluateStatus:'passed',persistence:'isolated in-memory Prisma methods; no DB connection',booklets:result.data.students.map(s=>s.recordBooklets),results:result.summary.map((r,i)=>({ordinal:i+1,score:r.score,net:r.net,lessons:r.lessons.map(l=>({lesson:l.lesson,correct:l.correct,wrong:l.wrong,blank:l.blank,net:l.net}))}))};
 console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
