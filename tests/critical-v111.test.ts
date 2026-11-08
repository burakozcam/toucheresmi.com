import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { readEvaluationExcel,inspectEvaluationExcel } from "../apps/api/src/optical-catalog";
import { reviewImportedQuestions } from "../apps/api/src/answer-import-review";
import { inspectFmtCoordinates,fmtProof,checkFmtProof } from "../apps/api/src/fmt-verification";
import { layout7108,layout8050 } from "../apps/api/src/optical-core";
import fmt7108 from "../apps/web/data/optical-7108.json";
import fmt8050 from "../apps/web/data/optical-8050.json";
const fixture=(file:string)=>path.join(__dirname,"fixtures",file);
test("gerçek özgün Fernus XLS ve Okulizyon XLSX: ham kaynak değerleri ve kazanımlar kayıpsız saklanır",()=>{
 for(const [file,format]of [["fernus-082701.xls","f"],["okulizyon-ankara.xlsx","o"]] as const){const q=readEvaluationExcel(fixture(file),format);assert.equal(q.length,90);assert.equal(q[0].source!.system,format);assert.equal(q[0].source!.values[format==="f"?2:5],q[0].answer);assert.equal(q[0].source!.row,format==="f"?3:4);assert.ok(q[0].source!.columns.length>0);}
 const q=readEvaluationExcel(fixture("okulizyon-ankara.xlsx"),"o").find(q=>q.lesson==="FEN"&&q.number===17)!;assert.equal(q.source!.values[6],q.outcomeCode);assert.ok(q.source!.values[10]);
});
test("içe aktarma: onaysız ve dosyadan kopuk önizleme reddedilir; düzeltme kaydedilir, özgün satır korunur",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"critical-import-")),file=path.join(dir,"source.xls");fs.copyFileSync(fixture("fernus-082701.xls"),file);
 const source={fieldname:"learningOutcomesFile",originalname:"source.xls",path:file,mimetype:"application/vnd.ms-excel",size:fs.statSync(file).size} as Express.Multer.File;
 try{const original=readEvaluationExcel(file,"f"),q=structuredClone(original);q[0].answer="H";q[0].outcomeName="Kullanıcının düzelttiği kazanım";q[0].source!.values[2]="FAKE";const checksum=crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),input={evaluationFormat:"f" as const,reviewedQuestions:JSON.stringify(q),sourceChecksum:checksum,confirmImport:false};
 assert.throws(()=>reviewImportedQuestions([source],input),/onaylayın/);assert.equal(fs.readdirSync(dir).length,1);assert.throws(()=>reviewImportedQuestions([source],{...input,confirmImport:true,sourceChecksum:"stale"}),/değişti/);
 const files=[source],saved=reviewImportedQuestions(files,{...input,confirmImport:true})!;assert.equal(saved[0].answer,"H");assert.equal(saved[0].source!.values[2],"C");assert.equal(files.length,2);assert.equal(files[1].fieldname,"answerKeyFile");assert.equal(readEvaluationExcel(files[1].path)[0].answer,"H");assert.deepEqual(fs.readFileSync(file),fs.readFileSync(fixture("fernus-082701.xls")));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("FMT gerçek koordinatlar: iki örnek, kapasite ve çakışma; başlık parametreleri boyut tahminine dönüştürülmez",()=>{
 const a=inspectFmtCoordinates(fmt7108.originalFmt,layout7108),b=inspectFmtCoordinates(fmt8050.originalFmt,layout8050);assert.equal(a.valid,true);assert.equal(b.valid,true);const short=structuredClone(layout8050);short.lessons.find(l=>l.name==="DİN")!.length=19;assert.ok(inspectFmtCoordinates(fmt8050.originalFmt,short).errors.some(e=>e.includes("DİN KÜLTÜRÜ")));assert.equal(a.columns,43); // Real 7108 has column 43 despite second header parameter 42.
 const bad=structuredClone(layout7108);bad.fields.id.length=6;assert.ok(inspectFmtCoordinates(fmt7108.originalFmt,bad).errors.some(e=>e.includes("kapasitesi")));
 const coordinates=fmt7108.originalFmt.replace("07=16=26=30","00=16=26=30");assert.equal(inspectFmtCoordinates(coordinates,layout7108).valid,false);assert.equal(inspectFmtCoordinates("unsupported",layout7108).valid,false);
});
test("FMT doğrulama kanıtı kullanıcıya, okuyucuya, FMT’ye, kodlamaya ve alanlara bağlıdır",()=>{
 const token=fmtProof("admin",fmt7108.originalFmt,layout7108,"QA Reader","utf-8"),verification={readerName:"QA Reader",readerConfirmed:true as const,encoding:"utf-8" as const,token};
 assert.equal(checkFmtProof("admin",fmt7108.originalFmt,layout7108,verification),true);assert.equal(checkFmtProof("other",fmt7108.originalFmt,layout7108,verification),false);assert.equal(checkFmtProof("admin",fmt7108.originalFmt,layout7108,{...verification,readerName:"Different"}),false);assert.equal(checkFmtProof("admin",fmt7108.originalFmt,layout7108,{...verification,encoding:"auto"}),false);
 const changed=structuredClone(layout7108);changed.fields.name.start++;assert.equal(checkFmtProof("admin",fmt7108.originalFmt,changed,verification),false);
});
test("ayrı F/O modülleri var; hatalı kaynak satırı düzeltilebilir önizlemeye taşınır",()=>{
 assert.ok(fs.existsSync(path.join(__dirname,"../apps/web/lib/optical-parsers/fernus.js")));assert.ok(fs.existsSync(path.join(__dirname,"../apps/web/lib/optical-parsers/okulizyon.js")));
 const {parseWorkbook}=require("../apps/web/lib/optical-import.js"),sheets=structuredClone(require("./fixtures/fernus-082701.json"));sheets[0].rows[2][2]="";const result=parseWorkbook(sheets,"f",{allowInvalid:true});assert.equal(result.questions.length,90);assert.ok(result.issues.some((s:string)=>s.includes("satır 3")));assert.equal(result.questions[0].answer,"");assert.throws(()=>parseWorkbook(sheets,"f"),/geçersiz/);
});
test("API: açık onay olmadan ana sayfaya veya değerlendirmeye kayıt yayımlanmaz",async()=>{
 const {app}=await import("../apps/api/src/server"),{prisma}=await import("../apps/api/src/db");const find=prisma.publisher.findFirst,create=prisma.publishedAnswerKey.create;let writes=0;
 prisma.publisher.findFirst=(async()=>({id:"pub"})) as any;prisma.publishedAnswerKey.create=(async()=>{writes++;return{};}) as any;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"no-publish-")),file=path.join(dir,"source.pdf");fs.writeFileSync(file,"%PDF-1.4\nTest");
 try{const handler=(app as any).router.stack.find((l:any)=>l.route?.path==="/api/admin/answer-keys"&&l.route.methods.post).route.stack.at(-1).handle;let status=200,message="";await handler({body:{publisherId:"pub",grade:"8",examName:"Onaysız",published:"true",showInEvaluation:"true"},files:{answerKeyFile:[{fieldname:"answerKeyFile",originalname:"source.pdf",path:file,size:14,mimetype:"application/pdf"}]}},{status(n:number){status=n;return this;},json(v:any){message=v.error;}},(e:any)=>{if(e)throw e;});assert.equal(status,400);assert.match(message,/onaylayın/);assert.equal(writes,0);}finally{prisma.publisher.findFirst=find;prisma.publishedAnswerKey.create=create;fs.rmSync(dir,{recursive:true,force:true});}
});
test("FMT toplu kayıt doğrulama kanıtı yoksa veritabanı işlemi bile başlamaz",async()=>{
 const {opticalRouter}=await import("../apps/api/src/optical-routes"),{prisma}=await import("../apps/api/src/db"),original=prisma.$transaction;let calls=0;prisma.$transaction=(async()=>{calls++;}) as any;
 try{const handler=(opticalRouter as any).stack.find((l:any)=>l.route?.path==="/templates/bulk").route.stack.at(-1).handle;let status=200;await handler({user:{id:"admin"},body:{templates:[{name:"Doğrulanmamış",originalFmt:fmt7108.originalFmt,layout:layout7108}]}},{status(n:number){status=n;return this;},json(){}},(e:any)=>{if(e)throw e;});assert.equal(status,400);assert.equal(calls,0);}finally{prisma.$transaction=original;}
});
