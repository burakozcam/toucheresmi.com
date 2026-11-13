import {recordLayout} from "./optical-readers";
import { opticalLayoutSchema, type OpticalLayout } from "./optical-core";
export function previewFmt(txt:string,input:OpticalLayout){
  const layout=opticalLayoutSchema.parse(input),lines=txt.replace(/^\uFEFF/,"").split(/\r\n|\n|\r/);while(lines.at(-1)==="")lines.pop();
  if(!lines.length||lines.length>2000)throw new Error("Örnek TXT 1–2000 satır içermeli.");
  const errors:string[]=[],warnings:string[]=[],lengths=new Map<number,number>();let errorCount=0;
  const fail=(message:string)=>{errorCount++;if(errors.length<30)errors.push(message);};
  const read=(line:string,f?:{start:number;length:number})=>f?line.slice(f.start-1,f.start-1+f.length).trim():"";
  for(const[lineIndex,line]of lines.entries()){
    const variant=recordLayout(layout,line),rowLayout=variant?.layout??layout;
    lengths.set(line.length,(lengths.get(line.length)??0)+1);const label=`Satır ${lineIndex+1}`;
    if(line.length!==rowLayout.lineLength){fail(`${label}: ${line.length} karakter var, FMT ${rowLayout.lineLength} bekliyor.`);continue;}
    for(const literal of rowLayout.literals??[])if(line.slice(literal.start-1,literal.start-1+literal.text.length)!==literal.text)fail(`${label}: ${literal.start}. konumdaki sabit metin eşleşmiyor.`);
    if(!read(line,rowLayout.fields.name))fail(`${label}: ad alanı boş.`);
    if(!read(line,rowLayout.fields.id)&&!read(line,rowLayout.fields.identity))fail(`${label}: öğrenci no ve eşleştirme kimliği boş.`);
    if(!/^[A-D]$/.test(read(line,rowLayout.fields.booklet).toUpperCase()))fail(`${label}: kitapçık A, B, C veya D olmalı.`);
    for(const lesson of rowLayout.lessons)if(/[^ABCDE* .-]/i.test(line.slice(lesson.start-1,lesson.start-1+lesson.length)))fail(`${label} / ${lesson.name}: cevap alanında geçersiz karakter var.`);
  }
  if(!layout.fields.grade)warnings.push("Sınıf alanı tanımlı değil; sınıf uyuşmazlığı kontrolü sınırlı kalır.");
  if(!layout.fields.branch)warnings.push("Şube alanı tanımlı değil; şube listeleri ayrılamaz.");
  return {canSave:errorCount===0,lineCount:lines.length,errorCount,errors,warnings,lengths:[...lengths].map(([length,count])=>({length,count})),rows:lines.slice(0,5).map((line,i)=>{const rowLayout=recordLayout(layout,line)?.layout??layout;return {line:i+1,fields:Object.fromEntries(Object.entries(rowLayout.fields).filter(([,f])=>f).map(([name,f])=>[name,name==="identity"?(read(line,f)?"•••••• (gizlendi)":""):read(line,f)])),lessons:rowLayout.lessons.map(l=>({name:l.name,answers:line.slice(l.start-1,l.start-1+l.length).replace(/ /g,"·")}))};})};
}
