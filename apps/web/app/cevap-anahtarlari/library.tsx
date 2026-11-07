"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_URL } from "../../lib/api";
import { answerKeyPath } from "../../lib/answer-key";
import SiteFooter from "../site-footer";
import ContactForm from "../contact-form";
import ThemeToggle from "../theme-toggle";

export type Publisher = { id: string; name: string };
type AnswerKeyFile = { id: string; category: "ANSWER_KEY" | "LEARNING_OUTCOMES"; originalFileName: string; mimeType: string; size: number; createdAt: string };
export type AnswerKeyRecord = {
  id: string;
  publisherId: string;
  grade: number;
  examName: string;
  published: boolean;
  publishedAt: string;
  publisher: Publisher;
  files: AnswerKeyFile[];
};

type AnswerKeyPage = { items?: AnswerKeyRecord[]; totalPages?: number; error?: string };

type Props = { initialItems: AnswerKeyRecord[]; initialPublishers: Publisher[]; initialPages: number; initialError: string; filters: { page: number; publisherId: string; grade: string; search: string } };
export default function PublicAnswerKeysPage({ initialItems, initialPublishers, initialPages, initialError, filters }: Props) {
  const [publishers, setPublishers] = useState<Publisher[]>(initialPublishers);
  const [items, setItems] = useState<AnswerKeyRecord[]>(initialItems);
  const [publisherId, setPublisherId] = useState(filters.publisherId);
  const [grade, setGrade] = useState(filters.grade);
  const [search, setSearch] = useState(filters.search);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(filters.page);
  const [totalPages, setTotalPages] = useState(initialPages);
  const [loadError, setLoadError] = useState(initialError);

  useEffect(() => {
    let active = true;
    async function loadPublishers() {
      try {
        const response = await fetch(`${API_URL}/api/publishers`);
        const result = await response.json() as Publisher[] | { error?: string };
        if (!response.ok || !Array.isArray(result)) {
          throw new Error((result as { error?: string }).error ?? "Yayınevleri yüklenemedi.");
        }
        if (active) setPublishers(result);
      } catch (error) {
        if (active) setLoadError(error instanceof TypeError
          ? "Yayınevi listesine ulaşılamadı. Lütfen daha sonra tekrar deneyin."
          : error instanceof Error ? error.message : "Yayınevleri yüklenemedi.");
      }
    }
    void loadPublishers();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const query = new URLSearchParams({ limit: "30", page: String(page) });
      if (publisherId) query.set("publisherId", publisherId);
      if (grade) query.set("grade", grade);
      if (search.trim()) query.set("search", search.trim());
      const publicQuery = new URLSearchParams(query);
      publicQuery.delete("limit");
      if (page === 1) publicQuery.delete("page");
      window.history.replaceState(null, "", `/cevap-anahtarlari${publicQuery.size ? `?${publicQuery}` : ""}`);
      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch(`${API_URL}/api/answer-keys?${query.toString()}`, { signal: controller.signal });
        const result = await response.json() as AnswerKeyPage;
        if (!response.ok || !Array.isArray(result.items)) {
          throw new Error(result.error ?? "Cevap anahtarı listesi yüklenemedi.");
        }
        setItems(result.items);
        setTotalPages(result.totalPages ?? 1);
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof TypeError
            ? "Cevap anahtarı servisine ulaşılamadı. Lütfen daha sonra tekrar deneyin."
            : error instanceof Error ? error.message : "Cevap anahtarı listesi yüklenemedi.");
          setItems([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [grade, page, publisherId, search]);

  function updateFilter(update: () => void) {
    update();
    setPage(1);
  }

  return (
    <main className="public-answer-page">
      <header className="landing-header answer-header">
        <Link className="brand" href="/" aria-label="Kurumsal Sınav ana sayfa">
          <span className="brand-mark">K</span>
          <span>kurumsal<span className="brand-light">sinav.com</span></span>
        </Link>
        <nav className="header-actions" aria-label="Ana menü">
          <Link className="header-link" href="/">Ana Sayfa</Link>
          <Link className="header-link" href="/sinav-degerlendir">Sınav Değerlendir</Link><ThemeToggle /><Link className="button button-navy" href="/login">Giriş Yap</Link>
        </nav>
      </header>

      <section className="answer-page-hero">
        <div className="answer-page-copy">
          <p className="hero-tag">CEVAP ANAHTARLARI</p>
          <h1>Deneme sınavı cevap anahtarları.</h1>
          <p>1–12. sınıf denemelerinin cevap anahtarlarını ve kazanım dosyalarını yayınevi, sınıf veya sınav adına göre bul. Üyelik gerektirmeden indir, cevaplarını kontrol et.</p>
        </div>
      </section>

      <div className="answer-library-links"><Link href="/sinav-degerlendir">Excel ile sınavını değerlendir →</Link><a href="#answer-key-request-form">Cevap anahtarı talep et →</a></div>
      <section className="answer-filter-panel" aria-label="Cevap anahtarı filtreleri">
        <label>
          <span>Yayınevi</span>
          <select value={publisherId} onChange={(event) => updateFilter(() => setPublisherId(event.target.value))}>
            <option value="">Tümü</option>
            {publishers.map((publisher) => <option key={publisher.id} value={publisher.id}>{publisher.name}</option>)}
          </select>
        </label>
        <label>
          <span>Sınıf</span>
          <select value={grade} onChange={(event) => updateFilter(() => setGrade(event.target.value))}>
            <option value="">Tümü</option>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map((value) => <option key={value} value={String(value)}>{value}. Sınıf</option>)}
          </select>
        </label>
        <label className="search-grow">
          <span>Arama</span>
          <input value={search} onChange={(event) => updateFilter(() => setSearch(event.target.value))} placeholder="Sınav adı veya yayınevi" />
        </label>
      </section>

      <div className="library-results-bar" aria-live="polite"><span>{loading ? "Aranıyor..." : `${items.length} yayın · Sayfa ${page} / ${totalPages}`}</span>{(publisherId || grade || search) && <button className="button button-quiet" onClick={() => { setPublisherId(""); setGrade(""); setSearch(""); setPage(1); }}>Filtreleri temizle ×</button>}</div>
      <section className="public-answer-grid" aria-busy={loading}>
        {loadError ? (
          <p className="notice error" role="alert">{loadError}</p>
        ) : loading ? (
          <p className="empty-state">Cevap anahtarları yükleniyor...</p>
        ) : items.length === 0 ? (
          <p className="empty-state">Seçilen filtrelere uygun yayın bulunmuyor.</p>
        ) : (
          items.map((item) => {
            const answerFile = item.files.find((file) => file.category === "ANSWER_KEY");
            const learningFile = item.files.find((file) => file.category === "LEARNING_OUTCOMES");
            return (
              <article className="answer-key-card public-answer-key-card" key={item.id}>
                <div className="answer-key-header">
                  <span className="badge">{item.grade}. Sınıf</span>
                  <span className="status-dot">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(item.publishedAt))}</span>
                </div>
                <p className="publisher-kicker">{item.publisher.name}</p><h2 className="library-card-title"><Link href={answerKeyPath(item)}>{item.examName} · {item.grade}. Sınıf Cevap Anahtarı</Link></h2>
                <p className="exam-name">{item.files.length} dosya · {answerFile ? "Cevap anahtarı" : "Kazanım dosyası"}{answerFile && learningFile ? " ve kazanım" : ""}</p>
                <Link className="answer-detail-link" href={answerKeyPath(item)}>Sınav detayları <span aria-hidden="true">→</span></Link>
                <div className="download-actions">
                  {answerFile && <a className="button button-navy" href={`${API_URL}/api/answer-key-files/${answerFile.id}`} target="_blank" rel="noreferrer">Cevap Anahtarını İndir</a>}
                  {learningFile && <a className="button button-quiet" href={`${API_URL}/api/answer-key-files/${learningFile.id}`} target="_blank" rel="noreferrer">Kazanımı İndir</a>}
                </div>
              </article>
            );
          })
        )}
      </section>
      {totalPages > 1 && <nav className="answer-pagination" aria-label="Cevap anahtarı sayfaları">
        <Link className="button button-quiet" aria-disabled={page === 1} href={`?${new URLSearchParams({ ...(publisherId ? { publisherId } : {}), ...(grade ? { grade } : {}), ...(search ? { search } : {}), page: String(Math.max(1, page - 1)) })}`}>Önceki</Link>
        <span>{page} / {totalPages}</span>
        <Link className="button button-quiet" aria-disabled={page === totalPages} href={`?${new URLSearchParams({ ...(publisherId ? { publisherId } : {}), ...(grade ? { grade } : {}), ...(search ? { search } : {}), page: String(Math.min(totalPages, page + 1)) })}`}>Sonraki</Link>
      </nav>}
      <section className="evaluation-help"><h2>Cevap anahtarını nasıl bulabilirim?</h2><p>Önce sınıfını seç, ardından yayınevi veya deneme adını ara. Yayın kartından cevap anahtarını ve varsa kazanım dosyasını indirebilirsin. Detay sayfasında sınav adı, sınıf ve yayın tarihini kontrol ederek doğru denemeye baktığından emin ol.</p><h3>Aradığım deneme listede yoksa?</h3><p>Aşağıdaki cevap anahtarı ekleme talebi formuna yayınevi, sınıf ve sınav bilgilerini yazabilirsin. Talepler incelenir; her talebin dosyasının bulunması veya yayımlanması garanti edilmez.</p></section>
      <section className="answer-request-section"><ContactForm purpose="answer-key" /></section>
      <SiteFooter />
    </main>
  );
}
