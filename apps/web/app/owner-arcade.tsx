"use client";
import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import {API_URL} from '../lib/api';
const BreakGame=dynamic(()=>import('./panel/break-game'),{ssr:false});
const BlockGame=dynamic(()=>import('./panel/block-game'),{ssr:false});
/** No game is mounted until the server validates the current owner session. */
export default function OwnerArcade(){
 const [allowed,setAllowed]=useState(false),[mode,setMode]=useState<'bird'|'snake'|'blocks'>('bird');
 useEffect(()=>{let active=true;const controller=new AbortController();
  const check=async()=>{const token=sessionStorage.getItem('kurumsal-auth-token');if(!token){setAllowed(false);return;}
   try{const r=await fetch(`${API_URL}/api/owner/games`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal});if(active)setAllowed(r.ok);}catch{if(active)setAllowed(false);}};
  void check();const timer=setInterval(()=>void check(),30_000);window.addEventListener('focus',check);
  return()=>{active=false;controller.abort();clearInterval(timer);window.removeEventListener('focus',check);};
 },[]);
 if(!allowed)return null;
 return <div className="owner-arcade"><div className="arcade-selector" role="group" aria-label="Oyun seçimi">{([['bird','Kule Rotası'],['snake','İz Takibi'],['blocks','Blok Atölyesi']] as const).map(([id,label])=><button type="button" className="button button-quiet" key={id} aria-pressed={mode===id} onClick={()=>setMode(id)}>{label}</button>)}</div>{mode==='blocks'?<BlockGame key={mode}/>:<BreakGame key={mode} initialMode={mode} hideHeading/>}</div>;
}
