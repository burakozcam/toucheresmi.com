/** Labels come only from reviewed source metadata, never user records or live DOM text. */
export function controlKey(id:string,variant?:string){return `${id}:${variant??''}`;}
export function controlLabel(definition:{id:string;label:string},explicit?:string){
 const label=(explicit||definition.label).replace(/panel-[a-z0-9-]+/g,'').replace(/\s+/g,' ').trim();
 return label||'İşlem alanı';
}
