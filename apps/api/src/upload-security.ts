import fs from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { SecurityError } from "./security-errors";
export function privateStoragePath(root:string,target:string){const resolved=path.resolve(target),base=path.resolve(root);if(!resolved.startsWith(base+path.sep))throw new SecurityError(404,"Dosya bulunamadı.");return resolved;}
/** Verify declared AND actual expanded ZIP sizes before SheetJS sees any workbook XML. */
export function inspectWorkbookBytes(bytes:Buffer){
 if(bytes.length>10*1024*1024)throw new SecurityError(413,"Excel dosyası en fazla 10 MB olabilir.");
 if(bytes.readUInt32LE(0)!==0x04034b50)return; // OLE and text are handled by their own signatures/parsers.
 let eocd=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(bytes.readUInt32LE(i)===0x06054b50){eocd=i;break;}
 if(eocd<0)throw new SecurityError(400,"Bozuk Excel ZIP yapısı.");
 const entries=bytes.readUInt16LE(eocd+10);let offset=bytes.readUInt32LE(eocd+16),total=0;
 if(entries>2000||bytes.readUInt16LE(eocd+4)!==0||bytes.readUInt16LE(eocd+6)!==0)throw new SecurityError(400,"Excel arşivinin dosya sayısı veya biçimi desteklenmiyor.");
 for(let i=0;i<entries;i++){
  if(offset+46>eocd||bytes.readUInt32LE(offset)!==0x02014b50)throw new SecurityError(400,"Bozuk Excel dizini.");
  const flags=bytes.readUInt16LE(offset+8),method=bytes.readUInt16LE(offset+10),compressed=bytes.readUInt32LE(offset+20),expanded=bytes.readUInt32LE(offset+24),nameLength=bytes.readUInt16LE(offset+28),local=bytes.readUInt32LE(offset+42);
  if((flags&1)||![0,8].includes(method)||expanded>20*1024*1024||total+expanded>40*1024*1024||local+30>bytes.length||bytes.readUInt32LE(local)!==0x04034b50)throw new SecurityError(400,"Excel arşivi güvenli açma sınırını aşıyor veya şifreli.");
  const name=bytes.toString("utf8",offset+46,offset+46+nameLength);if(name.split(/[\\/]/).includes("..")||/^[\\/]/.test(name))throw new SecurityError(400,"Excel arşiv yolu geçersiz.");
  const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28),end=start+compressed;if(end>bytes.length)throw new SecurityError(400,"Excel dosyası eksik.");
  let actual:Buffer;try{actual=method===8?inflateRawSync(bytes.subarray(start,end),{maxOutputLength:Math.max(1,Math.min(20*1024*1024,expanded+1))}):bytes.subarray(start,end);}catch{throw new SecurityError(400,"Excel sıkıştırma verisi geçersiz veya açma sınırını aşıyor.");}
  if(actual.length!==expanded)throw new SecurityError(400,"Excel açılmış dosya boyutu uyuşmuyor.");total+=actual.length;
  offset+=46+nameLength+bytes.readUInt16LE(offset+30)+bytes.readUInt16LE(offset+32);
 }
}
export function safeWorkbookRead(bytes:Buffer|string,options:any={}){if(Buffer.isBuffer(bytes)){if(bytes.length<8)throw new SecurityError(400,"Excel dosyası eksik.");inspectWorkbookBytes(bytes);}else if(bytes.length>10*1024*1024)throw new SecurityError(413,"Tablo dosyası çok büyük.");return require("xlsx").read(bytes,{...options,sheetRows:10001,cellHTML:false,cellFormula:false});}
export const safeWorkbookFile=(file:string,options:any={})=>safeWorkbookRead(fs.readFileSync(file),{...options,type:"buffer"});
