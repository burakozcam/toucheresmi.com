import Link from "next/link";
import ReleaseMark from "../release-mark";

export default function ReleaseCandidatePage() {
  return <main className="rc-page"><article className="rc-card">
    <p className="hero-tag">KURUMSAL SINAV · v1.2.5</p>
    <p className="rc-kicker">Ürün güncellemesi</p>
    <h1>Kurumsal Sınav <span>Release Candidate</span></h1>
    <p>Kurumsal Sınav, sınav yönetimi ve optik değerlendirme süreçlerini tek yerde buluşturan ilk sürüm adayına ulaştı.</p>
    <p>Bu aşamada arayüzü sadeleştiriyor, kullanım akışlarını iyileştiriyor ve farklı cihazlardaki deneyimi gözden geçiriyoruz. Geri bildirimlerle ürünü geliştirmeye devam edeceğiz.</p>
    <blockquote>Bir zamanlar yalnızca fikirdi. Şimdi çalışan, gelişen ve geleceğe hazırlanan gerçek bir yazılım.</blockquote>
    <p className="rc-signoff"><strong>Kurumsal Sınav — Daha yeni başlıyoruz.</strong></p>
    <div className="rc-actions"><Link className="button button-navy" href="/">Ana sayfa</Link><Link className="button button-quiet" href="/panel">Panele dön</Link><ReleaseMark/></div>
  </article></main>;
}
