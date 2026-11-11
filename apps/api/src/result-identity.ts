import crypto from "node:crypto";
import { env } from "./config";
const key=()=>crypto.createHash("sha256").update(`result-identity:${env.JWT_SECRET}`).digest();
export const identityHash=(value:string)=>crypto.createHmac("sha256",key()).update(value.trim()).digest("hex");
export function encryptIdentity(value:string){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv("aes-256-gcm",key(),iv);const data=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString("base64url");}
export function decryptIdentity(value?:string){try{if(!value)return "";const raw=Buffer.from(value,"base64url"),decipher=crypto.createDecipheriv("aes-256-gcm",key(),raw.subarray(0,12));decipher.setAuthTag(raw.subarray(12,28));return Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString("utf8");}catch{return "";}}
export const resultAccessCode=(schoolId:string,studentKey:string)=>crypto.createHmac("sha256",key()).update(`access:${schoolId}:${studentKey}`).digest("base64url").slice(0,16);
export const studentNumberKey=(value:string)=>value.trim().replace(/^0+(?=\d)/,"");

/** Per-school, per-exam capability for optional guest access. Never derived in the browser. */
export function studentReportAccessCode(schoolId:string,keyId:string,student:{identityHash?:string;branch:string;studentNo?:string;id:string;name?:string}){
  const stable=student.identityHash??`${student.branch.split("-")[0]}:${studentNumberKey(student.studentNo??student.id)}:${student.name??""}:${student.branch}`;
  return resultAccessCode(schoolId,`${keyId}:${stable}`);
}
export function matchesReportAccessCode(input:string,schoolId:string,keyId:string,student:Parameters<typeof studentReportAccessCode>[2]){
 const expected=studentReportAccessCode(schoolId,keyId,student);return /^[A-Za-z0-9_-]{16}$/.test(input)&&crypto.timingSafeEqual(Buffer.from(input),Buffer.from(expected));
}
