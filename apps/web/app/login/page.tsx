"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import ThemeToggle from "../theme-toggle";

const loginTypes = [
  { id: "dealer", title: "Bayi Girişi", description: "Bayi hesabınızla giriş yapın", available: true, icon: "⌂" },
  { id: "institution", title: "Kurum Girişi", description: "Okul veya kurum hesabınızla giriş yapın", available: false, icon: "▦" },
  { id: "student", title: "Öğrenci Girişi", description: "Sınav sonuçlarınıza ulaşın", available: false, icon: "♙" },
] as const;

type LoginType = (typeof loginTypes)[number]["id"];

export default function LoginPage() {
  const [selectedType, setSelectedType] = useState<LoginType>("dealer");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [homeHref, setHomeHref] = useState("/");

  useEffect(() => {
    if (window.sessionStorage.getItem("kurumsal-demo-session") === "dealer") {
      setHomeHref("/panel");
    }
  }, []);

  function selectType(type: LoginType, available: boolean) {
    setSelectedType(type);
    setMessage(available ? "" : "Bu giriş yöntemi henüz aktif değil. Lütfen sistem yöneticisine başvurun.");
    setSuccess(false);
  }

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    window.sessionStorage.removeItem("kurumsal-demo-session");
    if (selectedType !== "dealer") {
      setMessage("Bu giriş yöntemi henüz aktif değil. Lütfen sistem yöneticisine başvurun.");
      return;
    }

    const form = new FormData(event.currentTarget);
    if (form.get("username") === "burak" && form.get("password") === "burak") {
      window.sessionStorage.setItem("kurumsal-demo-session", "dealer");
      setSuccess(true);
      setMessage("Giriş başarılı. Yönetim paneline yönlendiriliyorsunuz...");
      window.setTimeout(() => window.location.assign("/panel"), 650);
      return;
    }

    setMessage("Kullanıcı adı veya şifre yanlış.");
  }

  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link className="brand" href={homeHref}><span className="brand-mark">K</span><span>kurumsal<span className="brand-light">sinav.com</span></span></Link>
        <div className="header-actions"><ThemeToggle /><Link className="header-link" href="/">← Ana sayfa</Link></div>
      </header>
      <section className="auth-layout">
        <div className="auth-aside">
          <div className="auth-aside-icon">K</div>
          <p className="hero-tag">KURUMSAL SINAV PLATFORMU</p>
          <h1>Tek yerden yönetin,<br /><span>güvenle değerlendirin.</span></h1>
          <p>Optik sınav süreçlerinize devam etmek için hesabınızla giriş yapın.</p>
          <div className="aside-decoration"><span>✓</span> Güvenli oturum <i /> <span>▤</span> Kolay yönetim</div>
        </div>
        <section className="login-card">
          <p className="hero-tag">HOŞ GELDİNİZ</p>
          <h2>Hesabınıza giriş yapın</h2>
          <p className="login-subtitle">Devam etmek için giriş türünüzü seçin.</p>
          <div className="login-types">
            {loginTypes.map((type) => <button className={`login-type ${selectedType === type.id ? "active" : ""} ${!type.available ? "unavailable" : ""}`} key={type.id} onClick={() => selectType(type.id, type.available)} type="button">
              <span className="login-type-icon">{type.icon}</span>
              <span className="login-type-copy"><strong>{type.title}</strong><small>{type.description}</small></span>
              <span className="login-type-arrow">{selectedType === type.id ? "●" : "○"}</span>
            </button>)}
          </div>
          {selectedType === "dealer" ? <form className="login-form" onSubmit={submitLogin}>
            <label>Kullanıcı adı<div className="input-wrap"><span>♙</span><input name="username" autoComplete="username" placeholder="Kullanıcı adınızı girin" required /></div></label>
            <label>Şifre<div className="input-wrap"><span>▣</span><input name="password" type="password" autoComplete="current-password" placeholder="Şifrenizi girin" required /></div></label>
            <button className="button button-navy login-submit" type="submit">Giriş Yap <span>→</span></button>
          </form> : <div className="inactive-panel"><span>i</span><p>Bu giriş türü şu anda kullanıma kapalı. Erişim için sistem yöneticisine başvurun.</p></div>}
          {message && <p className={`login-message ${success ? "message-success" : "message-error"}`} role="status">{success ? "✓" : "!"} {message}</p>}
          <p className="login-help">Girişle ilgili desteğe mi ihtiyacınız var? <a href="mailto:destek@kurumsalsinav.com">Bize ulaşın</a></p>
        </section>
      </section>
      <footer className="auth-footer">© 2026 kurumsalsinav.com <span>Ölçün. Değerlendirin. Geliştirin.</span></footer>
    </main>
  );
}
