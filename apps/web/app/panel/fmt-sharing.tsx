"use client";
import {useEffect,useState} from "react";
import {opticalRequest} from "../../lib/optical-api";
import type {TemplateRecord} from "../../lib/optical";
import FmtShareControls from "./fmt-share-controls";
export default function FmtSharing({token}:{token:string}){
 const [items,setItems]=useState<TemplateRecord[]>([]),[selected,setSelected]=useState<string[]>([]),[error,setError]=useState("");
 useEffect(()=>{void opticalRequest(token,"/templates").then(setItems).catch(e=>setError(e.message));},[token]);
 const options=[{id:"example:7108",name:"7108 · Özgün sistem FMT"},{id:"example:8050",name:"8050 · Özgün sistem FMT"},...items.filter(t=>t.active&&t.originalFmt?.trim()&&!/^\s*[\[{]/.test(t.originalFmt)).map(t=>({id:t.id,name:t.name}))];
 const toggle=(id:string)=>setSelected(s=>s.includes(id)?s.filter(v=>v!==id):[...s,id]);
 return <section className="management-panel fmt-sharing"><h2>FMT Paylaş</h2><p>7108, 8050 ve kayıtlı özgün FMT dosyalarını ayrı ayrı veya birlikte seçin. Seçtiğiniz dosyalar aynı süreli bağlantıda paylaşılır; süre dolunca indirme kapanır.</p>{error&&<p role="alert" className="notice error">{error}</p>}<fieldset><legend>Paylaşılacak FMT dosyaları</legend>{options.map(o=><label key={o.id} className="checkbox-row"><input type="checkbox" checked={selected.includes(o.id)} onChange={()=>toggle(o.id)}/>{o.name}</label>)}</fieldset><p>{selected.length} FMT seçildi.</p><FmtShareControls key={selected.join(",")} token={token} selection={{templateIds:selected.filter(s=>!s.startsWith("example:")),exampleCodes:selected.filter(s=>s.startsWith("example:")).map(s=>s.slice(8))}}/></section>;
}
