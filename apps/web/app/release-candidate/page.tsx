import Link from "next/link";
import ReleaseMark from "../release-mark";

export default function ReleaseCandidatePage() {
  return <main className="rc-page"><article className="rc-card">
    <p className="hero-tag">KURUMSAL SINAV · v1.1.5</p>
    <h1>🚀 KURUMSAL SINAV | <span>İLK RELEASE CANDIDATE (RC)</span> 🎉</h1>
    <p>Bir fikirle başlayan yolculuğumuzda bugün önemli bir dönüm noktasına yaklaşıyoruz!</p>
    <p>Günler süren geliştirmeler, sayısız deneme, karşılaştığımız hatalar ve her seferinde bulduğumuz çözümler...</p>
    <p>Sınav yönetiminden optik değerlendirmeye, cevap anahtarlarından raporlamaya kadar birçok özelliği bir araya getiren <strong>Kurumsal Sınav</strong>, ilk Release Candidate sürümüne hazırlanıyor. 🎓💻</p>
    <p>Henüz yolun başındayız. Önümüzde uzun bir test, geliştirme ve iyileştirme süreci var.</p>
    <p>Ama bugün küçük bir kutlamayı hak ediyoruz. 🥂</p>
    <blockquote><strong>Bir zamanlar yalnızca fikirdi. Şimdi çalışan, gelişen ve geleceğe hazırlanan gerçek bir yazılım.</strong></blockquote>
    <p><strong>İlk RC sürümümüz kutlu olsun! ❤️</strong></p>
    <p className="rc-signoff"><strong>Kurumsal Sınav — Daha yeni başlıyoruz.</strong> 🚀</p>
    <div className="rc-actions"><Link className="button button-navy" href="/">Ana sayfa</Link><Link className="button button-quiet" href="/panel">Panele dön</Link><ReleaseMark/></div>
  </article></main>;
}
