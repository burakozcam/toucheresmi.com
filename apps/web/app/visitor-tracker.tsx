"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { API_URL } from "../lib/api";
export default function VisitorTracker(){const page=usePathname();useEffect(()=>{
 if(!page||/^\/(panel|login|sonuclarim|hesap-kur|dosya-paylasim|fmt-paylasim)/.test(page)||navigator.doNotTrack==="1")return;
 try{const month=new Date().toISOString().slice(0,7),key="ks-visitor-month";let record=JSON.parse(localStorage.getItem(key)??"null");if(record?.month!==month){record={month,id:crypto.randomUUID()};localStorage.setItem(key,JSON.stringify(record));}void fetch(`${API_URL}/api/analytics/page`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({page,visitor:record.id}),keepalive:true}).catch(()=>{});}catch{}
 },[page]);return null;}
