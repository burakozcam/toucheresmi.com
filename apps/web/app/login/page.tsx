"use client";
import UiIcon from "../ui-icon";
import HumanVerification from "../human-verification";
import ReleaseMark from "../release-mark";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import ThemeToggle from "../theme-toggle";
import { API_URL } from "../../lib/api";

const loginTypes = [
  { id: "dealer", title: "Bayi Girişi", description: "Bayi hesabınızla giriş yapın", available: true, icon: "⌂" },
  { id: "admin", title: "Yönetici Girişi", description: "Sistem yönetici hesabınızla giriş yapın", available: true, icon: "⚙" },
  { id: "institution", title: "Kurum Girişi", description: "Okul veya kurum hesabınızla giriş yapın", available: false, icon: "▦" },
  { id: "student", title: "Öğrenci Girişi", description: "Sınav sonuçlarınıza ulaşın", available: true, icon: "♙" },
  { id: "parent", title: "Veli Girişi", description: "Çocuğunuzun sonuçlarına ulaşın", available: true, icon: "♧" },
] as const;

type LoginType = (typeof loginTypes)[number]["id"];

export default function LoginPage() {
  const [humanToken,setHumanToken]=useState("");
  const [attempt,setAttempt]=useState(0);
  const [selectedType, setSelectedType] = useState<LoginType>("dealer");
  const [registering, setRegistering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const homeHref = "/";

  useEffect(()=>{
    const params=new URLSearchParams(location.search);const type=params.get("type")??params.get("role");
    if(["student","parent","STUDENT","PARENT"].includes(type??"")){location.replace("/sonuclar#ogrenci-girisi");return;}
    if(type==="admin")setSelectedType("admin");
    const token=sessionStorage.getItem("kurumsal-auth-token");
    if(!token)return;
    const controller=new AbortController();
    void fetch(`${API_URL}/api/account`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:controller.signal}).then(async r=>{
      if(r.status===401){sessionStorage.removeItem("kurumsal-auth-token");sessionStorage.removeItem("kurumsal-auth-user");return;}
      if(!r.ok)return;
      const user=await r.json();sessionStorage.setItem("kurumsal-auth-user",JSON.stringify(user));
      location.replace(["STUDENT","PARENT"].includes(user.role)?"/sonuclarim":"/panel");
    }).catch(()=>{});
    return()=>controller.abort();
  },[]);

  function selectType(type: LoginType, available: boolean) {
    setSelectedType(type);
    setMessage(available ? "" : "Bu giriş yöntemi henüz aktif değil. Lütfen sistem yöneticisine başvurun.");
    setSuccess(false);
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    setSubmitting(true);
    if (!loginTypes.find(t=>t.id===selectedType)?.available) { setMessage("Bu giriş yöntemi henüz aktif değil."); setSubmitting(false);setHumanToken("");setAttempt(n=>n+1); return; }

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          humanToken,
          email: form.get("email"),
          password: form.get("password"),
          role: selectedType === "admin" ? "SUPER_ADMIN" : selectedType === "student" ? "STUDENT" : selectedType === "parent" ? "PARENT" : "DEALER",
        }),
      });
      const result = await response.json() as {
        error?: string;
        token?: string;
        user?: { id: string; email: string; firstName: string; lastName: string; role: string };
      };
      if (!response.ok || !result.token || !result.user) {
        setMessage(result.error ?? "Giriş yapılamadı. Bilgilerinizi kontrol edip tekrar deneyin.");
        setSubmitting(false);setHumanToken("");setAttempt(n=>n+1);
        return;
      }
      window.sessionStorage.setItem("kurumsal-auth-token", result.token);
      window.sessionStorage.setItem("kurumsal-auth-user", JSON.stringify(result.user));
      setSuccess(true);
      setMessage("Giriş başarılı. Yönetim paneline yönlendiriliyorsunuz...");
      window.setTimeout(() => window.location.assign(result.user!.role === "STUDENT" || result.user!.role === "PARENT" ? "/sonuclarim" : "/panel"), 650);
    } catch {
      setMessage("Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin.");
      setSubmitting(false);setHumanToken("");setAttempt(n=>n+1);
    }
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    setSubmitting(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          phone: form.get("phone"),
          humanToken,
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Üyelik talebi gönderilemedi. Bilgilerinizi kontrol edin.");
        setSubmitting(false);setHumanToken("");setAttempt(n=>n+1);
        return;
      }
      setSuccess(true);
      setMessage(result.message ?? "Üyelik talebiniz yönetici onayına gönderildi.");
      formElement.reset();
    } catch {
      setMessage("Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin.");
    } finally {
      setSubmitting(false);setHumanToken("");setAttempt(n=>n+1);
    }
  }

  return (
    <main className="auth-page login-page">
      <div className="login-ambient" aria-hidden="true"><span className="login-ambient-one" /><span className="login-ambient-two" /><span className="login-ambient-three" /></div>
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
          <p className="hero-tag">{registering ? "YENİ HESAP" : "HOŞ GELDİNİZ"}</p>
          <h2>{registering ? "Üyelik talebi oluşturun" : "Hesabınıza giriş yapın"}</h2>
          <p className="login-subtitle">{registering ? "Bilgileriniz yönetici onayına gönderilir." : "Devam etmek için giriş türünüzü seçin."}</p>
          {!registering && <div className="login-types">
            {loginTypes.filter(t=>!["admin","student","parent"].includes(t.id)).map((type) => <button className={`login-type ${selectedType === type.id ? "active" : ""} ${!type.available ? "unavailable" : ""}`} key={type.id} onClick={() => selectType(type.id, type.available)} type="button">
              <span className="login-type-icon"><UiIcon name={type.id==="dealer"?"book":type.id==="admin"?"settings":type.id==="institution"?"school":"users"}/></span>
              <span className="login-type-copy"><strong>{type.title}</strong><small>{type.description}</small></span>
              <span className="login-type-arrow">{selectedType === type.id ? "●" : "○"}</span>
            </button>)}
          </div>}
          {registering ? <form className="login-form registration-form" onSubmit={submitRegistration}>
            <label>Ad<div className="input-wrap"><input name="firstName" autoComplete="given-name" maxLength={80} required /></div></label>
            <label>Soyad<div className="input-wrap"><input name="lastName" autoComplete="family-name" maxLength={80} required /></div></label>
            <label>Telefon<div className="input-wrap"><input name="phone" type="tel" autoComplete="tel" minLength={7} maxLength={30} required /></div></label>
            <label>E-posta<div className="input-wrap"><input name="email" type="email" autoComplete="email" maxLength={254} required /></div></label>
            <label>Şifre <small>(en az 12 karakter)</small><div className="input-wrap"><input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /></div></label>
            <HumanVerification key={attempt} action={registering?"register":"login"} onToken={setHumanToken}/><button className="button button-navy login-submit" type="submit" disabled={submitting}>{submitting ? "Gönderiliyor..." : "Üyelik talebi gönder"} <span>→</span></button>
          </form> : selectedType === "admin" ? null : selectedType !== "institution" ? <form className="login-form" onSubmit={submitLogin}>
            <label>E-posta<div className="input-wrap"><span>✉</span><input name="email" type="email" autoComplete="username" placeholder="E-posta adresiniz" required /></div></label>
            <label>Şifre<div className="input-wrap"><span>▣</span><input name="password" type="password" autoComplete="current-password" placeholder="Şifrenizi girin" required /></div></label>
            <HumanVerification key={attempt} action={registering?"register":"login"} onToken={setHumanToken}/><button className="button button-navy login-submit" type="submit" disabled={submitting}>{submitting ? "Giriş yapılıyor..." : "Giriş Yap"} <span>→</span></button>
          </form> : <div className="inactive-panel"><span>i</span><p>Bu giriş türü şu anda kullanıma kapalı. Erişim için sistem yöneticisine başvurun.</p></div>}
          {message && <p className={`login-message ${success ? "message-success" : "message-error"}`} role="status">{success ? "✓" : "!"} {message}</p>}
          <p className="field-help">Öğrenci ve veli hesaplarını kurumunuzun bayisi oluşturur; ilk şifrenizi verilen davet bağlantısından belirleyin.</p>
          <p className="login-help">{registering ? "Zaten hesabınız var?" : "Üye olmak mı istiyorsunuz?"} <button type="button" className="auth-switch" onClick={() => { setRegistering(!registering); setMessage(""); setSuccess(false); }}>{registering ? "Giriş yapın" : "Üye ol"}</button></p>
          <p className="login-help"><Link href="/sonuclar#ogrenci-girisi">Öğrenci ve veli girişi → Sonuçlar</Link></p>
          {!registering && <p className="login-help">Girişle ilgili desteğe mi ihtiyacınız var? <Link href="/contact#contact-form">Bize ulaşın</Link></p>}
          <div className="admin-login-area"><button type="button" className="button button-quiet" onClick={()=>{setRegistering(false);selectType("admin",true);}}>⚙ Yönetici Girişi</button><p className="field-help">Yalnızca sistem yöneticileri içindir.</p>{selectedType==="admin"&&!registering&&<form className="login-form" onSubmit={submitLogin}>
            <label>E-posta<div className="input-wrap"><span>✉</span><input name="email" type="email" autoComplete="username" placeholder="E-posta adresiniz" required /></div></label>
            <label>Şifre<div className="input-wrap"><span>▣</span><input name="password" type="password" autoComplete="current-password" placeholder="Şifrenizi girin" required /></div></label>
            <HumanVerification key={attempt} action={registering?"register":"login"} onToken={setHumanToken}/><button className="button button-navy login-submit" type="submit" disabled={submitting}>{submitting ? "Giriş yapılıyor..." : "Giriş Yap"} <span>→</span></button>
          </form>}</div>
        </section>
      </section>
      <footer className="auth-footer">© 2026 kurumsalsinav.com · <ReleaseMark/> <span>Ölçün. Değerlendirin. Geliştirin.</span></footer>
    </main>
  );
}
