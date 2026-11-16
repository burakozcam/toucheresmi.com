import PublisherLogo from "../../publisher-logo";
import AnswerPdfOptions from "../../answer-pdf-options";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { API_URL } from "../../../lib/api";
import { answerKeyPath } from "../../../lib/answer-key";
import { SITE_NAME, SITE_URL } from "../../../config/site";
import ThemeToggle from "../../theme-toggle";
import ExamCover from "../../exam-cover";
import SiteFooter from "../../site-footer";
import { cache } from "react";

type AnswerKeyDetails = {
  coverImage?:string|null;examDate?:string|null;
  id: string;
  grade: number;
  examName: string;
  publishedAt: string;
  publisher: { id: string; name: string };
  files: Array<{ id: string; category: "ANSWER_KEY" | "LEARNING_OUTCOMES"; generated?:boolean; originalFileName: string }>;
};

const getAnswerKey = cache(async (id: string): Promise<AnswerKeyDetails | null> => {
  const response = await fetch(`${API_URL}/api/answer-keys/${encodeURIComponent(id)}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Cevap anahtarı yüklenemedi (${response.status}).`);
  return response.json() as Promise<AnswerKeyDetails>;
});

function descriptionFor(item: AnswerKeyDetails) {
  return `${item.publisher.name} ${item.grade}. sınıf ${item.examName} cevap anahtarı ve mevcut kazanım dosyalarını görüntüleyip indirin.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const separator = slug.lastIndexOf("-");
  if (separator < 1) return { robots: { index: false, follow: false } };
  const item = await getAnswerKey(slug.slice(separator + 1));
  if (!item) return { title: "Cevap Anahtarı Bulunamadı", robots: { index: false, follow: false } };
  const title = `${item.publisher.name} ${item.grade}. Sınıf ${item.examName} Cevap Anahtarı`;
  const description = descriptionFor(item);
  const canonical = answerKeyPath(item);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      publishedTime: item.publishedAt,
      images: [{ url: `${canonical}/opengraph-image`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`${canonical}/opengraph-image`] },
  };
}

export default async function AnswerKeyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const separator = slug.lastIndexOf("-");
  if (separator < 1) notFound();
  const item = await getAnswerKey(slug.slice(separator + 1));
  if (!item) notFound();

  const canonicalPath = answerKeyPath(item);
  if (slug !== canonicalPath.slice(canonicalPath.lastIndexOf("/") + 1)) permanentRedirect(canonicalPath);
  let related: AnswerKeyDetails[] = [];
  try {
    const response = await fetch(`${API_URL}/api/answer-keys?publisherId=${encodeURIComponent(item.publisher.id)}&grade=${item.grade}&limit=5`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (response.ok) { const data = await response.json(); if (Array.isArray(data.items)) related = data.items.filter((entry: AnswerKeyDetails) => entry.id !== item.id).slice(0, 4); }
  } catch { /* Keep downloads available when recommendations are unavailable. */ }
  const answerFile = item.files.find(file=>file.category==="ANSWER_KEY"&&file.generated)??item.files.find(file=>file.category==="ANSWER_KEY"&&/\.pdf$/i.test(file.originalFileName))??item.files.find(file=>file.category==="ANSWER_KEY");
  const learningFile = item.files.find((file) => file.category === "LEARNING_OUTCOMES");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: `${item.publisher.name} ${item.grade}. Sınıf ${item.examName} Cevap Anahtarı`,
    description: descriptionFor(item),
    inLanguage: "tr",
    datePublished: item.publishedAt,
    learningResourceType: "Answer key",
    url: `${SITE_URL}${canonicalPath}`,
    image: `${SITE_URL}${canonicalPath}/opengraph-image`,
    isAccessibleForFree: true,
    educationalLevel: `${item.grade}. Sınıf`,
    provider: { "@type": "Organization", name: item.publisher.name },
  };

  return (
    <main className="public-answer-page answer-detail-page">
      <header className="landing-header answer-header">
        <Link className="brand" href="/" aria-label="Kurumsal Sınav ana sayfa">
          <span className="brand-mark">K</span>
          <span>kurumsal<span className="brand-light">sinav.com</span></span>
        </Link>
        <nav className="header-actions" aria-label="Ana menü">
          <Link className="header-link" href="/cevap-anahtarlari">Tüm cevap anahtarları</Link>
          <ThemeToggle/><Link className="button button-navy" href="/login">Giriş Yap</Link>
        </nav>
      </header>
      <article className="answer-detail">
        <p className="hero-tag">YAYIMLANMIŞ CEVAP ANAHTARI</p>
        {item.coverImage&&<img className="detail-cover" src={item.coverImage} alt={`${item.examName} kapağı`} width="225" height="300"/>}<h1>{item.grade}. Sınıf {item.publisher.name} {item.examName}</h1>
        <p className="answer-detail-meta">Yayın tarihi: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(item.publishedAt))}</p>
        <p className="answer-detail-description">{descriptionFor(item)}</p>
        <AnswerPdfOptions id={item.id} name={item.examName}/><div className="download-actions">
          {answerFile && <a className="button button-navy" href={`${API_URL}/api/answer-key-files/${answerFile.id}`} target="_blank" rel="noreferrer">Cevap Anahtarını İndir</a>}
          {learningFile && <a className="button button-quiet" href={`${API_URL}/api/answer-key-files/${learningFile.id}`} target="_blank" rel="noreferrer">Kazanım Dosyasını İndir</a>}
        </div>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <section className="evaluation-promo"><div><h2>Cevaplarından bir karne oluştur.</h2><p>Excel şablonunu doldur, doğru ve yanlışlarını kontrol et; öğrenci ve şube sonuçlarını al.</p></div><Link className="button button-navy" href="/sinav-degerlendir">Sınav Değerlendir →</Link></section>
      {related.length > 0 && <section className="related-exams"><div className="catalog-section-title"><h2>Aynı yayınevinden diğer denemeler</h2><Link href={`/cevap-anahtarlari?publisherId=${encodeURIComponent(item.publisher.id)}`}>Yayınevi kataloğu →</Link></div><div className="book-showcase">{related.map(exam => <Link className="showcase-book" href={answerKeyPath(exam)} key={exam.id}><ExamCover item={exam}/><strong>{exam.examName}</strong><span>{exam.grade}. Sınıf · {exam.publisher.name}</span></Link>)}</div></section>}
      <SiteFooter />
    </main>
  );
}
