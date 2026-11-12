"use client";
import { useEffect,useState } from "react";
import type { OpticalQuestion } from "../../lib/optical";
import { questionProblems } from "../../lib/optical-admin-validation";
import CoefficientChoice from "./coefficient-choice";
import OpticalKeyEditor from "./optical-key-editor";
import type { ImportReview } from "./answer-key-file-input";
export type ManualReview=ImportReview&{file?:File};
export default function ManualKeyEntry({disabled,context,onReview}:{disabled:boolean;context:string;onReview:(value:ManualReview)=>void}){
 const [acceptedMissing,setAcceptedMissing]=useState(false);
 const [questions,setQuestions]=useState<OpticalQuestion[]>([]),[confirmed,setConfirmed]=useState(false);const errors=questionProblems(questions);
 useEffect(()=>setConfirmed(false),[context]);
 useEffect(()=>{let cancel=false;const quote=(s:unknown)=>`"${String(s??"").replace(/"/g,'""')}"`;const rows=[["Ders","A Soru No","B Soru No","Doğru Cevap","Katsayı","Kazanım Kodu","Kazanım Metni","C Soru No","D Soru No"],...questions.map(q=>[q.lesson,q.number,q.positions.B??"",q.answer,q.weight,q.outcomeCode,q.outcomeName,q.positions.C??"",q.positions.D??""])];const file=new File([rows.map(r=>r.map(quote).join(",")).join("\r\n")],"Elle Hazırlanan Kazanımlar.csv",{type:"text/csv"});void file.arrayBuffer().then(b=>crypto.subtle.digest("SHA-256",b)).then(hash=>{if(!cancel)onReview({questions,file,confirmed,format:"standard",checksum:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("")});});return()=>{cancel=true;};},[questions,confirmed]);
 return <div><h3>Elle cevap / kazanım oluştur</h3><CoefficientChoice key={JSON.stringify(questions)} missing={questions.some(q=>q.weight===null)} onAccept={accepted=>{setAcceptedMissing(accepted);if(!accepted)setConfirmed(false);}} onDefine={()=>document.querySelector<HTMLInputElement>('.optical-key-editor input[aria-label$="katsayı"]')?.focus()}/><OpticalKeyEditor questions={questions} onChange={q=>{setQuestions(q);setConfirmed(false);setAcceptedMissing(false);}} busy={disabled} editableIdentity/><label className="checkbox-row"><input aria-label="Elle hazırlanan anahtarı onaylıyorum" type="checkbox" checked={confirmed} disabled={disabled||!!errors.length||(questions.some(q=>q.weight===null)&&!acceptedMissing)} onChange={e=>setConfirmed(e.target.checked)}/>Bütün soruları, kazanımları ve yayın seçeneklerini inceledim; onaylıyorum.</label></div>;
}
