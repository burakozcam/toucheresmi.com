"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import ThemeToggle from "../theme-toggle";
import BreakGame from "./break-game";
import Calendar from "./calendar";
import PublisherManagement from "./publisher-management";
import AnswerKeyManagement from "./answer-key-management";
import RegistrationRequests from "./registration-requests";

type Section = "exam" | "fmt-upload" | "fmt-edit" | "fmt-delete" | "school-add" | "school-edit" | "school-delete" | "students" | "calendar" | "break" | "rebuilder" | "pdf-tools" | "publishers" | "publisher-requests" | "answer-keys" | "system-users" | "account";
type AuthUser = { id: string; email: string; firstName: string; lastName: string; role: "SUPER_ADMIN" | "DEALER" | "SCHOOL_ADMIN" | "STUDENT" };

const pages: Record<Section, { title: string; eyebrow: string; description: string; action: string }> = {
  exam: { title: "Sınav Yükle", eyebrow: "SINAV YÖNETİMİ", description: "Yeni sınav dosyalarınızı sisteme yükleyerek değerlendirme sürecini başlatın.", action: "Sınav dosyası seç" },
  "fmt-upload": { title: "FMT Yükle", eyebrow: "FMT YÖNETİMİ", description: "Optik verilerinizin okunacağı FMT format şablonunu ekleyin.", action: "FMT dosyası seç" },
  "fmt-edit": { title: "FMT Düzenle", eyebrow: "FMT YÖNETİMİ", description: "Kayıtlı FMT şablonlarını ve alan eşlemelerini düzenleyin.", action: "Şablonları görüntüle" },
  "fmt-delete": { title: "FMT Sil", eyebrow: "FMT YÖNETİMİ", description: "Kullanılmayan format şablonlarını kontrol edin ve kaldırın.", action: "Şablonları görüntüle" },
  "school-add": { title: "Kurum Ekle", eyebrow: "KURUM YÖNETİMİ", description: "Sisteme yeni bir okul veya kurum kaydı ekleyin.", action: "Yeni kurum ekle" },
  "school-edit": { title: "Kurum Düzenle", eyebrow: "KURUM YÖNETİMİ", description: "Kayıtlı kurum bilgilerini görüntüleyip güncelleyin.", action: "Kurumları görüntüle" },
  "school-delete": { title: "Kurum Sil", eyebrow: "KURUM YÖNETİMİ", description: "Sisteminizde kayıtlı kurumları yönetin.", action: "Kurumları görüntüle" },
  students: { title: "Öğrenciler", eyebrow: "ÖĞRENCİ YÖNETİMİ", description: "Öğrenci kayıtlarını ve sınav katılımlarını görüntüleyin.", action: "Öğrencileri görüntüle" },
  calendar: { title: "Takvim", eyebrow: "TAKVİM", description: "Ayları gezin; hafta sonlarını ve resmî tatilleri görüntüleyin.", action: "Bugüne git" },
  break: { title: "Mola", eyebrow: "KISA BİR MOLA", description: "Kısa bir mola verip mini koşu oyununu oynayabilirsiniz.", action: "Oyuna başla" },
  rebuilder: { title: "Sınav Listesi Düzenleyici", eyebrow: "SINAV ARAÇLARI", description: "Öğrenci listenizi düzenleyin, derslik dağılımını planlayın ve çıktınızı indirin.", action: "Aracı aç" },
  "pdf-tools": { title: "PDF ve Excel Araçları", eyebrow: "DOSYA ARAÇLARI", description: "PDF ve Excel dosyalarını tarayıcınızda birleştirin, bölün veya dönüştürün.", action: "Aracı aç" },
  "system-users": { title: "Üyeler", eyebrow: "SİSTEM YÖNETİMİ", description: "Üyelik taleplerini ve kullanıcı hesaplarını yönetin.", action: "Üye kayıtları" },
  publishers: { title: "Yayınevleri", eyebrow: "YAYINEVİ YÖNETİMİ", description: "Sisteme kayıtlı yayınevlerini görüntüleyin ve yayınevi talebi oluşturun.", action: "Yayınevi ekle" },
  "publisher-requests": { title: "Yayınevi Talepleri", eyebrow: "ONAY SÜRECİ", description: "Yayınevi ekleme taleplerini inceleyip onaylayın veya reddedin.", action: "Talep listesi" },
  "answer-keys": { title: "Cevap Anahtarları", eyebrow: "DOSYA YÖNETİMİ", description: "Cevap anahtarı ve kazanım dosyalarını yönetin, yayımlayın ve indirilebilir halde tutun.", action: "Yeni dosya ekle" },
  account: { title: "Hesap Ayarları", eyebrow: "HESABIM", description: "Kişisel bilgilerinizi görüntüleyip güncelleyin.", action: "Bilgileri kaydet" },
};

