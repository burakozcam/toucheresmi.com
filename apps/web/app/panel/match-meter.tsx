"use client";
import {useEffect,useState} from "react";
export default function MatchMeter({percent,label}:{percent:number;label:string}){
 const target=Math.max(0,Math.min(100,Number.isFinite(percent)?percent:0)),[value,setValue]=useState(0);
 useEffect(()=>{const motion=window.matchMedia("(prefers-reduced-motion: reduce)");let frame=0;const start=performance.now();const tick=(now:number)=>{const progress=motion.matches?1:Math.min(1,(now-start)/1100);setValue(target*progress);if(progress<1)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);const changed=()=>{if(motion.matches){cancelAnimationFrame(frame);setValue(target);}};motion.addEventListener("change",changed);return()=>{cancelAnimationFrame(frame);motion.removeEventListener("change",changed);};},[target]);
 const hue=value<=50?value*.9:45+(value-50)*1.9;
 return <div className="confidence-meter" role="meter" aria-label={`${label} eşleşme oranı`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(target)}><i style={{width:`${value}%`,backgroundColor:`hsl(${hue} 65% 42%)`}}/><strong>%{Math.round(target)}</strong></div>;
}
export function MatchDetails({children}:{children:React.ReactNode}){const [open,setOpen]=useState(false);return <details open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{open?"Detayları gizle":"Detayları göster"}</summary>{children}</details>;}
