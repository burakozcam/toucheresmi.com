"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {API_URL} from "./api";
import type {TemplateRecord,KeyRecord} from "./optical";
import type {LocationSchool} from "../app/panel/school-location-select";
/** Independent arrival: a slow exam catalog never hides TXT upload or school/FMT selectors. */
export function useOpticalCatalog(token:string){
 const version=useRef(0);
 const [schools,setSchools]=useState<LocationSchool[]>([]),[templates,setTemplates]=useState<TemplateRecord[]>([]),[keys,setKeys]=useState<KeyRecord[]>([]);
 const [loading,setLoading]=useState({schools:true,templates:true,keys:true}),[errors,setErrors]=useState<Record<string,string>>({});
 const reload=useCallback(async(signal?:AbortSignal)=>{
  const generation=++version.current;const current=()=>generation===version.current&&!signal?.aborted;
  setErrors({});setLoading({schools:true,templates:true,keys:true});
  const request=async(path:string)=>{const response=await fetch(`${API_URL}/api${path}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:signal?AbortSignal.any([signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)});if(response.status===404)throw Object.assign(Error("Liste adresi bulunamadı."),{status:404});const data=await response.json().catch(()=>null);if(!response.ok||!Array.isArray(data))throw Error(data?.error??"Liste alınamadı.");return data;};
  const fallback=async(path:string,old:string)=>{try{return await request(path);}catch(e){if((e as any).status===404)return request(old);throw e;}};
  const load=async(name:"schools"|"templates"|"keys",get:()=>Promise<any[]>,apply:(rows:any[])=>void)=>{try{const rows=await get();if(current())apply(rows);}catch(e){if(current())setErrors(current=>({...current,[name]:`${{schools:"Kurum",templates:"FMT",keys:"Sınav"}[name]} listesi yüklenemedi: ${(e as Error).name==="TimeoutError"?"Sunucu yanıtı gecikti. Yeniden deneyin.":(e as Error).message}`}));}finally{if(current())setLoading(current=>({...current,[name]:false}));}};
  await Promise.allSettled([load("schools",()=>request("/schools?active=true&compact=true"),setSchools),load("templates",()=>fallback("/optical/evaluation-templates","/optical/templates"),rows=>setTemplates(rows.filter(t=>t.active))),load("keys",()=>fallback("/optical/evaluation-exams","/optical/keys?available=true"),rows=>setKeys(rows.filter(k=>k.active)))]);
 },[token]);
 useEffect(()=>{const controller=new AbortController();setSchools([]);setTemplates([]);setKeys([]);void reload(controller.signal);return()=>{version.current++;controller.abort();};},[reload]);
 return {schools,templates,keys,loading,errors,reload,setSchools};
}
