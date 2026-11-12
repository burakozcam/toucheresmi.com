"use client";
import {useEffect,useRef,useState} from "react";
import {API_URL} from "../lib/api";
/** Reserve a stable logo box; unavailable images never leave a broken browser icon. */
export default function PublisherLogo({id,name,className="publisher-answer-logo",version}:{id:string;name:string;className?:string;version?:string|null}){
 const [failed,setFailed]=useState(false);
 const imageRef=useRef<HTMLImageElement>(null);
 useEffect(()=>{const image=imageRef.current;setFailed(!!image?.complete&&!image.naturalWidth);},[id,version]);
 const initials=name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join("").toLocaleUpperCase("tr-TR")||"Y";
 return <div className={`${className} publisher-logo-box${failed?" publisher-logo-missing":""}`} role="img" aria-label={failed?`${name}: logo görüntülenemedi`:`${name} logosu`}>
 {failed?<span className="publisher-logo-fallback" aria-hidden="true"><b>{initials}</b><small>Logo yok</small></span>:<img ref={imageRef} className="publisher-logo-image" src={`${API_URL}/api/publishers/${encodeURIComponent(id)}/logo${version?`?v=${encodeURIComponent(version)}`:""}`} alt="" loading="lazy" onError={()=>setFailed(true)}/>}
 </div>;
}
