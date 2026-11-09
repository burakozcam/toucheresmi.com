import fs from "node:fs";
import path from "node:path";
import { decodeOptical,type OpticalQuestion } from "./optical-core";
import type { ImportFormat } from "./optical-catalog";
const {parseWorkbook}=require("../lib/optical-import");
const norm=(s:unknown)=>String(s??"").trim().toLocaleUpperCase("tr-TR");
export async function inspectOutcomeFile(filePath:string,originalName:string,format:ImportFormat="auto",allowInvalid=true){
 const extension=path.extname(originalName).toLowerCase();let sheets:Array<{name:string;rows:unknown[][]}>;
 if([".xls",".xlsx",".csv",".tsv"].includes(extension)){
  const x=require("xlsx"),bytes=fs.readFileSync(filePath),book=x.read([".csv",".tsv"].includes(extension)?decodeOptical(bytes):bytes,{type:[".csv",".tsv"].includes(extension)?"string":"buffer",raw:true,cellDates:false});
  sheets=book.SheetNames.map((name:string)=>({name,rows:x.utils.sheet_to_json(book.Sheets[name],{header:1,defval:""})}));
 }else if(extension===".pdf"){
  const pages:Array<Array<{text:string;x:number;y:number;width:number}>>=await require("../lib/pdf-text.cjs").readPdfText(fs.readFileSync(filePath));
  if(pages.reduce((n,p)=>n+p.length,0)<8)throw new Error("PDF taranmış veya okunabilir metin içermiyor. Kaynak Excel/CSV dosyasını yükleyin ya da OCR ile metin katmanı ekleyin; cevaplar tahmin edilmedi.");
  const allRows:unknown[][]=[];let columns:Array<{name:string;x:number}>=[];
  for(const items of pages){const lines:Array<{y:number;items:typeof items}>=[];for(const item of [...items].sort((a,b)=>b.y-a.y||a.x-b.x)){let line=lines.find(l=>Math.abs(l.y-item.y)<3);if(!line){line={y:item.y,items:[]};lines.push(line);}line.items.push(item);}
   for(const line of lines){const cells=line.items.sort((a,b)=>a.x-b.x),text=cells.map(c=>norm(c.text)).join(" ");
    // Column boundaries are taken from an actual table header, never guessed from answers.
    if(cells.some(c=>norm(c.text)==="DERS")&&/CEVAP/.test(text)&&/SORU/.test(text)){
     const headers=cells.map(c=>({name:norm(c.text),x:c.x}));const names=headers.map(c=>c.name);
     if(!names.includes("DERS")||!names.some(n=>["A SORU NO","A SORU","SORU NO"].includes(n))||!names.some(n=>["DOĞRU CEVAP","CEVAP"].includes(n)))throw new Error("PDF tablo başlıkları ayrı ve okunabilir sütunlar olarak alınamadı. Genel Excel/CSV şablonunu kullanın.");
     columns=headers;if(!allRows.length)allRows.push(columns.map(c=>c.name));continue;
    }
    if(!columns.length)continue;const row=columns.map(()=>"");for(const cell of cells){let index=0;for(let j=1;j<columns.length;j++)if(cell.x>=columns[j].x-3)index=j;row[index]=String(row[index]??"")+(row[index]?" ":"")+cell.text;}
    const numberIndex=columns.findIndex(c=>["A SORU NO","A SORU","SORU NO"].includes(c.name));if(/^\d+$/.test(String(row[numberIndex]??"").trim()))allRows.push(row);
   }
  }
  if(allRows.length<2)throw new Error("PDF içindeki soru tablosu güvenilir biçimde okunamadı. Kaynak Excel/CSV dosyasını veya metin katmanı olan tablo PDF’sini kullanın; cevaplar tahmin edilmedi.");
  sheets=[{name:"PDF Tablosu",rows:allRows}];
 }else throw new Error("Bu kazanım dosyası otomatik okunamıyor. Excel, CSV, TSV veya metin tablosu içeren PDF kullanın. Görseller OCR olmadan değerlendirmeye açılmaz.");
 return parseWorkbook(sheets,format,{allowInvalid}) as {questions:OpticalQuestion[];issues:string[];warnings:string[];format:string;examName:string;publisher:string;grade?:number};
}
