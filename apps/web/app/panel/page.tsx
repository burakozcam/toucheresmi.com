"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import ThemeToggle from "../theme-toggle";
import BreakGame from "./break-game";
import BlockGame from "./block-game";
import PasswordSetup from "./password-setup";
import PdfEditor from "../pdf-duzenleyici/editor";
import ScheduleManagement from "./schedule-management";
import Calendar from "./calendar";
import PublisherManagement from "./publisher-management";
import AnswerKeyManagement from "./answer-key-management";
import RegistrationRequests from "./registration-requests";
import SchoolManagement from "./school-management";
import ExamManagement from "./exam-management";
import MotivationBanner from "./motivation-banner";
import ContactInbox from "./contact-inbox";
import AuditLogManagement from "./audit-log-management";
import { API_URL } from "../../lib/api";

type Section = "exam" | "fmt-upload" | "fmt-edit" | "fmt-delete" | "school-add" | "school-edit" | "school-delete" | "students" | "calendar" | "bird" | "snake" | "blocks" | "exam-schedule" | "rebuilder" | "pdf-tools" | "publishers" | "publisher-requests" | "answer-keys" | "system-users" | "contact-inbox" | "audit-logs" | "account";
type AuthUser = { id: string; email: string; firstName: string; lastName: string; phone?: string | null; mustChangePassword?: boolean; role: "SUPER_ADMIN" | "DEALER" | "SCHOOL_ADMIN" | "STUDENT" };

const pages: Record<Section, { title: string; eyebrow: string; description: string; action: string }> = {
  exam: { title: "Sınav Yükle", eyebrow: "SINAV YÖNETİMİ", description: "Yeni sınav dosyalarınızı sisteme yükleyerek değerlendirme sürecini başlatın.", action: "Sınav dosyası seç" },
  "fmt-upload": { title: "FMT Yükle", eyebrow: "FMT YÖNETİMİ", description: "Optik verilerinizin okunacağı FMT format şablonunu ekleyin.", action: "FMT dosyası seç" },
  "fmt-edit": { title: "FMT Düzenle", eyebrow: "FMT YÖNETİMİ", description: "Kayıtlı FMT şablonlarını ve alan eşlemelerini düzenleyin.", action: "Şablonları görüntüle" },
  "fmt-delete": { title: "FMT Sil", eyebrow: "FMT YÖNETİMİ", description: "Kullanılmayan format şablonlarını kontrol edin ve kaldırın.", action: "Şablonları görüntüle" },
  "school-add": { title: "Kurum Ekle", eyebrow: "KURUM YÖNETİMİ", description: "Sisteme yeni bir okul veya kurum kaydı ekleyin.", action: "Yeni kurum ekle" },
  "school-edit": { title: "Kurum Düzenle", eyebrow: "KURUM YÖNETİMİ", description: "Kayıtlı kurum bilgilerini görüntüleyip güncelleyin.", action: "Kurumları görüntüle" },
  "school-delete": { title: "Kurum Durumu", eyebrow: "KURUM YÖNETİMİ", description: "İlişkili sınav ve değerlendirmeler korunarak kurumları pasife alın veya yeniden aktifleştirin.", action: "Kurumları görüntüle" },
  students: { title: "Öğrenciler", eyebrow: "ÖĞRENCİ YÖNETİMİ", description: "Öğrenci kayıtlarını ve sınav katılımlarını görüntüleyin.", action: "Öğrencileri görüntüle" },
  calendar: { title: "Takvim", eyebrow: "TAKVİM", description: "Ayları gezin; hafta sonlarını ve resmî tatilleri görüntüleyin.", action: "Bugüne git" },
  bird: { title: "K ile Uçma Zamanı", eyebrow: "K ARCADE", description: "K logomuzla kulelerin arasından uç, kendi rekorunu geç.", action: "Oyuna başla" },
  blocks: { title: "Blok Zamanı", eyebrow: "K ARCADE", description: "Parçaları yerleştir, satırları tamamla.", action: "Başlat" },
  snake: { title: "Kıvrıla Kıvrıla K", eyebrow: "K ARCADE", description: "K ile izini büyüt, kıvrımları takip et.", action: "Oyuna başla" },
  "exam-schedule": { title: "Sınav Takvimi", eyebrow: "KURUMSAL SINAVLAR", description: "Yayınevlerinin sınav tarihlerini Excel ile ekleyin, düzenleyin ve cevap anahtarlarıyla eşleştirin.", action: "Takvimi yönet" },
  rebuilder: { title: "Sınav Listesi Düzenleyici", eyebrow: "SINAV ARAÇLARI", description: "Öğrenci listenizi düzenleyin, derslik dağılımını planlayın ve çıktınızı indirin.", action: "Aracı aç" },
  "pdf-tools": { title: "PDF Düzenleyici", eyebrow: "DOSYA ARAÇLARI", description: "PDF ve Excel dosyalarını tarayıcınızda birleştirin, bölün veya dönüştürün.", action: "Aracı aç" },
  publishers: { title: "Yayınevleri", eyebrow: "YAYINEVİ YÖNETİMİ", description: "Sisteme kayıtlı yayınevlerini görüntüleyin ve yayınevi talebi oluşturun.", action: "Yayınevi ekle" },
  "publisher-requests": { title: "Yayınevi Talepleri", eyebrow: "ONAY SÜRECİ", description: "Yayınevi ekleme taleplerini inceleyip onaylayın veya reddedin.", action: "Talep listesi" },
  "answer-keys": { title: "Cevap Anahtarları", eyebrow: "DOSYA YÖNETİMİ", description: "Cevap anahtarı ve kazanım dosyalarını yönetin, yayımlayın ve indirilebilir halde tutun.", action: "Yeni dosya ekle" },
  "system-users": { title: "Üyeler", eyebrow: "SİSTEM YÖNETİMİ", description: "Üyelik taleplerini ve kullanıcı hesaplarını yönetin.", action: "Üye kayıtları" },
  "contact-inbox": { title: "Gelen Kutusu", eyebrow: "İLETİŞİM", description: "İletişim formundan gelen mesajları inceleyin ve okundu durumunu yönetin.", action: "Gelen kutusu" },
  "audit-logs": { title: "İşlem Kayıtları", eyebrow: "SİSTEM GÜVENLİĞİ", description: "Yönetici ve kullanıcı işlemlerini tarih ve kullanıcıya göre inceleyin.", action: "İşlem kayıtları" },
  account: { title: "Hesap Ayarları", eyebrow: "HESABIM", description: "Kişisel bilgilerinizi görüntüleyip güncelleyin.", action: "Bilgileri kaydet" },
};

