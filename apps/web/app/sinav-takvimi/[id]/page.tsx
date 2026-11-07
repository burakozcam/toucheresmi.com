import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { API_URL } from "../../../lib/api";
import { scheduleTitle } from "../../../lib/schedule";
import type { ScheduleEntry } from "../../../lib/schedule";
import { answerKeyPath } from "../../../lib/answer-key";
import SiteFooter from "../../site-footer";
const get = cache(async (id: string) => { const r = await fetch(`${API_URL}/api/exam-schedule/${encodeURIComponent(id)}`, { cache: "no-store", signal: AbortSignal.timeout(8000) }); if (r.status === 404) return null; if (!r.ok) throw new Error("Sınav bilgileri yüklenemedi."); return r.json() as Promise<ScheduleEntry>; });
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> { const { id } = await params; const item = await get(id); return item ? { title: `${scheduleTitle(item)} | Sınav Takvimi`, description: `${scheduleTitle(item)} uygulama tarihi ve kapsamı.`, alternates: { canonical: `/sinav-takvimi/${id}` } } : { title: "Sınav bulunamadı", robots: { index: false } }; }
export default async function ScheduleDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const item = await get(id); if (!item) notFound();
  return <main className="public-answer-page"><header className="landing-header"><Link className="brand" href="/"><span className="brand-mark">K</span><span>kurumsalsinav.com</span></Link><Link className="header-link" href="/sinav-takvimi">← Sınav Takvimi</Link></header><article className="answer-detail"><p className="hero-tag">KURUMSAL DENEME SINAVI</p><h1>{scheduleTitle(item)}</h1><p className="answer-detail-meta">Uygulama tarihi: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(item.examDate))}</p>{item.series && <p>Seri: {item.series}</p>}<h2>Sınav kapsamı</h2><p className="schedule-scope">{item.scope}</p>{item.answerKey ? <Link className="button button-navy" href={answerKeyPath(item.answerKey)}>Eşleşen cevap anahtarına git →</Link> : <p className="field-help">Bu sınava henüz cevap anahtarı eklenmemiş.</p>}<p className="field-help">Tarih ve kapsam bilgileri yayınevi duyurularına göre yönetici tarafından güncellenir.</p></article><SiteFooter /></main>;
}
