import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { env } from "./config";
import { prisma } from "./db";
import type { AuthenticatedRequest } from "./auth";
const key=()=>crypto.createHash("sha256").update(`txt-archive:${env.TXT_STORAGE_KEY??env.JWT_SECRET}`).digest();
const header=Buffer.from("KSTXT1");
export const archiveScope=(user:NonNullable<AuthenticatedRequest["user"]>)=>user.role==="SUPER_ADMIN"?{}:{createdById:user.id};
export const archiveChecksum=(bytes:Buffer)=>crypto.createHash("sha256").update(bytes).digest("hex");
export function sealTxt(bytes:Buffer){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv("aes-256-gcm",key(),iv),data=Buffer.concat([cipher.update(bytes),cipher.final()]);return Buffer.concat([header,iv,cipher.getAuthTag(),data]);}
export function openTxt(bytes:Buffer){if(!bytes.subarray(0,6).equals(header))throw Error("Geçersiz TXT arşivi.");const cipher=crypto.createDecipheriv("aes-256-gcm",key(),bytes.subarray(6,18));cipher.setAuthTag(bytes.subarray(18,34));return Buffer.concat([cipher.update(bytes.subarray(34)),cipher.final()]);}
export function archiveDirectory(){return path.resolve(env.STORAGE_DIR,"optical-txt");}
export function archivePath(storedName:string){if(!/^[a-f0-9-]{36}\.txt\.enc$/.test(storedName))throw Error("TXT arşivi dosya bilgisi geçersiz.");return path.join(archiveDirectory(),storedName);}
export function archiveDto(row:{id:string;name:string;size:number;createdAt:Date;evaluatedAt:Date|null;resultId:string|null}){return {id:row.id,name:row.name,size:row.size,createdAt:row.createdAt,evaluatedAt:row.evaluatedAt,resultId:row.resultId};}
export async function readArchivedTxts(user:NonNullable<AuthenticatedRequest["user"]>,ids:string[]){
 const rows=await prisma.opticalTxtFile.findMany({where:{id:{in:ids},deletedAt:null,...archiveScope(user)},include:{result:{select:{id:true,schoolId:true,keyId:true,seriesId:true}},uses:{orderBy:{createdAt:"desc"},select:{result:{select:{id:true,schoolId:true,keyId:true,seriesId:true}}}}}});
 if(rows.length!==ids.length)throw Error("Seçilen TXT dosyalarına erişilemiyor. Dosya listesini yenileyin.");
 return ids.map(id=>{const row=rows.find(row=>row.id===id)!;let buffer:Buffer;try{buffer=openTxt(fs.readFileSync(archivePath(row.storedName)));if(buffer.length!==row.size||archiveChecksum(buffer)!==row.checksum)throw Error("checksum");}catch{throw Error(`${row.name}: arşiv okunamadı. Depolama dizini ve şifreleme anahtarını kontrol edin.`);}return {row,file:{fieldname:"files",originalname:row.name,mimetype:"text/plain",encoding:"7bit",size:row.size,buffer} as Express.Multer.File};});
}

export function evaluatedContext(item:Awaited<ReturnType<typeof readArchivedTxts>>[number],schoolId:string,keyId:string){return [...(item.row.uses??[]).map(use=>use.result),item.row.result].find(result=>result?.schoolId===schoolId&&result?.keyId===keyId);}

export function archiveName(original:string){const base=(original.split(/[\\/]/).at(-1)??"sonuc.txt").replace(/[\x00-\x1f]/g," ").trim().replace(/\.txt$/i,"").trim()||"sonuc";return base.slice(0,196)+".txt";}
