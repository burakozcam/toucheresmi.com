import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createAnswerKeyPdf,type KeyPdfContext } from "./answer-key-pdf";
import { inspectOutcomeFile } from "./outcome-file";
import { evaluationQuestions,type ImportFormat } from "./optical-catalog";
/** Validates the complete user-reviewed table against the actual uploaded file. No database writes. */
export async function reviewImportedQuestions(files:Express.Multer.File[],body:{evaluationFormat:ImportFormat;reviewedQuestions?:string;sourceChecksum?:string;confirmImport?:boolean;showInEvaluation?:boolean},context:KeyPdfContext={}){
  const source=files.find(f=>f.fieldname==="learningOutcomesFile")??files.find(f=>/\.(xlsx?|csv|tsv)$/i.test(f.originalname));
  if(!source)return null;
  if(!/\.(xlsx?|csv|tsv|pdf)$/i.test(source.originalname)&&!body.showInEvaluation)return null;
  const original=await inspectOutcomeFile(source.path,source.originalname,body.evaluationFormat,true);
  if(!body.confirmImport||!body.reviewedQuestions)throw new Error("Tüm soruların düzenlenebilir önizlemesini inceleyip içe aktarmayı onaylayın.");
  const checksum=crypto.createHash("sha256").update(fs.readFileSync(source.path)).digest("hex");
  if(checksum!==body.sourceChecksum)throw new Error("Dosya önizlemeden sonra değişti. Dosyayı yeniden seçip önizlemeyi onaylayın.");
  let reviewed;try{reviewed=evaluationQuestions(JSON.parse(body.reviewedQuestions));}catch(e){throw new Error(`Önizleme eksik veya hatalı: ${(e as Error).message}`);}
  if(reviewed.length!==original.questions.length)throw new Error("Kaynak sorular kaybedilemez: önizlemedeki soru sayısı dosyayla aynı olmalı.");
  const questions=reviewed.map((q,i)=>({...q,...(original.questions[i].source?{source:original.questions[i].source}:{})}));
  const bytes=await createAnswerKeyPdf(questions,context),filename=`${crypto.randomUUID()}.generated-answer.pdf`,filePath=path.join(path.dirname(source.path),filename);fs.writeFileSync(filePath,bytes);
  files.push({...source,fieldname:"answerKeyFile",originalname:"Onaylı Cevap Anahtarı.pdf",filename,path:filePath,mimetype:"application/pdf",size:bytes.length});
  return questions;
}
