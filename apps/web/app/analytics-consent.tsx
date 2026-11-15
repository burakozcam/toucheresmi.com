"use client";
import {useEffect,useState} from "react";
import {CONSENT_KEY} from "../lib/analytics-policy";
export default function AnalyticsConsent(){
 const [choice,setChoice]=useState<string|null|undefined>(undefined);
 useEffect(()=>{try{setChoice(localStorage.getItem(CONSENT_KEY));}catch{setChoice(null);}},[]);
 function save(value:string){try{localStorage.setItem(CONSENT_KEY,value);}catch{}setChoice(value);window.dispatchEvent(new Event("ks-consent"));if(value==="denied"){window.gtag?.("consent","update",{analytics_storage:"denied"});const id=process.env.NEXT_PUBLIC_GA4_ID;if(id)(window as any)[`ga-disable-${id}`]=true;try{localStorage.removeItem("ks-visitor-month");}catch{}location.reload();}}
 if(choice===undefined)return null;
 return <aside aria-label="Analitik çerez tercihleri" style={{position:"fixed",bottom:12,left:12,right:12,zIndex:1000,padding:12,border:"1px solid #8b94a5",borderRadius:8,background:"var(--surface, white)",color:"var(--ink, #17243c)",maxWidth:620,fontSize:13}}>{choice===null?<><p>İsteğe bağlı ziyaret istatistikleri yalnız izninizle çalışır. Tercihinizi daha sonra değiştirebilirsiniz. <a href="/verilerinizin-guvenligi">Gizlilik bilgisi</a></p><button type="button" onClick={()=>save("denied")}>Reddet</button>{" "}<button type="button" onClick={()=>save("granted")}>Analitik için izin ver</button></>:<button type="button" onClick={()=>setChoice(null)}>Çerez tercihleri</button>}</aside>;
}
