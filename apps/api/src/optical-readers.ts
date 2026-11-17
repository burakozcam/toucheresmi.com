import {canonicalJson} from "./canonical-json";
import type {OpticalLayout} from "./optical-core";
import {layoutOzdebirSingle,layoutOzdebirVerbal,layoutOzdebirNumeric} from "./ozdebir-layout";
/** Add verified publisher families here; discriminators have meaning only inside a family. */
export const readerFamilies=[{id:"ozdebir-middle",records:[
 {session:"single",label:"tek optik",layout:layoutOzdebirSingle},
 {session:"verbal",label:"sözel",layout:layoutOzdebirVerbal},
 {session:"numeric",label:"sayısal",layout:layoutOzdebirNumeric},
]}];
export function readerFamily(layout:OpticalLayout){const key=canonicalJson(layout);return readerFamilies.find(f=>f.records.some(r=>canonicalJson(r.layout)===key));}
export function recordLayout(layout:OpticalLayout,line:string,family:ReturnType<typeof readerFamily>|null=readerFamily(layout)){
 if(!family)return undefined;
 const marked=family.records.find(r=>(r.layout.literals??[]).every(l=>line.slice(l.start-1,l.start-1+l.text.length)===l.text));
 if(marked?.layout.lineLength===line.length)return marked;
 const byWidth=family.records.filter(r=>r.layout.lineLength===line.length&&reliableRecord(line,{...r.layout,literals:[]},"A"));
 if(byWidth.length===1)return {...byWidth[0],layout:{...byWidth[0].layout,literals:[]},warning:"Oturum belirteci satır uzunluğu ile çelişiyor; başlık ve cevap alanları doğrulanan kayıt düzeni kullanıldı."};
 return marked;
}
export function reliableRecord(line:string,layout:OpticalLayout,missingBooklet?:string){
 const read=(f?:{start:number;length:number})=>f?line.slice(f.start-1,f.start-1+f.length).trim():"";
 const f=layout.fields;
 return (layout.literals??[]).every(l=>line.slice(l.start-1,l.start-1+l.text.length)===l.text)&&
 !!read(f.name)&&!!(read(f.id)||read(f.identity))&&/^[A-D]$/i.test(read(f.booklet)||missingBooklet||"")&&
 (!f.grade||/^\d{1,2}$/.test(read(f.grade)))&&
 layout.lessons.some(l=>line.length>=l.start+l.length-1)&&
 layout.lessons.every(l=>!/[^ABCDE* .-]/i.test(line.slice(l.start-1,l.start-1+l.length)));
}
