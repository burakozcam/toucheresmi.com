"use client";
import {useEffect,useRef} from 'react';
/** Original K Logo Animasyonu SVG; interaction is scoped to its containing section. */
export default function KMascot({wave=false,scope='section'}:{wave?:boolean;scope?:'section'|'page'}){
 const svgRef=useRef<SVGSVGElement>(null);
 useEffect(()=>{const svg=svgRef.current;if(!svg)return;const host=(scope==='page'?svg.closest('main'):svg.closest('section'))??svg.parentElement!,media=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,timer:ReturnType<typeof setTimeout>|undefined;const target=[[0,0],[0,0]],position=[[0,0],[0,0]];
 function paint(){frame=0;let moving=false;position.forEach((v,i)=>{v[0]+=(target[i][0]-v[0])*.18;v[1]+=(target[i][1]-v[1])*.18;if(Math.abs(v[0]-target[i][0])+Math.abs(v[1]-target[i][1])>.02)moving=true;for(const key of ['p','h'])svg!.querySelector(`[data-eye="${key}${i+1}"]`)?.setAttribute('transform',`translate(${v[0]} ${v[1]})`);});if(moving)frame=requestAnimationFrame(paint);}
 function animate(){if(!frame)frame=requestAnimationFrame(paint);}
 function neutral(){target.forEach(v=>{v[0]=0;v[1]=0;});animate();}
 function move(e:PointerEvent){if(media.matches)return;const r=svg!.getBoundingClientRect();if(!r.width)return;[[168,113],[232,113]].forEach(([x,y],i)=>{const dx=(e.clientX-r.left)*400/r.width-x,dy=(e.clientY-r.top)*330/r.height-y,d=Math.hypot(dx,dy)||1,k=Math.min(8,d/10);target[i]=[dx/d*k,dy/d*k];});animate();}
 function touch(e:PointerEvent){if(e.pointerType==='mouse')return;move(e);clearTimeout(timer);timer=setTimeout(neutral,350);}
 function change(){cancelAnimationFrame(frame);frame=0;position.forEach(v=>{v[0]=v[1]=0;});target.forEach(v=>{v[0]=v[1]=0;});paint();}
 host.addEventListener('pointermove',move);host.addEventListener('pointerleave',neutral);host.addEventListener('pointerdown',touch,{passive:true});media.addEventListener('change',change);return()=>{host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',neutral);host.removeEventListener('pointerdown',touch);media.removeEventListener('change',change);cancelAnimationFrame(frame);clearTimeout(timer);};
 },[scope]);
 return <svg ref={svgRef} className={`k-mascot ${wave?'k-mascot-wave':''}`} viewBox="0 0 400 330" role="img" aria-label="Gözleri ve elleri olan K logosu">
  <ellipse className="shadow" cx="200" cy="300" rx="85" ry="10" fill="#1a2f55" opacity=".25"/>
  <g className="bob">

    <g className="wave">
      <line x1="100" y1="190" x2="58" y2="190" stroke="#1a2f55" strokeWidth="9" strokeLinecap="round"/>
      <g fill="#fff" stroke="#1a2f55" strokeWidth="3.5">
        <circle cx="32" cy="178" r="6"/><circle cx="28" cy="190" r="6"/><circle cx="32" cy="202" r="6"/>
        <circle cx="52" cy="176" r="6"/>
        <circle cx="46" cy="190" r="14"/>
      </g>
      <circle cx="46" cy="190" r="11.5" fill="#fff"/>
    </g>

    <g transform="translate(400,0) scale(-1,1)">
      <g className="wave b">
        <line x1="100" y1="190" x2="58" y2="190" stroke="#1a2f55" strokeWidth="9" strokeLinecap="round"/>
        <g fill="#fff" stroke="#1a2f55" strokeWidth="3.5">
          <circle cx="32" cy="178" r="6"/><circle cx="28" cy="190" r="6"/><circle cx="32" cy="202" r="6"/>
          <circle cx="52" cy="176" r="6"/>
          <circle cx="46" cy="190" r="14"/>
        </g>
        <circle cx="46" cy="190" r="11.5" fill="#fff"/>
      </g>
    </g>

    <path d="M130 70 H250 Q300 70 300 120 V220 Q300 270 250 270 H108 Q100 270 100 262 V100 Q100 70 130 70 Z" fill="#1a2f55"/>
    <text x="200" y="240" fontSize="118" fontWeight="800" textAnchor="middle" fill="#fff" fontFamily="Inter,Arial,sans-serif">K</text>

    <path d="M183 138 Q200 162 217 138 Z" fill="#e63946" stroke="#e63946" strokeWidth="4" strokeLinejoin="round"/>

    <g className="blink">
      <ellipse cx="168" cy="113" rx="19" ry="21" fill="#fff"/>
      <ellipse cx="232" cy="113" rx="19" ry="21" fill="#fff"/>
      <circle data-eye="p1" cx="168" cy="113" r="9" fill="#1a2f55"/>
      <circle data-eye="p2" cx="232" cy="113" r="9" fill="#1a2f55"/>
      <circle data-eye="h1" cx="164" cy="108" r="3" fill="#fff"/>
      <circle data-eye="h2" cx="228" cy="108" r="3" fill="#fff"/>
    </g>
  </g>
</svg>;
}
