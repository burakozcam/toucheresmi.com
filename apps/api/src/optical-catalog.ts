import fs from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { opticalQuestionsSchema, type OpticalQuestion } from "./optical-core";

export const evaluationPublicationWhere: Prisma.PublishedAnswerKeyWhereInput = {
  showInEvaluation: true, publisher: { active: true },
  files: { some: { category: "ANSWER_KEY" } },
};
export function evaluationQuestions(value: unknown): OpticalQuestion[] {
  const questions = opticalQuestionsSchema.parse(value);
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
  if(enabled && !files.some(f=>f.category==="ANSWER_KEY"))throw new Error("Ölçme değerlendirmede göstermek için cevap anahtarı dosyası gereklidir.");
  const candidates=[...files].sort((a,b)=>Number(b.category==="LEARNING_OUTCOMES")-Number(a.category==="LEARNING_OUTCOMES")).filter(f=>/\.(xlsx|xls)$/i.test(path.extname(f.originalFileName)));
  let problem:unknown;
  if(!filesChanged && previous){try{return evaluationQuestions(previous);}catch(e){problem=e;}}
  for(const file of candidates){try{return readEvaluationExcel(file.storagePath,format);}catch(e){problem=e;}}
  if(enabled||format==="f"||format==="o")throw new Error(problem instanceof Error?problem.message:"Ölçme değerlendirme için cevapları, A/B soru eşleştirmelerini ve kazanımları içeren Excel dosyasını kazanım alanına yükleyin.");
  return null;
}
