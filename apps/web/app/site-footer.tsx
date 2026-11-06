import Link from "next/link";
import { SITE_VERSION } from "../config/site";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link className="brand" href="/" aria-label="Kurumsal Sınav ana sayfa">
        <span className="brand-mark">K</span>
        <span>kurumsal<span className="brand-light">sinav.com</span></span>
      </Link>
      <p>© 2026 Kurumsal Sınav · {SITE_VERSION}</p>
      <nav aria-label="Alt menü">
        <Link href="/contact">İletişim</Link>
        <a href="mailto:destek@kurumsalsinav.com">destek@kurumsalsinav.com</a>
      </nav>
    </footer>
  );
}
