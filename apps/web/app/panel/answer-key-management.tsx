"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../../lib/api";

type Publisher = { id: string; name: string };
type AnswerKeyFile = { id: string; category: "ANSWER_KEY" | "LEARNING_OUTCOMES"; originalFileName: string; mimeType: string; size: number; createdAt: string; storagePath: string };
type AnswerKeyRecord = {
  id: string;
  publisherId: string;
  grade: number;
  examName: string;
  published: boolean;
  createdAt: string;
  publisher: Publisher;
  files: AnswerKeyFile[];
};

export default function AnswerKeyManagement({ token, readOnly = false }: { token: string; readOnly?: boolean }) {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [records, setRecords] = useState<AnswerKeyRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ publisherId: "", grade: "8", examName: "", published: true });

  const filteredRecords = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("tr-TR");
    return [...records].filter((entry) => !value || `${entry.examName} ${entry.publisher.name}`.toLocaleLowerCase("tr-TR").includes(value));
  }, [query, records]);

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [publisherResponse, answerResponse] = await Promise.all([
        fetch(`${API_URL}/api/publishers`, { headers }),
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
      if (!readOnly && !form.publisherId && publisherData[0]) {
        setForm((current) => ({ ...current, publisherId: publisherData[0].id }));
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
    const formData = new FormData(event.currentTarget);
    const inputFiles = formData.getAll("answerKeyFile") as File[];
    const outcomeFiles = formData.getAll("learningOutcomesFile") as File[];

    if (inputFiles.filter(Boolean).length === 0 && outcomeFiles.filter(Boolean).length === 0) {
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
      setForm({ publisherId: publishers[0]?.id ?? "", grade: "8", examName: "", published: true });
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

      {!readOnly && (
        <form className="answer-key-form" onSubmit={handleSubmit}>
          <div className="two-column-fields">
            <label>
              Yayınevi
              <select name="publisherId" value={form.publisherId} onChange={(event) => setForm((current) => ({ ...current, publisherId: event.target.value }))} required>
                <option value="">Seçiniz</option>
                {publishers.map((publisher) => (
                  <option key={publisher.id} value={publisher.id}>{publisher.name}</option>
                ))}
              </select>
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
          <h3>Yayımlanan cevap anahtarları</h3>
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
                  <h4>{item.examName}</h4>
                  <p>{item.publisher.name}</p>
                  <small>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(item.createdAt))}</small>
                  <div className="download-actions">
                    {answerFile && <a className="button button-quiet" href={`${API_URL}/api/answer-key-files/${answerFile.id}`} target="_blank" rel="noreferrer">Cevap Anahtarını İndir</a>}
                    {outcomesFile && <a className="button button-quiet" href={`${API_URL}/api/answer-key-files/${outcomesFile.id}`} target="_blank" rel="noreferrer">Kazanımı İndir</a>}
                    {!readOnly && <button type="button" className="button button-navy danger-button" onClick={() => void deleteRecord(item.id)}>Sil</button>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
