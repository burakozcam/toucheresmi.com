"use client";
import {useEffect,useState} from "react";
import {opticalRequest,jsonBody} from "../../lib/optical-api";
export default function FmtGuess({token,file,fileIds,onSelect,onExamSelect,disabled=false}:{token:string;file?:File;fileIds?:string[];onSelect:(id:string)=>void;onExamSelect?:(id:string)=>void;disabled?:boolean}){
 const [reports,setReports]=useState<any[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false),[applied,setApplied]=useState("");
 const [exams,setExams]=useState<any[]>([]),[examBusy,setExamBusy]=useState(false),[examError,setExamError]=useState("");
 const ids=JSON.stringify(fileIds??[]);
 useEffect(()=>{setReports([]);setError("");setApplied("");if(!file&&ids==="[]")return;let active=true;const controller=new AbortController();setBusy(true);
 const body=new FormData();if(file)body.append("file",file);
 void opticalRequest(token,"/infer-fmt",file?{method:"POST",body,signal:controller.signal}:{...jsonBody({fileIds:JSON.parse(ids)}),signal:controller.signal}).then(data=>{if(active)setReports(data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;controller.abort();};},[token,file,ids]);
 const best=reports[0]?.candidates?.[0];const same=best&&reports.every(r=>r.candidates[0]?.id===best.id);
 const bestId=same?best.id:"";
 useEffect(()=>{setExams([]);setExamError("");if(!bestId||!onExamSelect)return;let active=true;const controller=new AbortController();setExamBusy(true);
 const body=new FormData();if(file)body.append("file",file);body.append("templateId",bestId);
 void opticalRequest(token,"/suggest-exams",file?{method:"POST",body,signal:controller.signal}:{...jsonBody({fileIds:JSON.parse(ids),templateId:bestId}),signal:controller.signal}).then(data=>{if(active)setExams(data.items??[]);}).catch(e=>{if(active)setExamError(e.message);}).finally(()=>{if(active)setExamBusy(false);});return()=>{active=false;controller.abort();};},[token,file,ids,bestId,!!onExamSelect]);
 const exam=exams[0];
 return <div className="txt-suggestions" aria-live="polite">{busy&&<p>FMT içeriği analiz ediliyor…</p>}{error&&<p className="notice error">{error}</p>}{reports.map((r,i)=><div key={i} className="notice"><strong>{reports.length>1?`${i+1}. dosya: `:""}Önerilen FMT: {r.candidates?.[0]?.name??"Bulunamadı"} {r.candidates?.[0]&&`· %${Math.round(r.candidates[0].score*100)} eşleşme`}</strong><details><summary>Eşleşme ayrıntıları</summary>{r.candidates?.[0]?.reasons?.map((reason:string)=><p key={reason}>{reason}</p>)}</details></div>)}
 {onExamSelect&&<div className="notice"><strong>Önerilen sınav: {examBusy?"Karşılaştırılıyor…":exam?`${exam.publisher} · ${exam.grade}. sınıf · ${exam.name} · %${exam.matchPercent} eşleşme`:"Karşılaştırılabilir sınav bulunamadı"}</strong>{exam&&<p>{exam.matched}/{exam.compared} cevap eşleşti; en yakın öğrenci cevap dizisine göre tahmin.</p>}{examError&&<p role="alert">{examError}</p>}</div>}
 <div className="txt-suggestion-actions">{same&&<button type="button" disabled={disabled} className="button fmt-apply" onClick={()=>{onSelect(best.id);setApplied("Önerilen FMT seçildi.");}}>Önerilen FMT’yi uygula</button>}{onExamSelect&&exam&&<button type="button" disabled={disabled} className="button" onClick={()=>{onExamSelect(exam.id);setApplied("Önerilen sınav seçildi.");}}>Önerilen sınavı uygula</button>}{onExamSelect&&same&&exam&&<button type="button" disabled={disabled} className="button txt-apply-both" onClick={()=>{onSelect(best.id);onExamSelect(exam.id);setApplied("FMT ve sınav sağdaki alanlarda seçildi.");}}>İkisini de uygula</button>}</div>{applied&&<p role="status">{applied}</p>}</div>;
}
