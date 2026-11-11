"use client";
import {useEffect,useRef,useState} from "react";
import Script from "next/script";
import {API_URL} from "../lib/api";
export default function HumanVerification({action,onToken}:{action:string;onToken:(token:string)=>void}){
 const [config,setConfig]=useState<{enabled:boolean;siteKey?:string}|null>(null),[ready,setReady]=useState(false),[error,setError]=useState("");const container=useRef<HTMLDivElement>(null),callback=useRef(onToken);callback.current=onToken;
 useEffect(()=>{const controller=new AbortController();fetch(`${API_URL}/api/auth/human-verification`,{signal:controller.signal,cache:"no-store"}).then(async r=>{if(!r.ok)throw Error();setConfig(await r.json());}).catch(e=>{if(e.name!=="AbortError")setError("Doğrulama ayarları yüklenemedi. Lütfen tekrar deneyin.");});return()=>controller.abort();},[]);
 useEffect(()=>{const turnstile=(window as any).turnstile;if(!config?.enabled||!ready||!container.current||!turnstile)return;const id=turnstile.render(container.current,{sitekey:config.siteKey,action,callback:(t:string)=>{setError("");callback.current(t);},"expired-callback":()=>callback.current(""),"error-callback":()=>{callback.current("");setError("İnsan doğrulaması yüklenemedi. Lütfen yeniden deneyin.");}});return()=>{turnstile.remove(id);callback.current("");};},[config,ready,action]);
 return <>{config?.enabled&&<><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={()=>setReady(true)} onError={()=>setError("İnsan doğrulaması yüklenemedi.")}/><div ref={container}/></>}{error&&<p role="alert" className="notice error">{error}</p>}</>;
}
