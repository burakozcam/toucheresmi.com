"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../../lib/api";
import type { KeyRecord, OpticalSnapshot, TemplateRecord } from "../../lib/optical";
import { opticalRequest, OpticalRequestError } from "../../lib/optical-api";
import SearchableSelect from "./searchable-select";
import ExamPicker from "./exam-picker";
import { compatibleEvaluation } from "../../../api/lib/evaluation-compatibility";

type School = {id:string;name:string};
type History = {revision:number;seriesId:string;studentPublished:boolean;id:string;filename:string;createdAt:string;schoolId:string;school:{name:string};key:{name:string};template:{name:string}};
const num=(n:number)=>new Intl.NumberFormat("tr-TR",{maximumFractionDigits:2}).format(n);

export default function OpticalEvaluation({token,screen="results",initialResultId,onSaved,canCreateSchool=false}:{token:string;screen?:"upload"|"results";initialResultId?:string;onSaved?:(id:string)=>void;canCreateSchool?:boolean}){
  const [schools,setSchools]=useState<School[]>([]),[templates,setTemplates]=useState<TemplateRecord[]>([]),[keys,setKeys]=useState<KeyRecord[]>([]),[history,setHistory]=useState<History[]>([]);
  const [showSchoolForm,setShowSchoolForm]=useState(false),[schoolName,setSchoolName]=useState(""),[schoolCity,setSchoolCity]=useState(""),[schoolDistrict,setSchoolDistrict]=useState("");
  const [schoolId,setSchoolId]=useState(""),[templateId,setTemplateId]=useState(""),[keyId,setKeyId]=useState(""),[file,setFile]=useState<File|null>(null);
  const [snapshot,setSnapshot]=useState<OpticalSnapshot|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState(""),[confirmed,setConfirmed]=useState(false),[ready,setReady]=useState(false);
  const [mode,setMode]=useState("list"),[sortMode,setSortMode]=useState<"score"|"alphabetical">("score"),[branch,setBranch]=useState(""),[studentId,setStudentId]=useState(""),[monochrome,setMonochrome]=useState(false),[showQuestions,setShowQuestions]=useState(false);
  const [files,setFiles]=useState<File[]>([]),[mergeSessions,setMergeSessions]=useState("true");
  const [loadErrors,setLoadErrors]=useState<string[]>([]);
  const fileInputRef=useRef<HTMLInputElement>(null);
  const resultRef=useRef<HTMLElement>(null);
  async function loadHistory(){setHistory(await opticalRequest(token,`/results${schoolId?`?schoolId=${encodeURIComponent(schoolId)}`:""}`));}
  async function load(){
    const loadSchools=async()=>{
      const response=await fetch(`${API_URL}/api/schools?active=true`,{headers:{Authorization:`Bearer ${token}`}});
      const data=await response.json().catch(()=>null);
      if(!response.ok||!Array.isArray(data))throw new Error(data?.error??`Kurumlar yüklenemedi (HTTP ${response.status}).`);
      return data as School[];
    };
    const loadTemplates=async()=>{
      try{return await opticalRequest(token,"/evaluation-templates");}
      catch(error){
        // Older API deployments expose registered FMTs through /templates only.
        if(error instanceof OpticalRequestError&&error.status===404)return opticalRequest(token,"/templates");
        throw error;
      }
    };
    const loadExams=async()=>{
      try{return await opticalRequest(token,"/evaluation-exams");}
      catch(error){if(error instanceof OpticalRequestError&&error.status===404)return opticalRequest(token,"/keys?available=true");throw error;}
    };
    const [s,t,k]=await Promise.allSettled([loadSchools(),screen==="upload"?loadTemplates():Promise.resolve([]),screen==="upload"?loadExams():Promise.resolve([])]);
    const problems:string[]=[];
    if(s.status==="fulfilled"){setSchools(s.value);setSchoolId(current=>s.value.some(row=>row.id===current)?current:"");}
    else problems.push(`Kurum listesi yüklenemedi: ${s.reason instanceof Error?s.reason.message:"Bağlantıyı kontrol edin."}`);
    if(t.status==="fulfilled"&&Array.isArray(t.value))setTemplates(t.value.filter((row:TemplateRecord)=>row.active));
    else problems.push(`FMT listesi yüklenemedi: ${t.status==="rejected"&&t.reason instanceof Error?t.reason.message:"Sunucudan geçersiz liste geldi."}`);
    if(k.status==="fulfilled"&&Array.isArray(k.value))setKeys(k.value.filter((row:KeyRecord)=>row.active));
    else problems.push(`Sınav/cevap anahtarı listesi yüklenemedi: ${k.status==="rejected"&&k.reason instanceof Error?k.reason.message:"Sunucudan geçersiz liste geldi."}`);
    setLoadErrors(problems);
  }
  function retryLoad(){setLoading(true);void load().catch(e=>setError(e.message)).finally(()=>setLoading(false));}
  useEffect(()=>{setSnapshot(null);setTemplateId("");setKeyId("");setTemplates([]);setKeys([]);setSchools([]);setSchoolId("");setLoading(true);setLoadErrors([]);void load().then(()=>{if(screen==="results"&&initialResultId)return openResult(initialResultId);}).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[token,screen]);
  useEffect(()=>{if(screen!=="results"||!schoolId)return;let cancelled=false;setHistory([]);void opticalRequest(token,`/results?schoolId=${encodeURIComponent(schoolId)}`).then(rows=>{if(!cancelled)setHistory(rows);}).catch(e=>{if(!cancelled)setError(e.message);});return()=>{cancelled=true;};},[token,screen,schoolId]);
  function invalidate(){setSnapshot(null);setConfirmed(false);setNotice("");setError("");}
  async function run(){
    if(!canPreview)return;
    setBusy(true);setError("");setNotice("");
    try{
      const form=()=>{const body=new FormData();for(const selected of files)body.append("files",selected);body.append("schoolId",schoolId);body.append("templateId",templateId);body.append("keyId",keyId);body.append("encoding","auto");body.append("mergeSessions",mergeSessions);return body;};
      const preview=await opticalRequest(token,"/preview",{method:"POST",body:form()});
      if(preview.checks?.blockers?.length)throw new Error(preview.checks.blockers.join(" "));
      const body=form();body.append("previewToken",preview.previewToken);body.append("confirmWarnings","true");
      const result=await opticalRequest(token,"/evaluate",{method:"POST",body});setSnapshot(result);setNotice(`${result.data.students.length} öğrenci sonucu kaydedildi. Sınav Sonuçları ekranından kurumunuzu ve sınavı seçebilirsiniz.`);
    }catch(e){setError(e instanceof Error?e.message:"Değerlendirme kaydedilemedi.");}finally{setBusy(false);}
  }
  async function createSchool(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");try{const response=await fetch(`${API_URL}/api/schools`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({name:schoolName,city:schoolCity||null,district:schoolDistrict||null})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Kurum oluşturulamadı.");setSchools(current=>[...current,data].sort((a,b)=>a.name.localeCompare(b.name,"tr")));setSchoolId(data.id);setShowSchoolForm(false);setSchoolName("");setSchoolCity("");setSchoolDistrict("");setNotice("Kurum eklendi ve seçildi.");}catch(e){setError(e instanceof Error?e.message:"Kurum eklenemedi.");}finally{setBusy(false);}}
  async function openResult(id:string){setBusy(true);setError("");setNotice("");try{const result=await opticalRequest(token,`/results/${id}`);setSnapshot(result);if(result.schoolId)setSchoolId(result.schoolId);setBranch("");setStudentId(result.data.students[0]?.id??"");setMode("list");setConfirmed(false);}catch(e){setError(e instanceof Error?e.message:"Sonuç açılamadı.");}finally{setBusy(false);}}
  const selectedTemplate=templates.find(t=>t.id===templateId);
  const selectedKey=keys.find(key=>key.id===keyId);
  const incompatible=!!selectedTemplate&&!!selectedKey&&selectedKey.evaluationReady!==false&&!compatibleEvaluation(selectedTemplate,selectedKey);
  const canPreview=files.length>0&&!!schoolId&&!!templateId&&!!selectedKey&&selectedKey.evaluationReady!==false&&!incompatible;
  function selectFiles(selected:File[]){
    invalidate();if(selected.length>10||selected.some(f=>!f.size||f.size>2*1024*1024||!/\.txt$/i.test(f.name))){setError("En fazla 10 adet, her biri boş olmayan ve 2 MB’ı aşmayan TXT seçin.");return;}
    setFiles(selected);setFile(selected[0]??null);if(!selected.length&&fileInputRef.current)fileInputRef.current.value="";
  }
  function selectTxt(selected:File|null){selectFiles(selected?[selected]:[]);}
  return <section className="optical-module">
    {!!loadErrors.length&&<div className="notice error" role="alert">{loadErrors.map(message=><p key={message}>{message}</p>)}<button type="button" className="button button-quiet" disabled={loading||busy} onClick={retryLoad}>Listeleri yeniden yükle</button></div>}
    {screen==="upload"&&<section className="exam-upload-workspace">
      {error&&<p className="notice error" role="alert">{error}</p>}{notice&&<p className="notice success" role="status">{notice}</p>}
      {loading?<div className="management-panel" role="status">Kurumlar, FMT’ler ve sınavlar yükleniyor…</div>:<div className="exam-upload-grid">
        <div className="exam-upload-settings">
          <section className="exam-upload-card">
            <header className="exam-upload-card-header"><span className="exam-upload-icon" aria-hidden="true">▤</span><div><h2>Yüklenecek sınav bilgileri</h2><p>Yayınevini açın, sınavınızı seçin.</p></div></header>
            <div className="exam-upload-field"><span>Sınav <small>Yayınevi ve sınav</small></span><ExamPicker exams={keys} value={keyId} disabled={busy} onChange={id=>{setKeyId(id);invalidate();}}/></div>
            {selectedKey&&<div className="exam-upload-exam-meta"><span>{selectedKey.grade?`${selectedKey.grade}. sınıf`:"Sınav"}</span><span>{selectedKey.questionCount} soru</span><span>{selectedKey.booklets.length?`${selectedKey.booklets.join(" / ")} kitapçık`:"Anahtar bekleniyor"}</span></div>}
            {selectedKey?.evaluationReady===false&&<p className="notice" role="status">{selectedKey.evaluationIssue}</p>}
            {!keys.length&&<p className="field-help">Cevap anahtarı eklenmiş sınavlar burada yayınevlerinin altında listelenir.</p>}
            <div className="exam-upload-field"><span>FMT <small>Optik okuyucu şablonu</small></span><SearchableSelect label="FMT Seçiniz" disabled={busy} emptyMessage="Seçilebilir FMT yok. FMT listesini yeniden yükleyin veya etkin FMT kaydını kontrol edin." options={templates.map(t=>({id:t.id,label:t.name,detail:[t.grade?`${t.grade}. sınıf`:"",`${t.layout.lineLength} karakter`].filter(Boolean).join(" · ")}))} value={templateId} onChange={id=>{setTemplateId(id);invalidate();}} placeholder="FMT adı veya sınıf ara…"/></div>

            {incompatible&&<p className="notice error" role="alert">Seçilen FMT ile sınavın sınıfı veya ders/soru dağılımı uyuşmuyor. Sınav seçiminiz korundu; uygun FMT’yi seçin.</p>}
            {!templates.length&&<div className="exam-upload-empty"><p>Seçilebilir etkin FMT bulunamadı.</p>{!loadErrors.length&&<button type="button" className="button button-quiet" disabled={busy} onClick={retryLoad}>Listeleri yeniden yükle</button>}</div>}
            <div className="exam-upload-field"><label htmlFor="session-merge">Oturum birleştirme</label><select id="session-merge" value={mergeSessions} disabled={busy} onChange={e=>{setMergeSessions(e.target.value);invalidate();}}><option value="true">Aynı öğrenciye ait sınav verilerini birleştir</option><option value="false">Birleştirme; oturumları ayrı tut</option></select><small>Öğrenci numarası veya TC ile eşleştirilir. Önceden yüklenen tamamlayıcı oturumlar da birleştirilir.</small></div>
            <div className="exam-upload-field"><label htmlFor="exam-upload-school">Kurum</label><div className="exam-upload-school"><select id="exam-upload-school" disabled={busy} value={schoolId} onChange={e=>{setSchoolId(e.target.value);invalidate();}}><option value="">Kurum seçin</option>{schools.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select>{canCreateSchool&&<button type="button" className="button button-quiet" disabled={busy} onClick={()=>setShowSchoolForm(v=>!v)}>＋ Kurum ekle</button>}</div></div>
          </section>
          {showSchoolForm&&<form className="exam-upload-card inline-school-create" onSubmit={createSchool}><h3>Yeni kurum</h3><label>Kurum adı<input required value={schoolName} onChange={e=>setSchoolName(e.target.value)} maxLength={180}/></label><label>İl<input value={schoolCity} onChange={e=>setSchoolCity(e.target.value)} maxLength={100}/></label><label>İlçe<input value={schoolDistrict} onChange={e=>setSchoolDistrict(e.target.value)} maxLength={100}/></label><button className="button button-navy" disabled={busy}>Kurumu ekle</button></form>}
          <details className="exam-upload-help"><summary><span aria-hidden="true">ⓘ</span> Sınav nasıl yüklenir?</summary><ol><li>Yayınevinizin altından cevap anahtarı eklenmiş sınavı seçin.</li><li>TXT dosyanıza ait FMT’yi seçin ve kurumu kontrol edin.</li><li>Bilgisayarınızdaki TXT’yi ekleyip “Değerlendir” düğmesine basın.</li><li>Değerlendir ve kaydet düğmesine basın. Karnelerinizi Sınav Sonuçları ekranından açın.</li></ol><p>TXT kodlaması otomatik algılanır. A/B kitapçıkları cevap anahtarına göre değerlendirilir.</p></details>
        </div>
        <section className="exam-upload-card exam-upload-files">
          <header className="exam-upload-files-actions"><button type="button" className="button exam-evaluate-button" disabled={busy||!canPreview} onClick={()=>void run()}>{busy?"TXT değerlendiriliyor…":"Değerlendir ve kaydet"}</button><button type="button" className="button exam-clear-button" disabled={busy||!file} onClick={()=>selectTxt(null)}>Seçimi kaldır</button></header>
          <label className={`exam-txt-dropzone ${file?"has-file":""}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(busy)return;selectFiles(Array.from(e.dataTransfer.files));}}><input ref={fileInputRef} type="file" multiple aria-label="TXT dosyası" accept=".txt,text/plain" disabled={busy} onChange={e=>selectFiles(Array.from(e.target.files??[]))}/><span className="exam-txt-drop-icon" aria-hidden="true">⇧</span><strong>{file?"TXT dosyasını değiştir":"TXT dosyanızı buraya bırakın"}</strong><span>veya bilgisayarınızdan dosya seçin</span><small>.TXT · En fazla 2 MB</small></label>
          <div className="exam-file-table"><div className="exam-file-table-head"><span>Dosya adı</span><span>Boyut</span><span>Durum</span></div>{file?files.map((file,index)=><div key={`${index}-${file.name}`} className="exam-file-table-row"><span><strong>{file.name}</strong><small>Bilgisayarınızdan seçildi</small></span><span>{(file.size/1024).toLocaleString("tr-TR",{maximumFractionDigits:1})} KB</span><span className="exam-file-status">{snapshot?.id?"Kaydedildi":snapshot?"Önizlendi":"Hazır"}</span></div>):<div className="exam-file-table-empty"><span aria-hidden="true">▱</span><strong>Henüz dosya eklenmedi</strong><p>Optik okuyucunuzdan aldığınız TXT dosyasını seçin.</p></div>}</div>
          <footer className="exam-upload-files-footer"><span>{`${files.length} dosya seçili`}</span><span>TXT → FMT → Cevap anahtarı</span></footer>
          {(!file||!templateId||!keyId||!schoolId)&&<p className="field-help">Değerlendirmek için eksik: {[!file&&"TXT dosyası",!templateId&&"FMT",!keyId&&"sınav",!schoolId&&"kurum"].filter(Boolean).join(", ")}.</p>}
        </section>
      </div>}
    </section>}
    {screen==="upload"&&snapshot&&<section className="management-panel"><details open><summary>Öğrenci / oturum eşleştirmelerini incele</summary><div className="table-scroll"><table className="result-table"><thead><tr><th>Öğrenci No</th><th>Ad Soyad</th><th>Sınıf</th><th>Oturum / satır</th></tr></thead><tbody>{snapshot.data.students.map(s=><tr key={s.id}><td>{(s as any).studentNo??s.id}</td><td>{s.name}</td><td>{s.branch}</td><td>{s.sourceLines.join(", ")}</td></tr>)}</tbody></table></div></details><button className="button button-navy" onClick={()=>onSaved?.(snapshot.id!)}>Sınav Sonuçlarına geç</button></section>}
  </section>;
}
