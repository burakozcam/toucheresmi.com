"use client";

import ExamCover from "../exam-cover";
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
  coverImage?:string|null;examDate?:string|null;
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
  const [recent,setRecent]=useState<AnswerKeyRecord[]>(initialItems.slice(0,10));
  useEffect(()=>{const controller=new AbortController();fetch(`${API_URL}/api/answer-keys?limit=10&page=1`,{signal:controller.signal}).then(r=>r.json()).then(d=>{if(Array.isArray(d.items))setRecent(d.items);}).catch(()=>{});return()=>controller.abort();},[]);
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

  return <main className="public-answer-page publication-library">
<header className="landing-header answer-header"><Link className="brand" href="/"><span className="brand-mark">K</span><span>kurumsalsinav.com</span></Link><nav className="header-actions"><Link href="/">Ana Sayfa</Link><ThemeToggle/><Link className="button button-navy" href="/login">Giriş Yap</Link></nav></header>
<section className="catalog-heading"><p className="hero-tag">DİJİTAL SINAV KÜTÜPHANESİ</p><h1>Denemeni bul.<br/>Cevaplarını keşfet.</h1><p>Denemenizi bulun; cevap anahtarını, kazanımlarını ve kitapçık bilgilerini inceleyin.</p></section>
<section className="answer-filter-panel" aria-label="Cevap anahtarı filtreleri"><label>Yayınevi<select value={publisherId} onChange={e=>updateFilter(()=>setPublisherId(e.target.value))}><option value="">Tümü</option>{publishers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Sınıf<select value={grade} onChange={e=>updateFilter(()=>setGrade(e.target.value))}><option value="">Tümü</option>{Array.from({length:12},(_,i)=><option key={i} value={i+1}>{i+1}. Sınıf</option>)}</select></label><label className="search-grow">Sınav ara<input type="search" aria-label="Cevap anahtarlarında ara" value={search} maxLength={200} onChange={e=>updateFilter(()=>setSearch(e.target.value))} placeholder="Sınav veya yayınevi adı"/></label></section>
<section className="catalog-recent"><div className="catalog-section-title"><h2>Son Eklenen Sınavlar</h2><span>Yayımlanma tarihine göre</span></div><div className="book-showcase" tabIndex={0} role="region" aria-label="Son eklenen sınavları yatay kaydırın">{recent.map(item=><Link href={answerKeyPath(item)} key={item.id} className="showcase-book"><ExamCover item={item}/><strong>{item.examName}</strong><span>{item.publisher.name} · {item.grade}. Sınıf</span></Link>)}</div></section>
<section><div className="catalog-section-title"><h2>{publisherId ? `${publishers.find(p=>p.id===publisherId)?.name ?? "Yayınevi"} sınavları` : "Tüm Cevap Anahtarları"}</h2><span aria-live="polite">{loading?'Aranıyor…':`${items.length} sınav · ${page}/${totalPages}`}</span></div>{loadError&&<p className="notice error" role="alert">{loadError}</p>}{!loading&&!loadError&&!items.length&&<p>Bu filtrelere uygun sınav bulunamadı.</p>}<div className="catalog-books" aria-busy={loading}>{items.map(item=>{const answer=item.files.find(f=>f.category==='ANSWER_KEY'),outcomes=item.files.find(f=>f.category==='LEARNING_OUTCOMES');return <article className="catalog-book" key={item.id}><Link href={answerKeyPath(item)} aria-label={`${item.examName} sınav detayları`}><ExamCover item={item}/></Link><div><p className="book-publisher">{item.publisher.name}</p><h3><Link href={answerKeyPath(item)}>{item.examName}</Link></h3><p className="book-meta">{item.grade}. Sınıf · {item.examDate?'Sınav: '+new Date(item.examDate).toLocaleDateString('tr-TR'):'Yayın: '+new Date(item.publishedAt).toLocaleDateString('tr-TR')}</p><div className="book-downloads">{answer&&<a href={`${API_URL}/api/answer-key-files/${answer.id}`} target="_blank" rel="noreferrer">Cevap anahtarını indir ↓</a>}{outcomes&&<a href={`${API_URL}/api/answer-key-files/${outcomes.id}`} target="_blank" rel="noreferrer">Kazanımları indir ↓</a>}<Link href={answerKeyPath(item)}>Sınav detayları →</Link></div></div></article>;})}</div></section>
{totalPages>1&&<nav className="answer-pagination" aria-label="Cevap anahtarı sayfaları"><button className="button button-quiet" disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)}>Önceki</button><span>{page}/{totalPages}</span><button className="button button-quiet" disabled={page>=totalPages||loading} onClick={()=>setPage(p=>p+1)}>Sonraki</button></nav>}
<details className="catalog-request"><summary>Aradığınız sınav bulunmuyor mu?</summary><ContactForm purpose="answer-key"/></details><SiteFooter/></main>;
}