const groups: { title: string; items: { id: Section; label: string; icon: string }[] }[] = [
  { title: "SINAV İŞLEMLERİ", items: [{ id: "exam", label: "Sınav Yükle", icon: "⇧" }] },
  { title: "FMT YÖNETİMİ", items: [{ id: "fmt-upload", label: "FMT Yükle", icon: "＋" }, { id: "fmt-edit", label: "FMT Düzenle", icon: "✎" }, { id: "fmt-delete", label: "FMT Sil", icon: "⌫" }] },
  { title: "KURUM YÖNETİMİ", items: [{ id: "school-add", label: "Kurum Ekle", icon: "＋" }, { id: "school-edit", label: "Kurum Düzenle", icon: "✎" }, { id: "school-delete", label: "Kurum Sil", icon: "⌫" }] },
  { title: "YAYINEVLERİ", items: [{ id: "publishers", label: "Yayınevleri", icon: "▣" }] },
  { title: "CEVAP ANAHTARLARI", items: [{ id: "answer-keys", label: "Cevap Anahtarları", icon: "✓" }] },
  { title: "ÖĞRENCİLER", items: [{ id: "students", label: "Öğrenciler", icon: "♙" }] },
  { title: "ARAÇLAR", items: [{ id: "calendar", label: "Takvim", icon: "▦" }, { id: "break", label: "Mola", icon: "☕" }, { id: "rebuilder", label: "Sınav Listesi", icon: "▤" }, { id: "pdf-tools", label: "PDF / Excel", icon: "▧" }] },
  { title: "SİSTEM KULLANICILARI", items: [{ id: "system-users", label: "Üye Kayıtları", icon: "♙" }] },
  { title: "HESAP", items: [{ id: "account", label: "Hesap Ayarları", icon: "⚙" }] },
];

