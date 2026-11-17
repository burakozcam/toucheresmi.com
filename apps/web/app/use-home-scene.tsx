"use client";
import {useEffect,useRef,useState} from "react";

/** One clock drives the scene and its bar, including viewport/document pauses. */
export function useHomeScene(duration:number,last=20){
 const root=useRef<HTMLElement>(null),clock=useRef(0),[step,setStep]=useState(0),[paused,setPaused]=useState(false),[replay,setReplay]=useState(0);
 useEffect(()=>{
  const node=root.current;if(!node)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');let visible=false,frame=0,previous=0,paint=0;
  const stop=()=>{cancelAnimationFrame(frame);frame=0;previous=0;node.dataset.playing='false';};
  const render=()=>{const progress=motion.matches?1:Math.min(1,clock.current/(duration-800));node.style.setProperty('--scene-progress',String(progress));node.dataset.elapsed=String(Math.round(clock.current));setStep(Math.floor(progress*last));};
  const tick=(now:number)=>{if(previous)clock.current=(clock.current+Math.min(100,now-previous))%duration;previous=now;if(now-paint>=50){render();paint=now;}frame=requestAnimationFrame(tick);};
  const start=()=>{stop();if(motion.matches){render();return;}if(visible&&!paused&&!document.hidden){node.dataset.playing='true';frame=requestAnimationFrame(tick);}};
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;start();},{threshold:.15});
  observer.observe(node);motion.addEventListener('change',start);document.addEventListener('visibilitychange',start);render();
  return()=>{stop();observer.disconnect();motion.removeEventListener('change',start);document.removeEventListener('visibilitychange',start);};
 },[duration,last,paused,replay]);
 return {root,step,controls:<div className="studio-actions scene-controls"><button type="button" className="button button-quiet" onClick={()=>{clock.current=0;setStep(0);setReplay(n=>n+1);setPaused(false);}}>Yeniden oynat</button><button type="button" className="button button-quiet" aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>{paused?'Oynat':'Durdur'}</button></div>};
}
export function SceneProgress(){return <div className="scene-progress" aria-hidden="true"><i/></div>;}
