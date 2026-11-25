"use client";
import {useEffect,useRef,useState} from "react";

/** One clock drives the scene and its bar, including viewport/document pauses. */
export function useHomeScene(duration:number,last=20,once=false){
 const root=useRef<HTMLElement>(null),clock=useRef(0),[step,setStep]=useState(0),[paused,setPaused]=useState(false),[replay,setReplay]=useState(0);
 useEffect(()=>{
  const node=root.current;if(!node)return;node.dataset.homeScene='true';node.dataset.duration=String(duration);node.dataset.sceneLast=String(last);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');let visible=false,frame=0,previous=0,paint=0,pointerX=0,pointerY=0;
  const point=(event:PointerEvent)=>{if(event.pointerType!=='mouse'||motion.matches||!visible)return;const r=node.getBoundingClientRect();pointerX=(event.clientX-r.left)/r.width-.5;pointerY=(event.clientY-r.top)/r.height-.5;};
  const leave=()=>{pointerX=0;pointerY=0;};
  node.addEventListener('pointermove',point,{passive:true});node.addEventListener('pointerleave',leave);
  const stop=()=>{cancelAnimationFrame(frame);frame=0;previous=0;node.dataset.playing='false';};
  const render=()=>{const progress=motion.matches?1:Math.min(1,clock.current/(duration-800));node.style.setProperty('--scene-progress',String(progress));node.dataset.elapsed=String(Math.round(clock.current));const next=Math.min(last,Math.floor(progress*(last+1)));node.dataset.step=String(next);setStep(next);};
  const tick=(now:number)=>{if(document.hidden||motion.matches||paused||!visible){stop();if(motion.matches)render();return;}if(previous)clock.current=once?Math.min(duration,clock.current+Math.min(100,now-previous)):(clock.current+Math.min(100,now-previous))%duration;previous=now;if(now-paint>=50){const rect=node.getBoundingClientRect();node.style.setProperty('--scene-viewport',String(Math.max(-1,Math.min(1,(innerHeight/2-(rect.top+rect.height/2))/innerHeight))));node.style.setProperty('--scene-pointer-x',String(pointerX));node.style.setProperty('--scene-pointer-y',String(pointerY));render();paint=now;}if(once&&clock.current>=duration){render();stop();return;}frame=requestAnimationFrame(tick);};
  const start=()=>{stop();if(motion.matches){render();return;}if(visible&&!paused&&!document.hidden){node.dataset.playing='true';frame=requestAnimationFrame(tick);}};
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;start();},{threshold:.15});
  observer.observe(node);motion.addEventListener('change',start);document.addEventListener('visibilitychange',start);render();
  return()=>{stop();node.removeEventListener('pointermove',point);node.removeEventListener('pointerleave',leave);observer.disconnect();motion.removeEventListener('change',start);document.removeEventListener('visibilitychange',start);};
 },[duration,last,once,paused,replay]);
 return {root,step,controls:<div className="studio-actions scene-controls"><button type="button" className="button button-quiet" onClick={()=>{clock.current=0;setStep(0);setReplay(n=>n+1);setPaused(false);}}>Yeniden oynat</button><button type="button" className="button button-quiet" aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>{paused?'Oynat':'Durdur'}</button></div>};
}
export function SceneProgress(){return <div className="scene-progress" aria-hidden="true"><i/></div>;}
