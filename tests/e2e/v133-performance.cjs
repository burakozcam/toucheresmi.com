// Synthetic in-memory ranking benchmark, not an HTTP load/capacity guarantee.
const assert=require('node:assert/strict'),{resultRankings}=require('../../apps/api/src/result-rankings.ts');
function fixture(count){const cohorts=Array.from({length:count/1000},(_,i)=>({schoolId:'s'+i,data:{students:Array.from({length:1000},(_,j)=>({id:String(j),branch:'8-A'}))},summary:Array.from({length:1000},(_,j)=>({id:String(j),score:j%17===0?null:100+(j*73+i)%400}))}));return{cohorts,locations:cohorts.map(c=>({id:c.schoolId,city:'İstanbul',district:'Kadıköy'}))};}
const rows=[];
for(const count of [10000,100000]){const {cohorts,locations}=fixture(count),start=performance.now(),actual=resultRankings(cohorts[0],cohorts,locations),ms=performance.now()-start;assert.equal(actual.generalCount,count);
 let referenceMs=null;if(count===10000){const members=cohorts.flatMap(c=>c.summary),before=performance.now();for(const person of cohorts[0].summary){const expected=person.score===null?null:1+members.filter(s=>s.score!==null&&s.score>person.score+1e-8).length;assert.equal(actual.rankings[person.id].generalRank,expected);}referenceMs=performance.now()-before;}
 rows.push({cohortStudents:count,ownStudents:1000,indexedMs:Math.round(ms*100)/100,referenceGeneralRankOnlyMs:referenceMs===null?null:Math.round(referenceMs*100)/100,rssMB:Math.round(process.memoryUsage().rss/1048576)});
}
console.log(JSON.stringify({node:process.version,scope:'Single-process synthetic ranking only; excludes database, optical parsing, HTTP and PDF',results:rows},null,2));
