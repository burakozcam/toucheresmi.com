import express from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { canonicalJson } from "./canonical-json";
import { env } from "./config";
import { checksum, keyFingerprint, reviewSnapshot, reEvaluate, scoreChanges, type Snapshot } from "./optical-review";
import { analyzeSnapshot } from "./optical-analysis";
import multer from "multer";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { requireAuth, requireRole, type AuthenticatedRequest } from "./auth";
import { decodeOptical, opticalLayoutSchema, opticalQuestionsSchema, parseOptical, opticalSummary } from "./optical-core";
import { RequestLimiter } from "./rate-limit";
import { evaluationPublicationWhere, evaluationQuestions, evaluationExamChoice } from "./optical-catalog";
import { hasFmt } from "./fmt-share";
import { fmtBytes } from "./fmt-download";
import { findLibraryFmt, libraryFmtBytes } from "./fmt-library";
import { fmtProof,checkFmtProof,verificationSchema,inspectFmtCoordinates } from "./fmt-verification";
import { createAnswerKeyPdf } from "./answer-key-pdf";
import { detectFmtSource } from "./fmt-source";
import { analyzeFmt } from "./fmt-analyze";
import { bulkTemplatesInput,templateInput,fmtContentIdentity } from "./fmt-bulk";
import { previewFmt } from "./fmt-preview";
import {txtArchiveRouter} from "./txt-archive-routes";
import {readArchivedTxts,archiveScope,evaluatedContext} from "./txt-archive";
import {studentNumberKey} from "./result-identity";
import { resultRouter } from "./result-routes";
import { identityHash,encryptIdentity } from "./result-identity";
import { isDeleted,safeSnapshot,mergeStudentData } from "./result-data";
import { inferFmt } from "./fmt-inference";
import { convertTxt } from "./txt-converter";

import { systemEvaluationTemplates, systemEvaluationTemplate } from "./evaluation-templates";

export const opticalRouter = express.Router();
opticalRouter.use((_req,res,next)=>{res.setHeader("Cache-Control","private, no-store");next();});
opticalRouter.use(requireAuth, (req: AuthenticatedRequest,res,next)=>{
  if (req.user?.role !== Role.SUPER_ADMIN && req.user?.role !== Role.DEALER) {res.status(403).json({error:"Bu bölüm yalnızca yönetici ve bayilere açıktır."});return;} next();
});
opticalRouter.use(resultRouter,txtArchiveRouter);
type Handler = (req: AuthenticatedRequest,res: express.Response)=>Promise<void>;
const wrap = (handler: Handler): express.RequestHandler => async(req,res,next)=>{
  try {await handler(req as AuthenticatedRequest,res);} catch(error) {
    if(error instanceof z.ZodError){res.status(400).json({error:error.issues[0]?.message ?? "Geçersiz veri."});return;}
    if(error instanceof Prisma.PrismaClientKnownRequestError){
      if(error.code==="P2034"){res.status(409).json({error:"Sonuç eşzamanlı olarak değişti. Listeyi ve önizlemeyi yenileyin."});return;}
      if(error.code==="P2002"){res.status(409).json({error:"Bu kayıt zaten var veya sonuç sürümü değişti. Listeyi yenileyip mevcut kaydı açın."});return;}
      if(["P2021","P2022"].includes(error.code)){res.status(503).json({error:"Optik değerlendirme veritabanı güncellemesi henüz uygulanmamış."});return;}
    }
    next(error);
  }
};
const admin = requireRole(Role.SUPER_ADMIN);
const scope = (req: AuthenticatedRequest): Prisma.SchoolWhereInput => req.user!.role===Role.SUPER_ADMIN ? {} : {dealerId:req.user!.dealerId ?? "__none__"};
const idParam = (req: AuthenticatedRequest)=>String(req.params.id ?? "");

