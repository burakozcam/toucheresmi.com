"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import ThemeToggle from "../theme-toggle";

export default function ContactPage() {
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setNotice("");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          message: form.get("message"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Mesaj gönderilemedi.");
      setNotice("Mesajınız destek ekibine gönderildi.");
      event.currentTarget.reset();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Mesaj gönderilemedi. Lütfen e-posta bağlantısını kullanın.");
    } finally {
      setSubmitting(false);
    }
  }

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
        <form className="contact-form" onSubmit={submitContact}>
          <h2>Mesaj gönderin</h2>
          <label>Ad Soyad<input name="name" required minLength={2} maxLength={120} /></label>
          <label>E-posta<input name="email" type="email" required maxLength={254} /></label>
          <label>Telefon <span>(isteğe bağlı)</span><input name="phone" type="tel" maxLength={30} /></label>
          <label>Mesajınız<textarea name="message" rows={5} required minLength={5} maxLength={3000} /></label>
          <button className="button button-navy" type="submit" disabled={submitting}>{submitting ? "Gönderiliyor..." : "Mesajı gönder"} <span>→</span></button>
          <small>Otomatik gönderim için sunucuda e-posta ayarlarının yapılandırılmış olması gerekir. Alternatif olarak <a href="mailto:destek@kurumsalsinav.com">e-posta uygulamanızdan destek@kurumsalsinav.com adresine yazabilirsiniz.</a></small>
          {notice && <p className="contact-notice" role="status">{notice}</p>}
        </form>
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
          <a className="support-email" href="mailto:destek@kurumsalsinav.com">destek@kurumsalsinav.com</a>
        </aside>
      </section>
      <footer className="contact-footer">© 2026 kurumsalsinav.com <span><Link href="/">Ana sayfa</Link></span></footer>
    </main>
  );
}
