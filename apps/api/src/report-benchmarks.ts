import { resultGrade } from "../lib/result-grade";
/** Aggregate values only; no other institution's student records cross the report boundary. */
export function reportBenchmarks(views:any[]){
 const grades=[...new Set<string>(views.flatMap(v=>v.data.students.map((s:any)=>resultGrade(s.branch))))];
 const calculate=(grade?:string)=>{const rows=views.flatMap(v=>v.data.students.filter((s:any)=>!grade||resultGrade(s.branch)===grade).map((s:any)=>v.summary.find((r:any)=>r.id===s.id))).filter(Boolean),lessons=[...new Set<string>(rows.flatMap(r=>r.lessons.map((l:any)=>l.lesson)))];
 return {count:rows.length,score:rows.length?rows.reduce((a,r)=>a+r.score,0)/rows.length:null,lessons:Object.fromEntries(lessons.map(lesson=>{const values=rows.flatMap(r=>r.lessons.filter((l:any)=>l.lesson===lesson).map((l:any)=>l.net));return [lesson,values.reduce((a,b)=>a+b,0)/values.length];}))};};
 return {all:calculate(),grades:Object.fromEntries(grades.map(grade=>[grade,calculate(grade)]))};
}
