"use client";
import {useEffect,useRef,useState} from 'react';
const min=200,max=380,defaultWidth=260,key='ks-sidebar-width';
export default function SidebarResize(){const width=useRef(defaultWidth),raf=useRef(0),[saved,setSaved]=useState(defaultWidth);
 const apply=(value:number)=>{width.current=Math.max(min,Math.min(max,value));cancelAnimationFrame(raf.current);raf.current=requestAnimationFrame(()=>document.documentElement.style.setProperty('--panel-sidebar-width',`${width.current}px`));};
 const save=()=>{setSaved(width.current);try{localStorage.setItem(key,String(width.current));}catch{}};
 useEffect(()=>{try{const value=Number(localStorage.getItem(key));if(Number.isFinite(value)&&value>=min&&value<=max){apply(value);setSaved(value);}}catch{}return()=>{cancelAnimationFrame(raf.current);document.documentElement.style.removeProperty('--panel-sidebar-width');};},[]);
 return <button className="sidebar-resize" role="separator" aria-orientation="vertical" aria-label="Menü genişliği. Ok tuşlarıyla ayarlayın; Home veya çift tıklama ile sıfırlayın." aria-valuemin={min} aria-valuemax={max} aria-valuenow={saved} onDoubleClick={()=>{apply(defaultWidth);save();}} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home'].includes(e.key)){e.preventDefault();apply(e.key==='Home'?defaultWidth:width.current+(e.key==='ArrowRight'?10:-10));save();}}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);document.body.style.cursor='col-resize';}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))apply(e.clientX);}} onPointerUp={e=>{e.currentTarget.releasePointerCapture(e.pointerId);document.body.style.cursor='';save();}} onPointerCancel={()=>{document.body.style.cursor='';save();}}><span aria-hidden="true">⋮</span></button>;
}
