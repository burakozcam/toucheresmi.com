import fs from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { opticalQuestionsSchema, type OpticalQuestion } from "./optical-core";

export const evaluationPublicationWhere: Prisma.PublishedAnswerKeyWhereInput = {
  showInEvaluation: true, publisher: { active: true },
  AND: [{ files: { some: { category: "ANSWER_KEY" } } }, { files: { some: { category: "LEARNING_OUTCOMES" } } }],
};
export function evaluationQuestions(value: unknown): OpticalQuestion[] {
  const questions = opticalQuestionsSchema.parse(value);
  if (questions.some(q => !q.outcomeCode?.trim() || !q.outcomeName?.trim())) throw new Error("Ölçme değerlendirme için her sorunun kazanım kodu ve kazanım metni bulunmalıdır.");
  return questions;
}
// API production dependency; works without any web app directory.
const xlsx = () => require("xlsx") as {
  read(bytes: Buffer, options: object): {SheetNames: string[]; Sheets: Record<string, unknown>};
  utils: { sheet_to_json(sheet: unknown, options: object): unknown[][] };
};
export type ImportFormat="auto"|"f"|"o"|"standard";
export function inspectEvaluationExcel(filePath:string,format:ImportFormat="auto",allowInvalid=false){
  const lib=xlsx(),book=lib.read(fs.readFileSync(filePath),{type:"buffer"});
  const {parseWorkbook}=require("../lib/optical-import");
  const sheets=book.SheetNames.map(name=>({name,rows:lib.utils.sheet_to_json(book.Sheets[name],{header:1,defval:""})}));
  return parseWorkbook(sheets,format,{allowInvalid}) as {questions:OpticalQuestion[];format:string;issues:string[]};
}
export function readEvaluationExcel(filePath:string,format:ImportFormat="auto"):OpticalQuestion[]{return evaluationQuestions(inspectEvaluationExcel(filePath,format).questions);}
type FileInfo={category:string;storagePath:string;originalFileName:string};
export function prepareEvaluation(files:FileInfo[],enabled:boolean,previous:unknown,filesChanged:boolean,format:ImportFormat="auto"):OpticalQuestion[]|null {
  if(enabled && !["ANSWER_KEY","LEARNING_OUTCOMES"].every(c=>files.some(f=>f.category===c)))throw new Error("Ölçme değerlendirmede göstermek için hem cevap anahtarı hem kazanım dosyası gereklidir.");
  const candidates=[...files].sort((a,b)=>Number(b.category==="LEARNING_OUTCOMES")-Number(a.category==="LEARNING_OUTCOMES")).filter(f=>/\.(xlsx|xls)$/i.test(path.extname(f.originalFileName)));
  let problem:unknown;
  if(!filesChanged && previous){try{return evaluationQuestions(previous);}catch(e){problem=e;}}
  for(const file of candidates){try{return readEvaluationExcel(file.storagePath,format);}catch(e){problem=e;}}
  if(enabled||format==="f"||format==="o")throw new Error(problem instanceof Error?problem.message:"Ölçme değerlendirme için cevapları, A/B soru eşleştirmelerini ve kazanımları içeren Excel dosyasını kazanım alanına yükleyin.");
  return null;
}
