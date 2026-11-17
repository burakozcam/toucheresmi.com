import { SecurityError } from "./security-errors";
export const TXT_MAX_RECORDS = 5000;
export const TXT_MAX_BYTES = 2 * 1024 * 1024;
export const TXT_MAX_LINE_LENGTH = 4000;
export function inspectTxt(text:string){
 const lines=text.replace(/^\uFEFF/,"").split(/\r\n|\n|\r/);while(lines.at(-1)==="")lines.pop();
 if(!lines.length||lines.length>TXT_MAX_RECORDS)throw new SecurityError(400,"TXT 1–5.000 kayıt satırı içermelidir.");
 if(lines.some(line=>line.length>TXT_MAX_LINE_LENGTH||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(line)))throw new SecurityError(400,"TXT satırı en fazla 4.000 karakter olabilir ve çalıştırılabilir/ikili içerik içeremez.");
 return lines;
}
