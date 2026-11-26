import {AnnouncementDiscovery,HelpDiscovery,ScheduledShareDiscovery,PdfDiscovery} from './feature-discovery';
import HomeHelp from './home-help';
import StudyPlanDiscovery from "./study-plan-discovery";
import SystemArchitecture from './system-architecture';
import UiIcon from "./ui-icon";
import HomeSearch from "./home-search";
import TurkishFlag from "./turkish-flag";
import type { Metadata } from "next";
import Link from "next/link";

import {OpenEndedScene,StudentAssistantScene,LiveReport,SecurityScene,InferenceScene,AcademicProgress,BatchScene} from "./home-demos";
import ExamCover from "./exam-cover";
import { PublisherRibbon, HomeEffects } from "./home-motion";
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
  openGraph: { title: "Sınava girdin. Şimdi sıra sonuçlarda!", description: "Cevap anahtarını kontrol et, sınav sonucunu görüntüle.", url: "/" },
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
    <header className="landing-header"><Link className="brand" href="/" aria-label="Kurumsal Sınav ana sayfa"><span className="brand-mark">K</span><span>kurumsal<span className="brand-light">sinav.com</span></span></Link><nav className="header-actions" aria-label="Ana menü"><Link className="header-link" href="/cevap-anahtarlari">Cevap Anahtarları</Link><Link className="header-link" href="/sinav-takvimi">Sınav Takvimi</Link><a className="header-link" href="#kurumlar">Kurumlar İçin</a>{storeStatus?.open&&<Link className="header-link" href="/magaza">Mağaza</Link>}<ThemeToggle/><TurkishFlag/><Link className="button button-navy" href="/login">Giriş Yap <UiIcon name="arrow"/></Link></nav></header>
    <section className="landing-hero student-hero"><div className="hero-copy"><h1>Sınava girdin.<br />Şimdi sıra<br /><span>sonuçlarda!</span></h1><p className="hero-description">Cevap anahtarını kontrol et, sınav sonucunu görüntüle.</p><HomeSearch/><div className="hero-shortcuts"><Link href="/cevap-anahtarlari">Cevap Anahtarlarını Bul <span><UiIcon name="arrow"/></span></Link><Link href="/sonuclar">Sınav Sonucunu Öğren <span><UiIcon name="arrow"/></span></Link></div><p className="hero-proof">Kurumun için mi buradasın? <a href="#kurumlar">Çözümlerimizi keşfet <UiIcon name="arrow-right"/></a></p></div><div className="student-visual"><figure className="real-report-hero"><a href="/home-report.webp" target="_blank" rel="noreferrer" aria-label="Anonim örnek karneyi büyüt"><img src="/home-report.webp" width="990" height="1400" alt="Sistemin ürettiği örnek öğrenci karnesi: ders performansı, sıralamalar, cevap ve kazanım analizi" fetchPriority="high"/></a><figcaption>Gerçek karne tasarımımız · tamamı anonim örnek veriler</figcaption></figure></div></section>
    <OpenEndedScene/><StudyPlanDiscovery/><AcademicProgress/><InferenceScene/><LiveReport/><BatchScene/><SecurityScene/>
    <section className="home-exams" aria-labelledby="recent-title"><div className="home-section-top"><div><p className="hero-tag">DENEMEDEN SONRAKİ İLK DURAK</p><h2 id="recent-title">Yeni sınavlar.<br /><span>Aradığın cevaplar.</span></h2></div><Link className="text-link" href="/cevap-anahtarlari">Kütüphaneyi keşfet <UiIcon name="arrow"/></Link></div><div className="book-showcase home-books" tabIndex={0} role="region" aria-label="Son eklenen sınavlar, yatay kaydırılabilir">{items.map(item => <Link href={answerKeyPath(item)} key={item.id} className="showcase-book"><ExamCover item={item}/><span>{item.publisher.name} · {item.grade}. Sınıf</span><strong>{item.examName}</strong><em>Cevap anahtarına git <UiIcon name="arrow"/></em></Link>)}</div>{!items.length && <p className="home-empty">{keys ? "Henüz yayımlanmış sınav bulunmuyor." : "Sınav vitrini şu anda yüklenemedi. Cevap anahtarları kütüphanesinden tekrar deneyebilirsin."} <Link href="/cevap-anahtarlari">Kütüphaneyi aç <UiIcon name="arrow-right"/></Link></p>}</section>
    <PublisherRibbon publishers={publishers}/>

    <section className="institution-section" id="kurumlar"><div><p className="hero-tag">KURUMLARA ÖZEL</p><h2>Arkasında güçlü<br />bir sistem var.</h2><p>Birbiriyle koordineli çalışan değerlendirme, analiz, raporlama ve güvenlik modülleri. Karmaşık işlemler, sade bir kullanıcı deneyimi.</p><div className="hero-buttons"><Link className="button" href="/contact">Birlikte çalışalım <UiIcon name="arrow"/></Link><Link className="institution-login" href="/login">Kurum girişi <UiIcon name="arrow-right"/></Link></div></div><SystemArchitecture/></section>
    <AnnouncementDiscovery/><StudentAssistantScene/><HomeHelp/><HelpDiscovery/><ScheduledShareDiscovery/><section className="home-tool-links" aria-label="Öğrenci araçları"><Link href="/sinav-takvimi"><span>01 / PLANLA</span><strong>Bir sonraki denemen<br /> ne zaman?</strong><small>Sınav takvimine git <UiIcon name="arrow"/></small></Link><Link href="/sinav-degerlendir"><span>02 / DEĞERLENDİR</span><strong>Cevapların elinde.<br /> Karneni oluştur.</strong><small>Sınav değerlendirmeyi aç <UiIcon name="arrow"/></small></Link><PdfDiscovery/></section>
    <BlogPreview/><SiteFooter home/>
  </main>;
}
