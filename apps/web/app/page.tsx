"use client";

import PublisherLogo from "./publisher-logo";
import AnswerPdfOptions from "./answer-pdf-options";
import Link from "next/link";
import BlogPreview from "./blog-preview";
import { useEffect, useState } from "react";
import ThemeToggle from "./theme-toggle";
import SiteFooter from "./site-footer";
import ContactForm from "./contact-form";
import LgsCountdown from "./lgs-countdown";
import { answerKeyPath } from "../lib/answer-key";
import { API_URL } from "../lib/api";

const answerRows = [
  ["01", "A", "B", "C", "D", "A"],
  ["02", "C", "A", "D", "B", "C"],
  ["03", "B", "D", "A", "C", "B"],
  ["04", "D", "C", "B", "A", "D"],
  ["05", "A", "B", "D", "C", "A"],
];

type PreviewAnswerKey = {
  id: string;
  examName: string;
  grade: number;
  publisher: { id: string; name: string };
  publishedAt: string;
  files: Array<{ id: string; category: "ANSWER_KEY" | "LEARNING_OUTCOMES" }>;
};

export default function Home() {
  const [previewItems, setPreviewItems] = useState<PreviewAnswerKey[]>([]);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    async function loadPreview() {
      try {
        const response = await fetch(`${API_URL}/api/answer-keys?limit=3`);
        const result = await response.json() as { items?: PreviewAnswerKey[]; error?: string };
        if (response.ok && Array.isArray(result.items)) {
          setPreviewItems(result.items);
        } else {
          setPreviewError(result.error ?? "Cevap anahtarı önizlemesi yüklenemedi.");
        }
      } catch (error) {
        setPreviewError(error instanceof TypeError
          ? "Cevap anahtarı servisine ulaşılamadı. Lütfen daha sonra tekrar deneyin."
          : error instanceof Error ? error.message : "Cevap anahtarı önizlemesi yüklenemedi.");
      }
    }
    void loadPreview();
  }, []);

  return (
    <main className="landing"><a className="whatsapp-float" href="https://wa.me/905323872074" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp üzerinden bize yazın"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M21 11.5a9 9 0 0 1-13.4 7.9L3 21l1.6-4.6A9 9 0 1 1 21 11.5Z"/><path d="M8 7c0 5 4 9 9 9l1-3-3-1-1 1-3-3 1-1-1-3Z"/></svg></a>
      <header className="landing-header">
        <Link className="brand" href="/" aria-label="Kurumsal Sınav ana sayfa">
          <span className="brand-mark">K</span>
          <span>kurumsal<span className="brand-light">sinav.com</span></span>
        </Link>
        <nav className="header-actions" aria-label="Ana menü">
          <a className="header-link" href="#cozumler">Çözümler</a>
          <Link className="header-link flowing-gradient header-gradient-button" href="/cevap-anahtarlari">Cevap Anahtarları</Link>
          <Link className="header-link calendar-gradient-link" href="/sinav-takvimi">Sınav Takvimi</Link><Link className="header-link" href="/sinav-degerlendir">Sınav Değerlendir</Link>
          <Link className="header-link" href="/blog">Blog</Link><ThemeToggle />
          <Link className="button button-navy" href="/login">Giriş Yap <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <div className="hero-tag"><span className="tag-dot" /> SINAV SÜREÇLERİNDE YENİ NESİL DENEYİM</div>
          <h1>Sınavlarınızda<br />başarıyı <span>ölçün.</span></h1>
          <p className="hero-description">Optik formlardan anlamlı sonuçlara. Sınav değerlendirme, öğrenci analizi ve raporlama süreçleriniz tek bir platformda.</p>
          <div className="hero-buttons">
            <Link className="button button-navy button-big" href="/login">Hemen Giriş Yap <span aria-hidden="true">→</span></Link>
            <Link className="button button-quiet button-big flowing-gradient" href="/cevap-anahtarlari">Cevap Anahtarları <span aria-hidden="true">→</span></Link>
          </div>
          <div className="hero-proof"><span className="proof-check">✓</span> Kurumlar için güvenilir sınav yönetimi</div>
        </div>

        <div className="hero-visual" aria-label="Optik form ve sınav kağıtları illüstrasyonu">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="float-label float-label-top"><span className="label-icon">✓</span><span><strong>Optik okuma</strong><small>Hızlı ve güvenilir</small></span></div>
          <div className="paper paper-back"><div className="paper-head"><span>ÖĞRENCİ BİLGİLERİ</span><span className="paper-line" /></div><div className="paper-lines"><i /><i /><i /></div></div>
          <div className="paper paper-main">
            <div className="form-brand"><span className="mini-brand">K</span><span>KURUMSAL SINAV<small>CEVAP FORMU</small></span><span className="form-number">01</span></div>
            <div className="student-fields"><span>ÖĞRENCİ NO <i /></span><span>ADI SOYADI <i /></span></div>
            <div className="answer-table">
              <div className="answer-head"><b>SORU</b><b>A</b><b>B</b><b>C</b><b>D</b><b>E</b></div>
              {answerRows.map((row) => <div className="answer-row" key={row[0]}><b>{row[0]}</b>{row.slice(1).map((answer, index) => <span className={answer === "C" && row[0] === "03" ? "bubble filled" : "bubble"} key={`${row[0]}-${index}`}>{answer}</span>)}</div>)}
            </div>
            <div className="paper-footer"><span>OPTİK FORM · A SERİSİ</span><span className="barcode">▥▥▥▥▥▥▥</span></div>
          </div>
          <div className="float-label float-label-bottom"><span className="chart-icon">↗</span><span><strong>Sonuçlar hazır</strong><small>Detaylı analiz raporu</small></span></div>
          <span className="visual-spark spark-one">✳</span><span className="visual-spark spark-two">✳</span>
        </div>
      </section>

      <section className="metrics" aria-label="Platform özellikleri">
        <div><strong>Hızlı</strong><span>optik değerlendirme</span></div>
        <i />
        <div><strong>Kolay</strong><span>sınav yönetimi</span></div>
        <i />
        <div><strong>Anlaşılır</strong><span>başarı raporları</span></div>
      </section>

      <section className="solutions" id="cozumler">
        <div className="section-heading"><p className="hero-tag">KURUMUNUZ İÇİN TASARLANDI</p><h2>Sınav sürecinin her adımı,<br /><span>kontrolünüz altında.</span></h2></div>
        <div className="solution-cards">
          <article><span className="solution-icon">▤</span><h3>Optik okuma</h3><p>Optik form verilerinizi hızlıca işleyin, sınav sonuçlarına zahmetsizce ulaşın.</p></article>
          <article><span className="solution-icon">⌘</span><h3>Esnek sınav yönetimi</h3><p>Sınavlarınızı, cevap anahtarlarınızı ve kurum bilgilerinizi tek yerden yönetin.</p></article>
          <article><span className="solution-icon">▥</span><h3>Detaylı raporlama</h3><p>Öğrenci ve sınıf bazlı analizlerle performansı kolayca değerlendirin.</p></article>
        </div>
      </section>

      <section className="answer-key-preview" aria-labelledby="answer-key-preview-title">
        <div className="section-heading preview-heading">
          <p className="hero-tag">CEVAP ANAHTARLARI</p>
          <h2 id="answer-key-preview-title">Son eklenen denemeler</h2>
        </div>
        <div className="preview-grid">
          {previewError ? (
            <p className="notice error" role="alert">{previewError}</p>
          ) : previewItems.length === 0 ? (
            <p className="empty-state">Henüz yayımlanmış cevap anahtarı bulunmuyor.</p>
          ) : (
            previewItems.map((item) => (
              <article className="answer-key-card" key={item.id}>
                <div className="answer-key-header">
                  <span className="badge">{item.grade}. Sınıf</span>
                  <span className="status-dot">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(item.publishedAt))}</span>
                </div>
                <PublisherLogo id={item.publisher.id} name={item.publisher.name}/><h3><Link href={answerKeyPath(item)}>{item.publisher.name}</Link></h3>
                <p className="exam-name">{item.examName}</p>
                <AnswerPdfOptions id={item.id} name={item.examName}/><div className="download-actions">
                  {item.files.some((file) => file.category === "ANSWER_KEY") && (
                    <Link className="button button-navy" href={answerKeyPath(item)}>İndir</Link>
                  )}
                  {item.files.some((file) => file.category === "LEARNING_OUTCOMES") && (
                    <Link className="button button-quiet" href={answerKeyPath(item)}>Kazanım</Link>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
        <div className="preview-footer">
          <Link className="button button-navy" href="/cevap-anahtarlari">Tüm cevap anahtarlarını gör</Link>
        </div>
      </section>

      <section className="evaluation-promo" aria-labelledby="evaluate-title">
        <div><p className="hero-tag">EXCEL'DEN ÖĞRENCİ KARNESİNE</p><h2 id="evaluate-title">Cevaplar elinde.<br /><span>Sonuçlar bir adım ötede.</span></h2><p>Derslerini seç, şablonu doldur, öğrenci ve şube karnelerini hazırla. Üyelik gerektirmeden, dosyaların cihazında kalarak.</p></div>
        <Link className="button button-navy" href="/sinav-degerlendir">Sınav Değerlendir <span>→</span></Link>
      </section>
      <section className="answer-request-section" aria-labelledby="answer-request-title"><div className="section-heading"><p className="hero-tag">BİRLİKTE TAMAMLAYALIM</p><h2 id="answer-request-title">Aradığın cevap<br /><span>anahtarı burada yok mu?</span></h2><p>Yayınevi ve deneme bilgilerini gönder; ekleme talebini inceleyelim.</p></div><ContactForm purpose="answer-key" /></section>
      <section className="evaluation-promo schedule-promo"><div><p className="hero-tag">YAYINEVLERİ · KURUMSAL SINAVLAR</p><h2>Sınav tarihlerin tek takvimde.</h2><p>Sınıfını seç, yayınevlerinin denemelerini ay ay gör. Kapsam ve cevap anahtarları sınavın detayında.</p></div><Link className="button button-quiet calendar-gradient-button" href="/sinav-takvimi">Sınav Takvimi →</Link></section>
      <LgsCountdown />

      <section id="contact-section" className="home-contact" aria-labelledby="home-contact-title">
        <div className="section-heading">
          <p className="hero-tag">İLETİŞİM</p>
          <h2 id="home-contact-title">Size nasıl yardımcı<br /><span>olabiliriz?</span></h2>
        </div>
        <ContactForm showBrand />
      </section>

      <BlogPreview/><SiteFooter />
    </main>
  );
}
