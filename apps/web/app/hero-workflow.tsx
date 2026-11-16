"use client";
import {useEffect,useRef,useState} from "react";
const letters=['A','B','C','D','E'];
/** Decorative, entirely local example; no live student or exam statistics. */
export default function HeroWorkflow(){
 const root=useRef<HTMLElement>(null),frame=useRef(0),[paused,setPaused]=useState(false),[visible,setVisible]=useState(true);
 useEffect(()=>{if(!root.current||!('IntersectionObserver' in window))return;const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:.05});observer.observe(root.current);return()=>{observer.disconnect();cancelAnimationFrame(frame.current);};},[]);
 function tilt(x:number,y:number){cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(()=>{root.current?.style.setProperty('--workflow-x',`${x}deg`);root.current?.style.setProperty('--workflow-y',`${y}deg`);});}
 return <figure ref={root} className="workflow-hero" data-paused={paused||!visible} onPointerMove={e=>{if(paused||!visible||e.pointerType!=='mouse'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=e.currentTarget.getBoundingClientRect();tilt((.5-(e.clientY-r.top)/r.height)*4,((e.clientX-r.left)/r.width-.5)*5);}} onPointerLeave={()=>{if(!paused)tilt(0,0);}}>
  <div className="workflow-scene"><svg viewBox="0 0 600 510" role="img" aria-labelledby="workflow-title workflow-description">
   <title id="workflow-title">Bir sınavın sonuçlara dönüşümü</title><desc id="workflow-description">Sınav kitapçığı ve cevap formu taranır. İşaretli cevaplar değerlendirilir, ders grafikleri ve örnek öğrenci karnesi oluşur.</desc>
   <defs>
    <linearGradient id="wf-book" x2="1" y2="1"><stop stopColor="#3a5684"/><stop offset="1" stopColor="#172b4b"/></linearGradient>
    <linearGradient id="wf-paper" x2=".8" y2="1"><stop stopColor="#ffffff"/><stop offset="1" stopColor="#f1f3f6"/></linearGradient>
    <linearGradient id="wf-scan" x2="0" y2="1"><stop stopColor="#668dc4" stopOpacity="0"/><stop offset=".9" stopColor="#668dc4" stopOpacity=".15"/><stop offset="1" stopColor="#668dc4" stopOpacity=".65"/></linearGradient>
    <linearGradient id="wf-ground"><stop stopColor="#4e6c98" stopOpacity="0"/><stop offset=".5" stopColor="#4e6c98" stopOpacity=".12"/><stop offset="1" stopColor="#4e6c98" stopOpacity="0"/></linearGradient>
    <filter id="wf-shadow" x="-50%" y="-40%" width="200%" height="200%"><feDropShadow dx="0" dy="15" stdDeviation="15" floodColor="#0e203c" floodOpacity=".14"/></filter>
    <clipPath id="wf-sheet-clip"><rect x="226" y="118" width="195" height="233" rx="3"/></clipPath>
   </defs>
   <ellipse cx="300" cy="459" rx="240" ry="21" fill="url(#wf-ground)"/>
   <g className="wf-book-float"><g transform="rotate(-12 195 240)" filter="url(#wf-shadow)">
    <rect x="77" y="90" width="219" height="325" rx="7" fill="#d9dfE9"/><rect x="76" y="87" width="217" height="325" rx="6" fill="url(#wf-book)"/>
    <path d="M88 89v322" stroke="#fff" strokeOpacity=".18"/>
    <rect x="111" y="120" width="27" height="27" rx="7" fill="#fff" fillOpacity=".16"/><text x="124.5" y="139" textAnchor="middle" fill="#fff" fontSize="19" fontWeight="700">K</text>
    <text x="111" y="190" fill="#c7d4e8" fontSize="10" letterSpacing="2">KURUMSAL SINAV</text>
    <text x="110" y="223" fill="#fff" fontSize="27" fontWeight="650">Her cevap,</text><text x="110" y="254" fill="#fff" fontSize="27" fontWeight="650">bir adım.</text>
    <path d="M111 285h113M111 294h82" stroke="#afc1dc" strokeOpacity=".55" strokeWidth="2"/>
    <text x="111" y="379" fill="#c4d0e1" fontSize="9" letterSpacing="1.7">DENEME KİTAPÇIĞI</text><text x="246" y="379" fill="#fff" fontSize="14">08</text>
   </g></g>
   <g className="wf-form-float"><g transform="rotate(5 324 210)" filter="url(#wf-shadow)">
    <rect x="205" y="44" width="237" height="341" rx="7" fill="url(#wf-paper)" stroke="#dbe2ec"/>
    <rect x="225" y="65" width="23" height="23" rx="6" fill="#294b7c"/><text x="236.5" y="81.5" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">K</text>
    <text x="258" y="75" fill="#263c5d" fontSize="10" fontWeight="700">CEVAP FORMU</text><text x="258" y="88" fill="#7c8ba0" fontSize="8">8. SINIF · A KİTAPÇIĞI</text>
    <path d="M226 102h194" stroke="#dce3ec"/>
    <text x="227" y="122" fill="#7c8ba0" fontSize="7">ÖĞRENCİ NUMARASI</text><text x="227" y="139" fill="#3f5574" fontSize="11" letterSpacing="3">0 0 1 2 8</text>
    <text x="227" y="164" fill="#7c8ba0" fontSize="7">SORU</text>{letters.map((l,i)=><text key={l} x={274+i*31} y="164" textAnchor="middle" fill="#7c8ba0" fontSize="8">{l}</text>)}
    {Array.from({length:8},(_,r)=><g key={r}><text x="228" y={190+r*21} fill="#7c8ba0" fontSize="9">{String(r+1).padStart(2,'0')}</text>{letters.map((l,c)=><g key={l}><circle cx={274+c*31} cy={187+r*21} r="6" fill="none" stroke="#ccd6e4" strokeWidth="1.1"/>{c===[0,2,1,3,0,1,2,3][r]&&<circle className="wf-mark" style={{animationDelay:`${r*.26}s`}} cx={274+c*31} cy={187+r*21} r="4.2" fill="#345c91"/>}</g>)}<path d={`M226 ${199+r*21}h194`} stroke="#e7ebf1"/></g>)}
    <g clipPath="url(#wf-sheet-clip)"><rect className="wf-scan" x="225" y="113" width="197" height="48" fill="url(#wf-scan)"/></g>
    <text x="227" y="365" fill="#7c8ba0" fontSize="7" letterSpacing="1">OPTİK OKUMA · 7108</text><path d="M381 354v13m3-13v13m5-13v13m3-13v13m6-13v13m3-13v13m5-13v13m3-13v13" stroke="#637a99" strokeWidth="1.5"/>
   </g></g>
   <g className="wf-pencil" transform="rotate(28 492 85)" aria-hidden="true"><path d="M487 34h10v100l-5 16-5-16Z" fill="#6b92cc"/><path d="M487 134h10l-5 16Z" fill="#d8c4a4"/><path d="m490 144 2 6 2-6Z" fill="#172b4d"/><path d="M490 36v96" stroke="#adc8ed" strokeWidth="2"/></g>
   <g className="wf-verified"><rect x="389" y="159" width="147" height="40" rx="20" className="wf-chip"/><circle cx="410" cy="179" r="10" fill="#e7f2ed"/><path d="m405 179 3 3 6-7" fill="none" stroke="#4d806c" strokeWidth="1.8" strokeLinecap="round"/><text x="427" y="183" className="wf-chip-text" fontSize="10">Cevaplar eşleşti</text></g>
   <g className="wf-report" filter="url(#wf-shadow)">
    <rect x="331" y="250" width="215" height="219" rx="10" className="wf-report-paper"/>
    <text x="350" y="276" className="wf-report-title" fontSize="10" fontWeight="700" letterSpacing=".7">ÖĞRENCİ KARNESİ</text><text x="350" y="292" className="wf-muted" fontSize="8">Örnek değerlendirme · 90 soru</text>
    <text x="350" y="326" className="wf-report-title" fontSize="29" fontWeight="650">72<tspan dx="6" fontSize="10" fontWeight="400" className="wf-muted">net</tspan></text><circle cx="515" cy="316" r="13" fill="#e7f2ed"/><path d="m509 316 4 4 7-8" fill="none" stroke="#4d806c" strokeWidth="2" strokeLinecap="round"/>
    <path d="M350 340h177" className="wf-rule"/>
    {[17,8,9,7,16,18].map((n,i)=><g key={i}><rect x={354+i*29} y={407-n*2.7} width="17" height={n*2.7} rx="3" className="wf-bar" style={{animationDelay:`${i*.12}s`}}/><text x={362+i*29} y="422" textAnchor="middle" className="wf-muted" fontSize="7">{['TR','SOS','DİN','İNG','MAT','FEN'][i]}</text></g>)}
    <path d="M350 434h177" className="wf-rule"/><text x="350" y="453" className="wf-muted" fontSize="9">75 doğru<tspan dx="12">9 yanlış</tspan><tspan dx="12">6 boş</tspan></text>
   </g>
  </svg></div>
  <figcaption><span className="workflow-eyebrow">OPTİK FORMDAN ÖĞRENCİ KARNESİNE</span><ol className="workflow-stages"><li>Oku</li><li>Değerlendir</li><li>Raporla</li></ol><button type="button" className="workflow-pause" aria-pressed={paused} onClick={()=>{cancelAnimationFrame(frame.current);setPaused(v=>!v);}}>{paused?'Animasyonu oynat':'Animasyonu durdur'}<span aria-hidden="true">{paused?' ▶':' Ⅱ'}</span></button></figcaption>
 </figure>;
}
