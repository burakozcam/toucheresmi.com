import { canonicalJson } from "./canonical-json";
import { opticalQuestionsSchema,opticalSummary,type OpticalData,type OpticalStudent } from "./optical-core";
import { studentNumberKey } from "./result-identity";
import {keyFingerprint,type Snapshot} from "./optical-review";
export type ResultSnapshot=Snapshot&{deletedAt?:string;mergeSessions?:boolean};
export const isDeleted=(snapshot:unknown)=>!!(snapshot as ResultSnapshot)?.deletedAt;
const number=(s:OpticalStudent)=>{const id=s.studentNo??s.id;return id.startsWith("tc-")||id==="—"?`identity:${s.identityHash??s.id}`:`${s.branch.split("-")[0]}:${studentNumberKey(id)}`;};
export const snapshotFingerprint=(s:ResultSnapshot)=>s.keyFingerprint??keyFingerprint(s.data.questions,s.penalty);
/** Join matching students and retain the more complete marked lesson, preserving its booklet. */
export function mergeStudentData(previous:OpticalData,next:OpticalData,replaceStudent?:(student:OpticalStudent)=>boolean):OpticalData{
  if(canonicalJson(opticalQuestionsSchema.parse(previous.questions))!==canonicalJson(opticalQuestionsSchema.parse(next.questions)))throw new Error("Oturumların cevap anahtarları farklı. Aynı anahtarla yeniden yükleyin.");
  const students=structuredClone(previous.students);
  const mergeWarnings=[...previous.warnings,...next.warnings];
  for(const incoming of next.students){const matches=students.filter(s=>(s.identityHash&&incoming.identityHash&&s.identityHash===incoming.identityHash)||number(s)===number(incoming));
    if(matches.length>1)throw new Error("Oturum eşleştirmesi belirsiz. Öğrenci numarası ve TC alanlarını kontrol edin.");
    const old=matches[0];if(!old){students.push({...structuredClone(incoming),sourceLines:incoming.sourceLines.map(line=>line+previous.lineCount)});continue;}
    if(old.identityHash&&incoming.identityHash&&old.identityHash!==incoming.identityHash)mergeWarnings.push(`${incoming.studentNo??incoming.id}: aynı numara farklı TC bilgileriyle kullanılmış; numaraya göre birleştirildi. Farklı öğrenciler birleşmiş olabilir.`);
    if(old.name!==incoming.name||old.branch!==incoming.branch){mergeWarnings.push(`${incoming.studentNo??incoming.id}: oturumlarda ad veya sınıf/şube çelişiyor; daha çok işaretlemeli kaydın bilgileri korundu. Yanlış öğrenci eşleşmesi olabilir.`);if(incoming.answers.filter(Boolean).length>old.answers.filter(Boolean).length){old.name=incoming.name;old.branch=incoming.branch;}}
    for(const lesson of Object.keys(incoming.booklets)){if(old.booklets[lesson]&&!replaceStudent?.(incoming)){mergeWarnings.push(`${incoming.studentNo??incoming.id}: ${lesson} tekrarında daha çok işaretlemeli ders kaydı kullanıldı; eşitlikte ilk kayıt korundu. Çelişen cevaplar neti etkileyebilir.`);const indices=previous.questions.flatMap((q,i)=>q.lesson===lesson?[i]:[]);if(indices.filter(i=>incoming.answers[i]).length<=indices.filter(i=>old.answers[i]).length)continue;}
      previous.questions.forEach((q,i)=>{if(q.lesson===lesson)old.answers[i]=incoming.answers[i];});old.booklets[lesson]=incoming.booklets[lesson];}
    if(old.id.startsWith("tc-")&&!incoming.id.startsWith("tc-"))old.id=incoming.id;
    old.recordBooklets=[...new Set([...(old.recordBooklets??[]),...(incoming.recordBooklets??[])])];old.sourceLines=[...old.sourceLines,...incoming.sourceLines.map(line=>line+previous.lineCount)];old.identityHash??=incoming.identityHash;old.identityEncrypted??=incoming.identityEncrypted;
  }
  const warnings=students.flatMap(s=>{const missing=[...new Set(previous.questions.map(q=>q.lesson))].filter(l=>!s.booklets[l]);return missing.length?[`${s.id}: ${missing.join(", ")} cevapları boş.`]:[];});
  return {...next,students,lineCount:previous.lineCount+next.lineCount,warnings:[...new Set([...mergeWarnings,...warnings])]};
}
export function aggregateResults(rows:Array<{id:string;schoolId:string;snapshot:unknown;createdAt:Date}>){
  const active=rows.filter(r=>!isDeleted(r.snapshot)).sort((a,b)=>+new Date(a.createdAt)-+new Date(b.createdAt));if(!active.length)return null;
  const latest=active.at(-1)!,base=latest.snapshot as ResultSnapshot,students=new Map<string,OpticalStudent>();
  for(const row of active){const s=row.snapshot as ResultSnapshot;if(snapshotFingerprint(s)!==snapshotFingerprint(base))throw new Error("Aynı sınavın yüklemeleri farklı cevap anahtarları kullanıyor. Önce güncel anahtarla tekrar değerlendirin.");
    for(const student of s.data.students){const k=student.separateSession?`${row.id}:${student.id}`:student.identityHash??number(student);const matches=student.separateSession?[]:[...students].filter(([,old])=>!old.separateSession&&((old.identityHash&&student.identityHash&&old.identityHash===student.identityHash)||number(old)===number(student)));
      if(matches.length>1)throw new Error("Öğrenci numarası/TC eşleştirmesi belirsiz.");const existing=matches[0]?.[1];if(matches[0])students.delete(matches[0][0]);students.set(k,structuredClone(student));}}
  const data={...base.data,students:[...students.values()].map((s,i)=>({...s,studentNo:(s.studentNo??s.id).startsWith("tc-")?"—":s.studentNo??s.id,id:`r${i+1}`}))};
  return {...base,keyFingerprint:snapshotFingerprint(base),data,summary:opticalSummary(data,base.penalty),sourceResultIds:active.map(r=>r.id),schoolId:latest.schoolId};
}
export function safeSnapshot<T extends {data:OpticalData}>(snapshot:T){return {...snapshot,data:{...snapshot.data,students:snapshot.data.students.map(({identityHash,identityEncrypted,...student})=>({...student,...(/^\d{11}$/.test(student.studentNo??student.id)?{studentNo:"***********"}:{}),hasIdentity:!!identityEncrypted}))}};}
