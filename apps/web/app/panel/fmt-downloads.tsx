"use client";
import { useEffect, useState } from "react";
import FmtShareControls from "./fmt-share-controls";
import { API_URL } from "../../lib/api";
import { opticalRequest } from "../../lib/optical-api";
import type { TemplateRecord } from "../../lib/optical";
export async function downloadFmt(token:string,template:Pick<TemplateRecord,"id"|"name">){
  const r=await fetch(`${API_URL}/api/optical/templates/${encodeURIComponent(template.id)}/download`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
  if(!r.ok){const data=await r.json();throw new Error(data.error??"FMT indirilemedi.");}
  const url=URL.createObjectURL(await r.blob()),link=document.createElement("a");link.href=url;link.download=template.name.replace(/[\\/:*?"<>|\x00-\x1f]/g,"-").replace(/\.fmt$/i,"")+".fmt";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export async function downloadFmtExample(token:string,code:string){const r=await fetch(`${API_URL}/api/optical/templates/examples/${code}/download`,{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw new Error("Örnek FMT indirilemedi.");const url=URL.createObjectURL(await r.blob()),a=document.createElement("a");a.href=url;a.download=code+".fmt";a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export default function FmtDownloads({token}:{token:string}){
  const[items,setItems]=useState<TemplateRecord[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState("");
  useEffect(()=>{void opticalRequest(token,"/templates").then(setItems).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[token]);
  return <section className="management-panel fmt-download-center"><header className="panel-header"><div><p className="hero-tag">OPTİK FORM ŞABLONLARI</p><h2>FMT dosyalarını indir</h2></div></header><p>Optik okuma programında kullanacağınız şablonu indirin. TXT yüklerken de aynı FMT’yi seçin.</p><div className="studio-actions">{["7108","8050"].map(code=><button key={code} className="button button-quiet" disabled={!!busy} onClick={async()=>{setBusy(code);try{await downloadFmtExample(token,code);}catch(e){setError((e as Error).message);}finally{setBusy("");}}}>{code} FMT indir</button>)}</div>{error&&<p role="alert" className="notice error">{error}</p>}{loading?<p role="status">Şablonlar yükleniyor…</p>:!items.length?<p>Henüz indirilebilir FMT bulunmuyor.</p>:items.map(t=><div className="optical-record" key={t.id}><span><strong>{t.name}</strong><small>{t.layout.lineLength} karakter · {t.layout.lessons.map(l=>l.name).join(" · ")}{!t.active?" · Pasif":""}{!t.originalFmt?.trim()||/^\s*[\[{]/.test(t.originalFmt)?" · Özgün FMT yok; yöneticiye başvurun":""}</small></span><button className="button button-navy" disabled={!!busy||!t.originalFmt?.trim()||/^\s*[\[{]/.test(t.originalFmt)} onClick={async()=>{setBusy(t.id);setError("");try{await downloadFmt(token,t);}catch(e){setError((e as Error).message);}finally{setBusy("");}}}>{busy===t.id?"İndiriliyor…":"FMT indir"}</button>{t.active&&!!t.originalFmt?.trim()&&!/^\s*[\[{]/.test(t.originalFmt)&&<FmtShareControls token={token} templateId={t.id}/>}</div>)}</section>;
}
