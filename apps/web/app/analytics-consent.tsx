"use client";
import {useEffect,useState,useRef} from "react";
import {CONSENT_KEY} from "../lib/analytics-policy";
export default function AnalyticsConsent(){
 const notice=useRef<HTMLElement>(null);
 const [open,setOpen]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{try{setOpen(!["granted","denied"].includes(localStorage.getItem(CONSENT_KEY)??""));}catch{setOpen(true);}setReady(true);const edit=()=>setOpen(true);const sync=(e:StorageEvent)=>{if(e.key===CONSENT_KEY&&["granted","denied"].includes(e.newValue??""))setOpen(false);};window.addEventListener("ks-open-consent",edit);window.addEventListener("storage",sync);return()=>{window.removeEventListener("ks-open-consent",edit);window.removeEventListener("storage",sync);};},[]);
 useEffect(()=>{if(!open||!notice.current){document.documentElement.style.removeProperty('--cookie-notice-height');return;}const element=notice.current,measure=()=>document.documentElement.style.setProperty('--cookie-notice-height',`${element.getBoundingClientRect().height}px`),observer=new ResizeObserver(measure);measure();observer.observe(element);return()=>{observer.disconnect();document.documentElement.style.removeProperty('--cookie-notice-height');};},[open]);
 function save(value:"granted"|"denied"){try{localStorage.setItem(CONSENT_KEY,value);}catch{}setOpen(false);window.dispatchEvent(new Event("ks-consent"));if(value==="denied"){window.gtag?.("consent","update",{analytics_storage:"denied"});const id=process.env.NEXT_PUBLIC_GA4_ID;if(id)(window as any)[`ga-disable-${id}`]=true;try{localStorage.removeItem("ks-visitor-month");}catch{}}}
 if(!ready)return null;
 return open?<aside ref={notice} className="cookie-notice" aria-label="Çerez tercihleri"><p>Gizliliğinize önem veriyoruz. Sitemizin güvenli ve düzgün çalışabilmesi için yalnızca gerekli olan asgari düzeyde çerez kullanıyoruz. Ziyaretçi istatistiklerine yönelik isteğe bağlı çerezler ise yalnızca onayınızla etkinleştirilir.</p><a href="/verilerinizin-guvenligi">Gizlilik bilgisi</a><div><button type="button" className="button button-quiet" onClick={()=>save("denied")}>Yalnızca Gerekli Olanlar</button><button type="button" className="button button-navy" onClick={()=>save("granted")}>Tümünü Kabul Et</button></div></aside>:<button type="button" className="cookie-preference-link" onClick={()=>setOpen(true)}>Çerez Tercihleri</button>;
}
