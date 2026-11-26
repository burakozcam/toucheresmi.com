"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import KMascot from './k-mascot';
export default function HomeHelp(){
 const [open,setOpen]=useState(false),[wave,setWave]=useState(false),[scrolling,setScrolling]=useState(false),[obstructed,setObstructed]=useState(false);const root=useRef<HTMLElement>(null),button=useRef<HTMLButtonElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);},key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&root.current?.querySelector('#home-help-bubble')){setOpen(false);button.current?.focus();}},scroll=()=>setScrolling(window.scrollY>100);scroll();document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);window.addEventListener('scroll',scroll,{passive:true});
 // Reserve the lower corner while a consent overlay is present.
 const check=()=>setObstructed(!!document.querySelector('.cookie-notice,.consent-banner,.cookie-banner,[role="dialog"][aria-label*="çerez" i]'));
 const observer=new MutationObserver(check);observer.observe(document.body,{childList:true,subtree:true});check();return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);window.removeEventListener('scroll',scroll);observer.disconnect();if(timer.current)clearTimeout(timer.current);};},[]);
 function greet(){setWave(true);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setWave(false),850);}
 return <aside ref={root} className="home-help" data-visible={scrolling} data-obstructed={obstructed} aria-label="İletişim yardımı" hidden={!scrolling||obstructed}>{open&&<div id="home-help-bubble" className="home-help-bubble"><strong>Yardıma mı ihtiyacınız var?</strong><Link href="/contact#contact-form">İletişim formuna git</Link></div>}<button type="button" ref={button} className="home-help-button" aria-label={open?'Yardım balonunu kapat':'Yardım balonunu aç'} aria-expanded={open} aria-controls="home-help-bubble" onPointerEnter={greet} onFocus={greet} onClick={()=>{greet();setOpen(v=>!v);}}><KMascot wave={wave} scope="page"/></button></aside>;
}
