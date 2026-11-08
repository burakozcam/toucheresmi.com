import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { evaluationQuestions,inspectEvaluationExcel,type ImportFormat } from "./optical-catalog";
/** Validates the complete user-reviewed table against the actual uploaded file. No database writes. */
export function reviewImportedQuestions(files:Express.Multer.File[],body:{evaluationFormat:ImportFormat;reviewedQuestions?:string;sourceChecksum?:string;confirmImport?:boolean}){
  const source=files.find(f=>f.fieldname==="learningOutcomesFile"&&/\.xlsx?$/i.test(f.originalname))??files.find(f=>/\.xlsx?$/i.test(f.originalname));
  if(!source)return null;
  const original=inspectEvaluationExcel(source.path,body.evaluationFormat,true);
  if(!body.confirmImport||!body.reviewedQuestions)throw new Error("Tüm soruların düzenlenebilir önizlemesini inceleyip içe aktarmayı onaylayın.");
  const checksum=crypto.createHash("sha256").update(fs.readFileSync(source.path)).digest("hex");
  if(checksum!==body.sourceChecksum)throw new Error("Dosya önizlemeden sonra değişti. Dosyayı yeniden seçip önizlemeyi onaylayın.");
  let reviewed;try{reviewed=evaluationQuestions(JSON.parse(body.reviewedQuestions));}catch(e){throw new Error(`Önizleme eksik veya hatalı: ${(e as Error).message}`);}
  if(reviewed.length!==original.questions.length)throw new Error("Kaynak sorular kaybedilemez: önizlemedeki soru sayısı dosyayla aynı olmalı.");
  const questions=reviewed.map((q,i)=>({...q,...(original.questions[i].source?{source:original.questions[i].source}:{})}));
  // Preserve original workbook as outcomes; publish a corrected, ordinary Excel answer key.
  if(!files.some(f=>f.fieldname==="answerKeyFile")){
    const x=require("@optik/web/public/vendor/xlsx.full.min.js"),w=x.utils.book_new();
    const rows=[["Ders","A Soru No","B Soru No","Doğru Cevap","Katsayı","Kazanım Kodu","Kazanım Metni","C Soru No","D Soru No"],...questions.map(q=>[q.lesson,q.number,q.positions.B??"",q.answer,q.weight,q.outcomeCode??"",q.outcomeName??"",q.positions.C??"",q.positions.D??""])];
    x.utils.book_append_sheet(w,x.utils.aoa_to_sheet(rows),"Cevap Anahtarı");const bytes:Buffer=x.write(w,{type:"buffer",bookType:"xlsx"});const filename=`${crypto.randomUUID()}-onayli.xlsx`,filePath=path.join(path.dirname(source.path),filename);fs.writeFileSync(filePath,bytes);
    files.push({...source,fieldname:"answerKeyFile",originalname:"Onaylanan Cevap Anahtarı.xlsx",filename,path:filePath,mimetype:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",size:bytes.length});
  }else{
    const canonical=(qs:typeof questions)=>JSON.stringify(qs.map(({source,...q})=>q));
    if(canonical(questions)!==canonical(original.questions))throw new Error("Önizlemede düzeltme var. Ayrı cevap dosyasını kaldırın; onaylanan tablodan güncel cevap Excel’i oluşturulacak.");
  }
  return questions;
}
