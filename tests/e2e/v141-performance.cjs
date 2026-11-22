// In-memory synthetic benchmark only. No HTTP, database or production credentials.
const fs=require('node:fs'),{performance}=require('node:perf_hooks'),assert=require('node:assert/strict');
const {opticalSummary}=require('../../apps/api/src/optical-core.ts'),{examQuality}=require('../../apps/api/src/exam-quality.ts'),{studentExam,studentInsights}=require('../../apps/api/src/student-insights.ts');
const metrics=[];
for(const count of [50,500,5000]){
 const questions=['TÜRKÇE','MATEMATİK','FEN','SOSYAL','DİN','İNGİLİZCE'].flatMap(lesson=>Array.from({length:15},(_,i)=>({lesson,number:i+1,answer:'ABCD'[i%4],weight:1,positions:{A:i+1},outcomeCode:lesson+'.'+i%5,outcomeName:'Sentetik kazanım '+i%5}))),data={questions,students:Array.from({length:count},(_,i)=>({id:'s'+i,name:'Sentetik '+i,school:'Test',branch:'8-A',booklets:{},sourceLines:[],answers:questions.map((q,j)=>(i+j)%5===0?'':(i+j)%4===0?'B':q.answer)})),warnings:[],lineCount:count};
 const snapshot={data,summary:[],penalty:3,keyName:'Sentetik',schoolName:'Test',templateName:'Sentetik'};
 let start=performance.now();snapshot.summary=opticalSummary(data,3);const scoreMs=performance.now()-start;
 start=performance.now();const quality=examQuality(snapshot);const analysisMs=performance.now()-start;assert.equal(quality.studentCount,count);assert.equal(quality.questions.length,90);
 start=performance.now();const own=studentInsights(Array.from({length:5},(_,i)=>studentExam(snapshot,'s0','g'+i,new Date(2026,10,i+1))));const studentFiveExamMs=performance.now()-start;assert.equal(own.exams.length,5);assert.doesNotMatch(JSON.stringify(own),/Sentetik 1"/);
 metrics.push({studentCount:count,questions:90,scoreMs,analysisMs,studentFiveExamMs,responseBytes:Buffer.byteLength(JSON.stringify(quality)),rssMB:process.memoryUsage().rss/1024/1024});
}
const report={node:process.version,scope:'Single-process synthetic calculations. Does not measure database transfer, production concurrency, Passenger/LVE or hosting capacity.',metrics};fs.mkdirSync('test-results/v141',{recursive:true});fs.writeFileSync('test-results/v141/performance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
