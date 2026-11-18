"use client";
import {useId} from 'react';
/** Geometry and finish are local SVG. Every moving part follows --scene-progress. */
export default function SecurityLock(){
 const id=useId().replace(/:/g,''),ref=(name:string)=>`url(#${id}-${name})`;
 return <svg className="security-lock" viewBox="0 0 144 164" fill="none" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id={`${id}-brass`} x1="27" y1="80" x2="116" y2="145" gradientUnits="userSpaceOnUse"><stop stopColor="#8c5c18"/><stop offset=".18" stopColor="#d7aa4f"/><stop offset=".44" stopColor="#f3d58c"/><stop offset=".65" stopColor="#c38e31"/><stop offset="1" stopColor="#8a5d1f"/></linearGradient>
   <linearGradient id={`${id}-edge`} x1="30" y1="74" x2="112" y2="74" gradientUnits="userSpaceOnUse"><stop stopColor="#79511e"/><stop offset=".28" stopColor="#e9c77b"/><stop offset=".62" stopColor="#a77528"/><stop offset="1" stopColor="#64461f"/></linearGradient>
   <linearGradient id={`${id}-steel`} x1="46" y1="45" x2="103" y2="45" gradientUnits="userSpaceOnUse"><stop stopColor="#7e642f"/><stop offset=".2" stopColor="#eedcab"/><stop offset=".4" stopColor="#fff0c3"/><stop offset=".65" stopColor="#b79852"/><stop offset=".85" stopColor="#edd394"/><stop offset="1" stopColor="#806334"/></linearGradient>
   <linearGradient id={`${id}-light`}><stop stopColor="#fff7d9" stopOpacity="0"/><stop offset=".5" stopColor="#fff7d9" stopOpacity=".48"/><stop offset="1" stopColor="#fff7d9" stopOpacity="0"/></linearGradient>
   <clipPath id={`${id}-face`}><rect x="29" y="77" width="86" height="70" rx="11"/></clipPath>
  </defs>
  <ellipse cx="72" cy="155" rx="43" ry="4" fill="currentColor" opacity=".09"/>
  <path d="M42 78h18v9H42zm43 0h18v9H85z" fill="#47391e"/>
  <g className="lock-shackle">
   <path d="M49 87V46a23 23 0 0 1 46 0v41" stroke="#705828" strokeWidth="13"/>
   <path d="M49 87V46a23 23 0 0 1 46 0v41" stroke={ref('steel')} strokeWidth="10"/>
   <path d="M46 70V46a26 26 0 0 1 14-23" stroke="#fff2cb" strokeWidth="1.2" opacity=".75"/>
   <path d="M91 75h8m-8 4h8" stroke="#634a22" strokeWidth="1.5"/>
  </g>
  <g className="lock-body">
   <rect x="26" y="74" width="92" height="76" rx="13" fill={ref('edge')}/>
   <rect x="29" y="77" width="86" height="70" rx="11" fill={ref('brass')} stroke="#f8df9c" strokeWidth=".6"/>
   <path d="M35 88v47a6 6 0 0 0 6 6h62M39 81h65" stroke="#fff0bc" strokeOpacity=".38" strokeWidth=".7"/>
   <path d="M40 91h64m-64 3h64m-64 3h64m-64 35h64m-64 3h64" stroke="#5f431b" strokeOpacity=".09" strokeWidth=".5"/>
   <circle cx="72" cy="111" r="12" fill="#9c712e" stroke="#f4d995" strokeWidth="1"/>
   <circle cx="72" cy="111" r="9.5" fill="#d3ab59" stroke="#775324" strokeWidth=".7"/>
   <path d="M75 109a3 3 0 1 0-5 2l-1 6h6l-1-6a3 3 0 0 0 1-2Z" fill="#49391f"/>
   {[40,104].map(x=><g key={x}><circle cx={x} cy="137" r="2" fill="#9a7230"/><path d={`m${x-1} 137h2`} stroke="#f3d895" strokeWidth=".6"/></g>)}
   <path d="M62 87h20m-15 3h10" stroke="#6f4c1c" strokeOpacity=".5" strokeWidth=".8"/>
   <g clipPath={ref('face')}><path className="lock-glint" d="m-32 65 23-10 69 108-23 10Z" fill={ref('light')}/></g>
  </g>
 </svg>;
}
