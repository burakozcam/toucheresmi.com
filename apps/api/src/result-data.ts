import {preferFilledRecord} from "./student-merge";
import { canonicalJson } from "./canonical-json";
import { opticalQuestionsSchema,opticalSummary,type OpticalData,type OpticalStudent } from "./optical-core";
import { studentNumberKey } from "./result-identity";
import {keyFingerprint,type Snapshot} from "./optical-review";
export type ResultSnapshot=Snapshot&{deletedAt?:string;mergeSessions?:boolean};
export const isDeleted=(snapshot:unknown)=>!!(snapshot as ResultSnapshot)?.deletedAt;
const number=(s:OpticalStudent)=>{const id=s.studentNo??s.id;return id.startsWith("tc-")||id==="—"?`identity:${s.identityHash??s.id}`:`${s.branch.split("-")[0]}:${studentNumberKey(id)}`;};
export const snapshotFingerprint=(s:ResultSnapshot)=>s.keyFingerprint??keyFingerprint(s.data.questions,s.penalty);
/** Matching requires compatible institution and reliable identity fields. */
export function compatibleStudent(a:OpticalStudent,b:OpticalStudent){
 if(a.school!==b.school||(a.schoolCode&&b.schoolCode&&a.schoolCode!==b.schoolCode))return false;
 if(a.identityHash&&b.identityHash)return a.identityHash===b.identityHash;
 const norm=(v:string)=>v.trim().toLocaleUpperCase("tr-TR").replace(/\s+/g," ");
 return number(a)===number(b)&&(!a.name||!b.name||norm(a.name)===norm(b.name))&&
  (a.branch===b.branch||a.branch==="Belirtilmedi"||b.branch==="Belirtilmedi"||!a.branch.includes("-")||!b.branch.includes("-"));
}
/** Pick complete session records, including their blanks and booklet; never mix lessons in one session. */
export function mergeStudentData(previous:OpticalData,next:OpticalData,replaceStudent?:(student:OpticalStudent)=>boolean):OpticalData{
 if(canonicalJson(opticalQuestionsSchema.parse(previous.questions))!==canonicalJson(opticalQuestionsSchema.parse(next.questions)))throw new Error("Oturumların cevap anahtarları farklı. Aynı anahtarla yeniden yükleyin.");
 const students=structuredClone(previous.students),mergeWarnings=[...previous.warnings,...next.warnings];
 let duplicateRecords=0;
 for(const incoming of next.students){
  const matches=students.filter(s=>!s.separateSession&&!incoming.separateSession&&compatibleStudent(s,incoming));
  const old=matches.length===1?matches[0]:undefined;
  if(!old){
   if(matches.length>1||students.some(s=>number(s)===number(incoming)))mergeWarnings.push(`${incoming.studentNo??incoming.id}: aynı numarada kimlik çelişkisi / belirsiz eşleşme; kayıt ayrı tutuldu.`);
   const copy=structuredClone(incoming);copy.sourceLines=copy.sourceLines.map(l=>l+previous.lineCount);
   if(students.some(s=>s.id===copy.id)){copy.studentNo??=copy.id;copy.id=`${copy.id}-R${students.length+1}`;}students.push(copy);continue;
  }
  if(old.id.startsWith("tc-")&&!incoming.id.startsWith("tc-")){old.id=incoming.id;old.studentNo=incoming.studentNo;}
  old.name||=incoming.name;if(old.branch==="Belirtilmedi")old.branch=incoming.branch;
  old.identityHash??=incoming.identityHash;old.identityEncrypted??=incoming.identityEncrypted;old.schoolCode??=incoming.schoolCode;
  const groups=incoming.sessions??Object.fromEntries(Object.keys(incoming.booklets).map(l=>[l,{lessons:[l],marks:previous.questions.reduce((n,q,i)=>n+(q.lesson===l&&incoming.answers[i]?1:0),0),sourceLine:incoming.sourceLines[0]}]));
  const current=old.sessions??Object.fromEntries(Object.keys(old.booklets).map(l=>[l,{lessons:[l],marks:previous.questions.reduce((n,q,i)=>n+(q.lesson===l&&old.answers[i]?1:0),0),sourceLine:old.sourceLines[0]}]));
  for(const [session,record]of Object.entries(groups)){
   const overlapping=Object.entries(current).filter(([,r])=>r.lessons.some(l=>record.lessons.includes(l)));
   const oldMarks=overlapping.reduce((n,[,r])=>n+r.marks,0);
   if(overlapping.length){duplicateRecords++;mergeWarnings.push(`${incoming.studentNo??incoming.id}: aynı oturum tekrarında en dolu kayıt bütünüyle seçildi; eşitlikte ilk kayıt korundu.`);if(!replaceStudent?.(incoming)&&record.marks<=oldMarks)continue;}
   // A single-optic candidate replaces a split pair only as a whole. A lone split
   // cannot replace half of an existing single record.
   if(overlapping.some(([,r])=>r.lessons.some(l=>!record.lessons.includes(l)))){mergeWarnings.push(`${incoming.studentNo??incoming.id}: tek optikle kısmen çakışan oturum ayrı inceleme gerektiriyor; mevcut bütün kayıt korundu.`);continue;}
   for(const [k]of overlapping)delete current[k];
   for(const lesson of record.lessons){previous.questions.forEach((q,i)=>{if(q.lesson===lesson)old.answers[i]=incoming.answers[i];});old.booklets[lesson]=incoming.booklets[lesson];}
   current[session]={...record,sourceLine:record.sourceLine+previous.lineCount};
  }
  old.sessions=current;old.missingLessons=[...new Set(previous.questions.map(q=>q.lesson))].filter(l=>!old.booklets[l]);
  old.identityMarks=Object.values(current).reduce((n,r)=>n+r.marks,0);
  old.recordBooklets=[...new Set([...Object.values(old.booklets)])];old.sourceLines.push(...incoming.sourceLines.map(l=>l+previous.lineCount));
 }
 const missingWarnings=students.flatMap(s=>s.missingLessons?.length?[`${s.studentNo??s.id}: eksik oturum / okunamayan dersler: ${s.missingLessons.join(", ")}; puan hesaplanmadı.`]:[]);
 const warnings=[...new Set([...mergeWarnings.filter(w=>!w.includes("eksik oturum / okunamayan dersler:")),...missingWarnings])];
 const diagnostics={rejectedLines:[...(previous.diagnostics?.rejectedLines??[]),...(next.diagnostics?.rejectedLines??[]).map(r=>({...r,line:r.line+previous.lineCount}))],duplicateRecords:(previous.diagnostics?.duplicateRecords??0)+(next.diagnostics?.duplicateRecords??0)+duplicateRecords,
 missingVerbal:students.filter(s=>s.sessions&&!s.sessions.single&&s.sessions.numeric&&!s.sessions.verbal).length,missingNumeric:students.filter(s=>s.sessions&&!s.sessions.single&&s.sessions.verbal&&!s.sessions.numeric).length};
 return {...next,students,lineCount:previous.lineCount+next.lineCount,warnings,diagnostics,status:!students.length?"failed":warnings.length?"completed_with_warnings":"completed"};
}
export function aggregateResults(rows:Array<{id:string;schoolId:string;snapshot:unknown;createdAt:Date}>){
  const active=rows.filter(r=>!isDeleted(r.snapshot)).sort((a,b)=>+new Date(a.createdAt)-+new Date(b.createdAt));if(!active.length)return null;
  const latest=active.at(-1)!,base=latest.snapshot as ResultSnapshot,students=new Map<string,OpticalStudent>();
  for(const row of active){const s=row.snapshot as ResultSnapshot;if(snapshotFingerprint(s)!==snapshotFingerprint(base))throw new Error("Aynı sınavın yüklemeleri farklı cevap anahtarları kullanıyor. Önce güncel anahtarla tekrar değerlendirin.");
    for(const student of s.data.students){const k=student.separateSession?`${row.id}:${student.id}`:student.identityHash??number(student);const matches=student.separateSession?[]:[...students].filter(([,old])=>!old.separateSession&&compatibleStudent(old,student));
      if(matches.length===1)students.delete(matches[0][0]);students.set(`${k}:${row.id}:${student.id}`,structuredClone(student));}}
  const data={...base.data,students:[...students.values()].map((s,i)=>({...s,studentNo:(s.studentNo??s.id).startsWith("tc-")?"—":s.studentNo??s.id,id:`r${i+1}`}))};
  return {...base,keyFingerprint:snapshotFingerprint(base),data,summary:opticalSummary(data,base.penalty),sourceResultIds:active.map(r=>r.id),schoolId:latest.schoolId};
}
export function safeSnapshot<T extends {data:OpticalData}>(snapshot:T){return {...snapshot,data:{...snapshot.data,students:snapshot.data.students.map(({identityHash,identityEncrypted,...student})=>({...student,...(/^\d{11}$/.test(student.studentNo??student.id)?{studentNo:"***********"}:{}),hasIdentity:!!identityEncrypted}))}};}
