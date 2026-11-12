import crypto from "node:crypto";
import { opticalQuestionsSchema, opticalSummary, type OpticalData } from "./optical-core";
export type Snapshot = {data:OpticalData;penalty:number;summary:ReturnType<typeof opticalSummary>;schoolName:string;templateName:string;keyName:string;expectedGrade?:number;keyFingerprint?:string};
export function keyFingerprint(questions:unknown,penalty:number){
  const q=opticalQuestionsSchema.parse(questions).map(q=>({...q,positions:Object.fromEntries(Object.entries(q.positions).sort())})).sort((a,b)=>a.lesson.localeCompare(b.lesson)||a.number-b.number);
  return crypto.createHash("sha256").update(JSON.stringify({q,penalty})).digest("hex");
}
export const checksum=(txt:string)=>crypto.createHash("sha256").update(txt.replace(/\r\n?/g,"\n").replace(/\n+$/,"")).digest("hex");
export function reviewSnapshot(snapshot:Snapshot){
  const {data}=snapshot,blockers:string[]=[],warnings=[...data.warnings],seen=new Set<string>();
  for(const s of data.students){
    if(seen.has(s.id))blockers.push(`${s.id}: öğrenci numarası birden fazla kişide kullanılmış.`);seen.add(s.id);
    const grade=Number(s.branch.split("-")[0]);
    if(snapshot.expectedGrade&&grade&&grade!==snapshot.expectedGrade)blockers.push(`${s.id}: TXT sınıfı ${grade}, seçilen sınav ${snapshot.expectedGrade}. sınıf.`);
    if(s.branch==="Belirtilmedi"||!s.branch.includes("-"))warnings.push(`${s.id}: sınıf/şube bilgisi eksik; sınıf listelerini kontrol edin.`);
  }
  const multiple=data.students.reduce((n,s)=>n+s.answers.filter(a=>a==="*").length,0);
  if(multiple)warnings.push(`${multiple} çoklu işaret yanlış cevap olarak hesaplanacak.`);
  if(data.questions.some(q=>q.weight===null))warnings.push("Katsayı tanımlanmamış: doğru, yanlış, boş ve net hesaplanır; puan ve puan sıralaması hesaplanmaz.");
  const missing=data.questions.filter(q=>!q.outcomeCode||!q.outcomeName).length;
  if(missing)warnings.push(`${missing} soruda kazanım bilgisi eksik.`);
  // A booklet hint is a review aid only; never change a student's recorded booklet.
  for(const s of data.students)for(const lesson of [...new Set(data.questions.map(q=>q.lesson))]){
    const qs=data.questions.map((q,i)=>({q,i})).filter(({q})=>q.lesson===lesson&&/^[ABCDE]$/.test(q.answer));
    const book=s.booklets[lesson];if(!book||qs.length<8)continue;
    const own=qs.filter(({q,i})=>s.answers[i]===q.answer).length,raw=new Map<number,string>();
    qs.forEach(({q,i})=>raw.set(q.positions[book],s.answers[i]));
    for(const other of Object.keys(qs[0].q.positions)){
      if(other===book)continue;const alternative=qs.filter(({q})=>raw.get(q.positions[other])===q.answer).length;
      if(own/qs.length<=0.4&&alternative-own>=Math.max(4,qs.length*0.3)){warnings.push(`${s.id} / ${lesson}: ${book} kitapçığını kontrol edin; ${other} eşleştirmesinde belirgin fark var. Kitapçık otomatik değiştirilmedi.`);break;}
    }
  }
  return {studentCount:data.students.length,lineCount:data.lineCount,classCount:new Set(data.students.map(s=>s.branch)).size,questionCount:data.questions.length,multipleMarks:multiple,allCorrectQuestions:data.questions.filter(q=>q.answer==="H").length,cancelledQuestions:data.questions.filter(q=>q.answer==="X").length,blockers:[...new Set(blockers)],warnings:[...new Set(warnings)]};
}
export function reEvaluate(snapshot:Snapshot,questions:unknown,penalty:number):Snapshot{
  const next=opticalQuestionsSchema.parse(questions),old=snapshot.data.questions;
  const identity=(q:{lesson:string;number:number})=>`${q.lesson}\0${q.number}`;
  const oldIndex=new Map(old.map((q,i)=>[identity(q),i]));
  if(next.length!==old.length||next.some(q=>!oldIndex.has(identity(q))))throw new Error("Ders veya soru sayısı değişmiş. Özgün TXT’yi yeniden yükleyin.");
  const students=snapshot.data.students.map(s=>{
    const raw=new Map<string,string>();
    old.forEach((q,i)=>{const book=s.booklets[q.lesson];if(!book)return;const pos=q.positions?.[book];if(!pos)throw new Error("Eski kayıtta kitapçık eşleştirmesi yok. TXT’yi yeniden yükleyin.");raw.set(`${q.lesson}\0${pos}`,s.answers[i]);});
    return {...s,answers:next.map(q=>{const book=s.booklets[q.lesson];if(!book)return "";if(!q.positions[book])throw new Error(`${book} kitapçığı yeni anahtarda yok. TXT’yi yeniden yükleyin.`);return raw.get(`${q.lesson}\0${q.positions[book]}`)??"";})};
  });
  const data={...snapshot.data,students,questions:next.map(q=>({...q,column:`${q.lesson} | ${q.number}`}))};
  return {...snapshot,data,penalty,summary:opticalSummary(data,penalty),keyFingerprint:keyFingerprint(next,penalty)};
}
export function scoreChanges(before:Snapshot,after:Snapshot){return after.summary.map(r=>{const old=before.summary.find(s=>s.id===r.id)!;return{id:r.id,name:after.data.students.find(s=>s.id===r.id)!.name,beforeNet:old.net,afterNet:r.net,beforeScore:old.score,afterScore:r.score,changed:Math.abs(old.net-r.net)>1e-8||old.score!==r.score&&(old.score===null||r.score===null||Math.abs(old.score-r.score)>1e-8)};});}
