import crypto from 'node:crypto';
import {z} from 'zod';
import {SecurityError} from './security-errors';
import {canonicalJson} from './canonical-json';
export const exportInput=z.object({type:z.enum(['audit','publishers','announcements','keys','fmt','products','txt','schedule']),format:z.enum(['json','csv','xlsx','zip']),filters:z.record(z.string(),z.string().max(150)).default({})}).strict();
export type ExportInput=z.infer<typeof exportInput>;
export const exportFilters:Record<ExportInput['type'],string[]>={audit:['userId','action','from','to'],publishers:['search','active'],announcements:['category','audience','state','version','from','to'],keys:['publisherId','grade','published','originals'],fmt:['publisherId','sourceFormat','verified','active'],products:['publisherId','categoryId','grade','active'],txt:['dealerId','schoolId','keyId','from','to','evaluated'],schedule:['publisherId','level','published','from','to']};
export function validateExport(input:ExportInput){
 for(const [key,value]of Object.entries(input.filters)){if(!exportFilters[input.type].includes(key))throw new SecurityError(400,'Bu veri türünde desteklenmeyen filtre var.');if(['active','published','evaluated','verified','originals'].includes(key)&&!['true','false'].includes(value))throw new SecurityError(400,'Durum filtresi geçersiz.');if(key==='grade'&&!/^(?:[1-9]|1[0-2])$/.test(value))throw new SecurityError(400,'Sınıf geçersiz.');if(['from','to'].includes(key)&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(new Date(value).getTime())||new Date(value).toISOString().slice(0,10)!==value))throw new SecurityError(400,'Tarih geçersiz.');}
 if(input.filters.from&&input.filters.to&&input.filters.from>input.filters.to)throw new SecurityError(400,'Başlangıç tarihi bitişten sonra olamaz.');
 if(input.format==='zip'&&!['keys','fmt','txt'].includes(input.type)||input.type==='txt'&&input.format!=='zip')throw new SecurityError(400,'Bu veri türü için aktarım biçimi desteklenmiyor.');
 if(input.filters.originals==='true'&&input.format!=='zip')throw new SecurityError(400,'Özgün anahtar dosyaları için ZIP seçin.');
 return input;
}
export const exportDigest=(rows:unknown)=>crypto.createHash('sha256').update(canonicalJson(rows)).digest('hex');
export function exportName(value:string){return value.replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g,'-').replace(/\.{2,}/g,'-').slice(0,120)||'dosya';}
/** Every cell is quoted. Prefix spreadsheet formula/control starters, preserving identifiers as text. */
export function csvCell(value:unknown){let v=typeof value==='object'&&value!==null?JSON.stringify(value):String(value??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(v)||/^[\t\r\n]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
export function rowsCsv(rows:Record<string,unknown>[]){const columns=[...new Set(rows.flatMap(r=>Object.keys(r)))];return '\ufeff'+[columns.map(csvCell).join(','),...rows.map(r=>columns.map(c=>csvCell(r[c])).join(','))].join('\r\n');}
