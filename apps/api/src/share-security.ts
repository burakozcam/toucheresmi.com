import crypto from "node:crypto";
import {env} from "./config";
const key=()=>crypto.createHash("sha256").update(`share-token:v126:${env.JWT_SECRET}`).digest();
export function encryptShareToken(token:string){return seal(token,crypto.randomBytes(12));}
function seal(token:string,iv:Buffer){const cipher=crypto.createCipheriv("aes-256-gcm",key(),iv),bytes=Buffer.concat([cipher.update(token,"utf8"),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),bytes]).toString("base64url");}
export function decryptShareToken(value:string){const bytes=Buffer.from(value,"base64url"),cipher=crypto.createDecipheriv("aes-256-gcm",key(),bytes.subarray(0,12));cipher.setAuthTag(bytes.subarray(12,28));return Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString("utf8");}
export function validShare(share:{revokedAt:Date|null;expiresAt:Date|null;startsAt?:Date|null}|null,now=new Date()){return !!share&&!share.revokedAt&&(!share.startsAt||share.startsAt<=now)&&(!share.expiresAt||share.expiresAt>now);}
