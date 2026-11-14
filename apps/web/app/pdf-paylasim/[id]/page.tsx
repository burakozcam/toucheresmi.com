"use client";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {API_URL} from "../../../lib/api";
export default function PdfShare(){const {id}=useParams<{id:string}>(),[token,setToken]=useState(""),[name,setName]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{const value=location.hash.slice(1);history.replaceState(null,"",location.pathname);setToken(value);void fetch(`${API_URL}/api/public/pdf-shares/${encodeURIComponent(id)}/view`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:value}),cache:"no-store"}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);setName(data.name);}).catch(e=>setError(e.message));},[id]);
 return <main className="shared-fmt-page"><h1>Cevap Anahtarı PDF</h1>{name&&<p>{name}</p>}{error&&<p role="alert">{error}</p>}<button className="button button-navy" disabled={!name||busy} onClick={async()=>{setBusy(true);try{const response=await fetch(`${API_URL}/api/public/pdf-shares/${encodeURIComponent(id)}/download`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token}),cache:"no-store"});if(!response.ok)throw Error((await response.json()).error);const url=URL.createObjectURL(await response.blob()),a=document.createElement("a");a.href=url;a.download="Cevap Anahtarı.pdf";a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>PDF indir</button></main>;
}
