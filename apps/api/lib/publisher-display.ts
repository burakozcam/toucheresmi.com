/** Presentation alias only. IDs, persisted names, ownership and paths are untouched. */
export function publisherDisplayName(name:string){return /^(nartesi|nartesı|nartest)( yayınları)?$/iu.test(name.trim().toLocaleLowerCase('tr-TR'))?'Nartest':name;}
export function presentPublisherNames(value:any,publisherContext=false):any{
 if(Array.isArray(value))return value.map(v=>presentPublisherNames(v,publisherContext));
 if(!value||typeof value!=='object'||value instanceof Date||Buffer.isBuffer(value))return value;
 return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,(key==='publisherName'||publisherContext&&key==='name')&&typeof v==='string'?publisherDisplayName(v):presentPublisherNames(v,key==='publisher'||key==='publishers')]));
}
