import Link from "next/link";
import ThemeToggle from "./theme-toggle";

const answerRows = [
  ["01", "A", "B", "C", "D", "A"],
  ["02", "C", "A", "D", "B", "C"],
  ["03", "B", "D", "A", "C", "B"],
  ["04", "D", "C", "B", "A", "D"],
  ["05", "A", "B", "D", "C", "A"],
];

export default function Home() {
  return (
    <main className="landing">
      <header className="landing-header">
        <Link className="brand" href="/" aria-label="Kurumsal Sınav ana sayfa">
          <span className="brand-mark">K</span>
          <span>kurumsal<span className="brand-light">sinav.com</span></span>
        </Link>
        <nav className="header-actions" aria-label="Ana menü">
          <a className="header-link" href="#cozumler">Çözümler</a>
          <ThemeToggle />
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
            <a className="button button-quiet button-big" href="#cozumler">Platformu Keşfet <span aria-hidden="true">↓</span></a>
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
      <footer className="landing-footer"><Link className="brand" href="/"><span className="brand-mark">K</span><span>kurumsal<span className="brand-light">sinav.com</span></span></Link><span><Link href="/contact">İletişim</Link> · Ölçün. Değerlendirin. Geliştirin.</span></footer>
    </main>
  );
}
