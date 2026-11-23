"use client";
import {useLayoutEffect,useRef,useState,type ReactNode,type RefObject} from 'react';
import {createPortal} from 'react-dom';

/** Escape clipping/stacking ancestors and keep the list within the visual viewport. */
export default function FloatingPanel({anchor,onClose,className,children,role,label}:{anchor:RefObject<HTMLButtonElement|null>;onClose:()=>void;className:string;children:ReactNode;role?:'dialog';label?:string}){
 const panel=useRef<HTMLDivElement>(null),close=useRef(onClose);close.current=onClose;
 const [position,setPosition]=useState({left:8,top:8,width:280,maxHeight:320});
 useLayoutEffect(()=>{
  const place=()=>{const rect=anchor.current?.getBoundingClientRect();if(!rect)return;const viewport=window.visualViewport,w=viewport?.width??innerWidth,h=viewport?.height??innerHeight,x=viewport?.offsetLeft??0,y=viewport?.offsetTop??0;const below=h+y-rect.bottom-14,above=rect.top-y-14,up=below<220&&above>below,maxHeight=Math.max(80,Math.min(460,up?above:below));const height=Math.min(panel.current?.scrollHeight??maxHeight,maxHeight);setPosition({left:Math.max(x+8,Math.min(rect.left,w+x-Math.min(rect.width,w-16)-8)),top:up?Math.max(y+8,rect.top-height-6):rect.bottom+6,width:Math.min(rect.width,w-16),maxHeight});};
  const outside=(e:Event)=>{if(e.target instanceof Node&&!panel.current?.contains(e.target)&&!anchor.current?.contains(e.target))close.current();};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close.current();anchor.current?.focus();}};
  place();const observer=new ResizeObserver(place);if(anchor.current)observer.observe(anchor.current);
  window.addEventListener('resize',place);window.addEventListener('scroll',place,true);window.visualViewport?.addEventListener('resize',place);document.addEventListener('pointerdown',outside);document.addEventListener('focusin',outside);document.addEventListener('keydown',escape);
  return()=>{observer.disconnect();window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);window.visualViewport?.removeEventListener('resize',place);document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',outside);document.removeEventListener('keydown',escape);};
 },[anchor]);
 return createPortal(<div ref={panel} className={`${className} floating-panel`} style={position} role={role} aria-label={label}>{children}</div>,document.body);
}
