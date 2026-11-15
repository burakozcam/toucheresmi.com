"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import {API_URL} from "../lib/api";
import {analyticsPage,CONSENT_KEY} from "../lib/analytics-policy";
declare global {interface Window {dataLayer?:unknown[];gtag?:(...args:unknown[])=>void;}}
export default function VisitorTracker(){
 const pathname=usePathname(),[consent,setConsent]=useState(false);
 useEffect(()=>{const read=()=>{try{setConsent(localStorage.getItem(CONSENT_KEY)==="granted"&&navigator.doNotTrack!=="1");}catch{setConsent(false);}};read();window.addEventListener("ks-consent",read);window.addEventListener("storage",read);return()=>{window.removeEventListener("ks-consent",read);window.removeEventListener("storage",read);};},[]);
 useEffect(()=>{
  if(!consent){if(window.gtag){window.gtag("consent","update",{analytics_storage:"denied"});const id=process.env.NEXT_PUBLIC_GA4_ID;if(id)(window as any)[`ga-disable-${id}`]=true;}return;}
  if(!pathname||document.querySelector("[data-page-not-found]"))return;
  const page=analyticsPage(pathname,location.search,location.hash);if(!page)return;
  try{const month=new Date().toISOString().slice(0,7),key="ks-visitor-month";let record=JSON.parse(localStorage.getItem(key)??"null");if(record?.month!==month){record={month,id:crypto.randomUUID()};localStorage.setItem(key,JSON.stringify(record));}void fetch(`${API_URL}/api/analytics/page`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({page,visitor:record.id}),keepalive:true}).catch(()=>{});}catch{}
  const id=process.env.NEXT_PUBLIC_GA4_ID?.trim();if(process.env.NEXT_PUBLIC_GA4_APPROVED!=="true"||!id||!/^G-[A-Z0-9]+$/.test(id))return;
  (window as any)[`ga-disable-${id}`]=false;
  // Manual pageviews. Account-side Enhanced Measurement must be disabled before GA4_APPROVED.
  if(!window.gtag){window.dataLayer=[];window.gtag=function(){window.dataLayer!.push(arguments);};window.gtag("consent","default",{analytics_storage:"granted",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});window.gtag("js",new Date());window.gtag("config",id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,ignore_referrer:true,client_storage:"none",page_location:`${location.origin}${page}`,page_referrer:"",page_title:"Kurumsal Sınav"});const script=document.createElement("script");script.id="ks-ga4";script.async=true;script.src=`https://www.googletagmanager.com/gtag/js?id=${id}`;document.head.appendChild(script);}
  window.gtag("event","page_view",{send_to:id,page_location:`${location.origin}${page}`,page_referrer:"",page_title:"Kurumsal Sınav"});
 },[pathname,consent]);return null;
}
