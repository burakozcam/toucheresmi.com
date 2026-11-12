import { opticalSummary } from "./optical-core";
import type { Snapshot } from "./optical-review";
export function analyzeSnapshot(snapshot:Snapshot,branch?:string){
  const students=snapshot.data.students.filter(s=>!branch||s.branch===branch),data={...snapshot.data,students},summary=opticalSummary(data,snapshot.penalty),count=students.length;
  const questions=data.questions.map((q,i)=>{
    const distribution:Record<string,number>={A:0,B:0,C:0,D:0,E:0,"*":0,"Boş":0};let correct=0,wrong=0,blank=0;
    for(const s of students){const answer=s.answers[i]||"Boş";distribution[answer]=(distribution[answer]??0)+1;if(q.answer==="X")continue;if(q.answer==="H"||s.answers[i]===q.answer)correct++;else if(!s.answers[i])blank++;else wrong++;}
    return {lesson:q.lesson,number:q.number,answer:q.answer,outcomeCode:q.outcomeCode??"",outcomeName:q.outcomeName??"",correct,wrong,blank,success:count?correct/count*100:0,distribution,diagnostic:!/[HX]/.test(q.answer)};
  });
  const outcomes=new Map<string,{lesson:string;code:string;name:string;questionCount:number;correct:number;wrong:number;blank:number}>();
  for(const q of questions){if(!q.diagnostic)continue;const id=JSON.stringify([q.lesson,q.outcomeCode,q.outcomeName]),r=outcomes.get(id)??{lesson:q.lesson,code:q.outcomeCode,name:q.outcomeName||"Kazanım belirtilmemiş",questionCount:0,correct:0,wrong:0,blank:0};r.questionCount++;r.correct+=q.correct;r.wrong+=q.wrong;r.blank+=q.blank;outcomes.set(id,r);}
  const average=(rows:typeof summary,field:"score"|"net")=>rows.length&&rows.every(r=>r[field]!==null)?rows.reduce((n,r)=>n+(r[field]??0),0)/rows.length:null;
  const classes=[...new Set(students.map(s=>s.branch))].sort((a,b)=>a.localeCompare(b,"tr",{numeric:true})).map(name=>{const ids=new Set(students.filter(s=>s.branch===name).map(s=>s.id)),rows=summary.filter(s=>ids.has(s.id));return {name,studentCount:rows.length,meanNet:average(rows,"net"),meanScore:average(rows,"score")};});
  const lessons=[...new Set(data.questions.map(q=>q.lesson))].map(lesson=>{const values=summary.map(s=>s.lessons.find(l=>l.lesson===lesson)!);return{lesson,meanNet:count?values.reduce((n,r)=>n+r.net,0)/count:0,correct:values.reduce((n,r)=>n+r.correct,0),wrong:values.reduce((n,r)=>n+r.wrong,0),blank:values.reduce((n,r)=>n+r.blank,0)};});
  return {studentCount:count,meanNet:average(summary,"net"),meanScore:average(summary,"score"),classes,lessons,questions,outcomes:[...outcomes.values()].map(r=>({...r,success:count&&r.questionCount?r.correct/(count*r.questionCount)*100:0})).sort((a,b)=>a.success-b.success),hardest:questions.filter(q=>q.diagnostic).sort((a,b)=>a.success-b.success).slice(0,20)};
}
