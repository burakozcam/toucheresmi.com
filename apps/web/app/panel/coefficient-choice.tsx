"use client";
import ActionButton from "./action-button";
import ScoringSettings from "./scoring-settings";
import type {OpticalQuestion} from "../../lib/optical";
import {useEffect,useState} from "react";
export default function CoefficientChoice({missing,onDefine,onAccept,questions=[],onApply,publisher,grade}:{missing:boolean;onDefine:()=>void;onAccept:(value:boolean)=>void;questions?:OpticalQuestion[];onApply?:(q:OpticalQuestion[])=>void;publisher?:string;grade?:number}){
 const [accepted,setAccepted]=useState(false),[defaults,setDefaults]=useState(false);
 useEffect(()=>{setAccepted(false);onAccept(false);},[missing]);
 if(!missing)return null;
 return <aside className="notice fmt-guess-warning"><p>Bu sınav için katsayı tanımlanmamış. Sınavı katsayısız oluşturabilirsiniz. Katsayı gerektiren puan hesaplamaları yapılamayabilir.</p><div className="studio-actions">{onApply&&<ActionButton data-help-id="panel-coefficient-choice-1" intent="manage" type="button" className="button button-navy" onClick={()=>setDefaults(v=>!v)}>Varsayılan Katsayıları Ekle</ActionButton>}<ActionButton data-help-id="panel-coefficient-choice-2" intent="neutral" type="button" className="button button-quiet" onClick={()=>{setAccepted(true);onAccept(true);}}>Katsayısız Devam Et</ActionButton><ActionButton data-help-id="panel-coefficient-choice-3" intent="neutral" type="button" className="button button-quiet" onClick={()=>{setAccepted(false);onAccept(false);onDefine();}}>Katsayıları Kendim Tanımla</ActionButton></div>{defaults&&onApply&&<ScoringSettings questions={questions} onApply={onApply} publisher={publisher} grade={grade} previewOpen/>}{accepted&&<p role="status">Katsayısız devam edilecek. Puan ve puan sıralaması hesaplanmayacak.</p>}</aside>;
}
