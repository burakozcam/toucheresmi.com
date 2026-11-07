import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "../theme-toggle";
import SiteFooter from "../site-footer";
import ScheduleCalendar from "./schedule-calendar";
export const metadata: Metadata = { title: "Kurumsal Deneme Sınav Takvimi", description: "1–12. sınıf, TYT ve AYT yayınevi deneme sınavlarını aylık takvimde inceleyin. Sınav kapsamına ve eşleşen cevap anahtarına ulaşın.", alternates: { canonical: "/sinav-takvimi" }, openGraph: { title: "Kurumsal Sınav Takvimi", url: "/sinav-takvimi" } };
export default function SchedulePage() {
  return <main className="public-answer-page calendar-public-page"><header className="landing-header"><Link className="brand" href="/"><span className="brand-mark">K</span><span>kurumsal<span className="brand-light">sinav.com</span></span></Link><nav className="header-actions"><Link className="header-link" href="/cevap-anahtarlari">Cevap Anahtarları</Link><ThemeToggle /><Link className="header-link" href="/">Ana Sayfa</Link></nav></header><section className="answer-page-hero"><p className="hero-tag">YAYINEVLERİ · KURUMSAL DENEMELER</p><h1>Sınavlarını bir bakışta planla.</h1><p>Sınıfını seç, aylar arasında gezin. Aynı günün tüm yayınlarını görebilir; sınava tıklayarak kapsamını ve varsa cevap anahtarını açabilirsin.</p></section><ScheduleCalendar /><SiteFooter /></main>;
}
