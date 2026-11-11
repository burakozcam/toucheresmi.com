"use client";
import {useEffect,useState} from "react";
import {opticalRequest,jsonBody} from "../../lib/optical-api";
export default function FmtGuess({token,file,fileIds,onSelect}:{token:string;file?:File;fileIds?:string[];onSelect:(id:string)=>void}){
 const [reports,setReports]=useState<any[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const ids=JSON.stringify(fileIds??[]);
 useEffect(()=>{setReports([]);setError("");if(!file&&ids==="[]")return;let active=true;const controller=new AbortController();setBusy(true);
 const body=new FormData();if(file)body.append("file",file);
 void opticalRequest(token,"/infer-fmt",file?{method:"POST",body,signal:controller.signal}:{...jsonBody({fileIds:JSON.parse(ids)}),signal:controller.signal}).then(data=>{if(active)setReports(data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;controller.abort();};},[token,file,ids]);
 const best=reports[0]?.candidates?.[0];const same=best&&reports.every(r=>r.confidence!=="failed"&&r.candidates[0]?.id===best.id);
 return <div aria-live="polite">{busy&&<p>FMT içeriği analiz ediliyor…</p>}{error&&<p className="notice error">FMT tahmini başarısız. Lütfen şablonu manuel seçin.</p>}{reports.map((r,i)=><div key={i} className={`notice ${r.confidence==="strong"?"success":"fmt-guess-warning"}`}><strong>{reports.length>1?`${i+1}. dosya: `:""}{r.message}</strong><details><summary>Tahminin nedeni</summary>{r.candidates?.[0]?.reasons?.map((reason:string)=><p key={reason}>{reason}</p>)}<p>Tahmin bir öneridir. FMT’yi ve sınav kapsamını kontrol edip kendiniz seçin.</p></details></div>)}{same&&<button type="button" className="button button-quiet" onClick={()=>onSelect(best.id)}>Önerilen FMT’yi seç: {best.name}</button>}</div>;
}
