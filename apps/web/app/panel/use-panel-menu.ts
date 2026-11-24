'use client';
import {useEffect,useRef,useState} from 'react';

export function usePanelMenu(enabled:boolean) {
  const [open,setOpen]=useState(false),[compact,setCompact]=useState(true);
  const sidebar=useRef<HTMLElement>(null),content=useRef<HTMLElement>(null);
  const opener=useRef<HTMLElement|null>(null),focusCategory=useRef<string|null>(null);
  useEffect(()=>{
    const media=window.matchMedia('(max-width: 1000px)');
    const sync=()=>{setCompact(media.matches);setOpen(!media.matches);};
    sync();media.addEventListener('change',sync);
    return()=>media.removeEventListener('change',sync);
  },[]);
  function show(source:HTMLElement,category?:string) {
    opener.current=source;focusCategory.current=category??null;setOpen(true);
  }
  function close(toContent=false) {
    setOpen(false);
    requestAnimationFrame(()=>{
      if(toContent){content.current?.focus({preventScroll:true});window.scrollTo({top:0,left:0,behavior:'instant'});}
      else if(opener.current?.isConnected&&opener.current.getClientRects().length)opener.current.focus({preventScroll:true});
      else document.querySelector<HTMLButtonElement>('.sidebar-rail button')?.focus({preventScroll:true});
    });
  }
  const afterNavigation=()=>{if(compact)close(true);};
  useEffect(()=>{
    if(!enabled||!open)return;
    const frame=requestAnimationFrame(()=>{
      const target=focusCategory.current?document.getElementById(focusCategory.current):compact?sidebar.current?.querySelector<HTMLElement>('.sidebar-close'):null;
      target?.focus({preventScroll:true});target?.scrollIntoView({block:'nearest'});focusCategory.current=null;
    });
    const keydown=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();close();return;}
      if(!compact||e.key!=='Tab')return;
      const targets=Array.from(sidebar.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],[tabindex="0"]')??[]).filter(el=>!el.closest('[inert]')&&el.getClientRects().length);
      const first=targets[0],last=targets.at(-1);if(!first||!last)return;
      if(!sidebar.current?.contains(document.activeElement)){e.preventDefault();(e.shiftKey?last:first).focus();}
      else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',keydown);
    if(!compact)return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',keydown);};
    // Fixed body also prevents the page moving behind the drawer on iOS. Restore
    // the original inline styles and scroll position on close, resize or unmount.
    const body=document.body,root=document.documentElement,x=window.scrollX,y=window.scrollY;
    const saved={position:body.style.position,top:body.style.top,left:body.style.left,width:body.style.width,overflow:body.style.overflow,rootOverflow:root.style.overflow};
    Object.assign(body.style,{position:'fixed',top:`-${y}px`,left:`-${x}px`,width:'100%',overflow:'hidden'});root.style.overflow='hidden';
    return()=>{
      cancelAnimationFrame(frame);document.removeEventListener('keydown',keydown);
      Object.assign(body.style,{position:saved.position,top:saved.top,left:saved.left,width:saved.width,overflow:saved.overflow});root.style.overflow=saved.rootOverflow;
      window.scrollTo({left:x,top:y,behavior:'instant'});
    };
  },[enabled,open,compact]);
  return {open,compact,sidebar,content,show,close,afterNavigation};
}
