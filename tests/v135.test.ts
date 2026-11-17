import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {inferFmt} from "../apps/api/src/fmt-inference";
import {parseOptical,type OpticalLayout} from "../apps/api/src/optical-core";
import {inspectTxt} from "../apps/api/src/txt-limits";
import {parseStoreWorkbook,storeWorkbook,adjustedPrice,applyStoreChanges} from "../apps/api/src/store-core";
import {validateSupportedUpload} from "../apps/api/src/upload-security";
import {portalCode,portalHash,maskStudent,studentKey} from "../apps/api/src/student-portal";
const x=require("xlsx");
const layout:OpticalLayout={lineLength:40,fields:{id:{start:1,length:5},name:{start:6,length:15},booklet:{start:21,length:1}},lessons:[{name:"TÜRKÇE",start:22,length:10}]};
export const syntheticTxt=(count:number)=>Array.from({length:count},(_,i)=>String(i+1).padStart(5,"0")+"ORNEK OGRENCI".padEnd(15)+"A"+"ABCDABCDAB"+" ".repeat(9)).join("\n");
const templates=[{id:"synthetic",name:"Sentetik FMT",layout}];
test("v135 5.000 sentetik kayıt: tüm satırlar incelenir ve değerlendirilir; 5.001 ve uzun satır reddedilir",()=>{
 const txt=syntheticTxt(5000),started=performance.now(),report=inferFmt(txt,templates),inferenceMs=performance.now()-started;
 assert.equal(report.candidates[0].sampled,5000);assert.equal(report.candidates[0].valid,5000);assert.equal(report.candidates[0].score,1);
 const qs=Array.from({length:10},(_,i)=>({lesson:"TÜRKÇE",number:i+1,answer:"ABCDABCDAB"[i],weight:1,positions:{A:i+1}})),startParse=performance.now();
 const parsed=parseOptical(txt,layout,qs,"Sentetik Kurum");assert.equal(parsed.students.length,5000);assert.equal(parsed.lineCount,5000);
 const altered=txt.split("\n");altered[4999]=altered[4999].slice(0,20)+"Z"+altered[4999].slice(21);assert.equal(inferFmt(altered.join("\n"),templates).candidates[0].valid,4999);
 assert.throws(()=>inspectTxt(syntheticTxt(5001)),/5.000/);assert.equal(inferFmt(syntheticTxt(5001),templates).confidence,"failed");assert.throws(()=>inspectTxt("x".repeat(4001)),/4.000/);
 fs.mkdirSync("test-results/v135",{recursive:true});fs.writeFileSync("test-results/v135/txt-benchmark.json",JSON.stringify({records:5000,bytes:Buffer.byteLength(txt),inferenceMs,parseMs:performance.now()-startParse,node:process.version},null,2));
});
test("v135 FMT regresyonu: önceki kaynakla aynı aday, güven ve skor; örnekleme yok",()=>{
 const ts=require("typescript"),source=fs.readFileSync("tests/fixtures/v134-fmt-inference.txt","utf8"),compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports:any={};new Function("exports","require",compiled)(exports,createRequire(path.resolve("apps/api/src/fmt-inference.ts")));
 for(const count of [1,2,100,2000])assert.deepEqual(inferFmt(syntheticTxt(count),templates),exports.inferFmt(syntheticTxt(count),templates));
 const extended=source.replace("lines.length>2000","lines.length>5000"),exports2:any={};new Function("exports","require",ts.transpileModule(extended,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports2,createRequire(path.resolve("apps/api/src/fmt-inference.ts")));assert.deepEqual(inferFmt(syntheticTxt(5000),templates),exports2.inferFmt(syntheticTxt(5000),templates));
});
function product(i=1){return {id:`p${i}`,barcode:"0012345678901",name:"Örnek Kitap",description:"Açıklama",price:"125.50",discount:10,stock:12,categoryId:"cat",brandId:"brand",grade:8,lesson:"Türkçe",images:[],active:true};}
test("v135 Excel şablonu ID ve baştaki sıfırları korur; sahte XLSX, formül ve SIL reddedilir",async()=>{
 const bytes=storeWorkbook([product()]),parsed=parseStoreWorkbook(bytes,"urunler.xlsx");assert.equal(parsed.errors.length,0);assert.equal(parsed.changes[0].id,"p1");assert.equal(parsed.changes[0].data.barcode,"0012345678901");assert.equal(parsed.changes[0].data.price,125.5);
 assert.throws(()=>parseStoreWorkbook(Buffer.from("not xlsx"),"fake.xlsx"));await assert.rejects(()=>validateSupportedUpload(Buffer.from("MZ evil"),"fake.xlsx"));
 const book=x.read(bytes,{type:"buffer"});book.Sheets.Urunler.E2={t:"n",f:"1+1",v:2};assert.throws(()=>parseStoreWorkbook(x.write(book,{type:"buffer",bookType:"xlsx"}),"formula.xlsx"),/Formül/);
 const rows=x.utils.sheet_to_json(x.read(bytes,{type:"buffer"}).Sheets.Urunler,{header:1});rows[0].push("SIL");rows[1].push("1");const b=x.utils.book_new();x.utils.book_append_sheet(b,x.utils.aoa_to_sheet(rows),"Urunler");assert.match(parseStoreWorkbook(x.write(b,{type:"buffer",bookType:"xlsx"}),"sil.xlsx").errors[0].message,/SIL/);
});
test("v135 ürün fiyatı kuruşa yuvarlanır, tek geçersiz ilişkide hiçbir yazma yapılmaz",async()=>{
 assert.equal(adjustedPrice(100,15),115);assert.equal(adjustedPrice(125.5,-15),106.68);
 let writes=0;const db={storeCategory:{findMany:async()=>[]},storeBrand:{findMany:async()=>[{id:"brand"}]},storeProduct:{findMany:async()=>[product()],update:async()=>writes++,create:async()=>writes++}};
 const changes=parseStoreWorkbook(storeWorkbook([product()]),"p.xlsx").changes;await assert.rejects(()=>applyStoreChanges(db,changes,"different"));assert.equal(writes,0);
});
test("v135 kişisel kodlar rastgele, yalnız özetlenir; numara tekrarında farklı kimlikler karışmaz",()=>{
 const codes=new Set(Array.from({length:5000},()=>portalCode()));assert.equal(codes.size,5000);for(const c of codes){assert.match(c,/^[A-Za-z0-9_-]{24}$/);assert.equal(portalHash(c).length,64);assert.notEqual(portalHash(c),c);}assert.equal(maskStudent("Ahmet Çalışkan"),"Ahmet Ç****");assert.notEqual(studentKey({id:"1",name:"ÖRNEK A"}),studentKey({id:"1",name:"ÖRNEK B"}));
});

test("v135 kurum kod PDF çıktısı Türkçe metin ve sıfırlı numarayı korur",async()=>{const {studentCodesPdf}=await import("../apps/api/src/student-code-pdf");const code="AbCdEfGhIjKlMnOpQrStUvWx",bytes=await studentCodesPdf([["00001","2026-2027",code]],"Örnek Kurum");const {readPdfText}=require("../apps/api/lib/pdf-text.cjs");const pages=await readPdfText(bytes),text=pages.flat().map((v:any)=>v.text).join(" ");assert.equal(pages.length,1);assert.match(text,/Örnek Kurum/);assert.match(text,/00001/);assert.ok(text.includes(code));});
