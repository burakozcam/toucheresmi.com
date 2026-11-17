import Link from "next/link";
import ReleaseMark from "../release-mark";
import { SITE_VERSION } from "../../config/site";

// Keep existing bookmarks working after leaving the release candidate phase.
export default function ReleasePage() {
  return <main className="rc-page"><article className="rc-card">
    <p className="hero-tag">KURUMSAL SINAV · {SITE_VERSION}</p>
    <p className="rc-kicker">Ürün güncellemesi</p>
    <h1>Sınavdan sonraki adım daha kolay</h1>
    <p>Bu güncelleme ortak sınav ve cevap anahtarı yönetimi, sade rapor ayarları, TXT önerileri ve standart il/ilçe seçimleri sunar.</p>
    <p>Mevcut sınav değerlendirme kuralları ve kurumsal tasarım korunur. Hesap ayarlarından oturumlarınızı ve güvenilir cihazlarınızı yönetebilirsiniz.</p>
    <div className="rc-actions"><Link className="button button-navy" href="/">Ana sayfa</Link><Link className="button button-quiet" href="/panel">Panele dön</Link><ReleaseMark/></div>
  </article></main>;
}
