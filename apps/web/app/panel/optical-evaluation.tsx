"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Script from "next/script";
import { API_URL } from "../../lib/api";
import type { KeyRecord, OpticalSnapshot, TemplateRecord } from "../../lib/optical";
import { buildCohortContext } from "../../lib/evaluation";
import ReportCard from "../sinav-degerlendir/report-card";
import { opticalRequest, OpticalRequestError } from "../../lib/optical-api";
import CheckSummary from "./optical-checks";
import OpticalRevisions from "./optical-revisions";
import OpticalAnalysis from "./optical-analysis";
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
    if(s.status==="fulfilled"){setSchools(s.value);setSchoolId(current=>s.value.some(row=>row.id===current)?current:s.value[0]?.id??"");}
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
  async function run(save:boolean){
    if(!canPreview)return;
    setBusy(true);setError("");setNotice("");
    try{
      const body=new FormData();body.append("file",file);body.append("schoolId",schoolId);body.append("templateId",templateId);body.append("keyId",keyId);body.append("encoding","auto");body.append("confirmWarnings",String(confirmed));if(save&&snapshot?.previewToken)body.append("previewToken",snapshot.previewToken);
      const result=await opticalRequest(token,save?"/evaluate":"/preview",{method:"POST",body});setSnapshot(result);if(result.schoolId)setSchoolId(result.schoolId);setBranch("");setStudentId(result.data.students[0]?.id??"");setMode("list");
      if(save){setNotice("Sınav yüklendi. Sonuç Al ekranından çıktı türünü seçebilirsiniz.");}else{setConfirmed(false);setNotice("Önizleme hazır. Kurum, kitapçıklar ve öğrenci sayısını kontrol edip kaydedin.");}
      resultRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
    }catch(e){setError(e instanceof Error?e.message:"Değerlendirme başarısız.");}finally{setBusy(false);}
  }
  async function createSchool(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");try{const response=await fetch(`${API_URL}/api/schools`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({name:schoolName,city:schoolCity||null,district:schoolDistrict||null})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Kurum oluşturulamadı.");setSchools(current=>[...current,data].sort((a,b)=>a.name.localeCompare(b.name,"tr")));setSchoolId(data.id);setShowSchoolForm(false);setSchoolName("");setSchoolCity("");setSchoolDistrict("");setNotice("Kurum eklendi ve seçildi.");}catch(e){setError(e instanceof Error?e.message:"Kurum eklenemedi.");}finally{setBusy(false);}}
  async function openResult(id:string){setBusy(true);setError("");setNotice("");try{const result=await opticalRequest(token,`/results/${id}`);setSnapshot(result);if(result.schoolId)setSchoolId(result.schoolId);setBranch("");setStudentId(result.data.students[0]?.id??"");setMode("list");setConfirmed(false);}catch(e){setError(e instanceof Error?e.message:"Sonuç açılamadı.");}finally{setBusy(false);}}
  const weights=useMemo(()=>Object.fromEntries(snapshot?.data.questions.map(q=>[q.lesson,q.weight])??[]),[snapshot]);
  const context=useMemo(()=>snapshot?buildCohortContext(snapshot.data,snapshot.penalty,weights,500):undefined,[snapshot,weights]);
  const selectedTemplate=templates.find(t=>t.id===templateId);
  const selectedKey=keys.find(key=>key.id===keyId);
  const incompatible=!!selectedTemplate&&!!selectedKey&&selectedKey.evaluationReady!==false&&!compatibleEvaluation(selectedTemplate,selectedKey);
  const canPreview=!!file&&!!schoolId&&!!templateId&&!!selectedKey&&selectedKey.evaluationReady!==false&&!incompatible;
  function selectTxt(selected:File|null){
    invalidate();
    if(selected&&(!/\.txt$/i.test(selected.name)||selected.size>2*1024*1024||!selected.size)){setFile(null);if(fileInputRef.current)fileInputRef.current.value="";setError("Boş olmayan, en fazla 2 MB boyutunda bir TXT dosyası seçin.");return;}
    setFile(selected);if(!selected&&fileInputRef.current)fileInputRef.current.value="";
  }
  const branches=[...new Set(snapshot?.data.students.map(s=>s.branch)??[])];
  const visible=snapshot?.data.students.filter(s=>!branch||s.branch===branch)??[];
  const sorted=useMemo(()=>snapshot?[...snapshot.summary].sort((a,b)=>sortMode==="score"?b.score-a.score||a.id.localeCompare(b.id,"tr"):((snapshot.data.students.find(s=>s.id===a.id)?.name??"").localeCompare(snapshot.data.students.find(s=>s.id===b.id)?.name??"","tr")||a.id.localeCompare(b.id,"tr"))):[],[snapshot,sortMode]);
  const orderedVisible=sorted.flatMap(r=>{const student=visible.find(s=>s.id===r.id);return student?[student]:[]});
  const lessons=[...new Set(snapshot?.data.questions.map(q=>q.lesson)??[])];
  function exportExcel(){
    if(!snapshot||!window.XLSX)return;const book=window.XLSX.utils.book_new();
    const rows:unknown[][]=[["Kurum",snapshot.schoolName],["Sınav",snapshot.keyName],["FMT",snapshot.templateName],["Puan açıklaması","Yerel deneme puanı / 500; resmî LGS/YKS puanı değildir."],[],["Kurum Sırası","Öğrenci No","Ad Soyad","Sınıf / Şube",...lessons.flatMap(l=>[`${l} D`,`${l} Y`,`${l} B`,`${l} İptal`,`${l} Net`]),"Toplam Net","Yerel Puan / 500","Kitapçıklar"]];
    for(const r of sorted){const s=snapshot.data.students.find(s=>s.id===r.id)!;if(branch&&s.branch!==branch)continue;rows.push([1+sorted.filter(x=>x.score>r.score+1e-8).length,s.id,s.name,s.branch,...lessons.flatMap(l=>{const v=r.lessons.find(x=>x.lesson===l)!;return[v.correct,v.wrong,v.blank,v.cancelled,Number(v.net.toFixed(4))];}),Number(r.net.toFixed(4)),Number(r.score.toFixed(4)),Object.entries(s.booklets).map(([l,b])=>`${l}: ${b}`).join(", ")]);}
    window.XLSX.utils.book_append_sheet(book,window.XLSX.utils.aoa_to_sheet(rows),"Sonuç Listesi");
    if(mode==="classes")branches.filter(b=>!branch||b===branch).forEach((b,i)=>{const classRows=[...rows.slice(0,6),...rows.slice(6).filter(r=>r[3]===b)];window.XLSX!.utils.book_append_sheet(book,window.XLSX!.utils.aoa_to_sheet(classRows),`${i+1}-${b}`.replace(/[\\/?:*\[\]]/g,"-").slice(0,31));});
    const answers:unknown[][]=[["Öğrenci No","Ders","A Soru No","Kitapçık","Öğrenci Cevabı","Doğru Cevap","Kazanım Kodu","Kazanım"]];
    for(const s of visible)snapshot.data.questions.forEach((q,i)=>answers.push([s.id,q.lesson,q.number,s.booklets[q.lesson]??"—",s.answers[i]||"—",q.answer,q.outcomeCode??"",q.outcomeName??""]));
    window.XLSX.utils.book_append_sheet(book,window.XLSX.utils.aoa_to_sheet(answers),"Soru Detayı");window.XLSX.writeFile(book,"sinav-sonuclari.xlsx");
  }
  function resultList(listStudents:typeof visible,listBranch:string){if(!snapshot)return null;return <article className="student-report optical-list-report"><header className="report-header"><div className="brand"><span className="brand-mark">K</span><span>Kurumsal Sınav</span></div><div><strong>{snapshot.keyName}</strong><p>{snapshot.schoolName} · {listBranch||"Tüm sınıflar"} · {listStudents.length} öğrenci</p></div></header><h3>Detaylı sonuç listesi {!snapshot.id&&"· ÖNİZLEME"}</h3><div className="table-scroll"><table className="result-table"><thead><tr><th>Kurum sırası</th><th>Öğrenci / No / Şube</th>{lessons.map(l=><th key={l}>{l}<small>D / Y / B · Net</small></th>)}<th>Toplam net</th><th>Yerel puan / 500</th></tr></thead><tbody>{sorted.map(r=>{const s=listStudents.find(s=>s.id===r.id);if(!s)return null;return <tr key={s.id}><td>{1+listStudents.filter(other=>{const score=snapshot.summary.find(x=>x.id===other.id)?.score??-Infinity;return score>r.score+1e-8}).length}</td><td><strong>{s.name}</strong><small>{s.id} · {s.branch}</small></td>{r.lessons.map(l=><td key={l.lesson}>{l.correct} / {l.wrong} / {l.blank}<small>{num(l.net)} net{l.cancelled?` · ${l.cancelled} iptal`:""}</small></td>)}<td>{num(r.net)}</td><td>{num(r.score)}</td></tr>;})}</tbody></table></div><footer className="report-foot">{snapshot.penalty?`Net = doğru − yanlış / ${snapshot.penalty}.`:"Yanlış doğruyu götürmez."} H soruları tüm öğrenciler için doğru kabul edilir; X soruları hesap dışıdır. Puan / 500 yerel ölçektir; resmî LGS/YKS veya yayınevi puanı değildir. Kurum sırası yalnızca bu değerlendirmedeki öğrenciler arasındadır; eşit puanlar aynı sırayı alır.</footer></article>;}
  return <section className="optical-module">
    {!!loadErrors.length&&<div className="notice error" role="alert">{loadErrors.map(message=><p key={message}>{message}</p>)}<button type="button" className="button button-quiet" disabled={loading||busy} onClick={retryLoad}>Listeleri yeniden yükle</button></div>}
    <Script src="/vendor/xlsx.full.min.js" strategy="afterInteractive" onReady={()=>setReady(true)} onError={()=>setError("Excel dışa aktarma aracı yüklenemedi. Sayfayı yenileyin.")}/>
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
            {selectedTemplate&&<p className="exam-upload-format-note">{selectedTemplate.layout.lineLength} karakter · {selectedTemplate.layout.lessons.map(l=>l.name).join(" · ")}</p>}
            {incompatible&&<p className="notice error" role="alert">Seçilen FMT ile sınavın sınıfı veya ders/soru dağılımı uyuşmuyor. Sınav seçiminiz korundu; uygun FMT’yi seçin.</p>}
            {!templates.length&&<div className="exam-upload-empty"><p>Seçilebilir etkin FMT bulunamadı.</p>{!loadErrors.length&&<button type="button" className="button button-quiet" disabled={busy} onClick={retryLoad}>Listeleri yeniden yükle</button>}</div>}
            <div className="exam-upload-field"><label htmlFor="exam-upload-school">Kurum</label><div className="exam-upload-school"><select id="exam-upload-school" disabled={busy} value={schoolId} onChange={e=>{setSchoolId(e.target.value);invalidate();}}><option value="">Kurum seçin</option>{schools.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select>{canCreateSchool&&<button type="button" className="button button-quiet" disabled={busy} onClick={()=>setShowSchoolForm(v=>!v)}>＋ Kurum ekle</button>}</div></div>
          </section>
          {showSchoolForm&&<form className="exam-upload-card inline-school-create" onSubmit={createSchool}><h3>Yeni kurum</h3><label>Kurum adı<input required value={schoolName} onChange={e=>setSchoolName(e.target.value)} maxLength={180}/></label><label>İl<input value={schoolCity} onChange={e=>setSchoolCity(e.target.value)} maxLength={100}/></label><label>İlçe<input value={schoolDistrict} onChange={e=>setSchoolDistrict(e.target.value)} maxLength={100}/></label><button className="button button-navy" disabled={busy}>Kurumu ekle</button></form>}
          <details className="exam-upload-help"><summary><span aria-hidden="true">ⓘ</span> Sınav nasıl yüklenir?</summary><ol><li>Yayınevinizin altından cevap anahtarı eklenmiş sınavı seçin.</li><li>TXT dosyanıza ait FMT’yi seçin ve kurumu kontrol edin.</li><li>Bilgisayarınızdaki TXT’yi ekleyip “Değerlendir” düğmesine basın.</li><li>Önizlemeyi inceleyin, onaylayıp kaydedin. Karnelerinizi Sonuç Al ekranından açın.</li></ol><p>TXT kodlaması otomatik algılanır. A/B kitapçıkları cevap anahtarına göre değerlendirilir.</p></details>
        </div>
        <section className="exam-upload-card exam-upload-files">
          <header className="exam-upload-files-actions"><button type="button" className="button exam-evaluate-button" disabled={busy||!canPreview} onClick={()=>void run(false)}>{busy?"TXT değerlendiriliyor…":"Değerlendir"}</button><button type="button" className="button exam-clear-button" disabled={busy||!file} onClick={()=>selectTxt(null)}>Seçimi kaldır</button></header>
          <label className={`exam-txt-dropzone ${file?"has-file":""}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(busy)return;if(e.dataTransfer.files.length>1){setError("Her değerlendirme için tek TXT dosyası ekleyin.");return;}selectTxt(e.dataTransfer.files[0]??null);}}><input ref={fileInputRef} type="file" aria-label="TXT dosyası" accept=".txt,text/plain" disabled={busy} onChange={e=>selectTxt(e.target.files?.[0]??null)}/><span className="exam-txt-drop-icon" aria-hidden="true">⇧</span><strong>{file?"TXT dosyasını değiştir":"TXT dosyanızı buraya bırakın"}</strong><span>veya bilgisayarınızdan dosya seçin</span><small>.TXT · En fazla 2 MB</small></label>
          <div className="exam-file-table"><div className="exam-file-table-head"><span>Dosya adı</span><span>Boyut</span><span>Durum</span></div>{file?<div className="exam-file-table-row"><span><strong>{file.name}</strong><small>Bilgisayarınızdan seçildi</small></span><span>{(file.size/1024).toLocaleString("tr-TR",{maximumFractionDigits:1})} KB</span><span className="exam-file-status">{snapshot?.id?"Kaydedildi":snapshot?"Önizlendi":"Hazır"}</span></div>:<div className="exam-file-table-empty"><span aria-hidden="true">▱</span><strong>Henüz dosya eklenmedi</strong><p>Optik okuyucunuzdan aldığınız TXT dosyasını seçin.</p></div>}</div>
          <footer className="exam-upload-files-footer"><span>{file?"1 dosya seçili":"0 dosya"}</span><span>TXT → FMT → Cevap anahtarı</span></footer>
          {(!file||!templateId||!keyId||!schoolId)&&<p className="field-help">Değerlendirmek için eksik: {[!file&&"TXT dosyası",!templateId&&"FMT",!keyId&&"sınav",!schoolId&&"kurum"].filter(Boolean).join(", ")}.</p>}
        </section>
      </div>}
    </section>}
    {screen==="results"&&<section className="management-panel">{error&&<p className="notice error" role="alert">{error}</p>}{notice&&<p className="notice success" role="status">{notice}</p>}<div className="optical-form"><label>Kurum<select disabled={busy} value={schoolId} onChange={e=>{setSchoolId(e.target.value);setSnapshot(null);}}><option value="">Kurum seçin</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Yüklenen sınav<select aria-label="Yüklenen sınav" disabled={busy||!schoolId} value={snapshot?.id??""} onChange={e=>{if(e.target.value)void openResult(e.target.value);else setSnapshot(null);}}><option value="">Sınav seçin</option>{history.filter(h=>h.schoolId===schoolId).map(h=><option key={h.id} value={h.id}>{h.key.name} · Sürüm {h.revision??1} · {new Date(h.createdAt).toLocaleString("tr-TR")}</option>)}</select></label></div>{!loading&&!history.length&&<p>Henüz yüklenmiş sınav yok. Sınav Yükle ekranından başlayın.</p>}</section>}
    {snapshot&&<section className="management-panel optical-results" ref={resultRef}>
      <header className="panel-header"><div><p className="hero-tag">{snapshot.id?"KAYITLI DEĞERLENDİRME":"KONTROL ÖNİZLEMESİ"}</p><h2>{snapshot.keyName}</h2><p>{snapshot.schoolName} · {snapshot.templateName} · {snapshot.data.lineCount} satır → {snapshot.data.students.length} öğrenci{snapshot.createdAt?` · ${new Date(snapshot.createdAt).toLocaleString("tr-TR")}`:""}</p></div></header>
      <p className="notice">Karne ve soru detayları karşılaştırma için A kitapçığı soru sırasına çevrilir. Öğrencinin kaynak kitapçıkları aşağıda gösterilir. H: tüm cevaplar doğru; X: iptal. Sıralamalar yalnızca bu dosyadaki kurum öğrencilerini kapsar.</p>
      {snapshot.checks&&<CheckSummary checks={snapshot.checks}/>}
      {!snapshot.checks&&snapshot.data.warnings.length>0&&<details open><summary>{snapshot.data.warnings.length} boş ders uyarısı</summary><ul>{snapshot.data.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}
      {!snapshot.id&&<div className="optical-confirm"><label className="checkbox-row"><input type="checkbox" disabled={busy} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Kurum, öğrenci sayısı, kitapçıklar ve tüm kontrol uyarılarını inceledim.</label><button className="button button-navy" disabled={busy||!confirmed||!!snapshot.checks?.blockers.length} onClick={()=>void run(true)}>{busy?"Kaydediliyor…":"Sınavı yükle ve kaydet"}</button></div>}
      {screen==="upload"&&snapshot.id&&<button className="button button-navy" onClick={()=>onSaved?.(snapshot.id!)}>Sınav Değerlendir / Sonuç Al ekranına geç</button>}
      {screen==="results"&&<>
      {snapshot.id&&<OpticalRevisions token={token} snapshot={snapshot} onUpdate={next=>{setSnapshot(next);void loadHistory();}}/>}
      <div className="optical-form"><label>Sınıf / şube<select aria-label="Sonuç sınıfı / şubesi" disabled={busy} value={branch} onChange={e=>{setBranch(e.target.value);const first=snapshot.data.students.find(s=>!e.target.value||s.branch===e.target.value);setStudentId(first?.id??"");}}><option value="">Tüm sınıflar / şubeler</option>{branches.map(b=><option key={b}>{b}</option>)}</select></label><label>Rapor türü<select aria-label="Rapor türü" value={(["list","classes"].includes(mode)?`${mode}-${sortMode}`:mode)} onChange={e=>{const [next,order]=e.target.value.split("-");if(e.target.value==="list-cards"){setMode("list-cards");}else if(next==="list"||next==="classes"){setMode(next);setSortMode(order as "score"|"alphabetical");}else setMode(next);}}><option value="list-alphabetical">Okul Listesi — Alfabetik Sıralama</option><option value="list-score">Okul Listesi — Puan Sıralaması</option><option value="classes-alphabetical">Sınıf Sınıf Liste — Alfabetik Sıralama</option><option value="classes-score">Sınıf Sınıf Liste — Puan Sıralaması</option><option value="list-cards">Liste + öğrenci karneleri</option><option value="analysis">Soru / kazanım analizi</option><option value="individual">Tek öğrenci karnesi</option><option value="bulk">Karneleri İndir</option></select></label><label>Sıralama<select aria-label="Rapor sıralaması" value={sortMode} onChange={e=>setSortMode(e.target.value as "score"|"alphabetical")}><option value="alphabetical">Alfabetik sıralama</option><option value="score">Puan sıralaması</option></select></label>{mode==="bulk"&&<p className="field-help"><strong>Karneler hangi sırayla hazırlansın?</strong> Karneler {sortMode==="alphabetical"?"alfabetik":"puan sırasına göre"} hazırlanır. PDF yazdırma ekranında tek dosya olarak kaydedin.</p>}{mode==="individual"&&<label>Öğrenci<select value={studentId} onChange={e=>setStudentId(e.target.value)}>{visible.map(s=><option value={s.id} key={s.id}>{s.id} · {s.name}</option>)}</select></label>}</div>
      <div className="studio-actions"><label className="checkbox-row"><input type="checkbox" checked={monochrome} onChange={e=>setMonochrome(e.target.checked)}/>Siyah beyaz çıktı</label><label className="checkbox-row"><input type="checkbox" checked={showQuestions} onChange={e=>setShowQuestions(e.target.checked)}/>Karnede soru bazında kurum karşılaştırması</label><button className="button button-quiet" disabled={!snapshot.id||!ready||busy||mode==="analysis"} onClick={exportExcel}>Sonuçları Excel indir</button><button className="button button-navy" disabled={!snapshot.id||busy||!visible.length} onClick={()=>window.print()}>Liste / karne PDF kaydet</button></div>
      <p className="field-help">PDF düğmesi yazdırma ekranını açar; “PDF olarak kaydet” seçin. Puan / 500 yerel deneme puanıdır; yayınevinin standartlaştırılmış puanını ve Türkiye geneli sıralamasını üretmez.</p>
      <div className={`optical-print-page ${mode==="list"?"optical-list-print":""}`}>
        <div className={`report-print-area ${monochrome?"report-monochrome":""}`}>
          {mode==="analysis"&&snapshot.id?<OpticalAnalysis token={token} resultId={snapshot.id} branch={branch} title={snapshot.keyName} school={snapshot.schoolName} ready={ready}/>:mode==="list"?resultList(visible,branch):mode==="classes"?branches.filter(b=>!branch||b===branch).sort((a,b)=>a.localeCompare(b,"tr",{numeric:true})).map(b=><div className="optical-class-page" key={b}>{resultList(visible.filter(s=>s.branch===b),b)}</div>):<>{mode==="list-cards"&&resultList(visible,branch)}{orderedVisible.filter(s=>mode!=="individual"||s.id===studentId).map(s=><ReportCard key={s.id} data={snapshot.data} student={s} exam={snapshot.keyName} penalty={snapshot.penalty} weights={weights} scale={500} showQuestions={showQuestions} confirmed={!!snapshot.id} context={context} bookletInfo={`Kaynak kitapçıklar: ${Object.entries(s.booklets).map(([l,b])=>`${l}: ${b}`).join(" · ")}. Soru sırası: A kitapçığı. H: tüm cevaplar doğru kabul edilir.`}/>)}</>}
        </div>
      </div>
      </>}
      <details><summary>Öğrenci / oturum eşleştirmelerini incele</summary><div className="table-scroll"><table className="result-table"><thead><tr><th>Öğrenci</th><th>TXT satırları</th><th>Ders kitapçıkları</th></tr></thead><tbody>{snapshot.data.students.map(s=><tr key={s.id}><td>{s.id} · {s.name}</td><td>{s.sourceLines.join(", ")}</td><td>{Object.entries(s.booklets).map(([l,b])=>`${l}: ${b}`).join(" · ")}</td></tr>)}</tbody></table></div></details>
    </section>}
    {screen==="results"&&<section className="management-panel"><h2>Değerlendirme geçmişi</h2><p className="field-help">Seçili kurumdaki son 50 sınavın güncel sürümü. Sonuçlar, kullanılan anahtarın anlık kopyasıyla saklanır.</p>{!history.length?<p>Henüz kayıtlı değerlendirme yok.</p>:history.filter(h=>!schoolId||h.schoolId===schoolId).map(h=><div className="optical-record" key={h.id}><span><strong>{h.key.name}</strong><small>{h.school.name} · {h.template.name} · {new Date(h.createdAt).toLocaleString("tr-TR")} · Öğrenci/veli: {h.studentPublished?"Yayımlanmış":"Kapalı"}</small></span><button className="button button-quiet" disabled={busy} onClick={()=>void openResult(h.id)}>Liste ve karneleri aç</button></div>)}</section>}
  </section>;
}
