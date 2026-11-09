"use client";

import AnswerPdfOptions from "../answer-pdf-options";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import ManualKeyEntry,{type ManualReview} from "./manual-key-entry";
import LegacyKeyLink from "./legacy-key-link";
import StoredKeyEditor from "./stored-key-editor";
import BulkAnswerKeys from "./bulk-answer-keys";
import { API_URL } from "../../lib/api";
import AnswerArchiveFileInput from "./answer-archive-file-input";
import AnswerKeyFileInput from "./answer-key-file-input";
import PublisherSelect from "./publisher-select";

type Publisher = { id: string; name: string; active: boolean };
type AnswerKeyFile = {generated?:boolean; id: string; category: "ANSWER_KEY" | "LEARNING_OUTCOMES"; originalFileName: string; mimeType: string; size: number; createdAt: string; storagePath?: string };
type AnswerKeyRecord = {
  id: string;
  publisherId: string;
  grade: number;
  examName: string;
  published: boolean;
  showInEvaluation: boolean;
  opticalKey?: { id: string; penalty: number; active: boolean } | null;
  createdAt: string;
  publishedAt: string;
  publisher: Publisher;
  files: AnswerKeyFile[];
};

export default function AnswerKeyManagement({ token, readOnly = false }: { token: string; readOnly?: boolean }) {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [records, setRecords] = useState<AnswerKeyRecord[]>([]);
  const [query, setQuery] = useState("");
  const [view,setView]=useState<"list"|"new">("list"),[entryMethod,setEntryMethod]=useState("file"),[manualReview,setManualReview]=useState<ManualReview|null>(null),[editingQuestions,setEditingQuestions]=useState<string|null>(null);
  const [targetPublicationId,setTargetPublicationId]=useState("");
  const [answerFileKey,setAnswerFileKey]=useState("");
  const [uploadReset,setUploadReset]=useState(0);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editConfirmed,setEditConfirmed]=useState(false);
  const [editing, setEditing] = useState<AnswerKeyRecord | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ publisherId: "", grade: "8", examName: "", published: false, showInEvaluation: false, penalty: 3, publishedAt: new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Istanbul"}).format(new Date()) });

  const filteredRecords = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("tr-TR");
    return [...records].filter((entry) => !value || `${entry.examName} ${entry.publisher.name}`.toLocaleLowerCase("tr-TR").includes(value));
  }, [query, records]);

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [publisherResponse, answerResponse] = await Promise.all([
        readOnly
          ? fetch(`${API_URL}/api/publishers`, { headers })
          : fetch(`${API_URL}/api/admin/publishers`, { headers }),
        readOnly
          ? fetch(`${API_URL}/api/answer-keys?limit=30`)
          : fetch(`${API_URL}/api/admin/answer-keys`, { headers }),
      ]);

      const [publisherData, answerData] = await Promise.all([
        publisherResponse.json() as Promise<Publisher[] | { error?: string }>,
        answerResponse.json() as Promise<AnswerKeyRecord[] | { items?: AnswerKeyRecord[]; error?: string }>,
      ]);

      if (!publisherResponse.ok || !Array.isArray(publisherData)) {
        throw new Error((publisherData as { error?: string })?.error ?? "Yayınevleri yüklenemedi.");
      }

      const responseItems = Array.isArray(answerData)
        ? answerData
        : Array.isArray((answerData as { items?: AnswerKeyRecord[] })?.items)
          ? (answerData as { items: AnswerKeyRecord[] }).items
          : [];

      if (!readOnly && !answerResponse.ok) {
        throw new Error((answerData as { error?: string })?.error ?? "Cevap anahtarı listesi yüklenemedi.");
      }

      setPublishers(publisherData);
      setRecords(responseItems);
      const firstActivePublisher = publisherData.find((publisher) => publisher.active);
      if (!readOnly && !form.publisherId && firstActivePublisher) {
        setForm((current) => ({ ...current, publisherId: firstActivePublisher.id }));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Cevap anahtarı verisi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError("");
    if (!publishers.some((publisher) => publisher.id === form.publisherId && publisher.active)) {
      setError("Etkin bir yayınevi seçmelisiniz.");
      return;
    }
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    formData.set("published", String(form.published));
    formData.set("showInEvaluation", String(form.showInEvaluation));
    formData.set("penalty", String(form.penalty));
    if(entryMethod==="manual"){if(!manualReview?.confirmed||!manualReview.file){setError("Elle hazırlanan anahtarı ve yayın seçeneklerini onaylayın.");return;}formData.set("learningOutcomesFile",manualReview.file);formData.set("reviewedQuestions",JSON.stringify(manualReview.questions));formData.set("sourceChecksum",manualReview.checksum);formData.set("evaluationFormat","standard");formData.set("confirmImport","true");formData.set("confirmPublication","true");}
    const inputFiles = formData.getAll("answerKeyFile") as File[];
    const outcomeFiles = formData.getAll("learningOutcomesFile") as File[];

    if (!inputFiles.some((file) => file.size > 0) && !outcomeFiles.some((file) => file.size > 0)) {
      setError("En az bir dosya yüklemelisiniz.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/answer-keys${targetPublicationId?`/${encodeURIComponent(targetPublicationId)}`:""}`, {
        method: targetPublicationId?"PATCH":"POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) {
        setError(result.error ?? "Cevap anahtarı kaydedilemedi.");
        return;
      }

      setNotice(result.message ?? "Cevap anahtarı kaydedildi.");
      formElement.reset();setView("list");setManualReview(null);setTargetPublicationId("");setUploadReset(value=>value+1);
      setForm({ publisherId: publishers.find((publisher) => publisher.active)?.id ?? "", grade: "8", examName: "", published: false, showInEvaluation: false, penalty: 3, publishedAt: new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Istanbul"}).format(new Date()) });
      await loadData();
    } catch {
      setError("Dosya yükleme sırasında hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteRecord(id: string) {
    if (!window.confirm("Bu cevap anahtarı ve dosyaları silinecek. Devam edilsin mi?")) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/admin/answer-keys/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        setError(result.error ?? "Cevap anahtarı silinemedi.");
        return;
      }
      setNotice("Cevap anahtarı silindi.");
      await loadData();
    } catch {
      setError("Sunucuya ulaşılamadı.");
    }
  }

  return (
    <section className="management-panel answer-key-panel">
      <header className="panel-header">
        <div>
          <p className="hero-tag">CEVAP ANAHTARLARI</p>
          <h2>{view==="list"?"Cevap anahtarı kütüphanesi":"Yeni cevap anahtarı / kazanım"}</h2>
        </div>
      </header>

      {notice && <p className="notice success" role="status">{notice}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}

      {!readOnly&&view==="list"&&<LegacyKeyLink token={token} publications={records} onSaved={()=>void loadData()}/>}
      {!readOnly&&<div className="answer-add-tabs"><button className={`button ${view==="list"?"button-navy":"button-quiet"}`} disabled={bulkBusy} onClick={()=>{setView("list");setBulkMode(false);}}>Cevap anahtarlarını listele</button><button className={`button ${view==="new"&&!bulkMode?"button-navy":"button-quiet"}`} disabled={bulkBusy} onClick={()=>{setView("new");setBulkMode(false);}}>Yeni cevap anahtarı / kazanım ekle</button><button className="button button-quiet" disabled={bulkBusy} onClick={()=>{setView("new");setBulkMode(true);}}>Toplu dosya ekle</button></div>}
      {!readOnly && bulkMode && <BulkAnswerKeys token={token} publishers={publishers} onComplete={() => void loadData()} onBusyChange={setBulkBusy} />}
      {!readOnly && view==="new" && !bulkMode && (
        <form className="answer-key-form" onSubmit={handleSubmit}>
          <label>Sınav kaydı<select aria-label="Cevap anahtarının sınav kaydı" value={targetPublicationId} disabled={submitting} onChange={e=>{const id=e.target.value;setTargetPublicationId(id);const item=records.find(r=>r.id===id);if(item)setForm({publisherId:item.publisherId,grade:String(item.grade),examName:item.examName,published:item.published,showInEvaluation:item.showInEvaluation,penalty:item.opticalKey?.penalty??3,publishedAt:item.publishedAt.slice(0,10)});}}><option value="">Yeni sınav kaydı oluştur</option>{records.map(item=><option key={item.id} value={item.id}>{item.publisher.name} · {item.grade}. Sınıf · {item.examName}</option>)}</select></label>
          {targetPublicationId&&<p className="notice">Mevcut sınav güncellenecek; yeni mükerrer sınav oluşturulmayacak. Önceki sonuç kopyaları korunur.</p>}
          <div className="two-column-fields">
            <label className="publisher-select-field">
              Yayınevi
                <input type="hidden" name="publisherId" value={form.publisherId} />
                <PublisherSelect publishers={publishers.filter((publisher) => publisher.active)} value={form.publisherId} onChange={(publisherId) => setForm((current) => ({ ...current, publisherId }))} />
              </label>
            <label>
              Sınıf
              <select name="grade" value={form.grade} onChange={(event) => setForm((current) => ({ ...current, grade: event.target.value }))} required>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map((grade) => <option key={grade} value={String(grade)}>{grade}. Sınıf</option>)}
              </select>
            </label>
          </div>

          <label>
            Sınav / deneme adı
            <input name="examName" value={form.examName} onChange={(event) => setForm((current) => ({ ...current, examName: event.target.value }))} placeholder="Türkiye Geneli Deneme 1" required />
          </label>

          <label>Yayın tarihi<input type="date" name="publishedAt" value={form.publishedAt} onChange={(event) => setForm((current) => ({ ...current, publishedAt: event.target.value }))} required /></label>

          <label className="checkbox-row">
            <input type="checkbox" name="published" checked={form.published} onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))} />
            Ana sayfadaki Cevap Anahtarları bölümünde yayımla
          </label>

          <label className="checkbox-row"><input type="checkbox" name="showInEvaluation" checked={form.showInEvaluation} onChange={e=>setForm({...form,showInEvaluation:e.target.checked})}/>Ölçme ve Değerlendirme sisteminde kullanıma aç</label>
          <label>Değerlendirme kuralı<select name="penalty" value={form.penalty} onChange={e=>setForm({...form,penalty:Number(e.target.value)})}><option value={0}>Yanlış doğruyu götürmez</option><option value={3}>3 yanlış 1 doğru</option><option value={4}>4 yanlış 1 doğru</option></select></label>
          <p className="field-help">Doğru cevapları içeren kazanım dosyası tek başına yeterlidir; cevap PDF’si onaylanan tablodan oluşturulur. Format seçimi kazanım dosyasının kaynağını belirtir.</p>
          <label>Veri giriş yöntemi<select aria-label="Cevap anahtarı giriş yöntemi" value={entryMethod} onChange={e=>setEntryMethod(e.target.value)}><option value="file">Kazanım dosyasından / hazır PDF</option><option value="manual">Elle soru ve kazanım gir</option></select></label>
          {entryMethod==="manual"?<ManualKeyEntry disabled={submitting} context={targetPublicationId+JSON.stringify(form)} onReview={setManualReview}/>:          <div className="file-upload-grid">
            <AnswerArchiveFileInput key={`answer-${uploadReset}`} label="Cevap Anahtarı" disabled={submitting} onChange={setAnswerFileKey}/>
            <AnswerKeyFileInput token={token} key={uploadReset} disabled={submitting} reviewContext={targetPublicationId+JSON.stringify(form)+answerFileKey}  onExamName={examName=>setForm(current=>current.examName.trim()?current:{...current,examName})}/>
          </div>}


          <button className="button button-navy" type="submit" disabled={submitting}>{submitting ? "Yükleniyor..." : "Cevap anahtarı ekle"}</button>
        </form>
      )}

      <div className="public-list-panel" hidden={!readOnly&&view!=="list"}>
        <div className="list-header-row">
          <h3>{readOnly ? "Yayımlanan cevap anahtarları" : "Cevap anahtarı kayıtları"}</h3>
          <label className="search-field compact-search">
            <span>Arama</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sınav ara..." />
          </label>
        </div>

        {loading ? <p className="empty-state">Yükleniyor...</p> : filteredRecords.length === 0 ? (
          <p className="empty-state">Henüz cevap anahtarı bulunmuyor.</p>
        ) : (
          <div className="public-answer-grid">
            {filteredRecords.map((item) => {
              const answerFile = [...item.files].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).find(file=>file.category==="ANSWER_KEY"&&file.generated)??item.files.find(file=>file.category==="ANSWER_KEY"&&file.mimeType==="application/pdf")??item.files.find(file=>file.category==="ANSWER_KEY");
              const outcomesFile = item.files.find((file) => file.category === "LEARNING_OUTCOMES");
              return (
                <article className={`answer-key-card ${editing?.id===item.id||editingQuestions===item.opticalKey?.id?"answer-key-card-editing":""}`} key={item.id}>
                  <div className="answer-key-header">
                    <span className="badge">{item.grade}. Sınıf</span>
                    <span className="status-dot">Ana sayfa: {item.published ? "Görünür" : "Gizli"} · Değerlendirme: {item.showInEvaluation ? "Görünür" : "Gizli"}</span>
                  </div>
                  <h4>{item.examName}</h4>{!readOnly && <small className="publication-id">Takvim eşleştirme ID: <code>{item.id}</code></small>}
                  <p>{item.publisher.name}</p>
                  <small>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(item.publishedAt))}</small>
                  {!readOnly && editing?.id === item.id && (
                    <form className="answer-key-edit-form" onChange={()=>setEditConfirmed(false)} onSubmit={(event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      formData.set("published", String(editing.published));
                      formData.set("showInEvaluation", String(editing.showInEvaluation));
                      if(!editConfirmed){setError("Bilgileri ve yayın seçeneklerini onaylayın.");return;}
                      formData.set("confirmPublication","true");
                      void saveRecord(item.id, formData);
                    }}>
                      <input type="hidden" name="publisherId" value={editing.publisherId} />
                      <label>Yayınevi<PublisherSelect publishers={publishers.filter((publisher) => publisher.active || publisher.id === editing.publisherId)} value={editing.publisherId} onChange={(publisherId) => setEditing((current) => current ? { ...current, publisherId } : current)} /></label>
                      <div className="two-column-fields">
                        <label>Sınıf<select name="grade" value={String(editing.grade)} onChange={(event) => setEditing({ ...editing, grade: Number(event.target.value) })}>{[1,2,3,4,5,6,7,8,9,10,11,12].map((grade) => <option key={grade} value={String(grade)}>{grade}. Sınıf</option>)}</select></label>
                        <label>Yayın tarihi<input type="date" name="publishedAt" value={editing.publishedAt.slice(0, 10)} onChange={(event) => setEditing({ ...editing, publishedAt: event.target.value })} required /></label>
                      </div>
                      <label>Sınav / deneme adı<input name="examName" value={editing.examName} onChange={(event) => setEditing({ ...editing, examName: event.target.value })} required maxLength={180} /></label>
                      <label className="checkbox-row"><input type="checkbox" name="published" checked={editing.published} onChange={(event) => setEditing({ ...editing, published: event.target.checked })} />Ana sayfadaki Cevap Anahtarları bölümünde yayımla</label>
                      <label className="checkbox-row"><input type="checkbox" name="showInEvaluation" checked={editing.showInEvaluation??false} onChange={e=>setEditing({...editing,showInEvaluation:e.target.checked})}/>Ölçme ve Değerlendirme sisteminde kullanıma aç</label>
                      <label>Değerlendirme kuralı<select name="penalty" defaultValue={editing.opticalKey?.penalty??3}><option value={0}>Yanlış doğruyu götürmez</option><option value={3}>3 yanlış 1 doğru</option><option value={4}>4 yanlış 1 doğru</option></select></label>
                      <div className="file-upload-grid">
                        <AnswerArchiveFileInput label="Yeni cevap anahtarı dosyası" disabled={submitting} onChange={setAnswerFileKey}/>
                        <AnswerKeyFileInput token={token} label="Yeni kazanım dosyası" disabled={submitting} reviewContext={JSON.stringify(editing)+answerFileKey}/>
                      </div>
                      <div className="download-actions">
                        <label className="checkbox-row" onChange={e=>e.stopPropagation()}><input type="checkbox" checked={editConfirmed} onChange={e=>setEditConfirmed(e.target.checked)}/>Bilgileri, dosyaları ve yayın seçeneklerini kontrol ettim; kaydı onaylıyorum.</label>
                        <button className="button button-navy" type="submit" disabled={submitting||!editConfirmed}>{submitting?"Kaydediliyor…":"Değişiklikleri kaydet"}</button>
                        <button className="button button-quiet" type="button" onClick={() => setEditing(null)}>Vazgeç</button>
                      </div>
                    </form>
                  )}
                  {!readOnly&&editingQuestions===item.opticalKey?.id&&item.opticalKey&&<StoredKeyEditor token={token} keyId={item.opticalKey.id} onClose={()=>setEditingQuestions(null)} onSaved={()=>{setEditingQuestions(null);setNotice("Anahtar ve PDF güncellendi.");void loadData();}}/>}
                  <div className="download-actions">
                    <AnswerPdfOptions id={item.id} name={item.examName} token={readOnly?undefined:token}/>{answerFile && (readOnly
                      ? <a className="button button-quiet" href={`${API_URL}/api/answer-key-files/${answerFile.id}`} target="_blank" rel="noreferrer">Cevap Anahtarını İndir</a>
                      : <button type="button" className="button button-quiet" onClick={() => void downloadFile(answerFile, item)}>Cevap Anahtarını İncele</button>)}
                    {outcomesFile && (readOnly
                      ? <a className="button button-quiet" href={`${API_URL}/api/answer-key-files/${outcomesFile.id}`} target="_blank" rel="noreferrer">Kazanımı İndir</a>
                      : <button type="button" className="button button-quiet" onClick={() => void downloadFile(outcomesFile, item)}>Kazanımı İncele</button>)}
                    {!readOnly && <>
                      <button type="button" className="button button-quiet" onClick={() => {setEditing(item);setEditConfirmed(false);setEditingQuestions(null);}}>Bilgi / dosya düzenle</button>{item.opticalKey&&<button type="button" className="button button-quiet" onClick={()=>{setEditing(null);setEditingQuestions(item.opticalKey!.id);}}>Soruları ve kazanımları düzenle</button>}
                      <button type="button" className="button button-quiet" onClick={() => void setPublished(item, !item.published)}>{item.published ? "Yayından kaldır" : "Yeniden yayımla"}</button>
                      <button type="button" className="button button-navy danger-button" onClick={() => void deleteRecord(item.id)}>Sil</button>
                    </>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );

  async function saveRecord(id: string, formData: FormData) {
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
    const response = await fetch(`${API_URL}/api/admin/answer-keys/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Authorization: "Bearer " + token },
      body: formData,
    });
    const result = await response.json() as { error?: string; message?: string };
    if (!response.ok) {
      setError(result.error ?? "Cevap anahtarı güncellenemedi.");
      return;
    }
    setNotice(result.message ?? "Cevap anahtarı güncellendi.");
    setEditing(null);
    await loadData();
    } catch {
      setError("Cevap anahtarı güncellenirken sunucuya ulaşılamadı.");
    } finally { setSubmitting(false); }
  }

  async function setPublished(item: AnswerKeyRecord, published: boolean) {
    const formData = new FormData();
    formData.set("publisherId", item.publisherId);
    formData.set("grade", String(item.grade));
    formData.set("examName", item.examName);
    formData.set("published", String(published));formData.set("confirmPublication","true");
    formData.set("showInEvaluation", String(item.showInEvaluation??false));
    formData.set("penalty", String(item.opticalKey?.penalty??3));
    formData.set("publishedAt", item.publishedAt.slice(0, 10));
    await saveRecord(item.id, formData);
  }

  async function downloadFile(file: AnswerKeyFile, item: AnswerKeyRecord) {
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/answer-key-files/${encodeURIComponent(file.id)}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? "Dosya indirilemedi.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      const extension = file.originalFileName.match(/\.[^.]+$/)?.[0]?.toLowerCase() ?? "";
      const title = `${item.publisher.name} ${item.grade}. Sınıf ${item.examName} ${file.category === "ANSWER_KEY" ? "Cevap Anahtarı" : "Kazanımlar"}`;
      link.download = title.replace(/[\\/:*?"<>|\x00-\x1f]/g, "-").slice(0, 180).trim() + extension;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Dosya indirilemedi.");
    }
  }
}
