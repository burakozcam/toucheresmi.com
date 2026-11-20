import crypto from 'node:crypto';
import catalog from '../assets/templates/catalog.json';
import {libraryFmtBytes} from './fmt-library';
import {fmtBytes} from './fmt-download';
import {systemEvaluationTemplates,sameExecutableLayout} from './evaluation-templates';
import {canonicalJson} from './canonical-json';
type Saved={publisher?:{id:string;name:string}|null;sourceFormat?:string|null;id:string;name:string;originalFmt:string;originalBase64?:string|null;layout:unknown;active:boolean;publisherId?:string|null;grade?:number|null;validation?:unknown};
/** Presentation only: never updates IDs, references, inference choices or source bytes. */
export function fmtDisplayLibrary(saved:Saved[]){
 const system=systemEvaluationTemplates();
 const rows=catalog.map(entry=>{
  const executable=system.find(t=>t.id===`system-fmt-${entry.code}`),bytes=libraryFmtBytes(entry.code);
  const aliases=saved.filter(t=>executable&&t.active&&!t.publisherId&&!t.grade&&(/^system-fmt-/.test(t.id)||(t.validation as any)?.readerConfirmed===true)&&sameExecutableLayout(t.layout,executable.layout)&&fmtBytes(t.originalFmt,t.originalBase64).equals(bytes));
  return {id:`example:${entry.code}`,name:entry.name,code:entry.code,source:'system',publisherId:null as string|null,publisherName:null as string|null,grade:null as number|null,sourceFormat:null as string|null,active:!saved.some(t=>t.id===executable?.id&&!t.active),verified:!entry.requiresVerification,kind:entry.file.endsWith('.bldm')?'BLDM':'FMT',downloadPath:`/templates/examples/${entry.code}/download`,downloadName:entry.downloadName,layoutPath:aliases[0]?`/templates/${aliases[0].id}/layout`:null,templateId:null as string|null,exampleCode:entry.code as string|null,aliases:aliases.map(t=>t.id)};
 });
 const hidden=new Set(rows.flatMap(r=>r.aliases)),seen=new Map<string,typeof rows[number]>();
 for(const t of saved){if(hidden.has(t.id))continue;
  // Ownership, activation and verification are part of identity. Similar names never count.
  const validation=t.validation&&typeof t.validation==='object'?Object.fromEntries(Object.entries(t.validation).filter(([key])=>key!=='verifiedAt')):t.validation;
  const bytes=fmtBytes(t.originalFmt,t.originalBase64),identity=crypto.createHash('sha256').update(bytes).update(canonicalJson({layout:t.layout,active:t.active,publisherId:t.publisherId??null,grade:t.grade??null,validation:validation??null})).digest('hex');
  const duplicate=seen.get(identity);if(duplicate){duplicate.aliases.push(t.id);continue;}
  const downloadable=!!t.originalFmt.trim()&&!/^\s*[\[{]/.test(t.originalFmt);
  const row={id:t.id,name:t.name,code:(t.layout as any)?.literals?.map((l:any)=>l.text).join(' ')||'',source:'saved',publisherId:t.publisherId??null,publisherName:t.publisher?.name??null,grade:t.grade??null,sourceFormat:t.sourceFormat??null,active:t.active,verified:!!(t.validation as any)?.readerConfirmed,kind:'FMT',downloadPath:downloadable?`/templates/${t.id}/download`:'',downloadName:t.name.replace(/\.fmt$/i,'')+'.fmt',layoutPath:`/templates/${t.id}/layout`,templateId:t.id,exampleCode:null,aliases:[t.id]};
  rows.push(row);seen.set(identity,row);
 }
 return rows;
}
