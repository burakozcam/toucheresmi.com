import crypto from "node:crypto";
import { z } from "zod";
const secret=()=>require("./config").env.JWT_SECRET as string;
import { opticalLayoutSchema,type OpticalLayout } from "./optical-core";
const normalized=(s:string)=>s.toLocaleUpperCase("tr-TR").replace(/\s+/g," ").trim();
/** Validates the exact equals-delimited reader dialect of the two supplied FMT files. */
export function inspectFmtCoordinates(text:string,layout:OpticalLayout){
 const lines=text.replace(/^\uFEFF/,"").split(/\r\n|\r|\n/).filter(l=>l.trim()),errors:string[]=[],header=lines[0]?.split("=")??[];
 const rows=Number(header[0]),columns=Number(header[1]);
 if(!Number.isInteger(rows)||!Number.isInteger(columns)||rows<1||columns<1||rows>500||columns>500||!/^\d+$/.test(header[2]??""))return {valid:false,errors:["FMT başlığı desteklenen okuyucu biçiminde değil. Koordinatlar tahmin edilmedi."],rows,columns,fields:[]};
 const fields:Array<{name:string;rowStart:number;rowEnd:number;columnStart:number;columnEnd:number;mode:string}>=[];
 for(let i=1;i<lines.length;i++){const p=lines[i].split("="),[r1,r2,c1,c2]=p.slice(0,4).map(Number),name=p[8]?.trim();if(p.length<10||![r1,r2,c1,c2].every(Number.isInteger)||r1<1||r2<r1||r2>500||c1<1||c2<c1||c2>500||!["K","S"].includes(p[4])||! /^[DY]$/.test(p[5]??"")||!name){errors.push(`FMT satır ${i+1}: koordinat, alan adı veya okuma yönü geçersiz.`);continue;}if(p[4]==="S"&&p[6]?.length===1)continue; // S with a single permitted value emits a constant, not an optical region.
 if(fields.some(f=>r1<=f.rowEnd&&r2>=f.rowStart&&c1<=f.columnEnd&&c2>=f.columnStart))errors.push(`FMT satır ${i+1}: ${name} optik koordinatları başka bir alanla çakışıyor.`);fields.push({name,rowStart:r1,rowEnd:r2,columnStart:c1,columnEnd:c2,mode:p[5]});}
 if(!fields.length)errors.push("FMT içinde okunabilir alan yok.");
 const aliases:Record<string,string>={"KİTAPÇIK TÜRÜ":"booklet","CİNSİYET":"gender","OTURUM":"session","SINAV NUMARASI":"examNumber","ÖĞRENCİ NO":"id","ÖĞRENCİ NUMARASI":"id","ADI":"name","ADI SOYADI":"name","SOYADI":"surname","SINIF":"grade","ŞUBE":"branch","T.C.":"identity","TC/TEL":"identity","KURUM KODU":"schoolCode","OKUL KODU":"schoolCode"};
 for(const f of fields){const key=aliases[normalized(f.name)],target=key?layout.fields[key as keyof typeof layout.fields]:undefined;const course=(s:string)=>(({"DİN KÜLTÜRÜ":"DİN","FEN BİLİMLERİ":"FEN"} as Record<string,string>)[normalized(s)]??normalized(s));const lesson=layout.lessons.find(l=>course(l.name)===course(f.name));
  if(target){const capacity=f.mode==="D"?f.columnEnd-f.columnStart+1:1;if(target.length!==capacity)errors.push(`${f.name}: FMT kapasitesi ${capacity}, TXT alanı ${target.length} karakter. Alan eşleştirmesini düzeltin.`);}
  if(lesson){const capacity=f.mode==="Y"?f.rowEnd-f.rowStart+1:f.columnEnd-f.columnStart+1;if(lesson.length!==capacity)errors.push(`${f.name}: FMT cevap kapasitesi ${capacity}, TXT ders alanı ${lesson.length}.`);}
 }
 return {valid:!errors.length,errors,rows:Math.max(...fields.map(f=>f.rowEnd),0),columns:Math.max(...fields.map(f=>f.columnEnd),0),headerParameters:header,fields};
}
export const verificationSchema=z.object({readerName:z.string().trim().min(2).max(120),readerConfirmed:z.literal(true),encoding:z.enum(["auto","utf-8","windows-1254"]),token:z.string().max(2000)});
export function fmtProof(userId:string,originalFmt:string,layout:OpticalLayout,readerName:string,encoding:string){
 const digest=crypto.createHash("sha256").update(JSON.stringify({originalFmt,layout:opticalLayoutSchema.parse(layout),readerName:readerName.trim(),encoding})).digest("hex");
 const payload=Buffer.from(JSON.stringify({userId,digest,expires:Date.now()+24*60*60_000})).toString("base64url");return payload+"."+crypto.createHmac("sha256",secret()).update("fmt:"+payload).digest("base64url");
}
export function checkFmtProof(userId:string,originalFmt:string,layout:OpticalLayout,v:z.infer<typeof verificationSchema>){
 try{const[payload,signature]=v.token.split("."),expected=crypto.createHmac("sha256",secret()).update("fmt:"+payload).digest("base64url");if(!signature||signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return false;const p=JSON.parse(Buffer.from(payload,"base64url").toString()),digest=crypto.createHash("sha256").update(JSON.stringify({originalFmt,layout:opticalLayoutSchema.parse(layout),readerName:v.readerName.trim(),encoding:v.encoding})).digest("hex");return p.userId===userId&&p.expires>Date.now()&&p.digest===digest&&inspectFmtCoordinates(originalFmt,layout).valid;}catch{return false;}
}
