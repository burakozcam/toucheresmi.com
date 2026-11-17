import type { Metadata } from "next";
import Link from "next/link";

import {LiveReport,SecurityScene,InferenceScene,AcademicProgress,BatchScene} from "./home-demos";
import ExamCover from "./exam-cover";
import { PublisherRibbon, ProgressReport, ScrollStory, HomeEffects } from "./home-motion";
import ThemeToggle from "./theme-toggle";
import SiteFooter from "./site-footer";
import BlogPreview from "./blog-preview";
import { API_URL } from "../lib/api";
import { answerKeyPath } from "../lib/answer-key";
import type { AnswerKeyRecord, Publisher } from "./cevap-anahtarlari/library";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "KurumsalSınav | Ölçme ve Değerlendirme Sistemi" },
  description: "Denemeni bul, cevap anahtarlarını incele, sınav sonucunu öğren. Öğrenciler için başarı takibi, kurumlar için profesyonel optik değerlendirme.",
  alternates: { canonical: "/" },
  openGraph: { title: "Sınava girdin. Şimdi sıra sonuçlarda!", description: "Cevap anahtarlarını keşfet, sınav sonucunu öğren ve başarını takip et.", url: "/" },
};
async function loadPublic<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    return response.ok ? await response.json() as T : null;
  } catch { return null; }
}
export default async function Home() {
  const [keys, publisherData, storeStatus] = await Promise.all([loadPublic<{ items: AnswerKeyRecord[] }>("/api/answer-keys?limit=10&page=1"), loadPublic<Publisher[]>("/api/publishers"),loadPublic<{open:boolean}>("/api/store/status")]);
  const items = Array.isArray(keys?.items) ? keys.items : [];
  const publishers = Array.isArray(publisherData) ? publisherData : [];
  return <main className="landing next-generation">
    <HomeEffects/><a className="skip-to-content" href="#sinav-ara">Sınav aramaya geç</a>
    <header className="landing-header"><Link className="brand" href="/" aria-label="Kurumsal Sınav ana sayfa"><span className="brand-mark">K</span><span>kurumsal<span className="brand-light">sinav.com</span></span></Link><nav className="header-actions" aria-label="Ana menü"><Link className="header-link" href="/cevap-anahtarlari">Cevap Anahtarları</Link><Link className="header-link" href="/sinav-takvimi">Sınav Takvimi</Link><a className="header-link" href="#kurumlar">Kurumlar İçin</a>{storeStatus?.open&&<Link className="header-link" href="/magaza">Mağaza</Link>}<ThemeToggle/><Link className="button button-navy" href="/login">Giriş Yap ↗</Link></nav></header>
    <section className="landing-hero student-hero"><div className="hero-copy"><p className="hero-tag"><span className="tag-dot"/>BİR SONRAKİ ADIMIN BURADA</p><h1>Sınava girdin.<br />Şimdi sıra<br /><span>sonuçlarda!</span></h1><p className="hero-description">Cevap anahtarlarını keşfet, sınav sonucunu öğren ve başarını takip et.</p><form id="sinav-ara" className="hero-search" action="/cevap-anahtarlari" role="search"><label htmlFor="home-exam-search">Hangi sınava girdin?</label><div><span aria-hidden="true">⌕</span><input id="home-exam-search" name="search" type="search" placeholder="Yayınevi, sınav veya sınıf ara…" maxLength={200}/><button className="button button-navy" type="submit" aria-label="Cevap anahtarlarını bul">Bul ↗</button></div></form><div className="hero-shortcuts"><Link href="/cevap-anahtarlari">Cevap Anahtarlarını Bul <span>↗</span></Link><Link href="/sonuclar">Sınav Sonucunu Öğren <span>↗</span></Link></div><p className="hero-proof">Kurumun için mi buradasın? <a href="#kurumlar">Çözümlerimizi keşfet →</a></p></div><div className="student-visual"><figure className="real-report-hero"><a href="/home-report.webp" target="_blank" rel="noreferrer" aria-label="Anonim örnek karneyi büyüt"><img src="/home-report.webp" width="990" height="1400" alt="Sistemin ürettiği örnek öğrenci karnesi: ders performansı, sıralamalar, cevap ve kazanım analizi" fetchPriority="high"/></a><figcaption>Gerçek karne tasarımımız · tamamı anonim örnek veriler</figcaption></figure></div></section>
    <section className="home-exams" aria-labelledby="recent-title"><div className="home-section-top"><div><p className="hero-tag">DENEMEDEN SONRAKİ İLK DURAK</p><h2 id="recent-title">Yeni sınavlar.<br /><span>Aradığın cevaplar.</span></h2></div><Link className="text-link" href="/cevap-anahtarlari">Kütüphaneyi keşfet ↗</Link></div><div className="book-showcase home-books" tabIndex={0} role="region" aria-label="Son eklenen sınavlar, yatay kaydırılabilir">{items.map(item => <Link href={answerKeyPath(item)} key={item.id} className="showcase-book"><ExamCover item={item}/><span>{item.publisher.name} · {item.grade}. Sınıf</span><strong>{item.examName}</strong><em>Cevap anahtarına git ↗</em></Link>)}</div>{!items.length && <p className="home-empty">{keys ? "Henüz yayımlanmış sınav bulunmuyor." : "Sınav vitrini şu anda yüklenemedi. Cevap anahtarları kütüphanesinden tekrar deneyebilirsin."} <Link href="/cevap-anahtarlari">Kütüphaneyi aç →</Link></p>}</section>
    <PublisherRibbon publishers={publishers}/>
    <LiveReport/><SecurityScene/><AcademicProgress/>

    <section className="institution-section" id="kurumlar"><div><p className="hero-tag">KURUMLARA ÖZEL</p><h2>Arkasında güçlü<br />bir sistem var.</h2><p>Okullar, yayınevleri, kurs merkezleri ve bayiler için optik değerlendirme, sınav yönetimi ve ayrıntılı raporlama. Excel ve PDF anahtarlarından kitapçık eşleştirmelerine, güvenli sonuç paylaşımından kazanım analizine kadar tek çalışma alanı.</p><div className="hero-buttons"><Link className="button" href="/contact">Birlikte çalışalım ↗</Link><Link className="institution-login" href="/login">Kurum girişi →</Link></div></div><ol><li><span>01</span><div><strong>Optik formdan veriye</strong><p>Yaygın optik düzenleri, desteklenen TXT ve FMT şablonlarıyla esnek değerlendirme.</p></div></li><li><span>02</span><div><strong>Veriden anlamlı sonuçlara</strong><p>Öğrenci, sınıf ve kurum bazında ayrıntılı değerlendirme.</p></div></li><li><span>03</span><div><strong>Sonuçlardan yeni hedeflere</strong><p>Kazanım bazlı öğrenci karneleri, geçmiş sınav arşivi, tekli ve toplu PDF / Excel raporları.</p></div></li></ol></section>
    <InferenceScene/><BatchScene/><section className="home-tool-links" aria-label="Öğrenci araçları"><Link href="/sinav-takvimi"><span>01 / PLANLA</span><strong>Bir sonraki denemen<br /> ne zaman?</strong><small>Sınav takvimine git ↗</small></Link><Link href="/sinav-degerlendir"><span>02 / DEĞERLENDİR</span><strong>Cevapların elinde.<br /> Karneni oluştur.</strong><small>Sınav değerlendirmeyi aç ↗</small></Link><Link href="/pdf-duzenleyici"><span>03 / HAZIRLA</span><strong>Dosyaların da<br /> sınava hazır olsun.</strong><small>PDF araçlarını keşfet ↗</small></Link></section>
    <BlogPreview/><SiteFooter/>
  </main>;
}
