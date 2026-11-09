"use client";
import type { OpticalLayout } from "../../lib/optical";
import { fieldLabels } from "../../lib/optical-admin-validation";
export type FmtMapping={sourceName:string;target:string;start:number;length:number;status:string;reason:string};
export default function FmtMappingTable({mappings,layout,onChange,disabled}:{mappings:FmtMapping[];layout:OpticalLayout;onChange:(layout:OpticalLayout,mappings:FmtMapping[])=>void;disabled:boolean}){
 function update(index:number,target:string){const row=mappings[index],fields={...layout.fields},lessons=[...layout.lessons];
 if(row.target.startsWith("field:"))delete fields[row.target.slice(6) as keyof typeof fields];
 const filtered=row.target.startsWith("lesson:")?lessons.filter(l=>!(l.start===row.start&&l.name===row.target.slice(7))):lessons;
 if(target.startsWith("field:"))(fields as Record<string,unknown>)[target.slice(6)]={start:row.start,length:row.length};
 if(target.startsWith("lesson:")){filtered.push({name:target.slice(7),start:row.start,length:row.length});}
 onChange({...layout,fields,lessons:filtered},mappings.map((m,i)=>i===index?{...m,target,status:target==="ignore"?"Eşlenmedi":"Kullanıcı eşleştirdi"}:m));
 }
 return <><p>Dosyanızı inceledik ve alanları otomatik eşleştirdik. Lütfen kontrol edin. Gerekli düzeltmeleri yaptıktan ve TXT çıktısını doğruladıktan sonra kaydedebilirsiniz.</p><div className="table-scroll"><table className="result-table"><thead><tr><th>FMT’den okunan</th><th>Sistemde eşlenen</th><th>TXT konumu / kapasite</th><th>Durum</th></tr></thead><tbody>{mappings.map((m,i)=><tr key={i}><td>{m.sourceName}</td><td>{m.target==="literal"?"Sabit metin":<select aria-label={`${m.sourceName} alan eşleştirmesi`} disabled={disabled} value={m.target} onChange={e=>update(i,e.target.value)}><option value="ignore">Eşlenmedi / kullanma</option>{Object.entries(fieldLabels).map(([key,label])=><option key={key} value={`field:${key}`}>{label}</option>)}{[...new Set(["TÜRKÇE","SOSYAL","DİN","İNGİLİZCE","MATEMATİK","FEN",...layout.lessons.map(l=>l.name)])].map(l=><option key={l} value={`lesson:${l}`}>Ders: {l}</option>)}</select>}</td><td>{m.start}–{m.start+m.length-1} · {m.length} karakter</td><td>{m.status}<small>{m.reason}</small></td></tr>)}</tbody></table></div></>;
}
