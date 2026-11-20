"use client";
import {useState} from 'react';
import dynamic from 'next/dynamic';
const HelpCenter=dynamic(()=>import('./help-center'),{ssr:false,loading:()=> <p role="status">Sayfa rehberi açılıyor…</p>});
export default function HelpLauncher({section,title,role}:{section:string;title:string;role:string}){const [open,setOpen]=useState(false);return <>{!open&&<button className="help-launcher" aria-label={`${title} yardımını aç`} onClick={()=>setOpen(true)}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 2.5"/><path d="M12 16v1"/></svg><span>Yardım</span></button>}{open&&<HelpCenter key={section} section={section} title={title} role={role} onClose={()=>setOpen(false)}/>}</>;}
