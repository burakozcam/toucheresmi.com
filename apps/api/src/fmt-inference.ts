import { opticalLayoutSchema, type OpticalLayout } from "./optical-core";
export type FmtCandidate={id:string;name:string;layout:unknown};
/** Content-only inference; never returns raw fields, filenames or student information. */
export function inferFmt(text:string,templates:FmtCandidate[]){
 const lines=text.replace(/^\uFEFF/,"").split(/\r\n|\n|\r/);while(lines.at(-1)==="")lines.pop();
 if(!lines.length||lines.length>2000)return {confidence:"failed",message:"FMT tahmini başarısız. Lütfen şablonu manuel seçin.",candidates:[]};
 const sample=Array.from({length:Math.min(40,lines.length)},(_,i)=>lines[Math.floor(i*lines.length/Math.min(40,lines.length))]);
 const groups=new Map<string,{id:string;name:string;aliases:string[];layout:OpticalLayout}>();
 for(const t of templates){const parsed=opticalLayoutSchema.safeParse(t.layout);if(!parsed.success)continue;const layout=parsed.data;
 const key=JSON.stringify({width:layout.lineLength,fields:Object.entries(layout.fields).sort(([a],[b])=>a.localeCompare(b)),lessons:[...layout.lessons].sort((a,b)=>a.start-b.start),literals:[...(layout.literals??[])].sort((a,b)=>a.start-b.start)});
 const existing=groups.get(key);if(existing)existing.aliases.push(t.id);else groups.set(key,{...t,aliases:[t.id],layout});}
 const candidates=[...groups.values()].map(t=>{let valid=0,width=0,literals=0;for(const line of sample){if(line.length!==t.layout.lineLength)continue;width++;
 const read=(f?:{start:number;length:number})=>f?line.slice(f.start-1,f.start-1+f.length).trim():"";
 const literalOk=(t.layout.literals??[]).every(l=>line.slice(l.start-1,l.start-1+l.text.length)===l.text);if(literalOk)literals++;
 const f=t.layout.fields;if(literalOk&&!/[\x00-\x1f\x7f\ufffd]/.test(line)&&read(f.name)&&(read(f.id)||read(f.identity))&&/^[A-D]$/i.test(read(f.booklet))&&t.layout.lessons.every(l=>!/[^ABCDE* .-]/i.test(line.slice(l.start-1,l.start-1+l.length))))valid++;}
 const score=valid/sample.length;
 return {id:t.id,name:t.name,aliases:t.aliases,score,valid,sampled:sample.length,reasons:[`${sample.length} satır örneklendi; ${width} satır ${t.layout.lineLength} karakter uzunluğunda.`,`${valid} satırda ad, kimlik, kitapçık ve cevap konumları uyumlu.`,...(t.layout.literals?.length?[`${literals} satırda FMT sabit kodu eşleşti.`]:[])]};}).sort((a,b)=>b.score-a.score);
 const best=candidates[0],margin=(best?.score??0)-(candidates[1]?.score??0),confidence=best&&best.score===1&&margin>=.15&&sample.length>=2?"strong":best&&best.score>=.6&&margin>=.1?"possible":"failed";
 const label=best?(best.name.match(/(?:^|\D)(7108|8050)(?:\D|$)/)?.[1]??best.name):"";
 return {confidence,message:confidence==="strong"?`Tahmin edilen FMT: ${label}`:confidence==="possible"?`Olası FMT: ${label} — Lütfen kontrol edin.`:"FMT tahmini başarısız. Lütfen şablonu manuel seçin.",candidates:candidates.slice(0,3)};
}
