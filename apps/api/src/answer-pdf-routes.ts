import express from "express";
import crypto from "node:crypto";
import { Role } from "@prisma/client";
import { prisma } from "./db";
import { requireAuth,requireRole } from "./auth";
import { evaluationQuestions } from "./optical-catalog";
import { createAnswerKeyPdf } from "./answer-key-pdf";
import { RequestLimiter } from "./rate-limit";
import { safeFilename } from "./file-names";
export const answerPdfRouter=express.Router();
const cache=new Map<string,{at:number;bytes:Buffer}>();
const tasks=new Map<string,Promise<Buffer>>();
const limit=new RequestLimiter(60,60_000).middleware();
for(const admin of [false,true]){
 const prefix=admin?"/api/admin/answer-keys":"/api/answer-keys";
 const guards=admin?[requireAuth,requireRole(Role.SUPER_ADMIN)]:[];
 for(const info of [true,false])answerPdfRouter.get(`${prefix}/:id/${info?"pdf-info":"pdf"}`,...guards,limit,async(q,r,n)=>{
 try{
 r.setHeader("Cache-Control","private, no-store");
 const publication=await prisma.publishedAnswerKey.findFirst({where:{id:String(q.params.id),...(admin?{}:{published:true})},include:{opticalKey:true}});
 if(!publication){r.status(404).json({error:"Cevap anahtarı bulunamadı."});return;}
 let questions;try{questions=evaluationQuestions(publication.opticalKey?.questions);}catch{if(info){r.json({books:[]});return;}r.status(409).json({error:"Bu eski kayıtta soru verisi yok. Mevcut dosya indirmesini kullanın."});return;}
 const books=[...new Set(questions.flatMap(question=>Object.keys(question.positions)))].sort();
 if(info){r.json({books});return;}
 const book=typeof q.query.book==="string"?q.query.book:"all";
 if(book!=="all"&&!books.includes(book)){r.status(400).json({error:"Kitapçık bulunamadı."});return;}
 const context={examName:publication.examName,grade:publication.grade,books:book==="all"?books:[book]},key=crypto.createHash("sha256").update(JSON.stringify([questions,context])).digest("hex");
 let bytes=cache.get(key)&&Date.now()-cache.get(key)!.at<300_000?cache.get(key)!.bytes:undefined;
 if(!bytes){if(!tasks.has(key)){if(tasks.size>=5){r.status(503).json({error:"PDF üretimi yoğun; biraz sonra tekrar deneyin."});return;}const task=createAnswerKeyPdf(questions,context).then(value=>{if(cache.size>=20)cache.delete(cache.keys().next().value!);cache.set(key,{at:Date.now(),bytes:value});return value;}).finally(()=>tasks.delete(key));tasks.set(key,task);}bytes=await tasks.get(key)!;}
 r.attachment(safeFilename(`${publication.examName} - ${book==="all"?books.join("-"):book} Cevap Anahtarı.pdf`)).type("application/pdf").send(bytes);
 }catch(e){n(e);}
 });
}
