"use client";

import Link from "next/link";
import ThemeToggle from "../theme-toggle";
import ContactForm from "../contact-form";
import SiteFooter from "../site-footer";

export default function ContactPage() {
  return (
    <main className="contact-page">
      <header className="contact-header">
        <Link className="brand" href="/"><span className="brand-mark">K</span><span>kurumsal<span className="brand-light">sinav.com</span></span></Link>
        <div className="header-actions"><ThemeToggle /><Link className="header-link" href="/">← Ana sayfa</Link></div>
      </header>
      <section className="contact-intro">
        <p className="hero-tag">BİZİMLE İLETİŞİME GEÇİN</p>
        <h1>Size nasıl yardımcı<br /><span>olabiliriz?</span></h1>
        <p>Sorularınız, önerileriniz veya destek talepleriniz için bize mesaj gönderin.</p>
      </section>
      <section className="contact-grid">
        <ContactForm />
        <aside className="contact-location">
          <div className="location-heading"><span className="solution-icon">⌖</span><div><h2>İstanbul, Maltepe</h2><p>Kurumsal Sınav · İstanbul</p></div></div>
          <iframe
            title="İstanbul Maltepe haritası"
            src="https://maps.google.com/maps?q=Maltepe%2C%20%C4%B0stanbul%2C%20T%C3%BCrkiye&t=&z=13&ie=UTF8&iwloc=&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <a className="map-link" href="https://www.google.com/maps/search/?api=1&query=Maltepe%2C+Istanbul%2C+Turkey" target="_blank" rel="noreferrer">Google Haritalar'da aç ↗</a>
          <a className="support-email" href="/contact#contact-form">destek@kurumsalsinav.com</a>
        </aside>
      </section>
      <SiteFooter />
    </main>
  );
}
