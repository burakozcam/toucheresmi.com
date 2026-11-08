import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {layout8050,layout7108,opticalLayoutSchema,decodeOptical} from "../apps/api/src/optical-core";
import {layout8050 as webLayout} from "../apps/web/lib/optical";
import {convertTxt} from "../apps/api/src/txt-converter";
import {fmtBytes} from "../apps/api/src/fmt-download";
import fmt from "../apps/web/data/optical-8050.json";
const input=fs.readFileSync(path.join(__dirname,"fixtures/8050-anonymous.txt"),"utf8");
test("8050: gerçek FMT/TXT ile doğrulanan 171 karakterlik yerleşim; ad-soyad tek alan, 8050 sabiti yok",()=>{
  assert.deepEqual(webLayout,layout8050);assert.equal(opticalLayoutSchema.safeParse(layout8050).success,true);
  assert.equal(layout8050.fields.name.start,17);assert.equal(layout8050.fields.name.length,20);assert.equal(layout8050.fields.surname,undefined);assert.deepEqual(layout8050.literals,[]);
  assert.equal(layout8050.fields.booklet.start,37);assert.equal(layout8050.fields.examNumber?.start,169);
  assert.deepEqual(layout8050.lessons.map(l=>l.start),[49,69,89,109,129,149]);
  const positions=new Set<number>();for(const f of [...Object.values(layout8050.fields),...layout8050.lessons])if(f)for(let i=f.start;i<f.start+f.length;i++)positions.add(i);
  assert.equal(positions.size,171);
});
test("8050: 19 satırlık örneğin kimliksiz 9. satırı raporlanır, satırlar sessizce atlanmaz",()=>{
  const result=convertTxt(input,layout8050,layout8050);assert.equal(result.report.sourceLines,19);assert.equal(result.report.outputLines,19);assert.equal(result.report.errorCount,1);assert.equal(result.report.canDownload,false);
  assert.equal(result.report.issues[0].line,9);assert.equal(result.report.issues[0].field,"Kimlik");assert.equal(result.report.lossCount,0);
  const valid=input.split(/\r?\n/).filter((line,i)=>line&&i!==8).join("\r\n")+"\r\n";
  const checked=convertTxt(valid,layout8050,layout8050);assert.equal(checked.report.canDownload,true);assert.equal(decodeOptical(checked.bytes),valid);
});
test("7108 → gerçek 8050: ad-soyad birleşir, numara/kitapçık/TC/cevaplar doğru konumlara taşınır",()=>{
  const source=fs.readFileSync(path.join(__dirname,"fixtures/7108-anonymous.txt"),"utf8"),result=convertTxt(source,layout7108,layout8050);
  assert.equal(result.report.canDownload,true);assert.equal(result.report.errorCount,0);assert.equal(result.report.lossCount,0);
  const inputLines=source.trimEnd().split(/\r?\n/),outputLines=decodeOptical(result.bytes).split("\r\n").filter(Boolean);
  assert.equal(outputLines.length,4);
  outputLines.forEach((row,i)=>{const original=source.split(/\r?\n/)[i];assert.equal(row.length,171);assert.equal(row.slice(8,14).trim(),original.slice(10,15).trim());assert.equal(row[14],original[35]);assert.equal(row[36],original[50]);assert.equal(row.slice(37,48),original.slice(37,48));assert.equal(row.slice(48,168),original.slice(51,171));assert.equal(row[169],original[48]);assert.equal(row[170],original[49]);assert.equal(row[168]," ");});
  assert.equal(outputLines[0].slice(16,36).trim(),"ORNEK BIR");assert.equal(outputLines[0].slice(8,14),"00001 ");assert.equal(outputLines[0][14],"8");assert.equal(outputLines[0].slice(0,8),"        ");assert.equal(inputLines.length,4);
});
test("8050: sınav numarası hedefte yoksa kayıp uyarısı; özgün FMT baytları indirmede korunur",()=>{
  const first=input.split(/\r?\n/)[0],withExam=first.slice(0,168)+"3"+first.slice(169)+"\r\n",target=structuredClone(layout8050);delete target.fields.examNumber;
  const result=convertTxt(withExam,layout8050,target);assert.equal(result.report.errorCount,0);assert.equal(result.report.lossCount,1);assert.equal(result.report.issues[0].field,"Sınav numarası");assert.equal(result.report.canDownload,false);
  const bytes=fmtBytes(fmt.originalFmt,fmt.originalBase64);assert.equal(bytes.length,660);assert.equal(new TextDecoder("windows-1254").decode(bytes),fmt.originalFmt);
});
