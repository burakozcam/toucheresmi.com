"use client";
import ActionButton from "./action-button";
import {useEffect,useState} from "react";
import type {OpticalQuestion} from "../../lib/optical";
import {locationKey} from "../../../api/lib/turkey-locations";
import builtin from "../../../api/lib/ozdebir-profile.json";
import {lessonIdentity} from "../../../api/lib/evaluation-compatibility";
import {opticalRequest} from "../../lib/optical-api";
export default function ScoringSettings({questions,onApply,publisher="",grade=0,disabled=false,previewOpen=false}:{questions:OpticalQuestion[];onApply:(q:OpticalQuestion[])=>void;publisher?:string;grade?:number;disabled?:boolean;previewOpen?:boolean}){
 const [profile,setProfile]=useState<any>(builtin),[error,setError]=useState(""),[mode,setMode]=useState("custom");
 useEffect(()=>{const token=sessionStorage.getItem("kurumsal-auth-token");if(token)void opticalRequest(token,"/score-profiles").then(rows=>setProfile(rows.find((p:any)=>p.active&&p.grade===grade)??builtin)).catch(()=>setError("Güncel varsayılanlar alınamadı. Kaydetmeden önce yeniden deneyin."));},[grade]);
 const supported=grade===8&&locationKey(publisher)==="OZDEBIR";
 function applyDefault(){setMode("default");if(!supported)return;onApply(questions.map(q=>({...q,weight:profile.weights[lessonIdentity(q.lesson)]??null,scoreBase:profile.base,multipleMark:profile.multipleMark==="blank"?"blank":"wrong"})));}
 return <fieldset className="scoring-settings" disabled={disabled}><legend>Puan Hesaplama ve Katsayı Ayarları</legend><label>Hesaplama seçimi<select value={mode} onChange={e=>{if(e.target.value==="default")applyDefault();else setMode("custom");}}><option value="default" disabled={!supported||!!error}>Varsayılan katsayıları kullan</option><option value="custom">Sınava özel katsayı belirle</option></select></label><details open={previewOpen||undefined}><summary>Varsayılan Katsayılar</summary>{supported?<><p>Başlangıç puanı: {profile.base}</p><dl>{Object.entries(profile.weights).map(([lesson,value])=><div key={lesson}><dt>{lesson}</dt><dd>{String(value)}</dd></div>)}</dl><p className="field-help">Kaynak: Özdebir O8126 karne incelemesinden türetilen profil. Evrensel resmî katsayı değildir. Yalnız bu taslağa uygulanır.</p><ActionButton intent="evaluate" type="button" className="button button-quiet" disabled={!questions.length||!!error} onClick={applyDefault}>Varsayılanları bu taslağa uygula</ActionButton></>:<p>Bu yayınevi ve sınıf için kayıtlı varsayılan profil yok. Mevcut dosya katsayılarını koruyabilir veya soru tablosunda sınava özel katsayı belirleyebilirsiniz.</p>}</details>{error&&<p role="alert">{error}</p>}<p className="field-help">Dosyada gelen ve soru tablosunda girilen katsayılar korunur. Soru tablosu, bu sınava özel son değerleri gösterir. Geçmiş sonuçlar değişmez.</p></fieldset>;
}
