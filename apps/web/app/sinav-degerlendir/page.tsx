import type { Metadata } from "next";
import Link from "next/link";
import EvaluationTool from "./tool";
import SiteFooter from "../site-footer";
import ThemeToggle from "../theme-toggle";

export const metadata: Metadata = {
  title: "Ücretsiz Sınav Değerlendir | Excel Şablonu ve Öğrenci Karnesi",
  description: "Excel cevap anahtarı ve öğrenci cevaplarıyla sınav değerlendirin. Doğru, yanlış, boş ve netleri kontrol edin; öğrenci, şube ve toplu karne çıktısı alın.",
  alternates: { canonical: "/sinav-degerlendir" },
  openGraph: { title: "Excel ile Sınav Değerlendir", description: "Şablonu indir, cevapları yükle, karneleri hazırla.", url: "/sinav-degerlendir" },
};

export default function EvaluationPage() {
  return <main className="public-answer-page evaluation-page">
    <header className="landing-header"><Link className="brand" href="/"><span className="brand-mark">K</span><span>kurumsal<span className="brand-light">sinav.com</span></span></Link><nav className="header-actions"><Link className="header-link" href="/cevap-anahtarlari">Cevap Anahtarları</Link><ThemeToggle /></nav></header>
    <section className="answer-page-hero"><p className="hero-tag">ŞABLONDAN KARNEYE</p><h1>Sınavını değerlendir.<br /><span>Gelişimi görünür kıl.</span></h1><p>Derslerini belirle, Excel şablonunu doldur, sonuçları kontrol et. Öğrenci karneleri ve sınıf listeleri birkaç adımda hazır.</p><div className="feature-pills"><span>Ücretsiz kullanım</span><span>Üyelik gerektirmez</span><span>Dosyalar cihazında kalır</span></div></section>
    <EvaluationTool />
    <section className="evaluation-help"><h2>Excel ile sınav değerlendirme nasıl yapılır?</h2><p>Şablonun Cevap Anahtarı sayfasına her dersin doğru cevaplarını yazın. Öğrenci Cevapları sayfasında her öğrenci bir satır, her dersin cevapları tek hücredir. Örneğin 8 soru için ABCD--EA yazın; 5 ve 6. sorular boştur. İptal sorunun anahtarına X yazın; öğrenci zincirindeki soru yerini koruyun. İsterseniz kazanım kodu ve adı sütunlarını da ekleyin. Dosyayı yükleyip kontrol ettikten sonra karne oluşturun.</p><h3>Katsayı ve puan hesabı</h3><p>Net, doğru sayısından yanlış sayısının seçtiğiniz orana bölünmesiyle hesaplanır. Katsayılar ders netiyle çarpılır; geçerli soruların toplam ağırlığına bölünüp seçtiğiniz 100 veya 500 ölçeğine taşınır. Negatif puanlar 0 kabul edilir. Hazır şablonların soru sayıları ve test ağırlıkları 2026 MEB/ÖSYM kılavuzlarını esas alır. Bu yerel deneme hesabı resmî LGS/YKS puanı değildir; resmî standartlaştırma, Türkiye geneli yüzdelik dilim ve yerleştirme puanı hesaplanmaz.</p></section>
    <SiteFooter />
  </main>;
}