const groups: { title: string; items: { id: Section; label: string; icon: string }[] }[] = [
  { title: "SINAV İŞLEMLERİ", items: [{ id: "exam", label: "Sınav Yükle", icon: "⇧" }] },
  { title: "FMT YÖNETİMİ", items: [{ id: "fmt-upload", label: "FMT Yükle", icon: "＋" }, { id: "fmt-edit", label: "FMT Düzenle", icon: "✎" }, { id: "fmt-delete", label: "FMT Sil", icon: "⌫" }] },
  { title: "KURUM YÖNETİMİ", items: [{ id: "school-add", label: "Kurum Ekle", icon: "＋" }, { id: "school-edit", label: "Kurum Düzenle", icon: "✎" }, { id: "school-delete", label: "Kurum Durumu", icon: "◉" }] },
  { title: "YAYINEVLERİ", items: [{ id: "publishers", label: "Yayınevleri", icon: "▣" }] },
  { title: "CEVAP ANAHTARLARI", items: [{ id: "answer-keys", label: "Cevap Anahtarları", icon: "✦" }] },
  { title: "ÖĞRENCİLER", items: [{ id: "students", label: "Öğrenciler", icon: "♙" }] },
  { title: "ARAÇLAR", items: [{ id: "calendar", label: "Takvim", icon: "▦" }, { id: "bird", label: "K ile Uçma Zamanı", icon: "↗" }, { id: "blocks", label: "Blok Zamanı", icon: "▦" }, { id: "snake", label: "Kıvrıla Kıvrıla K", icon: "〰" }, { id: "rebuilder", label: "Sınav Listesi", icon: "▤" }, { id: "pdf-tools", label: "PDF Düzenleyici", icon: "▧" }] },
  { title: "SİSTEM KULLANICILARI", items: [{ id: "system-users", label: "Üye Kayıtları", icon: "♙" }] },
  { title: "YÖNETİM", items: [{ id: "contact-inbox", label: "Gelen Kutusu", icon: "✉" }, { id: "audit-logs", label: "İşlem Kayıtları", icon: "≡" }, { id: "exam-schedule", label: "Sınav Takvimi", icon: "▦" }] },
  { title: "HESAP", items: [{ id: "account", label: "Hesap Ayarları", icon: "⚙" }] },
];

