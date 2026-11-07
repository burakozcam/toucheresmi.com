import Link from "next/link";
import { SITE_VERSION } from "../config/site";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link className="brand" href="/" aria-label="Kurumsal Sınav ana sayfa">
        <span className="brand-mark">K</span>
        <span>kurumsal<span className="brand-light">sinav.com</span></span>
      </Link>
      <p>© 2026 Kurumsal Sınav · <span className="version-badge">Versiyon {SITE_VERSION}</span></p>
      <nav aria-label="Alt menü">
        <Link href="/cevap-anahtarlari">Cevap Anahtarları</Link>
        <Link href="/sinav-degerlendir">Sınav Değerlendir</Link>
        <Link href="/sinav-takvimi">Sınav Takvimi</Link>
        <Link href="/verilerinizin-guvenligi">Verilerinizin Güvenliği</Link>
        <Link href="/pdf-duzenleyici">PDF Düzenleyici</Link>
        <Link href="/contact">İletişim</Link>
        <a href="/contact#contact-form">destek@kurumsalsinav.com</a>
      </nav>
    </footer>
  );
}
