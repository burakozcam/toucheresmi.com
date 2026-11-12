"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../../lib/api";
import type { PublisherOption } from "./publisher-select";

type Publisher = PublisherOption & { active: boolean };
type Exam = {
  id: string;
  examName: string;
  grade: number;
  published: boolean;
  files: { category: "ANSWER_KEY" | "LEARNING_OUTCOMES" }[];
  publisher: Publisher;
  opticalKey?: { active: boolean } | null;
};

export default function ExamManagement({ token, onOpenAnswerKeys }: { token: string; onOpenAnswerKeys: (publicationId: string) => void }) {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [publisherId, setPublisherId] = useState("");
  const [grade, setGrade] = useState("8");
  const [examName, setExamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [publisherResponse, examResponse] = await Promise.all([
        fetch(`${API_URL}/api/admin/publishers`, { headers }),
        fetch(`${API_URL}/api/admin/answer-keys`, { headers }),
      ]);
      const [publisherData, examData] = await Promise.all([publisherResponse.json(), examResponse.json()]);
      if (!publisherResponse.ok || !Array.isArray(publisherData)) throw new Error(publisherData.error ?? "Yayınevleri yüklenemedi.");
      if (!examResponse.ok || !Array.isArray(examData)) throw new Error(examData.error ?? "Sınav kayıtları yüklenemedi.");
      setPublishers(publisherData);
      setExams(examData);
      setPublisherId(current => publisherData.some((publisher: Publisher) => publisher.id === current && publisher.active) ? current : publisherData.find((publisher: Publisher) => publisher.active)?.id ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Sınav kayıtları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [token]);

  const groupedExams = useMemo(() => {
    const groups = new Map<string, { publisher: Publisher; grades: Map<number, Exam[]> }>();
    for (const exam of exams) {
      let group = groups.get(exam.publisher.id);
      if (!group) {
        group = { publisher: exam.publisher, grades: new Map() };
        groups.set(exam.publisher.id, group);
      }
      const gradeExams = group.grades.get(exam.grade) ?? [];
      gradeExams.push(exam);
      group.grades.set(exam.grade, gradeExams);
    }
    return [...groups.values()].sort((a, b) => a.publisher.name.localeCompare(b.publisher.name, "tr")).map(group => ({
      ...group,
      grades: [...group.grades.entries()].sort(([a], [b]) => a - b).map(([gradeValue, rows]) => ({
        grade: gradeValue,
        exams: rows.sort((a, b) => a.examName.localeCompare(b.examName, "tr")),
      })),
    }));
  }, [exams]);

  async function createExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/exam-definitions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ publisherId, grade, examName }),
      });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error ?? "Sınav kaydı oluşturulamadı.");
      setExamName("");
      setNotice("Sınav eklendi. Şimdi cevap anahtarını yükleyebilirsiniz.");
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Sınav kaydı oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="management-panel exam-management">
      {notice && <p className="notice success" role="status">{notice}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}
      <form className="exam-form" onSubmit={createExam}>
        <h2>Yeni sınav</h2>
        <p>Yayınevi ve sınıfı seçip sınav adını ekleyin. Sonraki adımda bu kayda cevap anahtarı bağlanır.</p>
        <label>Yayınevi<select value={publisherId} onChange={event => setPublisherId(event.target.value)} required>
          <option value="">Yayınevi seçin</option>
          {publishers.filter(publisher => publisher.active).map(publisher => <option key={publisher.id} value={publisher.id}>{publisher.name}</option>)}
        </select></label>
        <label>Sınıf<select value={grade} onChange={event => setGrade(event.target.value)} required>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}. Sınıf</option>)}</select></label>
        <label>Sınav adı<input value={examName} onChange={event => setExamName(event.target.value)} maxLength={180} minLength={2} placeholder="Örn. Türkiye Geneli Deneme 1" required /></label>
        <button className="button button-navy" type="submit" disabled={submitting || !publisherId}>{submitting ? "Ekleniyor…" : "Sınavı ekle"}</button>
      </form>

      <div className="school-list-panel">
        <div className="list-header-row"><h2>Kayıtlı sınavlar</h2><span>{exams.length} sınav</span></div>
        {loading ? <p role="status">Sınavlar yükleniyor…</p> : !groupedExams.length ? <p className="empty-state">Henüz sınav eklenmedi.</p> : groupedExams.map(group => (
          <section className="exam-publisher-group" key={group.publisher.id}>
            <h3>{group.publisher.name} <span>{[...group.grades].reduce((count, item) => count + item.exams.length, 0)}</span></h3>
            {group.grades.map(({ grade: gradeValue, exams: rows }) => (
              <div className="exam-grade-group" key={gradeValue}>
                <h4>{gradeValue}. Sınıf</h4>
                <div className="exam-list">{rows.map(exam => {
                  const hasAnswerFile = exam.files.some(file => file.category === "ANSWER_KEY");
                  return <article className="exam-list-item" key={exam.id}>
                    <strong>{exam.examName}</strong>
                    <span>{hasAnswerFile ? "Cevap anahtarı dosyası eklendi" : "Cevap anahtarı bekleniyor"}</span>
                    <button className="button button-quiet" type="button" onClick={() => onOpenAnswerKeys(exam.id)}>{hasAnswerFile ? "Anahtarı düzenle" : "Cevap anahtarı ekle"}</button>
                  </article>;
                })}</div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </section>
  );
}