opticalRouter.get("/templates", wrap(async(req,res)=>{
  res.json(await prisma.opticalTemplate.findMany({where:req.user!.role===Role.SUPER_ADMIN?{}:{active:true},include:{publisher:{select:{id:true,name:true}}},orderBy:{createdAt:"desc"}}));
}));
opticalRouter.get("/evaluation-templates", wrap(async(_req,res)=>{
  const system=systemEvaluationTemplates();
  const saved=await prisma.opticalTemplate.findMany({where:{OR:[{active:true},{id:{in:system.map(t=>t.id)}}]},select:{id:true,name:true,layout:true,grade:true,active:true,publisher:{select:{id:true,name:true}}},orderBy:{createdAt:"desc"}});
  const ids=new Set(saved.map(t=>t.id));
  res.json([...saved.filter(t=>t.active),...system.filter(t=>!ids.has(t.id)).map(({originalFmt,...metadata})=>metadata)]);
}));
opticalRouter.get("/templates/examples/:code/download",wrap(async(req,res)=>{
 const code=String(req.params.code),entry=findLibraryFmt(code);if(!entry){res.status(404).json({error:"Sistem FMT dosyası bulunamadı."});return;}
 res.attachment(entry.downloadName).type("application/octet-stream").send(libraryFmtBytes(code));
}));
opticalRouter.get("/templates/:id/download",wrap(async(req,res)=>{
  const template=await prisma.opticalTemplate.findFirst({where:{id:idParam(req),...(req.user!.role===Role.SUPER_ADMIN?{}:{active:true})}});
  if(!template){res.status(404).json({error:"Etkin FMT dosyası bulunamadı."});return;}
  if(!hasFmt(template)){res.status(404).json({error:"Bu şablonda özgün FMT dosyası yok. JSON yerleşimi FMT olarak indirilemez; özgün dosyayı yeniden içe aktarın."});return;}
  const filename=template.name.replace(/[\\/:*?"<>|\x00-\x1f]/g,"-").replace(/\.fmt$/i,"").slice(0,140)+".fmt";
  res.setHeader("Cache-Control","private, no-store");res.attachment(filename).type("application/octet-stream").send(fmtBytes(template.originalFmt,template.originalBase64));
}));
opticalRouter.get("/templates/:id/layout",wrap(async(req,res)=>{
 const template=await prisma.opticalTemplate.findFirst({where:{id:idParam(req),...(req.user!.role===Role.SUPER_ADMIN?{}:{active:true})}});if(!template){res.status(404).json({error:"Şablon bulunamadı."});return;}
 res.attachment(`${template.name.replace(/[\\/:*?"<>|]/g,"-")}.layout.json`).type("application/json").send(JSON.stringify({schemaVersion:1,name:template.name,layout:template.layout},null,2));
}));
opticalRouter.post("/templates/analyze",admin,wrap(async(req,res)=>{
 const {originalFmt}=z.object({originalFmt:z.string().min(1).max(64000)}).parse(req.body);try{res.json({...analyzeFmt(originalFmt),detectedSource:detectFmtSource(originalFmt)});}catch(e){res.status(400).json({error:(e as Error).message});}
}));
opticalRouter.post("/templates",admin,wrap(async(req,res)=>{
  const data=templateInput.parse(req.body);
  const verification=verificationSchema.safeParse(data.verification);
  if(!verification.success||!checkFmtProof(req.user!.id,data.originalFmt,data.layout,verification.data)){res.status(400).json({error:"Koordinat / TXT / kodlama testini ve okuyucu uyumluluk onayını tamamlayın."});return;}
  const {verification:_,...record}=data;
  res.status(201).json(await prisma.opticalTemplate.create({data:{...record,validation:{readerName:verification.data.readerName,readerConfirmed:true,encoding:verification.data.encoding,verifiedAt:new Date().toISOString(),coordinates:inspectFmtCoordinates(data.originalFmt,data.layout)} as unknown as Prisma.InputJsonValue,layout:data.layout as Prisma.InputJsonValue}}));
}));
opticalRouter.post("/templates/bulk",admin,wrap(async(req,res)=>{
  const {templates}=bulkTemplatesInput.parse(req.body);
  for(const t of templates){const v=verificationSchema.safeParse(t.verification);if(!v.success||!checkFmtProof(req.user!.id,t.originalFmt,t.layout,v.data)){res.status(400).json({error:`${t.name}: koordinat / TXT testi ve okuyucu onayı eksik veya değişti.`});return;}}
  const outcome=await prisma.$transaction(async tx=>{
    const existing=await tx.opticalTemplate.findMany({where:{name:{in:templates.map(t=>t.name),mode:"insensitive"}},select:{name:true}});
    if(existing.length)return{error:`Kayıtlı şablon adı var: ${existing.map(t=>t.name).join(", ")}. İsimleri düzeltin; hiçbir kayıt eklenmedi.`};
    const saved=await tx.opticalTemplate.findMany({select:{name:true,originalFmt:true,layout:true}});
    const duplicate=templates.find(t=>saved.some(s=>s.originalFmt&&fmtContentIdentity(s)===fmtContentIdentity(t)));
    if(duplicate)return{error:`${duplicate.name}: aynı FMT içeriği ve TXT yerleşimi zaten kayıtlı; mevcut şablonu kullanın.`};
    const created=[];for(const t of templates){const {verification,...data}=t;created.push(await tx.opticalTemplate.create({data:{...data,validation:{readerName:verification!.readerName,readerConfirmed:true,encoding:verification!.encoding,verifiedAt:new Date().toISOString(),coordinates:inspectFmtCoordinates(t.originalFmt,t.layout)} as unknown as Prisma.InputJsonValue,layout:t.layout as Prisma.InputJsonValue}}));}return{created};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  if("error"in outcome){res.status(409).json({error:outcome.error});return;}res.status(201).json(outcome.created);
}));
// New row-wise endpoint; preserve the existing atomic bulk API for old callers.
opticalRouter.post("/templates/bulk-rows",admin,wrap(async(req,res)=>{
 const input=z.object({templates:z.array(z.unknown()).min(1).max(30)}).parse(req.body),results=[];
 for(const [index,value]of input.templates.entries()){
 const parsed=templateInput.safeParse(value);if(!parsed.success){results.push({index,status:"error",error:parsed.error.issues[0]?.message??"Satır geçersiz."});continue;}
 const t=parsed.data,source=t.sourceFormat==="auto"?detectFmtSource(t.originalFmt):t.sourceFormat;
 if(!t.grade||!t.publisherId||!source){results.push({index,status:"error",error:"Sınıf, yayınevi ve kaynak seçin. Kaynak algılanamıyorsa F, O veya MANUEL seçin."});continue;}
 const v=verificationSchema.safeParse(t.verification);if(!v.success||!checkFmtProof(req.user!.id,t.originalFmt,t.layout,v.data)){results.push({index,status:"error",error:"Koordinat / TXT testi ve onayı eksik veya değişti."});continue;}
 try{
 const result=await prisma.$transaction(async tx=>{
 if(!await tx.publisher.findUnique({where:{id:t.publisherId!},select:{id:true}}))return{error:"Yayınevi bulunamadı."};
 const saved=await tx.opticalTemplate.findMany({select:{name:true,originalFmt:true,layout:true}});
 if(saved.some(row=>row.name.toLocaleLowerCase("tr-TR")===t.name.toLocaleLowerCase("tr-TR")))return{error:"Bu isimde FMT zaten kayıtlı."};
 if(saved.some(row=>row.originalFmt&&fmtContentIdentity(row)===fmtContentIdentity(t)))return{error:"Aynı FMT içeriği ve yerleşimi zaten kayıtlı."};
 const {verification,...data}=t;
 const record=await tx.opticalTemplate.create({data:{...data,sourceFormat:source,layout:t.layout as Prisma.InputJsonValue,validation:{readerName:v.data.readerName,readerConfirmed:true,encoding:v.data.encoding,verifiedAt:new Date().toISOString(),coordinates:inspectFmtCoordinates(t.originalFmt,t.layout)} as unknown as Prisma.InputJsonValue}});return{id:record.id,name:record.name};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 results.push("error"in result?{index,status:"error",error:result.error}:{index,status:"success",...result});
 }catch{results.push({index,status:"error",error:"Kayıt tamamlanamadı. Listeyi yenileyip tekrar kontrol edin; başarılı satırlar korunur."});}
 }
 res.json({results,successCount:results.filter(r=>r.status==="success").length});
}));
opticalRouter.patch("/templates/:id",admin,wrap(async(req,res)=>{
  const data=z.object({active:z.boolean()}).parse(req.body);
  if(!await prisma.opticalTemplate.findUnique({where:{id:idParam(req)}})){res.status(404).json({error:"FMT bulunamadı."});return;}
  res.json(await prisma.opticalTemplate.update({where:{id:idParam(req)},data}));
}));
opticalRouter.get("/publishers",wrap(async(_req,res)=>{res.json(await prisma.publisher.findMany({select:{id:true,name:true},orderBy:{name:"asc"}}));}));
opticalRouter.get("/evaluation-exams",wrap(async(_req,res)=>{
  const exams=await prisma.publishedAnswerKey.findMany({where:evaluationPublicationWhere,include:{publisher:{select:{id:true,name:true}},opticalKey:true},orderBy:[{publisher:{name:"asc"}},{examName:"asc"}]});
  res.json(exams.map(evaluationExamChoice));
}));
opticalRouter.get("/keys",wrap(async(req,res)=>{
  const available=req.user!.role!==Role.SUPER_ADMIN||req.query.available==="true";
  const keys=await prisma.opticalKey.findMany({where:available?{publication:evaluationPublicationWhere}:{},include:{publication:{include:{publisher:{select:{id:true,name:true}}}}},orderBy:{createdAt:"desc"}});
  res.json(keys.filter(key=>{try{evaluationQuestions(key.questions);return true;}catch{return false;}}).map(key=>{const questions=evaluationQuestions(key.questions);return{id:key.id,name:key.publication?.examName??key.name,penalty:key.penalty,active:available?true:key.active,publicationId:key.publicationId,publisher:key.publication?.publisher??null,grade:key.publication?.grade??null,createdAt:key.createdAt,questionCount:questions.length,lessonCounts:Object.fromEntries([...new Set(questions.map(q=>q.lesson))].map(lesson=>[lesson,questions.filter(q=>q.lesson===lesson).length])),booklets:[...new Set(questions.flatMap(q=>Object.keys(q.positions)))].sort()};}));
}));
opticalRouter.get("/keys/:id",admin,wrap(async(req,res)=>{
  const key=await prisma.opticalKey.findUnique({where:{id:idParam(req)},include:{publication:{select:{examName:true}}}});
  if(!key){res.status(404).json({error:"Cevap anahtarı bulunamadı."});return;}
  res.json({...key,name:key.publication?.examName??key.name,fingerprint:keyFingerprint(key.questions,key.penalty)});
}));
opticalRouter.post("/keys",admin,wrap(async(req,res)=>{
  const data=z.object({name:z.string().trim().min(2).max(180),penalty:z.union([z.literal(0),z.literal(3),z.literal(4)]),confirmImport:z.literal(true),questions:opticalQuestionsSchema,publicationId:z.string().min(1).optional()}).parse(req.body);
  if(data.publicationId&&!await prisma.publishedAnswerKey.findUnique({where:{id:data.publicationId}})){res.status(400).json({error:"Arşivdeki sınav bulunamadı."});return;}
  if(data.publicationId){try{evaluationQuestions(data.questions);}catch(e){res.status(400).json({error:(e as Error).message});return;}}
  const {confirmImport,...keyData}=data;
  res.status(201).json(await prisma.opticalKey.create({data:{...keyData,questions:data.questions as Prisma.InputJsonValue}}));
}));
opticalRouter.patch("/keys/:id",admin,wrap(async(req,res)=>{
  const input=z.object({active:z.boolean().optional(),publicationId:z.string().min(1).optional(),questions:opticalQuestionsSchema.optional(),penalty:z.union([z.literal(0),z.literal(3),z.literal(4)]).optional(),confirmImport:z.boolean().optional(),expectedFingerprint:z.string().optional()}).refine(d=>d.active!==undefined||d.publicationId!==undefined||d.questions!==undefined||d.penalty!==undefined).parse(req.body);
  if(input.publicationId&&!await prisma.publishedAnswerKey.findUnique({where:{id:input.publicationId}})){res.status(400).json({error:"Arşivdeki sınav bulunamadı."});return;}
  const contentChange=input.questions!==undefined||input.penalty!==undefined;
  if(contentChange&&!input.confirmImport){res.status(400).json({error:"Tam önizlemeyi inceleyip anahtar değişikliğini onaylayın."});return;}
  let generatedPath:string|undefined;
  const save=async(tx:Prisma.TransactionClient)=>{
    const current=await tx.opticalKey.findUnique({where:{id:idParam(req)}});
    if(!current)return{status:404,error:"Cevap anahtarı bulunamadı."};
    if(input.publicationId&&current.publicationId&&input.publicationId!==current.publicationId)return{status:409,error:"Bu anahtar zaten bir sınava bağlı. Farklı sınav için yeni anahtar oluşturun."};
    if(contentChange&&input.expectedFingerprint!==keyFingerprint(current.questions,current.penalty))return{status:409,error:"Anahtar başka bir işlemde değişti. Güncel kaydı yeniden açın."};
    if((current.publicationId||input.publicationId)&&input.questions){try{evaluationQuestions(input.questions);}catch(e){return {status:400,error:(e as Error).message};}}
    const {expectedFingerprint,confirmImport,...data}=input;
    const key=await tx.opticalKey.update({where:{id:idParam(req)},data:{...data,...(data.questions?{questions:data.questions as Prisma.InputJsonValue}:{})}});
    if(contentChange&&key.publicationId){
      const publication=await tx.publishedAnswerKey.findUnique({where:{id:key.publicationId},include:{publisher:true}});
      if(publication){
        const bytes=await createAnswerKeyPdf(evaluationQuestions(key.questions),{examName:publication.examName,grade:publication.grade,publisherName:publication.publisher.name});
        const storedFileName=`${crypto.randomUUID()}.generated-answer.pdf`;
        const directory=path.resolve(env.STORAGE_DIR,"answer-keys",publication.id);fs.mkdirSync(directory,{recursive:true});generatedPath=path.join(directory,storedFileName);fs.writeFileSync(generatedPath,bytes);
        await tx.answerKeyFile.create({data:{answerKeyId:publication.id,category:"ANSWER_KEY",generated:true,originalFileName:"Onaylı Cevap Anahtarı.pdf",storedFileName,mimeType:"application/pdf",size:bytes.length,storagePath:generatedPath}});
      }
    }
    return{key};
  };
  const result=await (contentChange?prisma.$transaction(save,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable}):save(prisma)).catch(error=>{if(generatedPath)fs.rmSync(generatedPath,{force:true});throw error;});
  if("error"in result){res.status(result.status!).json({error:result.error});return;}
  res.json(result.key);
}));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:2*1024*1024,files:10,fields:12,fieldSize:90000}});
const uploadLimit=new RequestLimiter(30,10*60_000).middleware();
opticalRouter.post("/templates/preview",admin,uploadLimit,upload.single("file"),wrap(async(req,res)=>{
  if(!req.file||!/\.txt$/i.test(req.file.originalname)){res.status(400).json({error:"En fazla 2 MB örnek TXT dosyası seçin."});return;}
  const input=z.object({originalFmt:z.string().max(64000).optional(),readerName:z.string().trim().max(120).optional(),layout:z.string().max(12000),encoding:z.enum(["auto","utf-8","windows-1254"]).default("auto")}).parse(req.body);
  let layout;try{layout=opticalLayoutSchema.parse(JSON.parse(input.layout));}catch{res.status(400).json({error:"FMT yerleşimi geçersiz. Alan çakışmalarını ve karakter konumlarını düzeltin."});return;}
  try{const report=previewFmt(decodeOptical(req.file.buffer,input.encoding),layout);const coordinates=input.originalFmt?inspectFmtCoordinates(input.originalFmt,layout):null;if(coordinates&&!coordinates.valid){report.canSave=false;report.errors.push(...coordinates.errors);report.errorCount+=coordinates.errors.length;}res.json({...report,coordinates,validationToken:report.canSave&&input.originalFmt&&(input.readerName?.length??0)>=2?fmtProof(req.user!.id,input.originalFmt,layout,input.readerName!,input.encoding):undefined});}catch(e){res.status(400).json({error:(e as Error).message});}
}));
async function inferenceTemplates(){
 const saved=await prisma.opticalTemplate.findMany({where:{OR:[{active:true},{id:{in:systemEvaluationTemplates().map(t=>t.id)}}]},select:{id:true,name:true,layout:true,active:true}});
 return [...saved.filter(t=>t.active),...systemEvaluationTemplates().filter(t=>!saved.some(s=>s.id===t.id))];
}
opticalRouter.post("/infer-fmt",uploadLimit,upload.single("file"),wrap(async(req,res)=>{
 const input=z.object({fileIds:z.array(z.string().min(1)).min(1).max(10).optional()}).parse(req.body);
 let files:Express.Multer.File[]=[];
 if(input.fileIds)files=(await readArchivedTxts(req.user!,input.fileIds)).map(item=>item.file);
 else if(req.file&&/\.txt$/i.test(req.file.originalname))files=[req.file];
 if(!files.length){res.status(400).json({error:"Bir TXT dosyası seçin."});return;}
 const templates=await inferenceTemplates();
 const reports=files.map(file=>{try{return inferFmt(decodeOptical(file.buffer),templates);}catch{return {confidence:"failed",message:"FMT tahmini başarısız. Lütfen şablonu manuel seçin.",candidates:[]};}});
 res.json(reports);
}));
for(const mode of ["preview","download"]){
  opticalRouter.post(`/convert/${mode}`,uploadLimit,upload.single("file"),wrap(async(req,res)=>{
    res.setHeader("Cache-Control","private, no-store");
    const input=z.object({sourceId:z.string().min(1).max(100),targetId:z.string().min(1).max(100),inputEncoding:z.enum(["auto","utf-8","windows-1254"]).default("auto"),outputEncoding:z.enum(["utf-8","windows-1254"]).default("windows-1254"),lineEnding:z.enum(["crlf","lf"]).default("crlf"),lessonMap:z.string().max(10000).optional(),allowLoss:z.enum(["true","false"]).default("false")}).parse(req.body);
    if(!req.file||!/\.txt$/i.test(req.file.originalname)){res.status(400).json({error:"En fazla 2 MB boyutunda TXT dosyası yükleyin."});return;}
    let lessonMap:Record<string,string>|undefined;
    try{if(input.lessonMap)lessonMap=z.record(z.string().max(80),z.string().max(80)).parse(JSON.parse(input.lessonMap));}catch{res.status(400).json({error:"Ders eşleştirmeleri geçersiz."});return;}
    const[source,target]=await Promise.all([evaluationTemplate(input.sourceId),evaluationTemplate(input.targetId)]);
    if(!source||!target){res.status(404).json({error:"Etkin kaynak ve hedef FMT seçin."});return;}
    let result;try{result=convertTxt(decodeOptical(req.file.buffer,input.inputEncoding),opticalLayoutSchema.parse(source.layout),opticalLayoutSchema.parse(target.layout),{lessonMap,lineEnding:input.lineEnding,encoding:input.outputEncoding,allowLoss:input.allowLoss==="true"});}catch(e){res.status(400).json({error:e instanceof Error?e.message:"TXT dönüştürülemedi."});return;}
    if(mode==="preview"){res.json(result.report);return;}
    if(!result.report.canDownload){res.status(400).json({error:result.report.errorCount?"Sığmayan alanları ve hataları düzeltmeden çıktı indirilemez.":"Aktarılmayacak alanları kontrol edip veri kaybı onayını işaretleyin."});return;}
    const original=req.file.originalname.split(/[\\/]/).at(-1)!.replace(/\.txt$/i,"");
    const filename=`${original}-${target.name}`.replace(/[\\/:*?"<>|\x00-\x1f]/g,"-").slice(0,160)+".txt";
    res.attachment(filename).type("application/octet-stream").send(result.bytes);
  }));
}
async function evaluationTemplate(id:string){
  const system=systemEvaluationTemplate(id);
  const saved=await prisma.opticalTemplate.findFirst({where:{id,...(system?{}:{active:true})}});
  return saved ? (saved.active!==false?saved:null) : system;
}
for(const endpoint of ["preview","evaluate"]){
  opticalRouter.post(`/${endpoint}`,uploadLimit,upload.fields([{name:"file",maxCount:1},{name:"files",maxCount:10}]),wrap(async(req,res)=>{
    const input=z.object({fileIds:z.array(z.string().min(1).max(100)).min(1).max(10).refine(ids=>new Set(ids).size===ids.length,"Aynı TXT iki kez seçilemez.").optional(),mergeSessions:z.enum(["true","false"]).default("true"),schoolId:z.string().min(1).max(100),templateId:z.string().min(1).max(100),keyId:z.string().min(1).max(100),encoding:z.enum(["auto","utf-8","windows-1254"]).default("auto"),confirmWarnings:z.enum(["true","false"]).optional(),previewToken:z.string().max(3000).optional()}).parse(req.body);
    let archived:Awaited<ReturnType<typeof readArchivedTxts>>=[];
    if(input.fileIds){try{archived=await readArchivedTxts(req.user!,input.fileIds);}catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&["P2021","P2022"].includes(error.code)){res.status(503).json({error:"TXT arşivi migration’ı henüz uygulanmamış: 20261111010000_optical_txt_archive."});return;}res.status(400).json({error:(error as Error).message});return;}}
    const files=archived.length?archived.map(item=>item.file):req.file?[req.file]:Object.values(req.files??{}).flat() as Express.Multer.File[];
    if(!files.length||files.some(file=>!file.buffer.length||!/\.txt$/i.test(file.originalname))){res.status(400).json({error:"En fazla 2 MB boyutunda bir TXT dosyası seçin."});return;}
    const school=await prisma.school.findFirst({where:{id:input.schoolId,active:true,...scope(req)},select:{id:true,name:true}});
    if(!school){res.status(403).json({error:"Bu kurum için yükleme yetkiniz yok veya kurum etkin değil."});return;}
    const [template,key]=await Promise.all([evaluationTemplate(input.templateId),prisma.opticalKey.findFirst({where:{id:input.keyId,publication:evaluationPublicationWhere},include:{publication:{select:{examName:true,grade:true,publisherId:true}}}})]);
    if(!template || !key){res.status(400).json({error:"Etkin bir FMT ve cevap anahtarı seçin."});return;}
    let data,decoded="";
    try {decoded=files.map(file=>decodeOptical(file.buffer,input.encoding).replace(/[\r\n]+$/g,"")).join("\n");data=parseOptical(decoded,opticalLayoutSchema.parse(template.layout),evaluationQuestions(key.questions),school.name,{mergeSessions:input.mergeSessions==="true",hashIdentity:identityHash,encryptIdentity});}
    catch(error){
      const inference=decoded?inferFmt(decoded,systemEvaluationTemplates()):null,best=inference?.candidates[0];
      const suggested=inference?.confidence==="strong"&&best&&!best.aliases.includes(template.id)&&canonicalJson(opticalLayoutSchema.parse(template.layout))!==canonicalJson(systemEvaluationTemplate(best.id)?.layout)?best:undefined;
      res.status(400).json({error:(error instanceof Error?error.message:"TXT okunamadı.")+(suggested?` İçerik ${suggested.name} ile uyumlu görünüyor. Seçili kayıtlı FMT'nin alan konumlarını kontrol edin veya önerilen sistem FMT'sini açıkça seçip yeniden önizleyin.`:""),...(suggested?{fmtSuggestion:{id:suggested.id,name:suggested.name}}:{})});return;
    }
    const uploadChecksum=checksum(decoded+"\nmerge:"+input.mergeSessions);
    const duplicate=await prisma.opticalResult.findFirst({where:{schoolId:school.id,keyId:key.id,templateId:template.id,uploadChecksum,supersedesId:null},select:{id:true,snapshot:true}});
    const previousRows=await prisma.opticalResult.findMany({where:{schoolId:school.id,keyId:key.id,nextRevision:null},orderBy:{createdAt:"desc"}});
    const replaceKeys=new Set<string>();
    for(const item of archived.filter(item=>evaluatedContext(item,school.id,key.id))){
      try{const original=parseOptical(decodeOptical(item.file.buffer,input.encoding),opticalLayoutSchema.parse(template.layout),evaluationQuestions(key.questions),school.name,{mergeSessions:true,hashIdentity:identityHash});for(const student of original.students){if(student.identityHash)replaceKeys.add(student.identityHash);replaceKeys.add(`${student.branch.split("-")[0]}:${studentNumberKey(student.studentNo??student.id)}`);}}catch(error){res.status(400).json({error:(error as Error).message});return;}
    }
    const reprocessing=replaceKeys.size>0;
    if(archived.length>1&&input.mergeSessions==="false"){res.status(400).json({error:"Ayrı oturum modunda dosyalar sırayla değerlendirilmelidir."});return;}
    const activeRows=previousRows.filter(row=>!isDeleted(row.snapshot));
    const separateParent=input.mergeSessions==="false"&&reprocessing?activeRows.find(row=>archived.some(item=>{const context=evaluatedContext(item,school.id,key.id);return context?.id===row.id||context?.seriesId===row.seriesId;})):undefined;
    if(separateParent&&(separateParent.snapshot as any).mergeSessions!==false){res.status(400).json({error:"Bu dosya birleştirilmiş oturumda değerlendirildi. Birleştirme modunu kullanın veya önceki değerlendirmeyi kaldırın."});return;}
    const parent=input.mergeSessions==="true"&&(!duplicate||isDeleted((duplicate as any).snapshot)||reprocessing)?activeRows[0]:separateParent;
    if(parent&&input.mergeSessions==="true"){try{data=mergeStudentData((parent.snapshot as any).data,data,student=>replaceKeys.has(student.identityHash??"")||replaceKeys.has(`${student.branch.split("-")[0]}:${studentNumberKey(student.studentNo??student.id)}`));}catch(error){res.status(400).json({error:(error as Error).message});return;}}
    const snapshot={mergeSessions:input.mergeSessions==="true",expectedGrade:key.publication?.grade,keyFingerprint:keyFingerprint(key.questions,key.penalty),data,summary:opticalSummary(data,key.penalty),penalty:key.penalty,schoolName:school.name,templateName:template.name,keyName:key.publication?.examName??key.name};
    const checks=reviewSnapshot(snapshot);
    if(duplicate&&!isDeleted((duplicate as any).snapshot)&&!reprocessing)checks.blockers.push("Bu TXT aynı kurum ve sınav için zaten yüklendi. Sonuç Al ekranından mevcut kaydı açın.");
    const uploadFingerprint=checksum(canonicalJson({schoolId:school.id,fileIds:input.fileIds,template:opticalLayoutSchema.parse(template.layout),key:snapshot.keyFingerprint,uploadChecksum,parent:parent?.id,merged:checksum(canonicalJson(safeSnapshot(snapshot).data))}));
    if(endpoint==="preview"){res.json({...safeSnapshot(snapshot),checks,previewToken:seal("upload",req.user!.id,school.id,uploadFingerprint)});return;}
    if(!input.previewToken||!validSeal(input.previewToken,"upload",req.user!.id,school.id,uploadFingerprint)){res.status(409).json({error:"Önce TXT’yi kontrol edin. Anahtar veya dosya değiştiyse önizlemeyi yenileyin."});return;}
    if(checks.blockers.length){res.status(409).json({error:checks.blockers.join(" ")});return;}
    if(checks.warnings.length && input.confirmWarnings!=="true"){res.status(400).json({error:"Kontrol özetindeki uyarıları önizlemede inceleyip onaylayın."});return;}
    const result=await prisma.$transaction(async tx=>{
      // Recheck ownership immediately before writing, not just when rendering the selector.
      const allowed=await tx.school.findFirst({where:{id:school.id,active:true,...scope(req)},select:{id:true}});
      if(!allowed)return null;
      const stillAvailable=await tx.opticalKey.findFirst({where:{id:key.id,publication:evaluationPublicationWhere}});
      if(!stillAvailable)return null;
      if(keyFingerprint(stillAvailable.questions,stillAvailable.penalty)!==snapshot.keyFingerprint)throw new z.ZodError([{code:"custom",path:[],message:"Cevap anahtarı değişti. Önizlemeyi yenileyin."}]);
      const repeated=await tx.opticalResult.findFirst({where:{schoolId:school.id,keyId:key.id,templateId:template.id,uploadChecksum,supersedesId:null},select:{snapshot:true}});
      if(repeated&&!isDeleted(repeated.snapshot)&&!reprocessing)throw new z.ZodError([{code:"custom",path:[],message:"Bu TXT zaten kaydedildi. Sınav Sonuçları ekranından açın."}]);
      const systemTemplate=systemEvaluationTemplate(input.templateId);
      const currentTemplate=systemTemplate
        ? await tx.opticalTemplate.upsert({where:{id:systemTemplate.id},update:{},create:{...systemTemplate,layout:systemTemplate.layout as Prisma.InputJsonValue}})
        : await tx.opticalTemplate.findFirst({where:{id:template.id,active:true}});
      if(!currentTemplate||currentTemplate.active===false||canonicalJson(opticalLayoutSchema.parse(currentTemplate.layout))!==canonicalJson(opticalLayoutSchema.parse(template.layout)))throw new z.ZodError([{code:"custom",path:[],message:"FMT değişti veya pasif yapıldı. Önizlemeyi yenileyin."}]);
      if(parent){const current=await tx.opticalResult.findFirst({where:{id:parent.id,nextRevision:null,school:scope(req)}});if(!current||isDeleted(current.snapshot))throw new Error("Oturum kaydı değişti. Dosyayı yeniden değerlendirin.");}
      const created=await tx.opticalResult.create({data:{schoolId:school.id,templateId:template.id,keyId:key.id,createdById:req.user!.id,filename:files.map(file=>file.originalname).join(" + ").slice(0,200),...(parent?{seriesId:parent.seriesId,revision:parent.revision+1,supersedesId:parent.id,studentPublished:parent.studentPublished}:{}),uploadChecksum,snapshot:snapshot as unknown as Prisma.InputJsonValue}});
      if(parent){const grants=await tx.studentResultAccess.findMany({where:{resultId:parent.id}});if(grants.length)await tx.studentResultAccess.createMany({data:grants.map(grant=>({userId:grant.userId,resultId:created.id,studentNo:grant.studentNo,studentName:grant.studentName}))});if(parent.studentPublished)await tx.opticalResult.update({where:{id:parent.id},data:{studentPublished:false}});}
      if(input.fileIds){const updated=await tx.opticalTxtFile.updateMany({where:{id:{in:input.fileIds},deletedAt:null,...archiveScope(req.user!)},data:{evaluatedAt:new Date(),resultId:created.id}});if(updated.count!==input.fileIds.length)throw new Error("TXT arşivi değişti. Dosya listesini yenileyin.");await tx.opticalTxtUse.createMany({data:input.fileIds.map(fileId=>({fileId,resultId:created.id})),skipDuplicates:true});}
      return created;
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    if(!result){res.status(403).json({error:"Kurum erişimi değişti. Listeyi yenileyin."});return;}
    res.status(201).json({id:result.id,createdAt:result.createdAt,studentPublished:result.studentPublished,revision:result.revision,seriesId:result.seriesId,checks,schoolId:school.id,keyId:key.id,...safeSnapshot(snapshot)});
  }));
}
opticalRouter.get("/results",wrap(async(req,res)=>{
  const schoolId=typeof req.query.schoolId==="string"?req.query.schoolId:undefined;
  const items=await prisma.opticalResult.findMany({where:{...(schoolId?{schoolId}:{}),...(typeof req.query.seriesId==="string"?{seriesId:req.query.seriesId}:{}),school:scope(req),...(req.query.history==="true"?{}:{nextRevision:null})},select:{schoolId:true,revision:true,seriesId:true,id:true,filename:true,createdAt:true,studentPublished:true,snapshot:true,school:{select:{name:true}},key:{select:{name:true}},template:{select:{name:true}}},orderBy:{createdAt:"desc"}});
  res.json(items.filter(item=>req.query.deleted==="true"?isDeleted(item.snapshot):!isDeleted(item.snapshot)).map(({snapshot,...item})=>item));
}));
opticalRouter.get("/results/:id",wrap(async(req,res)=>{
  const item=await prisma.opticalResult.findFirst({where:{id:idParam(req),school:scope(req)},select:{schoolId:true,id:true,revision:true,seriesId:true,createdAt:true,snapshot:true,studentPublished:true,nextRevision:{select:{id:true}}}});
  if(!item||isDeleted(item.snapshot)){res.status(404).json({error:"Sonuç bulunamadı veya erişim yetkiniz yok."});return;}
  res.json({schoolId:item.schoolId,id:item.id,revision:item.revision,seriesId:item.seriesId,isLatest:!item.nextRevision,createdAt:item.createdAt,studentPublished:item.studentPublished,...safeSnapshot(item.snapshot as any),checks:reviewSnapshot(item.snapshot as unknown as Snapshot)});
}));
// Tokens bind the reviewed snapshot/key to this user and expire after 15 minutes.
const seal=(kind:string,userId:string,resultId:string,fingerprint:string)=>{
  const payload=Buffer.from(JSON.stringify({kind,userId,resultId,fingerprint,expires:Date.now()+15*60_000})).toString("base64url");
  return payload+"."+crypto.createHmac("sha256",env.JWT_SECRET).update("optical-review:"+payload).digest("base64url");
};
function validSeal(token:string,kind:string,userId:string,resultId:string,fingerprint:string){
  try{const[payload,signature]=token.split("."),expected=crypto.createHmac("sha256",env.JWT_SECRET).update("optical-review:"+payload).digest("base64url");if(!signature||signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return false;const v=JSON.parse(Buffer.from(payload,"base64url").toString());return v.kind===kind&&v.userId===userId&&v.resultId===resultId&&v.fingerprint===fingerprint&&v.expires>Date.now();}catch{return false;}
}
async function currentResult(req:AuthenticatedRequest){return prisma.opticalResult.findFirst({where:{id:idParam(req),school:scope(req)},include:{key:true,nextRevision:{select:{id:true}}}});}
opticalRouter.get("/results/:id/analysis",wrap(async(req,res)=>{
  const item=await currentResult(req);if(!item){res.status(404).json({error:"Sonuç bulunamadı veya yetkiniz yok."});return;}
  res.json(analyzeSnapshot(item.snapshot as unknown as Snapshot,typeof req.query.branch==="string"?req.query.branch:undefined));
}));
opticalRouter.get("/results/:id/checks",wrap(async(req,res)=>{
  const item=await currentResult(req);if(!item){res.status(404).json({error:"Sonuç bulunamadı veya yetkiniz yok."});return;}
  const snapshot=item.snapshot as unknown as Snapshot,checks=reviewSnapshot(snapshot);
  let fingerprint:string;try{fingerprint=keyFingerprint(item.key.questions,item.key.penalty);}catch{checks.blockers.push("Güncel cevap anahtarı eksik veya geçersiz. Cevap Anahtarları bölümünden tamamlayın.");res.json(checks);return;}
  if(item.nextRevision)checks.blockers.push("Bu kaydın daha yeni sürümü var. Son sürümü yayımlayın.");
  if(fingerprint!==(snapshot.keyFingerprint??keyFingerprint(snapshot.data.questions,snapshot.penalty)))checks.blockers.push("Cevap anahtarı değişti. Önce yeni anahtarla tekrar değerlendirin.");
  res.json({...checks,reviewToken:seal("publish",req.user!.id,item.id,fingerprint)});
}));
opticalRouter.patch("/results/:id/publication",wrap(async(req,res)=>{
  const data=z.object({published:z.boolean(),reviewToken:z.string().optional(),confirmWarnings:z.boolean().optional()}).parse(req.body);
  if(!data.published){const changed=await prisma.opticalResult.updateMany({where:{id:idParam(req),school:scope(req)},data:{studentPublished:false}});if(!changed.count){res.status(404).json({error:"Sonuç bulunamadı veya yayımlama yetkiniz yok."});return;}res.json({studentPublished:false});return;}
  const outcome=await prisma.$transaction(async tx=>{
    const item=await tx.opticalResult.findFirst({where:{id:idParam(req),school:scope(req)},include:{key:true,nextRevision:{select:{id:true}}}});
    if(!item)return "Sonuç bulunamadı veya yayımlama yetkiniz yok.";
    const snapshot=item.snapshot as unknown as Snapshot,checks=reviewSnapshot(snapshot);
    let fingerprint:string;try{fingerprint=keyFingerprint(item.key.questions,item.key.penalty);}catch{return "Güncel cevap anahtarı eksik veya geçersiz. Cevap Anahtarları bölümünden tamamlayın.";}
    if(item.nextRevision)return "Daha yeni sürüm var. Son sürümü açın.";
    if(fingerprint!==(snapshot.keyFingerprint??keyFingerprint(snapshot.data.questions,snapshot.penalty)))return "Cevap anahtarı değişti. Tekrar değerlendirin.";
    if(!data.reviewToken||!validSeal(data.reviewToken,"publish",req.user!.id,item.id,fingerprint))return "Yayımlama öncesi kontrol özetini yeniden açıp onaylayın.";
    if(checks.blockers.length)return checks.blockers.join(" ");
    if(checks.warnings.length&&!data.confirmWarnings)return "Kontrol özetindeki uyarıları onaylayın.";
    await tx.opticalResult.updateMany({where:{seriesId:item.seriesId,school:scope(req)},data:{studentPublished:false}});
    await tx.opticalResult.update({where:{id:item.id},data:{studentPublished:true,reviewedAt:new Date()}});return null;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  if(outcome){res.status(409).json({error:outcome});return;}res.json({studentPublished:true});
}));
for(const mode of ["preview","save"]){opticalRouter.post(`/results/:id/re-evaluate${mode==="preview"?"/preview":""}`,wrap(async(req,res)=>{
  const item=await currentResult(req);if(!item){res.status(404).json({error:"Sonuç bulunamadı veya yetkiniz yok."});return;}
  if(item.nextRevision){res.status(409).json({error:"Daha yeni sürüm var. Son sürüm üzerinden devam edin."});return;}
  const key=await prisma.opticalKey.findFirst({where:{id:item.keyId,publication:evaluationPublicationWhere},include:{publication:{select:{grade:true,examName:true}}}});
  if(!key){res.status(400).json({error:"Sınavın değerlendirme anahtarı etkin değil veya eksik."});return;}
  let next:Snapshot;try{next=reEvaluate(item.snapshot as unknown as Snapshot,evaluationQuestions(key.questions),key.penalty);next.expectedGrade=key.publication?.grade??next.expectedGrade;next.keyName=key.publication?.examName??key.name;}catch(e){res.status(400).json({error:(e as Error).message});return;}
  const checks=reviewSnapshot(next),changes=scoreChanges(item.snapshot as unknown as Snapshot,next),fingerprint=keyFingerprint(key.questions,key.penalty);
  if(mode==="preview"){res.json({checks,changes,changedCount:changes.filter(c=>c.changed).length,previewToken:seal("reevaluate",req.user!.id,item.id,fingerprint)});return;}
  const input=z.object({previewToken:z.string(),confirm:z.literal(true)}).parse(req.body);
  if(!validSeal(input.previewToken,"reevaluate",req.user!.id,item.id,fingerprint)){res.status(409).json({error:"Önizleme eskidi veya cevap anahtarı değişti. Yeniden önizleyin."});return;}
  if(checks.blockers.length){res.status(409).json({error:checks.blockers.join(" ")});return;}
  const saved=await prisma.$transaction(async tx=>{
    const current=await tx.opticalResult.findFirst({where:{id:item.id,school:scope(req),nextRevision:null}}),latestKey=await tx.opticalKey.findFirst({where:{id:key.id,publication:evaluationPublicationWhere}});
    if(!current||!latestKey||keyFingerprint(latestKey.questions,latestKey.penalty)!==fingerprint)return null;
    const created=await tx.opticalResult.create({data:{schoolId:item.schoolId,keyId:item.keyId,templateId:item.templateId,createdById:req.user!.id,filename:item.filename,seriesId:item.seriesId,revision:item.revision+1,supersedesId:item.id,uploadChecksum:item.uploadChecksum,snapshot:next as unknown as Prisma.InputJsonValue}});
    const grants=await tx.studentResultAccess.findMany({where:{resultId:item.id}});
    if(grants.length)await tx.studentResultAccess.createMany({data:grants.map(g=>({userId:g.userId,resultId:created.id,studentNo:g.studentNo,studentName:g.studentName}))});
    return created;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  if(!saved){res.status(409).json({error:"Sonuç veya anahtar değişti. Önizlemeyi yenileyin."});return;}
  res.status(201).json({id:saved.id,revision:saved.revision,seriesId:saved.seriesId,isLatest:true,createdAt:saved.createdAt,studentPublished:false,...next,checks});
}));}
