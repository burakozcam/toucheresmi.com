"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import BulkAnswerKeys from "./bulk-answer-keys";
import { API_URL } from "../../lib/api";
import PublisherSelect from "./publisher-select";

type Publisher = { id: string; name: string; active: boolean };
type AnswerKeyFile = { id: string; category: "ANSWER_KEY" | "LEARNING_OUTCOMES"; originalFileName: string; mimeType: string; size: number; createdAt: string; storagePath?: string };
type AnswerKeyRecord = {
  id: string;
  publisherId: string;
  grade: number;
  examName: string;
  published: boolean;
  createdAt: string;
  publishedAt: string;
  publisher: Publisher;
  files: AnswerKeyFile[];
};

export default function AnswerKeyManagement({ token, readOnly = false }: { token: string; readOnly?: boolean }) {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [records, setRecords] = useState<AnswerKeyRecord[]>([]);
  const [query, setQuery] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<AnswerKeyRecord | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ publisherId: "", grade: "8", examName: "", published: true, publishedAt: new Date().toISOString().slice(0, 10) });

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
    const formData = new FormData(event.currentTarget);
    const inputFiles = formData.getAll("answerKeyFile") as File[];
    const outcomeFiles = formData.getAll("learningOutcomesFile") as File[];

    if (!inputFiles.some((file) => file.size > 0) && !outcomeFiles.some((file) => file.size > 0)) {
      setError("En az bir dosya yüklemelisiniz.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/answer-keys`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) {
        setError(result.error ?? "Cevap anahtarı kaydedilemedi.");
        return;
      }

      setNotice(result.message ?? "Cevap anahtarı kaydedildi.");
      event.currentTarget.reset();
      setForm({ publisherId: publishers.find((publisher) => publisher.active)?.id ?? "", grade: "8", examName: "", published: true, publishedAt: new Date().toISOString().slice(0, 10) });
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
          <h2>Yeni cevap anahtarı ekle</h2>
        </div>
      </header>

      {notice && <p className="notice success" role="status">{notice}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}

      {!readOnly && <div className="answer-add-tabs"><button className={`button ${!bulkMode ? "button-navy" : "button-quiet"}`} disabled={bulkBusy} onClick={() => setBulkMode(false)}>Cevap anahtarı ekle</button><button className={`button ${bulkMode ? "button-navy" : "button-quiet"}`} disabled={bulkBusy} onClick={() => setBulkMode(true)}>Toplu ekle</button></div>}
      {!readOnly && bulkMode && <BulkAnswerKeys token={token} publishers={publishers} onComplete={() => void loadData()} onBusyChange={setBulkBusy} />}
      {!readOnly && !bulkMode && (
        <form className="answer-key-form" onSubmit={handleSubmit}>
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
            Yayımlansın
          </label>

          <div className="file-upload-grid">
            <label>
              Cevap Anahtarı
              <input type="file" name="answerKeyFile" accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.webp" />
            </label>
            <label>
              Kazanım dosyası
              <input type="file" name="learningOutcomesFile" accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.webp" />
            </label>
          </div>

          <button className="button button-navy" type="submit" disabled={submitting}>{submitting ? "Yükleniyor..." : "Cevap anahtarı ekle"}</button>
        </form>
      )}

      <div className="public-list-panel">
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
              const answerFile = item.files.find((file) => file.category === "ANSWER_KEY");
              const outcomesFile = item.files.find((file) => file.category === "LEARNING_OUTCOMES");
              return (
                <article className="answer-key-card" key={item.id}>
                  <div className="answer-key-header">
                    <span className="badge">{item.grade}. Sınıf</span>
                    <span className="status-dot">{item.published ? "Yayında" : "Taslak"}</span>
                  </div>
                  <h4>{item.examName}</h4>{!readOnly && <small className="publication-id">Takvim eşleştirme ID: <code>{item.id}</code></small>}
                  <p>{item.publisher.name}</p>
                  <small>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(item.publishedAt))}</small>
                  {!readOnly && editing?.id === item.id && (
                    <form className="answer-key-edit-form" onSubmit={(event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      void saveRecord(item.id, formData);
                    }}>
                      <input type="hidden" name="publisherId" value={editing.publisherId} />
                      <label>Yayınevi<PublisherSelect publishers={publishers.filter((publisher) => publisher.active || publisher.id === editing.publisherId)} value={editing.publisherId} onChange={(publisherId) => setEditing((current) => current ? { ...current, publisherId } : current)} /></label>
                      <div className="two-column-fields">
                        <label>Sınıf<select name="grade" value={String(editing.grade)} onChange={(event) => setEditing({ ...editing, grade: Number(event.target.value) })}>{[1,2,3,4,5,6,7,8,9,10,11,12].map((grade) => <option key={grade} value={String(grade)}>{grade}. Sınıf</option>)}</select></label>
                        <label>Yayın tarihi<input type="date" name="publishedAt" value={editing.publishedAt.slice(0, 10)} onChange={(event) => setEditing({ ...editing, publishedAt: event.target.value })} required /></label>
                      </div>
                      <label>Sınav / deneme adı<input name="examName" value={editing.examName} onChange={(event) => setEditing({ ...editing, examName: event.target.value })} required maxLength={180} /></label>
                      <label className="checkbox-row"><input type="checkbox" name="published" checked={editing.published} onChange={(event) => setEditing({ ...editing, published: event.target.checked })} />Yayımlansın</label>
                      <div className="file-upload-grid">
                        <label>Yeni cevap anahtarı dosyası<input type="file" name="answerKeyFile" accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.webp" /></label>
                        <label>Yeni kazanım dosyası<input type="file" name="learningOutcomesFile" accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.webp" /></label>
                      </div>
                      <div className="download-actions">
                        <button className="button button-navy" type="submit">Değişiklikleri kaydet</button>
                        <button className="button button-quiet" type="button" onClick={() => setEditing(null)}>Vazgeç</button>
                      </div>
                    </form>
                  )}
                  <div className="download-actions">
                    {answerFile && (readOnly
                      ? <a className="button button-quiet" href={`${API_URL}/api/answer-key-files/${answerFile.id}`} target="_blank" rel="noreferrer">Cevap Anahtarını İndir</a>
                      : <button type="button" className="button button-quiet" onClick={() => void downloadFile(answerFile, item)}>Cevap Anahtarını İncele</button>)}
                    {outcomesFile && (readOnly
                      ? <a className="button button-quiet" href={`${API_URL}/api/answer-key-files/${outcomesFile.id}`} target="_blank" rel="noreferrer">Kazanımı İndir</a>
                      : <button type="button" className="button button-quiet" onClick={() => void downloadFile(outcomesFile, item)}>Kazanımı İncele</button>)}
                    {!readOnly && <>
                      <button type="button" className="button button-quiet" onClick={() => setEditing(item)}>Düzenle</button>
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
    }
  }

  async function setPublished(item: AnswerKeyRecord, published: boolean) {
    const formData = new FormData();
    formData.set("publisherId", item.publisherId);
    formData.set("grade", String(item.grade));
    formData.set("examName", item.examName);
    formData.set("published", String(published));
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
