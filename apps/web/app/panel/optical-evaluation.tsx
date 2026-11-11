"use client";
import {useEffect,useRef,useState} from "react";
import type {FormEvent} from "react";
import {API_URL} from "../../lib/api";
import {opticalRequest,OpticalRequestError,jsonBody} from "../../lib/optical-api";
import {useOpticalCatalog} from "../../lib/use-optical-catalog";
import type {OpticalSnapshot} from "../../lib/optical";
import {compatibleEvaluation} from "../../../api/lib/evaluation-compatibility";
import FmtGuess from "./fmt-guess";
import SearchableSelect from "./searchable-select";
import ExamPicker from "./exam-picker";
import SchoolLocationSelect from "./school-location-select";
const archiveFailure=(e:unknown)=>e instanceof OpticalRequestError&&e.status===404?"TXT arşivi API’de bulunamadı. API ve Web güncellemesini birlikte tamamlayın.":(e as Error).message;
type ArchivedTxt={id:string;name:string;size:number;createdAt:string;evaluatedAt:string|null;resultId:string|null};
export default function OpticalEvaluation({token,onSaved,canCreateSchool=false}:{token:string;screen?:"upload"|"results";onSaved?:(id:string)=>void;canCreateSchool?:boolean}){
 const catalog=useOpticalCatalog(token);
 const [schoolId,setSchoolId]=useState(""),[templateId,setTemplateId]=useState(""),[keyId,setKeyId]=useState(""),[mergeSessions,setMergeSessions]=useState("true");
 const [localFiles,setLocalFiles]=useState<File[]>([]),[archive,setArchive]=useState<ArchivedTxt[]>([]),[selectedIds,setSelectedIds]=useState<string[]>([]),[archiveLoading,setArchiveLoading]=useState(true),[uploading,setUploading]=useState(false),[evaluating,setEvaluating]=useState(false);
 const [error,setError]=useState(""),[archiveError,setArchiveError]=useState(""),[notice,setNotice]=useState(""),[snapshot,setSnapshot]=useState<OpticalSnapshot|null>(null);
 const [showSchoolForm,setShowSchoolForm]=useState(false),[schoolName,setSchoolName]=useState(""),[schoolCity,setSchoolCity]=useState(""),[schoolDistrict,setSchoolDistrict]=useState("");
 const input=useRef<HTMLInputElement>(null);
 async function loadArchive(){setArchiveLoading(true);try{setArchive(await opticalRequest(token,"/txt-files"));setArchiveError("");}catch(e){setArchiveError(archiveFailure(e));}finally{setArchiveLoading(false);}}
 useEffect(()=>{let active=true;setArchive([]);setSelectedIds([]);setArchiveLoading(true);void opticalRequest(token,"/txt-files",{signal:AbortSignal.timeout(12000)}).then(rows=>{if(active){setArchive(rows);setArchiveError("");}}).catch(e=>{if(active)setArchiveError(archiveFailure(e));}).finally(()=>{if(active)setArchiveLoading(false);});return()=>{active=false;};},[token]);
 function invalidate(){setSnapshot(null);setError("");setNotice("");}
 function pick(files:File[]){setError("");if(files.length>10||files.some(f=>!f.size||f.size>2*1024*1024||!/\.txt$/i.test(f.name))){setLocalFiles([]);if(input.current)input.current.value="";setError("1–10 adet TXT seçin. Her dosya boş olmayan ve en fazla 2 MB boyutunda olmalı.");return;}setLocalFiles(files);}
 async function uploadFiles(){if(!localFiles.length)return;setUploading(true);setError("");setNotice("");try{const body=new FormData();for(const file of localFiles)body.append("files",file);const saved:ArchivedTxt[]=await opticalRequest(token,"/txt-files",{method:"POST",body});setArchive(current=>[...saved,...current]);setLocalFiles([]);setSelectedIds([]);if(input.current)input.current.value="";setArchiveError("");setNotice(`${saved.length} TXT sunucuya yüklendi. Listeden değerlendirmek istediklerinizi işaretleyin.`);}catch(e){setError((e as Error).message);}finally{setUploading(false);}}
 const template=catalog.templates.find(t=>t.id===templateId),exam=catalog.keys.find(k=>k.id===keyId);
 const incompatible=!!template&&!!exam&&exam.evaluationReady!==false&&!compatibleEvaluation(template,exam);
 const canEvaluate=selectedIds.length>0&&selectedIds.length<=10&&!!schoolId&&!!template&&!!exam&&exam.evaluationReady!==false&&!incompatible;
 async function evaluate(){if(!canEvaluate)return;setEvaluating(true);setError("");setNotice("");setSnapshot(null);let completed=0,last:any;try{
  const groups=mergeSessions==="false"?selectedIds.map(id=>[id]):[selectedIds];
  for(const [i,fileIds]of groups.entries()){setNotice(`${i+1} / ${groups.length} değerlendirme işleniyor…`);const data={fileIds,schoolId,templateId,keyId,encoding:"auto",mergeSessions};const preview=await opticalRequest(token,"/preview",jsonBody(data));if(preview.checks?.blockers?.length)throw Error(preview.checks.blockers.join(" "));last=await opticalRequest(token,"/evaluate",jsonBody({...data,confirmWarnings:"true",previewToken:preview.previewToken}));completed+=fileIds.length;setSelectedIds(current=>current.filter(id=>!fileIds.includes(id)));}
  setSnapshot(last);setSelectedIds([]);await loadArchive();setNotice("Seçilen TXT’ler değerlendirildi ve kaydedildi. Dosyalar arşivde gri olarak durur; tekrar seçilebilir.");
 }catch(e){setError((e as Error).message);setNotice(completed?`${completed} dosya kaydedildi; kalan dosyalar tamamlanamadı.`:"");if(last)setSnapshot(last);await loadArchive();}finally{setEvaluating(false);}}
 function toggle(id:string){invalidate();setSelectedIds(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);}
 async function createSchool(event:FormEvent<HTMLFormElement>){event.preventDefault();setError("");try{const response=await fetch(`${API_URL}/api/schools`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({name:schoolName,city:schoolCity||null,district:schoolDistrict||null})});const data=await response.json();if(!response.ok)throw Error(data.error??"Kurum eklenemedi.");catalog.setSchools(current=>[...current,data]);setSchoolId(data.id);setShowSchoolForm(false);setSchoolName("");setSchoolCity("");setSchoolDistrict("");invalidate();}catch(e){setError((e as Error).message);}}
 return <section className="optical-module">
 {error&&<p className="notice error" role="alert">{error}</p>}{notice&&<p className="notice success" role="status">{notice}</p>}
 {Object.values(catalog.errors).map(message=><p key={message} className="notice error" role="alert">{message}</p>)}
 <div className="exam-upload-grid txt-archive-grid">
  <section className="exam-upload-card exam-upload-files"><header className="exam-upload-card-header"><span className="exam-upload-icon" aria-hidden="true">⇧</span><div><h2>1. TXT dosyalarını sunucuya yükleyin</h2><p>Önce yükleyin, sonra listedekileri işaretleyin.</p></div></header>
   <label className="exam-txt-dropzone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!uploading&&!evaluating)pick(Array.from(e.dataTransfer.files));}}><input ref={input} type="file" multiple aria-label="TXT dosyası" accept=".txt,text/plain" disabled={uploading||evaluating} onChange={e=>pick(Array.from(e.target.files??[]))}/><span className="exam-txt-drop-icon" aria-hidden="true">⇧</span><strong>{localFiles.length?`${localFiles.length} dosya bilgisayardan seçildi`:"TXT dosyalarını seçin veya buraya bırakın"}</strong><small>Her seferinde 1–10 TXT · Dosya başına en fazla 2 MB</small></label>
   {localFiles.map((file,i)=><FmtGuess key={`${i}-${file.name}`} token={token} file={file} onSelect={id=>{setTemplateId(id);invalidate();}}/>)}
   {!!localFiles.length&&<div className="txt-local-files"><p>Henüz sunucuya yüklenmedi:</p>{localFiles.map((f,i)=><span key={`${i}-${f.name}`}>{f.name}</span>)}</div>}
   <div className="studio-actions"><button className="button button-navy" disabled={!localFiles.length||uploading||evaluating} onClick={()=>void uploadFiles()}>{uploading?"Sunucuya yükleniyor…":"TXT’leri sunucuya yükle"}</button><button className="button button-quiet" disabled={archiveLoading||uploading||evaluating} onClick={()=>void loadArchive()}>Dosya listesini yenile</button></div>
   {archiveError&&<p className="notice error" role="alert">{archiveError}</p>}
   <h3 className="txt-archive-title">Sunucudaki TXT dosyaları</h3><p className="field-help">Yeşil: değerlendirilmedi · Gri: değerlendirildi. Her ikisi de seçilebilir.</p>
   <div className="txt-archive-list" aria-label="Sunucudaki TXT dosyaları"><div className="txt-archive-row txt-archive-head"><input type="checkbox" aria-label="İlk 10 TXT dosyasını seç" disabled={!archive.length||evaluating} checked={archive.length>0&&archive.slice(0,10).every(f=>selectedIds.includes(f.id))} onChange={e=>{invalidate();setSelectedIds(e.target.checked?archive.slice(0,10).map(f=>f.id):[]);}}/><span>Dosya adı / durum</span><span>Yüklenme tarihi</span></div>
   {archiveLoading&&!archive.length&&<p role="status">TXT arşivi yükleniyor…</p>}{!archiveLoading&&!archive.length&&!archiveError&&<p className="exam-file-table-empty">Henüz sunucuya TXT yüklenmedi.</p>}
   {archive.map(file=><label className={`txt-archive-row ${file.evaluatedAt?"txt-evaluated":"txt-pending"}`} key={file.id}><input type="checkbox" aria-label={`${file.name} dosyasını seç`} checked={selectedIds.includes(file.id)} disabled={evaluating} onChange={()=>toggle(file.id)}/><span><strong>{file.name}</strong><small>{file.evaluatedAt?"Değerlendirildi":"Değerlendirilmedi"} · {(file.size/1024).toLocaleString("tr-TR",{maximumFractionDigits:1})} KB</small></span><time dateTime={file.createdAt}>{new Date(file.createdAt).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul",dateStyle:"short",timeStyle:"short"})}</time></label>)}
   </div><p className="field-help">{archive.length} dosya arşivde · {selectedIds.length} dosya işaretli</p>
   {selectedIds.length>10&&<p className="notice error" role="alert">Bir değerlendirmede en fazla 10 dosya seçin.</p>}
  </section>
  <div className="exam-upload-settings"><section className="exam-upload-card"><header className="exam-upload-card-header"><span className="exam-upload-icon" aria-hidden="true">▤</span><div><h2>2. Seçilen dosyaları değerlendirin</h2><p>Sınav, FMT ve kurumu seçip Yükle’ye basın.</p></div></header>
   <div className="exam-upload-field"><span>Sınav</span><ExamPicker exams={catalog.keys} value={keyId} disabled={evaluating} onChange={id=>{setKeyId(id);invalidate();}}/>{catalog.loading.keys&&<small role="status">Sınav listesi yükleniyor…</small>}</div>
   {exam?.evaluationReady===false&&<p className="notice">{exam.evaluationIssue}</p>}
   <div className="exam-upload-field"><span>FMT</span><SearchableSelect label="FMT Seçiniz" value={templateId} disabled={evaluating} options={catalog.templates.map(t=>({id:t.id,label:t.name,detail:[t.grade?`${t.grade}. sınıf`:"",`${t.layout.lineLength} karakter`].filter(Boolean).join(" · ")}))} placeholder="FMT adı veya sınıf ara…" emptyMessage={catalog.loading.templates?"FMT listesi yükleniyor…":"Seçilebilir FMT bulunamadı."} onChange={id=>{setTemplateId(id);invalidate();}}/></div>
   {selectedIds.length>0&&<FmtGuess token={token} fileIds={selectedIds} onSelect={id=>{setTemplateId(id);invalidate();}}/>}
   {incompatible&&<p className="notice error" role="alert">FMT ile seçilen sınavın sınıfı veya soru dağılımı uyuşmuyor. Uygun FMT’yi seçin.</p>}
   <div className="exam-upload-field"><label htmlFor="session-merge">Oturum birleştirme</label><select id="session-merge" value={mergeSessions} disabled={evaluating} onChange={e=>{setMergeSessions(e.target.value);invalidate();}}><option value="true">Aynı öğrenciye ait sınav verilerini birleştir</option><option value="false">Birleştirme; oturumları ayrı tut</option></select></div>
   <SchoolLocationSelect schools={catalog.schools} value={schoolId} disabled={evaluating} loading={catalog.loading.schools} onChange={id=>{setSchoolId(id);invalidate();}}/>
   <div className="studio-actions"><button className="button exam-evaluate-button" disabled={!canEvaluate||evaluating||uploading} onClick={()=>void evaluate()}>{evaluating?"Değerlendiriliyor…":"Seçili TXT’leri yükle ve değerlendir"}</button>{canCreateSchool&&<button className="button button-quiet" disabled={evaluating} onClick={()=>setShowSchoolForm(v=>!v)}>＋ Kurum ekle</button>}<button className="button button-quiet" disabled={evaluating||Object.values(catalog.loading).some(Boolean)} onClick={()=>void catalog.reload()}>Seçim listelerini yenile</button></div>
   <p className="field-help">Dosyalarınız sunucuda kalır. Yalnız işaretlediğiniz dosyalar değerlendirilir.</p>
  </section>
  {showSchoolForm&&<form className="exam-upload-card inline-school-create" onSubmit={createSchool}><h3>Yeni kurum</h3><label>Kurum adı<input required value={schoolName} onChange={e=>setSchoolName(e.target.value)} maxLength={180}/></label><label>İl<input required value={schoolCity} onChange={e=>setSchoolCity(e.target.value)} maxLength={100}/></label><label>İlçe<input required value={schoolDistrict} onChange={e=>setSchoolDistrict(e.target.value)} maxLength={100}/></label><button className="button button-navy">Kurumu ekle</button></form>}
  <details className="exam-upload-help"><summary>ⓘ Sınav nasıl yüklenir?</summary><ol><li>Bilgisayarınızdan en fazla 10 TXT seçip sunucuya yükleyin.</li><li>Sunucu listesinden istediğiniz yeşil veya gri dosyaları işaretleyin.</li><li>Sınav ve FMT’yi, ardından il → ilçe → kurumu seçin.</li><li>“Seçili TXT’leri yükle ve değerlendir” düğmesine basın. Karneleri Sınav Sonuçları’ndan alın.</li></ol></details>
  </div>
 </div>
 {snapshot&&<section className="management-panel"><details><summary>Öğrenci / oturum eşleştirmelerini incele</summary><div className="table-scroll"><table className="result-table"><thead><tr><th>No</th><th>Öğrenci</th><th>Sınıf</th><th>Satır</th></tr></thead><tbody>{snapshot.data.students.map(s=><tr key={s.id}><td>{(s as any).studentNo??s.id}</td><td>{s.name}</td><td>{s.branch}</td><td>{s.sourceLines.join(", ")}</td></tr>)}</tbody></table></div></details><button className="button button-navy" onClick={()=>onSaved?.(snapshot.id!)}>Sınav Sonuçlarına geç</button></section>}
 </section>;
}
