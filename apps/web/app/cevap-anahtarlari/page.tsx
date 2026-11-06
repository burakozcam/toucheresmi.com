"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_URL } from "../../lib/api";

type Publisher = { id: string; name: string };
type AnswerKeyFile = { id: string; category: "ANSWER_KEY" | "LEARNING_OUTCOMES"; originalFileName: string; mimeType: string; size: number; createdAt: string };
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

export default function PublicAnswerKeysPage() {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [items, setItems] = useState<AnswerKeyRecord[]>([]);
  const [publisherId, setPublisherId] = useState("");
  const [grade, setGrade] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [publisherResponse, answerResponse] = await Promise.all([
          fetch(`${API_URL}/api/publishers`),
          fetch(`${API_URL}/api/answer-keys?limit=30`),
        ]);

        const [publisherResult, answerResult] = await Promise.all([
          publisherResponse.json() as Promise<Publisher[] | { error?: string }>,
          answerResponse.json() as Promise<{ items?: AnswerKeyRecord[]; error?: string }>,
        ]);

        if (publisherResponse.ok && Array.isArray(publisherResult)) {
          setPublishers(publisherResult);
        }
        if (answerResponse.ok && Array.isArray(answerResult.items)) {
          setItems(answerResult.items);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesPublisher = !publisherId || item.publisherId === publisherId;
      const matchesGrade = !grade || String(item.grade) === grade;
      const matchesSearch = !search || `${item.publisher.name} ${item.examName}`.toLocaleLowerCase("tr-TR").includes(search.trim().toLocaleLowerCase("tr-TR"));
      return matchesPublisher && matchesGrade && matchesSearch;
    }).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [grade, items, publisherId, search]);

  return (
    <main className="public-answer-page">
      <header className="landing-header answer-header">
        <Link className="brand" href="/" aria-label="Kurumsal Sınav ana sayfa">
          <span className="brand-mark">K</span>
          <span>kurumsal<span className="brand-light">sinav.com</span></span>
        </Link>
        <nav className="header-actions" aria-label="Ana menü">
          <Link className="header-link" href="/">Ana Sayfa</Link>
          <Link className="button button-navy" href="/login">Giriş Yap</Link>
        </nav>
      </header>

      <section className="answer-page-hero">
        <div className="answer-page-copy">
          <p className="hero-tag">CEVAP ANAHTARLARI</p>
          <h1>Yayımlanan denemeler ve kazanım dosyalarına hızlı erişim.</h1>
          <p>Yayınevi ve sınıf filtreleriyle arama yapabilir, istediğiniz dosyayı doğrudan indirebilirsiniz.</p>
        </div>
      </section>

      <section className="answer-filter-panel">
        <label>
          <span>Yayınevi</span>
          <select value={publisherId} onChange={(event) => setPublisherId(event.target.value)}>
            <option value="">Tümü</option>
            {publishers.map((publisher) => <option key={publisher.id} value={publisher.id}>{publisher.name}</option>)}
          </select>
        </label>
        <label>
          <span>Sınıf</span>
          <select value={grade} onChange={(event) => setGrade(event.target.value)}>
            <option value="">Tümü</option>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map((value) => <option key={value} value={String(value)}>{value}. Sınıf</option>)}
          </select>
        </label>
        <label className="search-grow">
          <span>Arama</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Sınav adı veya yayınevi" />
        </label>
      </section>

      <section className="public-answer-grid">
        {loading ? (
          <p className="empty-state">Cevap anahtarları yükleniyor...</p>
        ) : filteredItems.length === 0 ? (
          <p className="empty-state">Seçilen filtrelere uygun yayın bulunmuyor.</p>
        ) : (
          filteredItems.map((item) => {
            const answerFile = item.files.find((file) => file.category === "ANSWER_KEY");
            const learningFile = item.files.find((file) => file.category === "LEARNING_OUTCOMES");
            return (
              <article className="answer-key-card public-answer-key-card" key={item.id}>
                <div className="answer-key-header">
                  <span className="badge">{item.grade}. Sınıf</span>
                  <span className="status-dot">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(item.createdAt))}</span>
                </div>
                <h3>{item.publisher.name}</h3>
                <p className="exam-name">{item.examName}</p>
                <div className="download-actions">
                  {answerFile && <a className="button button-navy" href={`${API_URL}/api/answer-key-files/${answerFile.id}`} target="_blank" rel="noreferrer">Cevap Anahtarını İndir</a>}
                  {learningFile && <a className="button button-quiet" href={`${API_URL}/api/answer-key-files/${learningFile.id}`} target="_blank" rel="noreferrer">Kazanımı İndir</a>}
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
