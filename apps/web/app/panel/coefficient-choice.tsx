"use client";
import {useEffect,useState} from "react";
export default function CoefficientChoice({missing,onDefine,onAccept}:{missing:boolean;onDefine:()=>void;onAccept:(value:boolean)=>void}){
 const [accepted,setAccepted]=useState(false);
 useEffect(()=>{setAccepted(false);onAccept(false);},[missing]);
 if(!missing)return null;
 return <aside className="notice fmt-guess-warning"><p>Bu sınav için katsayı tanımlanmamış. Sınavı katsayısız oluşturabilirsiniz. Katsayı gerektiren puan hesaplamaları yapılamayabilir.</p><div className="studio-actions"><button type="button" className="button button-navy" onClick={()=>{setAccepted(true);onAccept(true);}}>Katsayısız devam et</button><button type="button" className="button button-quiet" onClick={()=>{setAccepted(false);onAccept(false);onDefine();}}>Katsayı tanımla</button></div>{accepted&&<p role="status">Katsayısız devam edilecek. Puan ve puan sıralaması hesaplanmayacak.</p>}</aside>;
}