export default function PanelPage() {
  const router = useRouter();
  const authCheckStarted = useRef(false);
  const [section, setSection] = useState<Section>("exam");
  const [authorized, setAuthorized] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [authToken, setAuthToken] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profileNotice, setProfileNotice] = useState("");
  const [logoutNotice, setLogoutNotice] = useState("");
  const rebuilderFrame = useRef<HTMLIFrameElement>(null);
  const pdfToolsFrame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (authCheckStarted.current) return;
    authCheckStarted.current = true;
    const token = window.sessionStorage.getItem("kurumsal-auth-token");
    const storedUser = window.sessionStorage.getItem("kurumsal-auth-user");
    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }

    let user: AuthUser;
    try {
      user = JSON.parse(storedUser) as AuthUser;
    } catch {
      window.sessionStorage.removeItem("kurumsal-auth-token");
      window.sessionStorage.removeItem("kurumsal-auth-user");
      router.replace("/login");
      return;
    }
    if (!user.id || !user.email || !user.firstName || !["SUPER_ADMIN", "DEALER", "SCHOOL_ADMIN", "STUDENT"].includes(user.role)) {
      window.sessionStorage.removeItem("kurumsal-auth-token");
      window.sessionStorage.removeItem("kurumsal-auth-user");
      router.replace("/login");
      return;
    }

    setAuthToken(token);
    setAuthUser(user);
    setProfile((current) => ({ ...current, firstName: user.firstName, lastName: user.lastName, email: user.email }));
    if (user.role === "SUPER_ADMIN") setSection("system-users");

    const savedProfile = window.localStorage.getItem("kurumsal-profile");
    if (savedProfile) {
      try {
        setProfile((current) => ({ ...current, ...JSON.parse(savedProfile), firstName: user.firstName, lastName: user.lastName, email: user.email }));
      } catch {
        window.localStorage.removeItem("kurumsal-profile");
      }
    }
    setAuthorized(true);
  }, [router]);

  useEffect(() => {
    function resizeToolFrame(event: MessageEvent<unknown>) {
      if (!event.data || typeof event.data !== "object") return;
      const message = event.data as { type?: string; height?: number };
      if (message.type !== "kurumsal-tool-height" || typeof message.height !== "number" || !Number.isFinite(message.height)) return;
      const frame = event.source === rebuilderFrame.current?.contentWindow
        ? rebuilderFrame.current
        : event.source === pdfToolsFrame.current?.contentWindow
          ? pdfToolsFrame.current
          : null;
      if (frame) frame.style.height = `${Math.max(560, Math.min(message.height, 20000))}px`;
    }
    window.addEventListener("message", resizeToolFrame);
    return () => window.removeEventListener("message", resizeToolFrame);
  }, []);

  function logout() {
    window.sessionStorage.removeItem("kurumsal-auth-token");
    window.sessionStorage.removeItem("kurumsal-auth-user");
    setLogoutNotice("Güvenli çıkış yaptınız. Ana sayfaya yönlendiriliyorsunuz.");
    window.setTimeout(() => router.replace("/"), 1100);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem("kurumsal-profile", JSON.stringify(profile));
    setProfileNotice("Hesap bilgileriniz bu tarayıcıda kaydedildi.");
  }

  if (!authorized) return <main className="panel-loading">Oturum kontrol ediliyor...</main>;
  const activePage = pages[section];

  return (
    <main className="dashboard">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <Link className="brand sidebar-brand" href="/panel"><span className="brand-mark">K</span><span>kurumsal<span className="brand-light">sinav.com</span></span></Link>
        <button className="sidebar-profile profile-link" onClick={() => setSection("account")}><span className="profile-avatar">{profile.firstName.slice(0, 1).toUpperCase() || "B"}</span><span><strong>{profile.firstName} {profile.lastName}</strong><small>{authUser?.role === "SUPER_ADMIN" ? "Sistem yöneticisi" : "Bayi hesabı"}</small></span><span className="online-dot" /></button>
        <nav className="side-nav" aria-label="Yönetim menüsü">
          {groups.filter((group) => group.title !== "SİSTEM KULLANICILARI" || authUser?.role === "SUPER_ADMIN").map((group) => <div className="nav-group" key={group.title}>
            <p>{group.title}</p>
            {group.items.map((item) => <button className={`nav-item ${section === item.id ? "nav-active" : ""}`} key={item.id} onClick={() => { setSection(item.id); setMenuOpen(false); }}><span>{item.icon}</span>{item.label}</button>)}
          </div>)}
        </nav>
        <div className="sidebar-bottom"><div className="support-box"><span>?</span><p><strong>Yardıma mı ihtiyacınız var?</strong><small>Destek ekibimize ulaşın.</small></p><a href="mailto:destek@kurumsalsinav.com">→</a></div><button className="logout-button" onClick={logout}><span>↪</span> Güvenli çıkış yap</button></div>
      </aside>
      <section className="dashboard-main">
        <header className="dashboard-header"><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menüyü aç">☰</button><div className="breadcrumbs">Yönetim Paneli <span>/</span> <strong>{activePage.title}</strong></div><div className="dashboard-actions"><ThemeToggle /><button className="notification-button" aria-label="Bildirimler">♧<i /></button><button className="header-avatar profile-avatar-button" aria-label="Hesap ayarlarını aç" onClick={() => setSection("account")}>{profile.firstName.slice(0, 1).toUpperCase() || "B"}</button><button className="header-logout" onClick={logout}>Çıkış Yap <span>↪</span></button></div></header>
        <div className="dashboard-content">
          <div className="welcome-strip"><div><span className="welcome-emoji">✦</span><span><strong>Hoş geldiniz, {profile.firstName}</strong><small>Sınav süreçlerinizi buradan yönetebilirsiniz.</small></span></div><span className="today-date">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date())}</span></div>
          <div className="page-title"><div><p className="hero-tag">{activePage.eyebrow}</p><h1>{activePage.title}</h1><p>{activePage.description}</p></div>{!["account", "calendar", "break", "rebuilder", "pdf-tools", "system-users"].includes(section) && <button className="button button-navy" onClick={() => document.getElementById("main-action")?.click()}><span>＋</span> {activePage.action}</button>}</div>
          {logoutNotice && <div className="logout-toast" role="status">{logoutNotice}</div>}
          {section === "account" ? <section className="account-card">
            <form className="account-form" onSubmit={saveProfile}>
              <div className="account-avatar">{profile.firstName.slice(0, 1).toUpperCase() || "B"}</div>
              <div className="account-fields">
                <label>Ad<input value={profile.firstName} onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} required maxLength={80} /></label>
                <label>Soyad<input value={profile.lastName} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} maxLength={80} /></label>
                <label>E-posta<input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} maxLength={254} /></label>
                <label>Telefon<input type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} maxLength={30} /></label>
                <button className="button button-navy" type="submit">Bilgileri kaydet</button>
                {profileNotice && <p className="profile-notice" role="status">{profileNotice}</p>}
              </div>
            </form>
          </section> : section === "calendar" ? <Calendar /> : section === "break" ? <BreakGame /> : section === "rebuilder" ? <iframe ref={rebuilderFrame} className="tool-frame rebuilder-frame" src="/rebuilder.html" title="Sınav Listesi Düzenleyici" sandbox="allow-scripts allow-downloads" referrerPolicy="no-referrer" /> : section === "pdf-tools" ? <iframe ref={pdfToolsFrame} className="tool-frame pdf-tools-frame" src="/araclar/pdf-tools.html" title="PDF ve Excel Araçları" sandbox="allow-scripts allow-downloads" referrerPolicy="no-referrer" /> : section === "system-users" && authUser?.role === "SUPER_ADMIN" ? <RegistrationRequests token={authToken} /> : section === "publishers" || section === "publisher-requests" ? <PublisherManagement token={authToken} role={authUser?.role ?? "DEALER"} /> : section === "answer-keys" ? <AnswerKeyManagement token={authToken} readOnly={authUser?.role !== "SUPER_ADMIN"} /> : <section className="dashboard-empty">
            <div className="empty-art"><div className="empty-paper"><span className="empty-paper-mark">K</span><i /><i /><i /><div className="empty-bubbles"><b /><b /><b /><b /></div></div><span className="empty-spark">✳</span><span className="empty-orbit" /></div>
            <h2>{section === "exam" ? "İlk sınavınızı yükleyin" : `${activePage.title} işlemlerine başlayın`}</h2>
            <p>{section === "exam" ? "Sınav dosyanızı seçin, değerlendirme ve raporlama sürecini başlatın." : activePage.description}</p>
            <button id="main-action" className="button button-navy" onClick={() => window.alert("Bu özellik sonraki geliştirme adımında aktif edilecek.")}><span>＋</span> {activePage.action}</button>
          </section>}
          <div className="dashboard-footnote"><span>◈</span> Optik sınav yönetiminiz için ihtiyacınız olan her şey tek panelde.</div>
        </div>
      </section>
    </main>
  );
}
