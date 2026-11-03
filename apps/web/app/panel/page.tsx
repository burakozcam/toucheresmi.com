"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import ThemeToggle from "../theme-toggle";
import BreakGame from "./break-game";
import Calendar from "./calendar";

type Section = "exam" | "fmt-upload" | "fmt-edit" | "fmt-delete" | "school-add" | "school-edit" | "school-delete" | "students" | "calendar" | "break" | "rebuilder" | "pdf-tools" | "account";

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
  account: { title: "Hesap Ayarları", eyebrow: "HESABIM", description: "Kişisel bilgilerinizi görüntüleyip güncelleyin.", action: "Bilgileri kaydet" },
};

const groups: { title: string; items: { id: Section; label: string; icon: string }[] }[] = [
  { title: "SINAV İŞLEMLERİ", items: [{ id: "exam", label: "Sınav Yükle", icon: "⇧" }] },
  { title: "FMT YÖNETİMİ", items: [{ id: "fmt-upload", label: "FMT Yükle", icon: "＋" }, { id: "fmt-edit", label: "FMT Düzenle", icon: "✎" }, { id: "fmt-delete", label: "FMT Sil", icon: "⌫" }] },
  { title: "KURUM YÖNETİMİ", items: [{ id: "school-add", label: "Kurum Ekle", icon: "＋" }, { id: "school-edit", label: "Kurum Düzenle", icon: "✎" }, { id: "school-delete", label: "Kurum Sil", icon: "⌫" }] },
  { title: "ÖĞRENCİLER", items: [{ id: "students", label: "Öğrenciler", icon: "♙" }] },
  { title: "ARAÇLAR", items: [{ id: "calendar", label: "Takvim", icon: "▦" }, { id: "break", label: "Mola", icon: "☕" }, { id: "rebuilder", label: "Sınav Listesi", icon: "▤" }, { id: "pdf-tools", label: "PDF / Excel", icon: "▧" }] },
  { title: "HESAP", items: [{ id: "account", label: "Hesap Ayarları", icon: "⚙" }] },
];

export default function PanelPage() {
  const router = useRouter();
  const authCheckStarted = useRef(false);
  const [section, setSection] = useState<Section>("exam");
  const [authorized, setAuthorized] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState({ firstName: "Burak", lastName: "", email: "", phone: "" });
  const [profileNotice, setProfileNotice] = useState("");
  const [logoutNotice, setLogoutNotice] = useState("");

  useEffect(() => {
    if (authCheckStarted.current) return;
    authCheckStarted.current = true;
    const savedProfile = window.localStorage.getItem("kurumsal-profile");
    if (savedProfile) {
      try {
        setProfile({ firstName: "Burak", lastName: "", email: "", phone: "", ...JSON.parse(savedProfile) });
      } catch {
        window.localStorage.removeItem("kurumsal-profile");
      }
    }
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type === "reload") {
      window.sessionStorage.removeItem("kurumsal-demo-session");
      router.replace("/login");
      return;
    }
    if (window.sessionStorage.getItem("kurumsal-demo-session") !== "dealer") {
      window.sessionStorage.removeItem("kurumsal-demo-session");
      router.replace("/login");
      return;
    }
    setAuthorized(true);
  }, [router]);

  function logout() {
    window.sessionStorage.removeItem("kurumsal-demo-session");
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
        <button className="sidebar-profile profile-link" onClick={() => setSection("account")}><span className="profile-avatar">{profile.firstName.slice(0, 1).toUpperCase() || "B"}</span><span><strong>{profile.firstName} {profile.lastName}</strong><small>Bayi hesabı</small></span><span className="online-dot" /></button>
        <nav className="side-nav" aria-label="Yönetim menüsü">
          {groups.map((group) => <div className="nav-group" key={group.title}>
            <p>{group.title}</p>
            {group.items.map((item) => <button className={`nav-item ${section === item.id ? "nav-active" : ""}`} key={item.id} onClick={() => { setSection(item.id); setMenuOpen(false); }}><span>{item.icon}</span>{item.label}</button>)}
          </div>)}
        </nav>
        <div className="sidebar-bottom"><div className="support-box"><span>?</span><p><strong>Yardıma mı ihtiyacınız var?</strong><small>Destek ekibimize ulaşın.</small></p><a href="mailto:destek@kurumsalsinav.com">→</a></div><button className="logout-button" onClick={logout}><span>↪</span> Güvenli çıkış yap</button></div>
      </aside>
      <section className="dashboard-main">
        <header className="dashboard-header"><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menüyü aç">☰</button><div className="breadcrumbs">Yönetim Paneli <span>/</span> <strong>{activePage.title}</strong></div><div className="dashboard-actions"><ThemeToggle /><button className="notification-button" aria-label="Bildirimler">♧<i /></button><button className="header-avatar profile-avatar-button" aria-label="Hesap ayarlarını aç" onClick={() => setSection("account")}>{profile.firstName.slice(0, 1).toUpperCase() || "B"}</button><button className="header-logout" onClick={logout}>Çıkış Yap <span>↪</span></button></div></header>
        <div className="dashboard-content">
          <div className="welcome-strip"><div><span className="welcome-emoji">✦</span><span><strong>Hoş geldiniz, Burak</strong><small>Sınav süreçlerinizi buradan yönetebilirsiniz.</small></span></div><span className="today-date">Cuma, 23 Ekim 2026</span></div>
          <div className="page-title"><div><p className="hero-tag">{activePage.eyebrow}</p><h1>{activePage.title}</h1><p>{activePage.description}</p></div>{!["account", "calendar", "break", "rebuilder", "pdf-tools"].includes(section) && <button className="button button-navy" onClick={() => document.getElementById("main-action")?.click()}><span>＋</span> {activePage.action}</button>}</div>
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
          </section> : section === "calendar" ? <Calendar /> : section === "break" ? <BreakGame /> : section === "rebuilder" ? <iframe className="tool-frame rebuilder-frame" src="/rebuilder.html" title="Sınav Listesi Düzenleyici" sandbox="allow-scripts allow-downloads" referrerPolicy="no-referrer" /> : section === "pdf-tools" ? <iframe className="tool-frame pdf-tools-frame" src="/araclar/pdf-tools.html" title="PDF ve Excel Araçları" sandbox="allow-scripts allow-downloads" referrerPolicy="no-referrer" /> : <section className="dashboard-empty">
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
