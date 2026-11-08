type Student={id:string;name:string;school:string;branch:string;answers:string[];booklets?:Record<string,string>};
type Summary={id:string;score:number;net:number;lessons:unknown[]};
export type StoredResult={data:{questions:unknown[];students:Student[]};summary:Summary[];penalty:number;schoolName:string;keyName:string;templateName:string};
export function resultStudent(snapshot:unknown,studentNo:string):Student {
  const s=snapshot as StoredResult;
  if(!s?.data||!Array.isArray(s.data.students)||!Array.isArray(s.summary))throw new Error("Sonuç verisi okunamadı.");
  const matches=s.data.students.filter(v=>v.id===studentNo);
  if(matches.length!==1)throw new Error("Bu numara için tek bir öğrenci bulunamadı. Sonuç listesini kontrol edin.");
  return matches[0];
}
/** Only own answers and aggregate ranks cross the reader boundary. Never return peer records. */
export function privateResult(snapshot:unknown,studentNo:string) {
  const s=snapshot as StoredResult,student=resultStudent(snapshot,studentNo);
  const own=s.summary.filter(r=>r.id===studentNo);
  if(own.length!==1)throw new Error("Öğrenci sonucu okunamadı.");
  const score=own[0].score, branchIds=new Set(s.data.students.filter(v=>v.branch===student.branch).map(v=>v.id));
  return {data:{questions:s.data.questions,students:[{id:student.id,name:student.name,school:student.school,branch:student.branch,answers:student.answers}]},
    penalty:s.penalty,schoolName:s.schoolName,keyName:s.keyName,templateName:s.templateName,
    summary:[own[0]],booklets:student.booklets??{},
    comparison:{schoolRank:1+s.summary.filter(v=>v.score>score+1e-8).length,schoolCount:s.summary.length,
      branchRank:1+s.summary.filter(v=>branchIds.has(v.id)&&v.score>score+1e-8).length,branchCount:branchIds.size,
      mean:s.summary.reduce((n,v)=>n+v.score,0)/Math.max(1,s.summary.length)}};
}
