'use client';
import {useEffect,useState} from 'react';
import SecurityLock from '../security-lock';
// Only this fixed demonstration word is animated. No credential/session prop exists.
const DEMO=['Şifreniz','*ifreniz','**freniz','***reniz','****eniz','*****niz','******iz','*******z','********'];
export default function SessionGate({verified=false,children}:{verified?:boolean;children?:React.ReactNode}){
 const [step,setStep]=useState(0);
 useEffect(()=>{if(verified||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const timer=setInterval(()=>setStep(s=>(s+1)%DEMO.length),220);return()=>clearInterval(timer);},[verified]);
 return <div className={`panel-session-gate ${verified?'session-verified':''}`} role={verified?undefined:'status'} aria-live="polite"><SecurityLock/><span className="session-demo" aria-hidden="true">{DEMO[step]}</span><p>{verified?'Oturum doğrulandı':'Oturum kontrol ediliyor…'}</p>{children}</div>;
}
