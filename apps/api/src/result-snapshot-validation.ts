import {SecurityError} from './security-errors';
/** Support object JSON and legacy string-encoded JSON. Never turn an unreadable
 * snapshot into an empty result: the entire edit/merge must fail before writes. */
export function readResultSnapshot(value:unknown):any{
 let snapshot:any=value;
 for(let depth=0;typeof snapshot==='string'&&depth<2;depth++){
  try{snapshot=JSON.parse(snapshot);}catch{throw unreadable();}
 }
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||!snapshot.data||
  !Array.isArray(snapshot.data.students)||!Array.isArray(snapshot.data.questions)||!snapshot.data.questions.length||
  !Array.isArray(snapshot.summary)||typeof snapshot.penalty!=='number'||!Number.isFinite(snapshot.penalty))throw unreadable();
 const data=snapshot.data;
 if(data.questions.some((q:any)=>!q||typeof q.lesson!=='string'||!Number.isInteger(q.number)||typeof q.answer!=='string'||!q.positions||typeof q.positions!=='object'))throw unreadable();
 if(!Number.isInteger(data.lineCount)||data.lineCount<0||data.warnings!==undefined&&!Array.isArray(data.warnings))throw unreadable();
 if(data.students.some((s:any)=>!s||typeof s.id!=='string'||typeof s.name!=='string'||typeof s.branch!=='string'||typeof s.school!=='string'||!Array.isArray(s.answers)||s.answers.some((a:unknown)=>typeof a!=='string')||s.answers.length!==data.questions.length||!s.booklets||!Array.isArray(s.sourceLines)))throw unreadable();
 // Warnings were optional in older JSON; this metadata default never supplies answers/students.
 return data.warnings===undefined?{...snapshot,data:{...data,warnings:[]}}:snapshot;
}
function unreadable(){return new SecurityError(422,'Kayıtlı sonuç verisi eksik veya okunamıyor. Mevcut kayıt korunmuştur; düzenleme ve birleştirme kaydedilmedi. Yöneticiye kayıt kimliğiyle başvurun.','RESULT_SNAPSHOT_UNREADABLE');}
