import {z} from 'zod';
import {opticalQuestionsSchema,opticalSummary,type OpticalData,type OpticalQuestion} from './optical-core';
import {SecurityError} from './security-errors';
export const rosterRow=z.object({studentNo:z.string().trim().min(1).max(100),firstName:z.string().trim().min(1).max(80),lastName:z.string().trim().min(1).max(80),grade:z.coerce.number().int().min(1).max(12),branch:z.string().trim().min(1).max(80)});
/** Formatted cell strings preserve leading zeroes, including Excel number formats. */
export function readRoster(buffer:Buffer){
 const x=require('xlsx'),book=x.read(buffer,{type:'buffer'}),sheet=book.Sheets[book.SheetNames[0]],rows=x.utils.sheet_to_json(sheet,{header:1,raw:false,defval:''}) as string[][];
 const head=rows[0]?.map(v=>String(v).trim().toLocaleLowerCase('tr-TR'))??[],names=['öğrenci no','ad','soyad','sınıf','şube'];
 if(names.some(n=>!head.includes(n)))throw new SecurityError(400,'Şablon sütunları: Öğrenci No, Ad, Soyad, Sınıf, Şube.');
 if(rows.length>1001)throw new SecurityError(400,'Bir yüklemede en fazla 1.000 öğrenci seçin.');
 const seen=new Set<string>();
 return rows.slice(1).map((row,i)=>{const values=names.map(n=>String(row[head.indexOf(n)]??'')),parsed=rosterRow.safeParse(Object.fromEntries(['studentNo','firstName','lastName','grade','branch'].map((k,j)=>[k,values[j]])));
  const duplicate=parsed.success&&seen.has(parsed.data.studentNo);if(parsed.success)seen.add(parsed.data.studentNo);
  return {row:i+2,...(parsed.success?{data:parsed.data}:{}),error:duplicate?'Dosyada yinelenen öğrenci numarası.':parsed.success?'':parsed.error.issues.map(e=>`${e.path.join('.')}: ${e.message}`).join('; ')};
 }).filter(row=>row.data||rows[row.row-1].some(Boolean));
}
export function examAvailability(questions:unknown){const q=opticalQuestionsSchema.safeParse(questions);return q.success?{questions:q.data,error:''}:{questions:[] as OpticalQuestion[],error:'Kullanılabilir cevap anahtarı / kitapçık eşleştirmesi eksik veya tutarsız.'};}
export function validateMarks(questions:OpticalQuestion[],answers:string[],booklets:Record<string,string>){
 if(answers.length!==questions.length)throw new SecurityError(400,'Cevap sayısı sınavla eşleşmiyor.');
 const lessons=[...new Set(questions.map(q=>q.lesson))];
 if(Object.keys(booklets).some(l=>!lessons.includes(l))||lessons.some(l=>!Object.keys(questions.find(q=>q.lesson===l)!.positions).includes(booklets[l])))throw new SecurityError(400,'Her ders için geçerli kitapçığı seçin.');
 const raw=new Map<string,OpticalQuestion>();for(const q of questions)raw.set(`${q.lesson}:${q.positions[booklets[q.lesson]]}`,q);
 questions.forEach((q,i)=>{const optionCount=raw.get(`${q.lesson}:${q.number}`)?.optionCount??q.optionCount??5;if(answers[i]!==''&&!new RegExp(`^[${'ABCDE'.slice(0,optionCount)}]$`).test(answers[i]))throw new SecurityError(400,`${q.lesson} / ${q.number}: geçersiz işaret.`);});
}
export function digitalSnapshot(exam:{questions:unknown;penalty:number;name:string;grade:number},enrollment:{studentNo:string;grade:number;branch:string;user:{firstName:string;lastName:string};school:{name:string}},answers:string[],booklets:Record<string,string>){
 const qs=opticalQuestionsSchema.parse(exam.questions);validateMarks(qs,answers,booklets);
 const raw=new Map(qs.map((q,i)=>[`${q.lesson}:${q.number}`,answers[i]]));
 const data:OpticalData={questions:qs.map(q=>({...q,column:`${q.lesson} | ${q.number}`})),students:[{id:enrollment.studentNo,studentNo:enrollment.studentNo,name:`${enrollment.user.firstName} ${enrollment.user.lastName}`,school:enrollment.school.name,branch:`${enrollment.grade}-${enrollment.branch}`,booklets,answers:qs.map(q=>raw.get(`${q.lesson}:${q.positions[booklets[q.lesson]]}`)??''),sourceLines:[]}],lineCount:1,warnings:[]};
 return {data,penalty:exam.penalty,summary:opticalSummary(data,exam.penalty),schoolName:enrollment.school.name,keyName:exam.name,templateName:'E-Sınav dijital optik',expectedGrade:exam.grade};
}
export const expired=(attempt:{endsAt:Date|null;submittedAt:Date|null},now=Date.now())=>!attempt.submittedAt&&!!attempt.endsAt&&+attempt.endsAt<=now;
