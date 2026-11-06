"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../../lib/api";
import PublisherSelect from "./publisher-select";
import type { PublisherOption } from "./publisher-select";

type SchoolOption = { id: string; name: string; city: string | null; district: string | null };
type Exam = {
  id: string;
  name: string;
  examDate: string;
  school: SchoolOption;
  publisher: PublisherOption | null;
};

export default function ExamManagement({ token }: { token: string }) {
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [publishers, setPublishers] = useState<PublisherOption[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [publisherId, setPublisherId] = useState("");
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [schoolResponse, publisherResponse, examResponse] = await Promise.all([
        fetch(`${API_URL}/api/schools?active=true`, { headers }),
        fetch(`${API_URL}/api/publishers`),
        fetch(`${API_URL}/api/exams`, { headers }),
      ]);
      const [schoolData, publisherData, examData] = await Promise.all([
        schoolResponse.json() as Promise<SchoolOption[] | { error?: string }>,
        publisherResponse.json() as Promise<PublisherOption[] | { error?: string }>,
        examResponse.json() as Promise<Exam[] | { error?: string }>,
      ]);
      if (!schoolResponse.ok || !Array.isArray(schoolData)) throw new Error((schoolData as { error?: string }).error ?? "Kurumlar yüklenemedi.");
      if (!publisherResponse.ok || !Array.isArray(publisherData)) throw new Error((publisherData as { error?: string }).error ?? "Yayınevleri yüklenemedi.");
      if (!examResponse.ok || !Array.isArray(examData)) throw new Error((examData as { error?: string }).error ?? "Sınavlar yüklenemedi.");
      setSchools(schoolData);
      setPublishers(publisherData);
      setExams(examData);
      setSchoolId((current) => schoolData.some((school) => school.id === current) ? current : schoolData[0]?.id ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Sınav verileri yüklenemedi.");
    }
  }

  useEffect(() => { void loadData(); }, [token]);

  async function createExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/exams`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, publisherId: publisherId || null, name, examDate }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Sınav oluşturulamadı.");
        return;
      }
      setNotice("Sınav kaydı oluşturuldu.");
      setName("");
      setPublisherId("");
      await loadData();
    } catch {
      setError("Sınav kaydedilirken sunucuya ulaşılamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="management-panel exam-management">
      <header className="panel-header"><div><p className="hero-tag">SINAV YÖNETİMİ</p><h2>Sınav oluştur</h2></div></header>
      {notice && <p className="notice success" role="status">{notice}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}
      {schools.length === 0 ? <p className="empty-state">Sınav oluşturmak için önce aktif bir kurum ekleyin.</p> : (
        <form className="exam-form" onSubmit={createExam}>
          <label>Kurum<select value={schoolId} onChange={(event) => setSchoolId(event.target.value)} required>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}{school.city ? ` — ${school.city}` : ""}{school.district ? ` / ${school.district}` : ""}</option>)}</select></label>
          <label>Yayınevi (isteğe bağlı)<PublisherSelect publishers={publishers} value={publisherId} onChange={setPublisherId} label="Yayınevi seçin (isteğe bağlı)" /></label>
          <label>Sınav adı<input value={name} onChange={(event) => setName(event.target.value)} maxLength={180} required /></label>
          <label>Sınav tarihi<input type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} required /></label>
          <button className="button button-navy" type="submit" disabled={submitting}>{submitting ? "Oluşturuluyor..." : "Sınav oluştur"}</button>
        </form>
      )}
      <div className="school-list-panel">
        <h3>Son sınavlar</h3>
        {exams.length === 0 ? <p className="empty-state">Henüz sınav kaydı bulunmuyor.</p> : (
          <div className="exam-list">
            {exams.map((exam) => <article className="exam-list-item" key={exam.id}>
              <strong>{exam.name}</strong>
              <span>{exam.school.name} · {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(exam.examDate))}</span>
              <small>{exam.publisher?.name ?? "Yayınevi belirtilmemiş"}</small>
            </article>)}
          </div>
        )}
      </div>
    </section>
  );
}
