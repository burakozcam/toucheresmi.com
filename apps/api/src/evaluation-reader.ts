import {legacyOzdebirSingle} from "./ozdebir-layout";
import {opticalLayoutSchema,layout7108,type OpticalLayout} from "./optical-core";
import {readerFamily,recordLayout,reliableRecord} from "./optical-readers";
import {canonicalJson} from "./canonical-json";
/** Switch only with unique structural evidence, never from answer-key success rates. */
export function evaluationReader(text:string,selected:OpticalLayout,templates:Array<{name:string;layout:unknown}>,missingBooklet?:string){
 const lines=text.replace(/^\uFEFF/,"").split(/\r\n|\n|\r/).filter(l=>l.trim());
 const count=(layout:OpticalLayout)=>lines.filter(line=>{const family=readerFamily(layout),r=recordLayout(layout,line);return (!family||r)&&reliableRecord(line,r?.layout??layout,"A");}).length;
 const legacy7108={...layout7108,fields:{...layout7108.fields,booklet:{start:50,length:1},session:{start:51,length:1}}};
 const knownStale=canonicalJson(selected)===canonicalJson(legacyOzdebirSingle)||canonicalJson(selected)===canonicalJson(legacy7108);
 const selectedCount=count(selected),groups=new Map<string,{layout:OpticalLayout;name:string;count:number}>();
 for(const t of templates){const parsed=opticalLayoutSchema.safeParse(t.layout);if(!parsed.success)continue;const layout=parsed.data,key=readerFamily(layout)?.id??canonicalJson(layout);if(!groups.has(key))groups.set(key,{layout,name:t.name,count:count(layout)});}
 const ranked=[...groups.values()].sort((a,b)=>b.count-a.count),best=ranked[0];
 if(best&&best.count>0&&(best.count>selectedCount||(best.count===selectedCount&&(readerFamily(best.layout)||canonicalJson(best.layout)===canonicalJson(layout7108))&&knownStale))&&best.count>(ranked[1]?.count??0))return {matched:best.count,layout:best.layout,warning:`Seçilen FMT yerine kimlik, kitapçık, sabit kod ve cevap konumları doğrulanan ${best.name} kullanıldı. Konumlar kaydırılmadı.`};
 return {matched:selectedCount,layout:selected,warning:null};
}
