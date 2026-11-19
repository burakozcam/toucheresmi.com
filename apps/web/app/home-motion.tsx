"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PublisherLogo from "./publisher-logo";

export function PublisherRibbon({ publishers }: { publishers: { id: string; name: string }[] }) {
  const root = useRef<HTMLElement>(null);
  const [paused,setPaused]=useState(false);
  useEffect(() => {
    const node=root.current;if(!node)return;
    let visible=false;const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const sync=()=>{node.dataset.paused=String(paused||!visible||document.hidden||motion.matches);};
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});observer.observe(node);
    document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);sync();
    return()=>{observer.disconnect();document.removeEventListener('visibilitychange',sync);motion.removeEventListener('change',sync);};
  }, [paused,publishers.length]);
  if (!publishers.length) return null;
  return <section ref={root} className="publisher-ribbon" aria-label="Yayınevleri" data-paused="true">
    <div className="ribbon-label"><span>Yayınevini seç.<br /><strong>Denemeni bul.</strong></span><button type="button" aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?"Şeridi oynat":"Şeridi durdur"}</button></div>
    <div className="ribbon-window"><div className="ribbon-track"><div className="ribbon-group">{publishers.map(p => <Link href={`/cevap-anahtarlari?publisherId=${encodeURIComponent(p.id)}`} key={p.id}><PublisherLogo id={p.id} name={p.name} /><span>{p.name}</span></Link>)}</div></div></div>
  </section>;
}

export function HomeEffects(){
 useEffect(()=>{
  const hero=document.querySelector<HTMLElement>('.real-report-hero');
  if(!('IntersectionObserver' in window))return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');let visible=false;
  const sync=()=>{if(hero)hero.dataset.floating=String(visible&&!document.hidden&&!motion.matches);};
  const visibility=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});if(hero)visibility.observe(hero);
  document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);sync();
  const nodes=document.querySelectorAll<HTMLElement>('.home-exams,.institution-section,.home-tool-links');
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.setAttribute('data-entered','true');observer.unobserve(entry.target);}),{threshold:.12});
  nodes.forEach(node=>{node.dataset.motion='ready';observer.observe(node);});
  return()=>{visibility.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',sync);motion.removeEventListener('change',sync);nodes.forEach(node=>delete node.dataset.motion);};
 },[]);return null;
}
