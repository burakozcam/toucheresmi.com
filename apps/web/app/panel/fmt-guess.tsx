"use client";
import {useEffect,useRef,useState,type ReactNode} from "react";
import MatchMeter,{MatchDetails} from "./match-meter";
import {opticalRequest,jsonBody} from "../../lib/optical-api";
function MatchNotice({percent,label,children}:{percent?:number;label:string;children:ReactNode}){
 const value=typeof percent==="number"&&Number.isFinite(percent)?Math.max(0,Math.min(100,Math.round(percent))):undefined;
 return <div className="notice match-notice"><div className="match-notice-content">{children}</div>{value!==undefined&&<MatchMeter percent={value} label={label}/>}</div>;
}

export default function FmtGuess({token,file,fileIds,onSelect,onExamSelect,onUpload,disabled=false}:{token:string;file?:File;fileIds?:string[];onSelect:(id:string)=>void;onExamSelect?:(id:string)=>void;disabled?:boolean;onUpload?:(file:File)=>Promise<void>}){
 const [reports,setReports]=useState<any[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false),[applied,setApplied]=useState("");
 const [exams,setExams]=useState<any[]>([]),[examBusy,setExamBusy]=useState(false),[examError,setExamError]=useState("");
 const applying=useRef(false);const [applyBusy,setApplyBusy]=useState(false);
 async function apply(fmt?:string,key?:string){if(applying.current||disabled)return;applying.current=true;setApplyBusy(true);setError("");setApplied("");try{if(file){if(!onUpload)throw Error("TXT yükleme işlemi kullanılamıyor.");await onUpload(file);}if(fmt)onSelect(fmt);if(key)onExamSelect?.(key);setApplied(file?"TXT sunucuya yüklendi; önerilen seçimler uygulandı.":"Önerilen seçimler uygulandı.");}catch(e){setError((e as Error).message);}finally{applying.current=false;setApplyBusy(false);}}
 const ids=JSON.stringify(fileIds??[]);
 useEffect(()=>{setReports([]);setError("");setApplied("");if(!file&&ids==="[]")return;let active=true;const controller=new AbortController();setBusy(true);
 const body=new FormData();if(file)body.append("file",file);
 void opticalRequest(token,"/infer-fmt",file?{method:"POST",body,signal:controller.signal}:{...jsonBody({fileIds:JSON.parse(ids)}),signal:controller.signal}).then(data=>{if(active)setReports(data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;controller.abort();};},[token,file,ids]);
 const best=reports[0]?.candidates?.[0];const same=best&&reports.every(r=>r.candidates[0]?.id===best.id);
 const bestId=same?best.id:"";
 useEffect(()=>{setExams([]);setExamError("");setExamBusy(false);if(!bestId||!onExamSelect)return;let active=true;const controller=new AbortController();setExamBusy(true);
 const body=new FormData();if(file)body.append("file",file);body.append("templateId",bestId);
 void opticalRequest(token,"/suggest-exams",file?{method:"POST",body,signal:controller.signal}:{...jsonBody({fileIds:JSON.parse(ids),templateId:bestId}),signal:controller.signal}).then(data=>{if(active)setExams(data.items??[]);}).catch(e=>{if(active)setExamError(e.message);}).finally(()=>{if(active)setExamBusy(false);});return()=>{active=false;controller.abort();};},[token,file,ids,bestId,!!onExamSelect]);
 const exam=exams[0];
 return <div className="txt-suggestions" aria-live="polite">{busy&&<p>FMT içeriği analiz ediliyor…</p>}{error&&<p className="notice error">{error}</p>}{reports.map((r,i)=><MatchNotice key={i} label="FMT" percent={r.candidates?.[0]?r.candidates[0].score*100:undefined}><strong>{reports.length>1?`${i+1}. dosya: `:""}Önerilen FMT: {r.candidates?.[0]?.name??"Bulunamadı"} {r.candidates?.[0]&&`· %${Math.round(r.candidates[0].score*100)} eşleşme`}</strong><p>{r.message}</p><MatchDetails>{r.candidates?.[0]?.reasons?.map((reason:string)=><p key={reason}>{reason}</p>)}</MatchDetails></MatchNotice>)}
 {onExamSelect&&<MatchNotice key={exam?.id??"pending"} label="Sınav" percent={exam?.matchPercent}><strong>Önerilen sınav: {examBusy?"Karşılaştırılıyor…":exam?`${exam.publisher} · ${exam.grade}. sınıf · ${exam.name} · %${exam.matchPercent} eşleşme`:"Karşılaştırılabilir sınav bulunamadı"}</strong>{exam&&<MatchDetails><p>{exam.matched}/{exam.compared} cevap eşleşti; en yakın öğrenci cevap dizisine göre tahmin.</p></MatchDetails>}{examError&&<p role="alert">{examError}</p>}</MatchNotice>}
 <div className="txt-suggestion-actions">{same&&<button type="button" disabled={disabled||applyBusy} className="button fmt-apply" onClick={()=>void apply(best.id)}>Önerilen FMT’yi uygula</button>}{onExamSelect&&exam&&<button type="button" disabled={disabled||applyBusy} className="button" onClick={()=>void apply(undefined,exam.id)}>Önerilen sınavı uygula</button>}{onExamSelect&&same&&exam&&<button type="button" disabled={disabled||applyBusy} className="button txt-apply-both" onClick={()=>void apply(best.id,exam.id)}>{applyBusy?"TXT yükleniyor…":file?"TXT dosyasını yükle ve önerilen seçimleri uygula":"Önerilen FMT ve sınavı uygula"}</button>}</div>{applied&&<p role="status">{applied}</p>}</div>;
}
