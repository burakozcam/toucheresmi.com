"use client";
import {answerKeyRows} from "../../../api/lib/answer-key-rows";
import { useEffect,useState } from "react";
import type { OpticalQuestion } from "../../lib/optical";
import { questionProblems } from "../../lib/optical-admin-validation";
import CoefficientChoice from "./coefficient-choice";
import ExamTemplatePicker from "./exam-template-picker";
import OpticalKeyEditor from "./optical-key-editor";
import type { ImportReview } from "./answer-key-file-input";
export type ManualReview=ImportReview&{file?:File};
export default function ManualKeyEntry({token,disabled,context,onReview,publisher="",grade=0}:{publisher?:string;grade?:number;token:string;disabled:boolean;context:string;onReview:(value:ManualReview)=>void}){
 const [acceptedMissing,setAcceptedMissing]=useState(false);
 const [questions,setQuestions]=useState<OpticalQuestion[]>([]),[confirmed,setConfirmed]=useState(false);const errors=questionProblems(questions);
 useEffect(()=>setConfirmed(false),[context]);
 useEffect(()=>{let cancel=false;const quote=(s:unknown)=>`"${String(s??"").replace(/"/g,'""')}"`;const rows=answerKeyRows(questions);const file=new File([rows.map(r=>r.map(quote).join(",")).join("\r\n")],"Elle Hazırlanan Kazanımlar.csv",{type:"text/csv"});void file.arrayBuffer().then(b=>crypto.subtle.digest("SHA-256",b)).then(hash=>{if(!cancel)onReview({questions,file,confirmed,format:"standard",checksum:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("")});});return()=>{cancel=true;};},[questions,confirmed]);
 return <div><h3>Optik cevap / kazanım oluştur</h3><ExamTemplatePicker token={token} questions={questions} disabled={disabled} onChange={q=>{setQuestions(q);setConfirmed(false);setAcceptedMissing(false);}}/><CoefficientChoice questions={questions} publisher={publisher} grade={grade} onApply={q=>{setQuestions(q);setConfirmed(false);setAcceptedMissing(false);}} missing={questions.some(q=>q.weight===null)} onAccept={accepted=>{setAcceptedMissing(accepted);if(!accepted)setConfirmed(false);}} onDefine={()=>document.querySelector<HTMLInputElement>('.optical-key-editor input[aria-label$="katsayı"]')?.focus()}/><OpticalKeyEditor publisher={publisher} grade={grade} questions={questions} onChange={q=>{setQuestions(q);setConfirmed(false);setAcceptedMissing(false);}} busy={disabled} editableIdentity/><label className="checkbox-row"><input data-help-id="panel-manual-key-entry-1" aria-label="Elle hazırlanan anahtarı onaylıyorum" type="checkbox" checked={confirmed} disabled={disabled||!!errors.length||(questions.some(q=>q.weight===null)&&!acceptedMissing)} onChange={e=>setConfirmed(e.target.checked)}/>Bütün soruları, kazanımları ve yayın seçeneklerini inceledim; onaylıyorum.</label></div>;
}
