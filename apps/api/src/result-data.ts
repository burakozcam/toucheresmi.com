import { opticalSummary,type OpticalData,type OpticalStudent } from "./optical-core";
import { studentNumberKey } from "./result-identity";
import {keyFingerprint,type Snapshot} from "./optical-review";
export type ResultSnapshot=Snapshot&{deletedAt?:string;mergeSessions?:boolean};
export const isDeleted=(snapshot:unknown)=>!!(snapshot as ResultSnapshot)?.deletedAt;
const number=(s:OpticalStudent)=>{const id=s.studentNo??s.id;return id.startsWith("tc-")||id==="—"?`identity:${s.identityHash??s.id}`:`${s.branch.split("-")[0]}:${studentNumberKey(id)}`;};
export const snapshotFingerprint=(s:ResultSnapshot)=>s.keyFingerprint??keyFingerprint(s.data.questions,s.penalty);
/** Only disjoint lessons may be joined. A duplicate marked lesson is never overwritten. */
export function mergeStudentData(previous:OpticalData,next:OpticalData):OpticalData{
  if(JSON.stringify(previous.questions)!==JSON.stringify(next.questions))throw new Error("Oturumların cevap anahtarları farklı. Aynı anahtarla yeniden yükleyin.");
  const students=structuredClone(previous.students);
  for(const incoming of next.students){const matches=students.filter(s=>(s.identityHash&&incoming.identityHash&&s.identityHash===incoming.identityHash)||number(s)===number(incoming));
    if(matches.length>1)throw new Error("Oturum eşleştirmesi belirsiz. Öğrenci numarası ve TC alanlarını kontrol edin.");
    const old=matches[0];if(!old){students.push({...structuredClone(incoming),sourceLines:incoming.sourceLines.map(line=>line+previous.lineCount)});continue;}
    if(old.identityHash&&incoming.identityHash&&old.identityHash!==incoming.identityHash)throw new Error("Aynı öğrenci numarası farklı TC bilgileriyle kullanılmış.");
    if(old.name!==incoming.name||old.branch!==incoming.branch)throw new Error(`${incoming.studentNo??incoming.id}: oturumlarda ad veya sınıf/şube çelişiyor.`);
    for(const lesson of Object.keys(incoming.booklets)){if(old.booklets[lesson])throw new Error(`${incoming.studentNo??incoming.id}: ${lesson} oturumu zaten yüklü. Aynı cevaplar tekrar birleştirilemez.`);
      previous.questions.forEach((q,i)=>{if(q.lesson===lesson)old.answers[i]=incoming.answers[i];});old.booklets[lesson]=incoming.booklets[lesson];}
    if(old.id.startsWith("tc-")&&!incoming.id.startsWith("tc-"))old.id=incoming.id;
    old.sourceLines=[...old.sourceLines,...incoming.sourceLines.map(line=>line+previous.lineCount)];old.identityHash??=incoming.identityHash;old.identityEncrypted??=incoming.identityEncrypted;
  }
  const warnings=students.flatMap(s=>{const missing=[...new Set(previous.questions.map(q=>q.lesson))].filter(l=>!s.booklets[l]);return missing.length?[`${s.id}: ${missing.join(", ")} cevapları boş.`]:[];});
  return {...next,students,lineCount:previous.lineCount+next.lineCount,warnings};
}
export function aggregateResults(rows:Array<{id:string;schoolId:string;snapshot:unknown;createdAt:Date}>){
  const active=rows.filter(r=>!isDeleted(r.snapshot)).sort((a,b)=>+new Date(a.createdAt)-+new Date(b.createdAt));if(!active.length)return null;
  const latest=active.at(-1)!,base=latest.snapshot as ResultSnapshot,students=new Map<string,OpticalStudent>();
  for(const row of active){const s=row.snapshot as ResultSnapshot;if(snapshotFingerprint(s)!==snapshotFingerprint(base))throw new Error("Aynı sınavın yüklemeleri farklı cevap anahtarları kullanıyor. Önce güncel anahtarla tekrar değerlendirin.");
    for(const student of s.data.students){const k=student.separateSession?`${row.id}:${student.id}`:student.identityHash??number(student);const matches=student.separateSession?[]:[...students].filter(([,old])=>!old.separateSession&&((old.identityHash&&student.identityHash&&old.identityHash===student.identityHash)||number(old)===number(student)));
      if(matches.length>1)throw new Error("Öğrenci numarası/TC eşleştirmesi belirsiz.");const existing=matches[0]?.[1];if(existing&&(existing.name!==student.name||existing.branch!==student.branch||(existing.identityHash&&student.identityHash&&existing.identityHash!==student.identityHash)))throw new Error("Aynı numaraya ait çelişen öğrenci kayıtları var. Oturum verilerini kontrol edin.");if(matches[0])students.delete(matches[0][0]);students.set(k,structuredClone(student));}}
  const data={...base.data,students:[...students.values()].map((s,i)=>({...s,studentNo:(s.studentNo??s.id).startsWith("tc-")?"—":s.studentNo??s.id,id:`r${i+1}`}))};
  return {...base,keyFingerprint:snapshotFingerprint(base),data,summary:opticalSummary(data,base.penalty),sourceResultIds:active.map(r=>r.id),schoolId:latest.schoolId};
}
export function safeSnapshot<T extends {data:OpticalData}>(snapshot:T){return {...snapshot,data:{...snapshot.data,students:snapshot.data.students.map(({identityHash,identityEncrypted,...student})=>({...student,...(/^\d{11}$/.test(student.studentNo??student.id)?{studentNo:"***********"}:{}),hasIdentity:!!identityEncrypted}))}};}
