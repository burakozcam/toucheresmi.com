import {fmtContentIdentity} from './fmt-identity';
const norm=(s:string)=>s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9]+/g,' ').trim();
/** Suggestions are evidence, never an automatic save or exam binding. */
export function suggestFmtMetadata(draft:{sourceName:string;originalFmt:string;layout:any},templates:any[],publishers:{id:string;name:string}[]){
 const exact=templates.filter(t=>t.originalFmt&&fmtContentIdentity(t)===fmtContentIdentity(draft)),grades=[...new Set(exact.map(t=>t.grade).filter(Boolean))] as number[],publisherIds=[...new Set(exact.map(t=>t.publisherId??t.publisher?.id).filter(Boolean))] as string[];
 const file=norm(draft.sourceName),named=publishers.filter(p=>(' '+file+' ').includes(' '+norm(p.name)+' ')),grade=file.match(/\b(1[0-2]|[1-9])\s*(?:sinif|snf)\b/);
 return{grade:grades.length===1?String(grades[0]):grades.length?undefined:grade?.[1],publisherId:publisherIds.length===1?publisherIds[0]:publisherIds.length?undefined:named.length===1?named[0].id:undefined,reason:exact.length?'Aynı FMT içeriği ve TXT yerleşimine sahip mevcut kayıtlar.':'Dosya adındaki açık sınıf / yayınevi eşleşmesi. Belirsiz alanlar seçilmez.',ambiguous:grades.length>1||publisherIds.length>1||named.length>1};
}
