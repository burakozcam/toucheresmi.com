import {lessonIdentity} from "../lib/evaluation-compatibility";
import {z} from "zod";
import type {OpticalData} from "./optical-core";
const editSchema=z.object({studentId:z.string().max(100),field:z.enum(["studentNo","name","grade","section","booklet","answer"]),lesson:z.string().max(80).optional(),session:z.enum(["verbal","numeric"]).optional(),question:z.number().int().min(0).max(299).optional(),value:z.string().max(160)});
export const editsSchema=z.array(editSchema).min(1).max(20000);
export function applyResultEdits(data:OpticalData,edits:z.infer<typeof editsSchema>){
 const next=structuredClone(data),changes:Array<{studentId:string;field:string;question?:number;lesson?:string;session?:string;before:string;after:string}>=[];
 for(const edit of [...edits].sort((a,b)=>Number(b.field==="booklet")-Number(a.field==="booklet"))){
  const s=next.students.find(s=>s.id===edit.studentId);if(!s)throw Error("Düzenlenen öğrenci bu sınavda yok.");let before="",after=edit.value.trim();
  if(edit.field==="answer"){
   const index=edit.question;if(index===undefined||!next.questions[index])throw Error("Soru bulunamadı.");const q=next.questions[index];if(s.missingLessons?.includes(q.lesson))throw Error("Eksik oturumun cevabı düzenlenemez; önce oturum TXT’sini yükleyin.");
   after=after.toUpperCase();if(!/^[ABCDE*]?$/.test(after))throw Error("Cevap A–E, * veya boş olmalıdır.");before=s.answers[index];s.answers[index]=after;
  }else if(edit.field==="booklet"){
   after=after.toUpperCase()||"A";if(!/^[A-D]$/.test(after))throw Error("Kitapçık A, B, C veya D olmalıdır.");
   const lessons=edit.session?Object.keys(s.booklets).filter(l=>["MATEMATIK","FEN"].includes(lessonIdentity(l))===(edit.session==="numeric")):edit.lesson?[edit.lesson]:Object.keys(s.booklets);if(!lessons.length)throw Error("Okunmuş oturum bulunamadı.");
   before=lessons.map(l=>`${l}:${s.booklets[l]??""}`).join(", ");
   for(const lesson of lessons){const old=s.booklets[lesson];if(!old)throw Error("Eksik oturum kitapçığı üretilemez.");const indices=next.questions.flatMap((q,i)=>q.lesson===lesson?[i]:[]),raw=new Map<number,string>();for(const i of indices)raw.set(next.questions[i].positions[old],s.answers[i]);
    for(const i of indices){const position=next.questions[i].positions[after];if(!position)throw Error("Bu kitapçığın soru çaprazı anahtarda yok.");s.answers[i]=raw.get(position)??"";}s.booklets[lesson]=after;
   }
   s.recordBooklets=[...new Set(Object.values(s.booklets))];
  }else if(edit.field==="name"){if(after.length>120)throw Error("Ad soyad en fazla 120 karakter olmalıdır.");before=s.name;s.name=after;}
  else if(edit.field==="studentNo"){if(after.length>30||/[\x00-\x1f]/.test(after))throw Error("Öğrenci numarası geçersiz.");before=s.studentNo??s.id;s.studentNo=after;}
  else {const parts=s.branch.split('-'),grade=parts.shift()??'',section=parts.join('-');if(edit.field==="grade"){if(after&&!/^(?:[1-9]|1[0-2])$/.test(after))throw Error("Sınıf 1–12 veya boş olmalıdır.");before=grade;s.branch=[after,section].filter(Boolean).join('-');}else{if(after.length>20)throw Error("Şube en fazla 20 karakter olmalıdır.");before=section;s.branch=[grade,after].filter(Boolean).join('-');}}
  if(before!==after)changes.push({studentId:s.id,field:edit.field,question:edit.question,lesson:edit.lesson,session:edit.session,before,after});
 }
 if(!changes.length)throw Error("Kaydedilecek değişiklik yok.");return{data:next,changes};
}
