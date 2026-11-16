"use client";
import {useEffect,useState} from "react";
import {API_URL} from "../../lib/api";
export default function DealerStatus({token}:{token:string}){
 const [data,setData]=useState<any>(null),[error,setError]=useState("");
 async function load(){try{const r=await fetch(`${API_URL}/api/dealer-policy`,{headers:{Authorization:`Bearer ${token}`}}),d=await r.json();if(!r.ok)throw Error(d.error);setData(d);setError("");}catch(e){setError((e as Error).message);}}
 useEffect(()=>{const refresh=()=>void load();refresh();window.addEventListener("ks-dealer-usage-changed",refresh);return()=>window.removeEventListener("ks-dealer-usage-changed",refresh);},[token]);
 return <aside className="dealer-status">{error?<span role="alert">{error}</span>:data?<span><strong>Bugünkü öğrenci kotan: {data.dailyUsed} / {data.dailyStudentLimit??"Sınırsız"}</strong> · Kalan: {data.dailyRemaining??"Sınırsız"} · Bölge: {data.restrictedRegions?"Sınırlandırılmış":"Serbest"}</span>:<span>Bayi yetkileri yükleniyor…</span>}<button className="button button-quiet" onClick={()=>void load()}>Kotayı yenile</button></aside>;
}