export default function PanelPage() {
  const router = useRouter();
  const authCheckStarted = useRef(false);
  const [section, setSection] = useState<Section>("exam");
  const [authorized, setAuthorized] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profileNotice, setProfileNotice] = useState("");
  const [logoutNotice, setLogoutNotice] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadMessageError, setUnreadMessageError] = useState("");
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

    window.localStorage.removeItem("kurumsal-profile");
    void fetch(`${API_URL}/api/account`, { headers: { Authorization: `Bearer ${token}` } }).then(async (response) => {
      if (response.status === 401) {
        window.sessionStorage.removeItem("kurumsal-auth-token");
        window.sessionStorage.removeItem("kurumsal-auth-user");
        router.replace("/login");
        return;
      }
      if (!response.ok) throw new Error("Hesap bilgileri alınamadı.");
      const account = await response.json() as AuthUser;
      setAuthUser(account);
      setProfile({ firstName: account.firstName, lastName: account.lastName, email: account.email, phone: account.phone ?? "" });
      window.sessionStorage.setItem("kurumsal-auth-user", JSON.stringify(account));
    }).catch(() => setProfileNotice("Güncel hesap bilgilerine ulaşılamadı. Lütfen tekrar deneyin."));
    setAuthorized(true);
  }, [router]);

  useEffect(() => {
    if (!authToken || authUser?.role !== "SUPER_ADMIN") return;
    let active = true;
    const loadUnreadCount = async () => {
      try {
        const response = await fetch(`${API_URL}/api/admin/contact-messages?pageSize=1`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const result = await response.json() as { unreadCount?: number; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Yeni mesaj sayısı alınamadı.");
        if (active) {
          setUnreadMessages(Number(result.unreadCount) || 0);
          setUnreadMessageError("");
        }
      } catch (error) {
        if (active) setUnreadMessageError(error instanceof Error ? error.message : "Yeni mesaj sayısı alınamadı.");
      }
    };
    void loadUnreadCount();
    const timer = window.setInterval(() => { void loadUnreadCount(); }, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [authToken, authUser?.role]);

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

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileNotice("");
    try {
      const response = await fetch(`${API_URL}/api/account`, { method: "PATCH", headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      const result = await response.json() as AuthUser & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Bilgiler kaydedilemedi.");
      setAuthUser(result);
      window.sessionStorage.setItem("kurumsal-auth-user", JSON.stringify(result));
      setProfileNotice("Hesap bilgileriniz güncellendi.");
    } catch (error) { setProfileNotice(error instanceof Error ? error.message : "Sunucuya ulaşılamadı."); }
    finally { setProfileSaving(false); }
  }

  if (!authorized) return <main className="panel-loading">Oturum kontrol ediliyor...</main>;
  if (authUser?.mustChangePassword) return <PasswordSetup token={authToken} onComplete={(token, user) => { setAuthToken(token); setAuthUser(user); }} />;
  const activePage = pages[section];

  return (
    <main className="dashboard">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <Link className="brand sidebar-brand" href="/panel"><span className="brand-mark">K</span><span>kurumsal<span className="brand-light">sinav.com</span></span></Link>
        <button className="sidebar-profile profile-link" onClick={() => setSection("account")}><span className="profile-avatar">{profile.firstName.slice(0, 1).toUpperCase() || "B"}</span><span><strong>{authUser?.role === "SUPER_ADMIN" ? "Yönetici hesabı" : `${profile.firstName} ${profile.lastName}`}</strong><small>Hesap ayarlarını aç ↗</small></span><span className="online-dot" /></button>
        <nav className="side-nav" aria-label="Yönetim menüsü">
          {groups.filter((group) => !["SİSTEM KULLANICILARI", "YÖNETİM"].includes(group.title) || authUser?.role === "SUPER_ADMIN").map((group) => {
            const items = group.items.filter((item) =>
              !["school-edit", "school-delete"].includes(item.id) || authUser?.role === "SUPER_ADMIN"
            ).filter((item) =>
              !["school-add", "exam"].includes(item.id) || authUser?.role === "SUPER_ADMIN" || authUser?.role === "DEALER"
            );
            return items.length > 0 && <div className="nav-group" key={group.title}>
              <p>{group.title}</p>
              {items.map((item) => <button className={`nav-item ${item.id === "answer-keys" ? "nav-item-featured" : ""} ${section === item.id ? "nav-active" : ""}`} key={item.id} onClick={() => { setSection(item.id); setMenuOpen(false); }}><span>{item.icon}</span>{item.label}{item.id === "contact-inbox" && unreadMessages > 0 && <span className="sidebar-unread-badge">{unreadMessages} yeni</span>}{item.id === "contact-inbox" && unreadMessageError && <span className="sidebar-unread-error" title={unreadMessageError}>!</span>}</button>)}
            </div>;
          })}
        </nav>
        <div className="sidebar-bottom"><div className="support-box"><span>?</span><p><strong>Yardıma mı ihtiyacınız var?</strong><small>Destek ekibimize ulaşın.</small></p><Link href="/contact#contact-form">→</Link></div><button className="logout-button" onClick={logout}><span>↪</span> Güvenli çıkış yap</button></div>
      </aside>
      <section className="dashboard-main">
        <header className="dashboard-header"><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menüyü aç">☰</button><div className="breadcrumbs">Yönetim Paneli <span>/</span> <strong>{activePage.title}</strong></div><div className="dashboard-actions"><ThemeToggle /><button className="header-avatar profile-avatar-button" aria-label="Hesap ayarlarını aç" onClick={() => setSection("account")}>{profile.firstName.slice(0, 1).toUpperCase() || "B"}</button><button className="header-logout" onClick={logout}>Çıkış Yap <span>↪</span></button></div></header>
        <div className="dashboard-content">
          <MotivationBanner firstName={profile.firstName} />
          <div className="page-title"><div><p className="hero-tag">{activePage.eyebrow}</p><h1>{activePage.title}</h1><p>{activePage.description}</p></div>{!["account", "calendar", "bird", "snake", "blocks", "exam-schedule", "rebuilder", "pdf-tools", "system-users", "contact-inbox", "audit-logs", "publishers", "publisher-requests", "answer-keys"].includes(section) && <button className="button button-navy" onClick={() => document.getElementById("main-action")?.click()}><span>＋</span> {activePage.action}</button>}</div>
          {logoutNotice && <div className="logout-toast" role="status">{logoutNotice}</div>}
          {section === "exam-schedule" && authUser?.role === "SUPER_ADMIN" ? <ScheduleManagement token={authToken} /> : section === "contact-inbox" && authUser?.role === "SUPER_ADMIN" ? <ContactInbox token={authToken} /> : section === "audit-logs" && authUser?.role === "SUPER_ADMIN" ? <AuditLogManagement token={authToken} /> : section === "account" ? <section className="account-card">
            <form className="account-form" onSubmit={saveProfile}>
              <div className="account-avatar">{profile.firstName.slice(0, 1).toUpperCase() || "B"}</div>
              <div className="account-fields">
                <label>Ad<input value={profile.firstName} onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} required maxLength={80} /></label>
                <label>Soyad<input value={profile.lastName} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} maxLength={80} /></label>
                <label>E-posta<input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} maxLength={254} /></label>
                <label>Telefon<input type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} maxLength={30} /></label>
                <button className="button button-navy" type="submit" disabled={profileSaving}>{profileSaving ? "Kaydediliyor..." : "Bilgileri kaydet"}</button>
                {profileNotice && <p className="profile-notice" role="status">{profileNotice}</p>}
              </div>
            </form>
          </section> : section === "calendar" ? <Calendar /> : section === "blocks" ? <BlockGame /> : section === "bird" || section === "snake" ? <BreakGame key={section} initialMode={section === "bird" ? "bird" : "snake"} /> : section === "rebuilder" ? <iframe ref={rebuilderFrame} className="tool-frame rebuilder-frame" src="/rebuilder.html" title="Sınav Listesi Düzenleyici" sandbox="allow-scripts allow-downloads allow-popups allow-modals" referrerPolicy="no-referrer" /> : section === "pdf-tools" ? <PdfEditor /> : section === "system-users" && authUser?.role === "SUPER_ADMIN" ? <RegistrationRequests token={authToken} /> : section === "publishers" || section === "publisher-requests" ? <PublisherManagement token={authToken} role={authUser?.role ?? "DEALER"} /> : section === "answer-keys" ? <AnswerKeyManagement token={authToken} readOnly={authUser?.role !== "SUPER_ADMIN"} /> : ["school-add", "school-edit", "school-delete"].includes(section) && (authUser?.role === "SUPER_ADMIN" || authUser?.role === "DEALER") ? <SchoolManagement token={authToken} role={authUser.role} /> : section === "exam" && (authUser?.role === "SUPER_ADMIN" || authUser?.role === "DEALER") ? <ExamManagement token={authToken} /> : <section className="dashboard-empty">
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
