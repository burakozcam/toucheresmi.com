"use client";
import dynamic from "next/dynamic";
import {canonicalSection,canOpenSection} from "../../lib/panel-navigation";
const FmtWorkspace=dynamic(()=>import("./fmt-workspace"),{loading:()=> <p role="status">FMT çalışma alanı yükleniyor…</p>});
import HelpLauncher from "./help-launcher";
import Announcements from "./announcements";
import SidebarResize from "./sidebar-resize";
const OwnerArcade=dynamic(()=>import("../owner-arcade"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
import ActionButton from "./action-button";
const DealerManagement=dynamic(()=>import("./dealer-management"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const DealerActivities=dynamic(()=>import("./dealer-activities"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
import DealerStatus from "./dealer-status";
const AccountSecurity=dynamic(()=>import("./account-security"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const ExamWorkspace=dynamic(()=>import("./exam-workspace"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
import BulkExams from "./bulk-exams";
const ResultEditor=dynamic(()=>import("./result-editor"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
import UiIcon from "../ui-icon";
const PublisherLogos=dynamic(()=>import("./publisher-logos"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const SystemCenter=dynamic(()=>import("./system-center"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const BlogManagement=dynamic(()=>import("./blog-management"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const FileManagement=dynamic(()=>import("./file-management"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
import { readProfileImage } from "../../lib/admin-request";
import ReleaseMark from "../release-mark";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import ThemeToggle from "../theme-toggle";
import PasswordSetup from "./password-setup";
const PdfEditor=dynamic(()=>import("../pdf-duzenleyici/editor"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const ScheduleManagement=dynamic(()=>import("./schedule-management"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const Calendar=dynamic(()=>import("../sinav-takvimi/schedule-calendar"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const StudentCodeManagement=dynamic(()=>import("./student-code-management"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const StoreManagement=dynamic(()=>import("./store-management"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const PublisherManagement=dynamic(()=>import("./publisher-management"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const AnswerKeyManagement=dynamic(()=>import("./answer-key-management"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const RegistrationRequests=dynamic(()=>import("./registration-requests"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const SchoolManagement=dynamic(()=>import("./school-management"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const TestCenter=dynamic(()=>import("./test-center"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const ExamManagement=dynamic(()=>import("./exam-management"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const FmtManager=dynamic(()=>import("./fmt-manager"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const OpticalEvaluation=dynamic(()=>import("./optical-evaluation"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const ExamResults=dynamic(()=>import("./exam-results"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const ResultDeletion=dynamic(()=>import("./result-deletion"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});

const ShareLinks=dynamic(()=>import("./share-links"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const FmtSharing=dynamic(()=>import("./fmt-sharing"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const ReaderAccounts=dynamic(()=>import("./reader-accounts"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const TxtConverter=dynamic(()=>import("./txt-converter"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
import MotivationBanner from "./motivation-banner";
const ContactInbox=dynamic(()=>import("./contact-inbox"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const SearchHistory=dynamic(()=>import("./search-history"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
const AuditLogManagement=dynamic(()=>import("./audit-log-management"),{loading:()=> <div className="panel-loading" role="status" aria-busy="true">Ekran yükleniyor…</div>});
import { API_URL } from "../../lib/api";

const ReevaluationCenter=dynamic(()=>import("./reevaluation-center"),{loading:()=> <p role="status">Yeniden değerlendirme yükleniyor…</p>});
const ExportCenter=dynamic(()=>import("./export-center"),{loading:()=> <p role="status">Dışa Aktarım Merkezi yükleniyor…</p>});
const BackupCenter=dynamic(()=>import("./backup-center"));
const ExamAnalytics=dynamic(()=>import('./exam-analytics'));
type Section = "export-center" | "backup-center" | "reevaluate" | "announcements" | "search-history" | "student-codes" | "store" | "dealers" | "dealer-activities" | "bulk-exams" | "result-editor" | "share-links" | "test-center" | "welcome" | "publisher-logos" | "system-center" | "blog" | "files" | "fmt-share" | "txt-converter" | "fmt-download" | "optical-keys" | "exam-records" | "data-delete" | "results" | "exam" | "fmt-upload" | "fmt-edit" | "fmt-delete" | "school-add" | "school-edit" | "school-delete" | "students" | "calendar" | "bird" | "snake" | "blocks" | "exam-schedule" | "rebuilder" | "pdf-tools" | "publishers" | "publisher-requests" | "answer-keys" | "system-users" | "contact-inbox" | "audit-logs" | "account";
type AuthUser = { canPlayGames?:boolean; impersonation?:{dealerName:string;expiresAt:string}|null; avatar?: string | null; id: string; email: string; firstName: string; lastName: string; phone?: string | null; mustChangePassword?: boolean; role: "SUPER_ADMIN" | "DEALER" | "SCHOOL_ADMIN" | "STUDENT" | "PARENT" };

const pages: Record<Section, { title: string; eyebrow: string; description: string; action: string }> = {
 "export-center":{title:"Dışa Aktarım Merkezi",eyebrow:"SİSTEM MERKEZİ",description:"Yetkili verilerin kapsamını kontrol ederek dosyalarınızı indirin.",action:""},
 "backup-center":{title:"Yedekleme ve Sürüm Kurtarma Merkezi",eyebrow:"SİSTEM MERKEZİ",description:"Gelecek sürümler için hazırlık.",action:""},
 reevaluate:{title:"Tekrar Değerlendir",eyebrow:"SINAV İŞLEMLERİ",description:"Mevcut sonuç sürümünü açın; güncel anahtarla önizleyip ONAYLA ile yeni sürüm oluşturun.",action:""},
 "search-history":{title:"Arama Geçmişi",eyebrow:"YÖNETİM",description:"Gönderilen aramalar ve en çok aranan ifadeler; son 30 gün.",action:""},
 dealers:{title:"Bayiler",eyebrow:"BAYİ YÖNETİMİ",description:"Hesaplar, işlem yetkileri, yayınevi bölgeleri ve günlük öğrenci kotaları.",action:""},
 "dealer-activities":{title:"Bayi Faaliyetleri",eyebrow:"İŞLEM TAKİBİ",description:"Değerlendirme, düzenleme, silme ve rapor işlemlerini inceleyin.",action:""},
 "bulk-exams":{title:"Toplu Sınav Ekle",eyebrow:"SINAV YÖNETİMİ",description:"Excel sütunlarıyla çok sayıda sınav ve cevap anahtarı hazırlayın.",action:""},
 "result-editor":{title:"Sınav Verilerini Düzenle",eyebrow:"SINAV VERİLERİ",description:"Öğrenci ve cevap bilgilerini kontrol ederek yeni sonuç revizyonu oluşturun.",action:""},
 announcements:{title:"Duyurular",eyebrow:"ARAÇLAR",description:"Güncel duyurular ve duyuru geçmişi.",action:""},
 welcome:{title:"Yönetim paneline hoş geldiniz",eyebrow:"KURUMSAL SINAV",description:"Sınav ve değerlendirme işlemlerinize buradan başlayın.",action:""},
 "publisher-logos":{title:"Yayınevi Logoları",eyebrow:"GÖRSEL YÖNETİMİ",description:"Yayınevi logolarını toplu yükleyin ve yönetin.",action:"Logo yükle"},
 "system-center":{title:"Sistem Merkezi",eyebrow:"SÜPER YÖNETİM",description:"Sistem sağlığı, ziyaretçiler ve güvenlik olaylarını inceleyin.",action:"Yenile"},
 blog:{title:"Blog",eyebrow:"İÇERİK YÖNETİMİ",description:"Yazılarınızı görsellerle hazırlayın ve yayımlayın.",action:"Yazı ekle"},
 files:{title:"Dosya Yönetimi",eyebrow:"",description:"Dosyalarınızı yönetin ve güvenli paylaşım bağlantıları oluşturun.",action:"Dosya yükle"},
  "fmt-share": {title:"FMT Paylaş ve İndir",eyebrow:"SÜRELİ FMT PAYLAŞIMI",description:"7108, 8050 ve kayıtlı FMT dosyalarını ayrı ayrı veya birlikte süreli paylaşın.",action:"Paylaş"},
  "share-links": {title:"Paylaşım Bağlantıları",eyebrow:"PAYLAŞIM YÖNETİMİ",description:"FMT, cevap anahtarı PDF ve üyelik bağlantılarını yönetin.",action:"Bağlantıları yönet"},
  "fmt-download": {title:"FMT Paylaş ve İndir",eyebrow:"FMT DOSYALARI",description:"Optik okuma programınız için kayıtlı FMT şablonlarını indirin.",action:"FMT indir"},
  "txt-converter": {title:"FMT Dönüştürücü",eyebrow:"OPTİK DOSYA ARAÇLARI",description:"TXT dosyanızı kayıtlı kaynak ve hedef FMT yerleşimleri arasında dönüştürün.",action:"FMT dönüştür"},
 results: { title: "Sınav Sonuçları", eyebrow: "", description: "Sınavınızı seçin, sonuçları inceleyin ve raporlarınızı indirin.", action: "Sonuç al" },
  exam: { title: "Sınav Değerlendir", eyebrow: "OPTİK DEĞERLENDİRME", description: "TXT dosyanızı FMT ve cevap anahtarıyla değerlendirin; sonuç listesi ve öğrenci karneleri alın.", action: "TXT seç" },
  "data-delete":{title:"Veri Silme",eyebrow:"",description:"TXT değerlendirme kayıtlarını kaldırın veya geri alın.",action:""},
  "test-center": {title:"Test Merkezi",eyebrow:"SALT OKUNUR TEST RAPORU",description:"Gerçek yerel test sonuçları ve çalıştırılmayan kontroller.",action:"Raporu görüntüle"},
  "exam-records": { title: "Sınav ve Cevap Anahtarı Yönetimi", eyebrow: "SINAV YÖNETİMİ", description: "Yayınevine göre sınav kaydı oluşturun, cevap anahtarını ekleyin ve kayıtları sınıf sınıf yönetin.", action: "Sınav ekle" },
  "optical-keys": { title: "Değerlendirme Anahtarları", eyebrow: "CEVAP ANAHTARLARI", description: "Soru cevapları, kitapçık eşleştirmeleri ve kazanımları değerlendirmeye hazırlayın.", action: "Anahtar ekle" },
  "fmt-upload": { title: "FMT Yönetimi", eyebrow: "", description: "FMT şablonlarını yönetin, ekleyin ve paylaşın.", action: "FMT dosyası seç" },
  "fmt-edit": { title: "FMT Yönetimi", eyebrow: "", description: "FMT şablonlarını yönetin, ekleyin ve paylaşın.", action: "Şablonları görüntüle" },
  "fmt-delete": { title: "FMT Yönetimi", eyebrow: "", description: "FMT şablonlarını yönetin, ekleyin ve paylaşın.", action: "Şablonları görüntüle" },
  "school-add": { title: "Kurum Yönetimi", eyebrow: "KURUM YÖNETİMİ", description: "Kurum ekleyin, bilgilerini düzenleyin ve durumunu aynı ekranda yönetin.", action: "Yeni kurum ekle" },
  "school-edit": { title: "Kurum Düzenle", eyebrow: "KURUM YÖNETİMİ", description: "Kayıtlı kurum bilgilerini görüntüleyip güncelleyin.", action: "Kurumları görüntüle" },
  "school-delete": { title: "Kurum Durumu", eyebrow: "KURUM YÖNETİMİ", description: "İlişkili sınav ve değerlendirmeler korunarak kurumları pasife alın veya yeniden aktifleştirin.", action: "Kurumları görüntüle" },
  students: { title: "Öğrenci / Veli Hesapları", eyebrow: "SONUÇ ERİŞİMİ", description: "Öğrenci ve veli hesaplarını oluşturun, sonuçları bağlayın ve erişimleri yönetin.", action: "Hesap ekle" },
  calendar: { title: "Takvim", eyebrow: "TAKVİM", description: "Ana sayfadaki yayımlanmış sınav takvimini sınıf ve aya göre görüntüleyin.", action: "Bugüne git" },
  bird: { title: "K ile Uçma Zamanı", eyebrow: "K ARCADE", description: "K logomuzla kulelerin arasından uç, kendi rekorunu geç.", action: "Oyuna başla" },
  blocks: { title: "Blok Zamanı", eyebrow: "K ARCADE", description: "Parçaları yerleştir, satırları tamamla.", action: "Başlat" },
  snake: { title: "Kıvrıla Kıvrıla K", eyebrow: "K ARCADE", description: "K ile izini büyüt, kıvrımları takip et.", action: "Oyuna başla" },
  "exam-schedule": { title: "Sınav Takvimi", eyebrow: "KURUMSAL SINAVLAR", description: "Yayınevlerinin sınav tarihlerini Excel ile ekleyin, düzenleyin ve cevap anahtarlarıyla eşleştirin.", action: "Takvimi yönet" },
  rebuilder: { title: "Sınav Listesi Düzenleyici", eyebrow: "SINAV ARAÇLARI", description: "Öğrenci listenizi düzenleyin, derslik dağılımını planlayın ve çıktınızı indirin.", action: "Aracı aç" },
  "pdf-tools": { title: "PDF ve Belge Araçları", eyebrow: "DOSYA ARAÇLARI", description: "PDF ve Excel dosyalarını tarayıcınızda birleştirin, bölün veya dönüştürün.", action: "Aracı aç" },
  "student-codes": {title:"Öğrenci Erişim Kodları",eyebrow:"KİŞİSEL SONUÇ ERİŞİMİ",description:"Akademik yıl ve doğrulanmış sonuç bağlantılarıyla güvenli erişim.",action:"Öğrenci kodları"},
  store: {title:"Mağaza",eyebrow:"KATALOG YÖNETİMİ",description:"Ürün, kategori, marka ve mağaza ayarları.",action:"Mağaza"},
  publishers: { title: "Yayınevleri", eyebrow: "YAYINEVİ YÖNETİMİ", description: "Sisteme kayıtlı yayınevlerini görüntüleyin ve yayınevi talebi oluşturun.", action: "Yayınevi ekle" },
  "publisher-requests": { title: "Yayınevi Talepleri", eyebrow: "ONAY SÜRECİ", description: "Yayınevi ekleme taleplerini inceleyip onaylayın veya reddedin.", action: "Talep listesi" },
  "answer-keys": { title: "Cevap Anahtarları", eyebrow: "", description: "Sınav cevap anahtarı ve kazanım dosyalarını yönetin.", action: "Yeni dosya ekle" },
  "system-users": { title: "Üyeler", eyebrow: "SİSTEM YÖNETİMİ", description: "Üyelik taleplerini ve kullanıcı hesaplarını yönetin.", action: "Üye kayıtları" },
  "contact-inbox": { title: "Gelen Kutusu", eyebrow: "İLETİŞİM", description: "İletişim formundan gelen mesajları inceleyin ve okundu durumunu yönetin.", action: "Gelen kutusu" },
  "audit-logs": { title: "İşlem Kayıtları", eyebrow: "SİSTEM GÜVENLİĞİ", description: "Yönetici ve kullanıcı işlemlerini tarih ve kullanıcıya göre inceleyin.", action: "İşlem kayıtları" },
  account: { title: "Hesap Ayarları", eyebrow: "HESABIM", description: "Kişisel bilgilerinizi görüntüleyip güncelleyin.", action: "Bilgileri kaydet" },
};

const groups: { title: string; items: { id: Section; label: string; icon: string }[] }[] = [
  { title: "Sınav Değerlendir", items: [{ id: "exam", label: "Sınav Değerlendir", icon: "⇧" },{ id: "results", label: "Sınav Sonuçları", icon: "▥" },{id:"reevaluate",label:"Tekrar Değerlendir",icon:"refresh"}, { id: "exam-records", label: "Sınav ve Cevap Anahtarı Yönetimi", icon: "＋" },{id:"result-editor",label:"Sınav Verilerini Düzenle",icon:"pencil"},{id:"data-delete",label:"Veri Silme",icon:"⌫"}] },
  { title: "FMT Yönetimi", items: [{id:"fmt-upload",label:"FMT Yönetimi ve Paylaşım",icon:"sliders"},{id:"txt-converter",label:"FMT Dönüştürücü",icon:"convert"}] },
  { title: "Paylaşım Yönetimi", items: [{id:"share-links",label:"Paylaşım Bağlantıları",icon:"share"}] },
  { title: "Kurum Yönetimi", items: [{ id: "school-add", label: "Kurum Yönetimi", icon: "＋" }] },
  { title: "Yayınevleri", items: [{ id: "publishers", label: "Yayınevleri", icon: "▣" }] },
  { title: "Cevap Anahtarları", items: [{ id: "answer-keys", label: "Cevap Anahtarları", icon: "✦" }] },
  { title: "Öğrenciler", items: [{ id: "students", label: "Öğrenci / Veli Hesapları", icon: "♙" }] },
  {title:"Mola Alanı",items:[{id:"bird",label:"Kule Rotası",icon:"↗"},{id:"blocks",label:"Blok Atölyesi",icon:"▦"},{id:"snake",label:"İz Takibi",icon:"〰"}]},
  { title: "Araçlar", items: [{id:"announcements",label:"Duyurular",icon:"✦"},{ id: "calendar", label: "Takvim", icon: "▦" }, { id: "rebuilder", label: "Sınav Listesi", icon: "▤" }, { id: "pdf-tools", label: "PDF ve Belge Araçları", icon: "▧" }] },
  { title: "Sistem Kullanıcıları", items: [{id:"dealers",label:"Bayiler",icon:"♙"},{id:"dealer-activities",label:"Bayi Faaliyetleri",icon:"≡"},{ id: "system-users", label: "Üye Kayıtları", icon: "♙" }] },
  {title:"Öğrenci Erişimi",items:[{id:"student-codes",label:"Öğrenci Erişim Kodları",icon:"▣"}]},
  {title:"Mağaza",items:[{id:"store",label:"Mağaza",icon:"▣"}]},
  { title: "Yönetim", items: [{id:"search-history",label:"Arama Geçmişi",icon:"search"},{id:"test-center",label:"Test Merkezi",icon:"✓"},{id:"publisher-logos",label:"Yayınevi Logoları",icon:"▣"},{id:"system-center",label:"Sistem Merkezi",icon:"◈"},{id:"export-center",label:"Dışa Aktarım Merkezi",icon:"download"},{id:"backup-center",label:"Yedekleme ve Sürüm Kurtarma Merkezi",icon:"shield"},{id:"blog",label:"Blog",icon:"✎"},{id:"files",label:"Dosya Yönetimi",icon:"▣"},{ id: "contact-inbox", label: "Gelen Kutusu", icon: "✉" }, { id: "audit-logs", label: "İşlem Kayıtları", icon: "≡" }, { id: "exam-schedule", label: "Sınav Takvimi", icon: "▦" }] },
  { title: "Hesap", items: [{ id: "account", label: "Hesap Ayarları", icon: "⚙" }] },
];

export default function PanelPage() {
  const router = useRouter();
  const authCheckStarted = useRef(false);
  const [savedOpticalId,setSavedOpticalId]=useState<string>();
  const [resultSelection,setResultSelection]=useState<{schoolId:string;keyId:string}>();
  const [answerKeyTargetId,setAnswerKeyTargetId]=useState("");
  const [section, updateSection] = useState<Section>("welcome");
  const historyIndex=useRef(0), restoringHistory=useRef(false);
  const [openGroups,setOpenGroups]=useState<Record<string,boolean>>({});
  function mayLeave(next:Section){if(next===section)return true;if(!window.dispatchEvent(new Event('ks-panel-before-navigate',{cancelable:true})))return false;return !(section==='pdf-tools'&&document.querySelector('.pdf-editor iframe,.document-scanner')&&!confirm('PDF çalışma alanından ayrılınca düzenlemeler kapanacak. Belgelerinizi indirdiniz mi?'));}
  const setSection=(requested:Section)=>{const next=canonicalSection(requested) as Section;if(!canOpenSection(next,authUser?.role??'',authUser?.canPlayGames)||!mayLeave(next))return;updateSection(next);const url=new URL(location.href);url.search='';url.searchParams.set('section',next);history.pushState({ksPanelIndex:++historyIndex.current},'',url.pathname+url.search);};
  const [authorized, setAuthorized] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState({ firstName: "", lastName: "", email: "", phone: "", avatar: null as string | null });
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
    if (!token) { if(sessionStorage.getItem("kurumsal-admin-session")){setProfileNotice("Bayi oturumu sonlandı. Kendi panelinize dönebilirsiniz.");return;}router.replace("/login"); return; }
    setAuthToken(token);
    void fetch(`${API_URL}/api/account`, { headers: { Authorization: `Bearer ${token}` } }).then(async (response) => {
      if (response.status === 401) {
        window.sessionStorage.removeItem("kurumsal-auth-token");
        window.sessionStorage.removeItem("kurumsal-auth-user");
        if(sessionStorage.getItem('kurumsal-admin-session')){setProfileNotice('Bayi oturumu sonlandı. Kendi panelinize dönebilirsiniz.');return;}
        router.replace("/login");
        return;
      }
      if (!response.ok) throw new Error("Hesap bilgileri alınamadı.");
      const account = await response.json() as AuthUser;
      if (account.role === "STUDENT" || account.role === "PARENT") { router.replace("/sonuclarim"); return; }
      setAuthUser(account);
      const target=canonicalSection(new URLSearchParams(location.search).get('section')??'welcome');
      const next=Object.prototype.hasOwnProperty.call(pages,target)&&canOpenSection(target,account.role,account.canPlayGames)?target as Section:'welcome';
      updateSection(next);history.replaceState({ksPanelIndex:0},'',`/panel?section=${next}${next==='dealers'&&new URLSearchParams(location.search).get('dealerId')?'&dealerId='+encodeURIComponent(new URLSearchParams(location.search).get('dealerId')!):''}`);
      setAuthorized(true);
      setProfile({ firstName: account.firstName, lastName: account.lastName, email: account.email, phone: account.phone ?? "", avatar: account.avatar ?? null });
      window.sessionStorage.setItem("kurumsal-auth-user", JSON.stringify(account));
    }).catch(() => setProfileNotice("Güncel hesap bilgilerine ulaşılamadı. Lütfen tekrar deneyin."));
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

  useEffect(() => {
    const syncTheme = () => rebuilderFrame.current?.contentWindow?.postMessage({type:"kurumsal-tool-theme",theme:document.documentElement.dataset.theme === "light" ? "light" : "dark"}, "*");
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {attributes:true,attributeFilter:["data-theme"]});
    syncTheme();
    return () => observer.disconnect();
  }, [section]);

  useEffect(()=>{const group=groups.find(g=>g.items.some(i=>canonicalSection(i.id)===section));if(group)setOpenGroups(v=>({...v,[group.title]:true}));},[section]);
  useEffect(()=>{const pop=(event:PopStateEvent)=>{if(restoringHistory.current){restoringHistory.current=false;return;}const index=event.state?.ksPanelIndex??0,target=canonicalSection(new URLSearchParams(location.search).get('section')??'welcome') as Section;const next=pages[target]&&canOpenSection(target,authUser?.role??'',authUser?.canPlayGames)?target:'welcome';if(!mayLeave(next)){restoringHistory.current=true;history.go(historyIndex.current-index);return;}historyIndex.current=index;updateSection(next);setMenuOpen(false);};window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[section,authUser]);

  async function returnToAdmin(){
    if(!mayLeave('welcome'))return;
    const saved=sessionStorage.getItem('kurumsal-admin-session');if(!saved){setProfileNotice('Asıl yönetici oturumu bu sekmede bulunamadı. Yeniden giriş yapın.');return;}
    try{const parent=JSON.parse(saved);const response=await fetch(`${API_URL}/api/security/impersonation/end`,{method:'POST',headers:{Authorization:`Bearer ${parent.token}`}});if(!response.ok)throw Error('Yönetici oturumu doğrulanamadı. Yeniden giriş yapın.');sessionStorage.setItem('kurumsal-auth-token',parent.token);sessionStorage.removeItem('kurumsal-auth-user');sessionStorage.removeItem('kurumsal-admin-session');location.replace(parent.returnUrl??'/panel?section=dealers');}catch(e){setProfileNotice((e as Error).message);}
  }
  function enterPortal(result:{token:string}){sessionStorage.setItem('kurumsal-admin-session',JSON.stringify({token:authToken,returnUrl:location.pathname+location.search}));sessionStorage.setItem('kurumsal-auth-token',result.token);sessionStorage.removeItem('kurumsal-auth-user');location.assign('/panel?section=welcome');}
  async function logout() {
    if(!mayLeave('welcome'))return;
    try{const saved=sessionStorage.getItem('kurumsal-admin-session'),token=saved?JSON.parse(saved).token:authToken;const r=await fetch(`${API_URL}/api/security/logout`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});if(!r.ok&&r.status!==401)throw Error();}catch{setProfileNotice('Sunucu oturumu sonlandırılamadı. Yeniden deneyin.');return;}
    for(const key of ['kurumsal-auth-token','kurumsal-auth-user','kurumsal-admin-session'])sessionStorage.removeItem(key);
    setLogoutNotice('Güvenli çıkış yaptınız. Ana sayfaya yönlendiriliyorsunuz.');router.replace('/');
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

  if (!authorized) return <main className="panel-loading"><div>{profileNotice||"Oturum kontrol ediliyor..."}{profileNotice&&sessionStorage.getItem("kurumsal-admin-session")&&<button data-help-id="panel-page-1x" className="button button-danger" onClick={()=>void returnToAdmin()}>KENDİ PANELİME DÖN</button>}{profileNotice&&<ActionButton data-help-id="panel-page-1" intent="manage" className="button button-navy" onClick={()=>location.reload()}>Tekrar dene</ActionButton>}</div></main>;
  if (authUser?.mustChangePassword) return <PasswordSetup token={authToken} onComplete={(token, user) => { setAuthToken(token); setAuthUser(user); }} />;
  const activePage = pages[section];

  return (
    <main className="dashboard" data-management={authUser?.role==="SUPER_ADMIN"||authUser?.role==="DEALER"}>
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}><SidebarResize/>
        <button data-help-id="panel-page-2" className="brand sidebar-brand" onClick={() => setSection("welcome")} aria-label="Kurumsal Sınav panel karşılama sayfası"><span className="brand-mark">K</span><span className="sidebar-brand-word"><span>kurumsal</span><span className="brand-light">sinav.com</span></span></button>
        <button data-help-id="panel-page-3" className="sidebar-profile profile-link" onClick={() => setSection("account")}><span className="profile-avatar">{profile.avatar ? <img src={profile.avatar} alt="Profil fotoğrafı"/> : profile.firstName.slice(0, 1).toUpperCase() || "B"}</span><span><strong>{`${profile.firstName} ${profile.lastName}`}</strong><small>Hesap ayarlarını aç <UiIcon name="arrow"/></small></span><span className="online-dot" /></button>
        <nav className="side-nav" aria-label="Yönetim menüsü">
          {groups.map((group,index)=>{
            const items=group.items.filter(item=>canOpenSection(item.id,authUser?.role??'',authUser?.canPlayGames)).filter(item=>!(item.id==='answer-keys'&&authUser?.role==='SUPER_ADMIN'));
            const expanded=!!openGroups[group.title];
            const current=items.some(item=>canonicalSection(item.id)===section);
            return items.length>0&&<div className="nav-group" key={group.title}>
              <button data-help-id="panel-page-5xx" data-help-label="Menü bölümünü aç veya kapat" className="nav-category" data-current={current} aria-expanded={expanded} aria-controls={`nav-category-${index}`} onClick={()=>setOpenGroups(v=>({...v,[group.title]:!v[group.title]}))}>
                {group.title}<span className="nav-category-arrow" aria-hidden="true"><UiIcon name="chevron-right"/></span>
              </button>
              <div className="nav-submenu" id={`nav-category-${index}`} data-expanded={expanded} aria-hidden={!expanded} inert={!expanded}>
                <div className="nav-submenu-clip"><div className="nav-submenu-list">
                  {items.map((item,itemIndex)=>{
                    const selected=canonicalSection(item.id)===section;
                    return <button data-help-id="panel-page-4" data-operation={item.id} aria-current={selected?'page':undefined} className={`nav-item ${selected?'nav-active':''}`} style={{'--submenu-delay':`${itemIndex*20}ms`} as CSSProperties} key={item.id} onClick={()=>{setSection(item.id);setMenuOpen(false);}}>
                      <span className="nav-item-icon" aria-hidden="true"><UiIcon name={item.id}/></span>{item.label}
                      {item.id==='contact-inbox'&&unreadMessages>0&&<span className="sidebar-unread-badge">{unreadMessages} yeni</span>}
                      {item.id==='contact-inbox'&&unreadMessageError&&<span className="sidebar-unread-error" title={unreadMessageError}>!</span>}
                    </button>;
                  })}
                </div></div>
              </div>
            </div>;
          })}
        </nav>
        <div className="sidebar-bottom"><div className="support-box"><span>?</span><p><strong>Yardıma mı ihtiyacınız var?</strong><small>Destek ekibimize ulaşın.</small></p><Link data-help-id="panel-page-5x" href="/contact#contact-form"><UiIcon name="arrow-right"/></Link></div><ActionButton data-help-id="panel-page-5" intent="neutral" className="logout-button" onClick={()=>void logout()}><span>↪</span> Güvenli çıkış yap</ActionButton></div>
      </aside>
      <section className="dashboard-main">
        <header className="dashboard-header"><button data-help-id="panel-page-6" className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menüyü aç">☰</button><div className="breadcrumbs">Yönetim Paneli <span>/</span> <strong>{activePage.title}</strong></div><div className="dashboard-actions"><ThemeToggle /><ActionButton data-help-id="panel-page-7" intent="neutral" type="button" className="header-avatar profile-avatar-button" aria-label="Hesap ayarlarını aç" onClick={() => setSection("account")}>{profile.avatar ? <img src={profile.avatar} alt="Profil fotoğrafı"/> : profile.firstName.slice(0, 1).toUpperCase() || "B"}</ActionButton><button data-help-id="panel-page-8" className="header-logout" onClick={()=>void logout()}>Güvenli Çıkış Yap <span>↪</span></button></div></header>
        {authUser?.impersonation&&<aside className="impersonation-banner" role="status"><strong>Şu anda {authUser.impersonation.dealerName} panelindesiniz.</strong><span>Bitiş: {new Date(authUser.impersonation.expiresAt).toLocaleTimeString('tr-TR',{timeZone:'Europe/Istanbul'})}</span><ActionButton data-help-id="panel-page-12xx" intent="danger" className="button button-danger" onClick={()=>void returnToAdmin()}>KENDİ PANELİME DÖN</ActionButton></aside>}
        <div className="dashboard-content">
          <HelpLauncher section={section} title={activePage.title} role={authUser?.role??"DEALER"}/>
          {profileNotice&&<p className="notice error" role="alert">{profileNotice}</p>}
          {authUser?.role==="DEALER"&&<DealerStatus token={authToken}/>}

          {section==="welcome"&&<><MotivationBanner firstName={profile.firstName}/>{["SUPER_ADMIN","DEALER"].includes(authUser?.role??"")&&<Announcements token={authToken} compact onNavigate={s=>setSection(s as Section)}/>}</>}
          {!["welcome","bird","snake"].includes(section) && <div className="page-title"><div>{activePage.eyebrow && <p className="hero-tag">{activePage.eyebrow}</p>}<h1>{activePage.title}</h1>{activePage.description && <p>{activePage.description}</p>}</div>{activePage.action&&!["student-codes","announcements","search-history","store","dealers","dealer-activities","result-editor","bulk-exams","test-center", "publisher-logos", "system-center", "blog", "files", "fmt-share", "txt-converter", "students", "fmt-download", "results", "exam", "exam-records", "data-delete", "fmt-upload", "fmt-edit", "fmt-delete", "optical-keys", "account", "calendar", "bird", "snake", "blocks", "exam-schedule", "rebuilder", "pdf-tools", "system-users", "contact-inbox", "audit-logs", "publishers", "publisher-requests", "answer-keys"].includes(section) && <ActionButton data-help-id="panel-page-10" intent="manage" className="button button-navy" onClick={() => document.getElementById("main-action")?.click()}><span><UiIcon name="add"/></span> {activePage.action}</ActionButton>}</div>}
          {logoutNotice && <div className="logout-toast" role="status">{logoutNotice}</div>}
          {section === "announcements" && ["SUPER_ADMIN","DEALER"].includes(authUser?.role??"") ? <Announcements token={authToken} admin={authUser?.role==="SUPER_ADMIN"} onNavigate={s=>setSection(s as Section)}/> : section === "search-history" && authUser?.role === "SUPER_ADMIN" ? <SearchHistory token={authToken}/> : section === "student-codes" && ["SUPER_ADMIN","DEALER","SCHOOL_ADMIN"].includes(authUser?.role??"") ? <StudentCodeManagement token={authToken}/> : section === "store" && authUser?.role === "SUPER_ADMIN" ? <StoreManagement token={authToken}/> : section === "dealers" && authUser?.role === "SUPER_ADMIN" ? <DealerManagement token={authToken} onEnterPortal={enterPortal}/> : section === "dealer-activities" && authUser?.role === "SUPER_ADMIN" ? <DealerActivities token={authToken}/> : section === "welcome" ? <section className="management-panel panel-welcome"><div className="welcome-cards"><article><h3>Görüş ve öneriler</h3><p>İstek ve geri bildirimlerinizi bize iletin.</p><Link data-help-id="panel-page-12x" href="/contact">İletişime geçin <UiIcon name="arrow"/></Link></article><article><h3>Değerlendirilebilir yayınlar</h3><p>Sistemde bulunan yayınları ve değerlendirme durumlarını görüntüleyin.</p><button data-help-id="panel-page-11" onClick={()=>setSection("publishers")}>Yayınevlerini görüntüle <UiIcon name="arrow"/></button></article><article><h3>Cevap anahtarları</h3><p>Yayımlanmış sınav cevap anahtarlarını inceleyin.</p><Link data-help-id="panel-page-14x" href="/cevap-anahtarlari">Cevap anahtarlarını aç <UiIcon name="arrow"/></Link></article><article><h3>Sınav takvimi</h3><p>Yayınevlerinin sınav tarihlerini ve kapsam bilgilerini inceleyin.</p><Link data-help-id="panel-page-15x" href="/sinav-takvimi">Takvimi aç <UiIcon name="arrow"/></Link></article></div></section> : section === "publisher-logos" && authUser?.role === "SUPER_ADMIN" ? <PublisherLogos token={authToken}/> : section === "test-center" && authUser?.role === "SUPER_ADMIN" ? <TestCenter token={authToken}/> : section === "backup-center" && authUser?.role === "SUPER_ADMIN" ? <BackupCenter/> : section === "export-center" && authUser?.role === "SUPER_ADMIN" ? <ExportCenter token={authToken}/> : section === "system-center" && authUser?.role === "SUPER_ADMIN" ? <SystemCenter token={authToken}/> : section === "blog" && authUser?.role === "SUPER_ADMIN" ? <BlogManagement token={authToken}/> : section === "files" && authUser?.role === "SUPER_ADMIN" ? <FileManagement token={authToken}/> : section === "share-links" && authUser?.role === "SUPER_ADMIN" ? <ShareLinks token={authToken}/> : section === "bulk-exams" && authUser?.role === "SUPER_ADMIN" ? <ExamWorkspace token={authToken} initialMode="bulk"/> : section === "result-editor" && (authUser?.role === "SUPER_ADMIN" || authUser?.role === "DEALER") ? <ResultEditor token={authToken}/> : (section === "fmt-upload" || section === "fmt-share" || section === "fmt-download") && ["SUPER_ADMIN","DEALER"].includes(authUser?.role??"") ? <FmtWorkspace token={authToken} manage={authUser?.role==="SUPER_ADMIN"}/> : section === "txt-converter" ? <TxtConverter token={authToken} /> : section === "students" && (authUser?.role === "SUPER_ADMIN" || authUser?.role === "DEALER") ? <ReaderAccounts token={authToken} /> : ["fmt-upload", "fmt-edit", "fmt-delete", "optical-keys"].includes(section) && authUser?.role === "SUPER_ADMIN" ? <FmtManager token={authToken} /> : section === "exam" && (authUser?.role === "SUPER_ADMIN" || authUser?.role === "DEALER") ? <OpticalEvaluation token={authToken} canCreateSchool={authUser?.role === "SUPER_ADMIN" || authUser?.role === "DEALER"} screen="upload" onSaved={(id,schoolId,keyId)=>{window.dispatchEvent(new Event("ks-dealer-usage-changed"));setSavedOpticalId(id);setResultSelection({schoolId,keyId});setSection("results");}} /> : section === "reevaluate" && (authUser?.role === "SUPER_ADMIN" || authUser?.role === "DEALER") ? <ReevaluationCenter token={authToken} admin={authUser?.role==='SUPER_ADMIN'}/> : section === "results" && ["SUPER_ADMIN","DEALER","SCHOOL_ADMIN"].includes(authUser?.role??"") ? authUser?.role === "SCHOOL_ADMIN" ? <ExamAnalytics token={authToken}/> : <ExamResults token={authToken} initialSelection={resultSelection}/> : section === "data-delete" && (authUser?.role === "SUPER_ADMIN" || authUser?.role === "DEALER") ? <ResultDeletion token={authToken}/> : section === "exam-schedule" && authUser?.role === "SUPER_ADMIN" ? <ScheduleManagement token={authToken} /> : section === "contact-inbox" && authUser?.role === "SUPER_ADMIN" ? <ContactInbox token={authToken} /> : section === "audit-logs" && authUser?.role === "SUPER_ADMIN" ? <AuditLogManagement token={authToken} onExport={()=>setSection("export-center")}/> : section === "account" ? <section className="account-card">
            <form className="account-form" onSubmit={saveProfile}>
              <div className="account-avatar">{profile.avatar ? <img src={profile.avatar} alt="Profil fotoğrafı"/> : profile.firstName.slice(0, 1).toUpperCase() || "B"}</div>
              <div className="account-fields"><label>Profil fotoğrafı · PNG / JPEG / WebP<input data-help-id="panel-page-12" type="file" accept="image/png,image/jpeg,image/webp" disabled={profileSaving} onChange={async e=>{const file=e.target.files?.[0];if(file)try{const avatar=await readProfileImage(file);setProfile(v=>({...v,avatar}));setProfileNotice("Fotoğraf hazır; bilgileri kaydederek hesabınıza ekleyin.");}catch(err){setProfileNotice((err as Error).message);}}}/></label>{profile.avatar&&<ActionButton data-help-id="panel-page-13" intent="neutral" type="button" className="button button-quiet" onClick={()=>setProfile({...profile,avatar:null})}>Fotoğrafı kaldır</ActionButton>}
                <label>Ad<input data-help-id="panel-page-14" value={profile.firstName} onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} required maxLength={80} /></label>
                <label>Soyad<input data-help-id="panel-page-15" value={profile.lastName} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} maxLength={80} /></label>
                <label>E-posta<input data-help-id="panel-page-16" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} maxLength={254} /></label>
                <label>Telefon<input data-help-id="panel-page-17" type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} maxLength={30} /></label>
                <ActionButton data-help-id="panel-page-18" intent="save" loading={profileSaving} className="button button-navy" type="submit" disabled={profileSaving}>{profileSaving ? "Kaydediliyor..." : "Bilgileri kaydet"}</ActionButton>
                {profileNotice && <p className="profile-notice" role="status">{profileNotice}</p>}
              </div>
            </form>
            {!authUser?.impersonation&&<AccountSecurity token={authToken} onLogin={result=>{setAuthToken(result.token);setAuthUser(result.user);sessionStorage.setItem("kurumsal-auth-token",result.token);sessionStorage.setItem("kurumsal-auth-user",JSON.stringify(result.user));}}/>}
          </section> : section === "calendar" ? <Calendar /> : section === "blocks" || section === "bird" || section === "snake" ? authUser?.canPlayGames?<OwnerArcade/>:<section><h2>404 — Sayfa Bulunamadı</h2><p>Aradığınız sayfa bulunamadı.</p></section> : section === "rebuilder" ? <iframe onLoad={event => event.currentTarget.contentWindow?.postMessage({type:"kurumsal-tool-theme",theme:document.documentElement.dataset.theme === "light" ? "light" : "dark"}, "*")} ref={rebuilderFrame} className="tool-frame rebuilder-frame" src="/rebuilder.html" title="Sınav Listesi Düzenleyici" sandbox="allow-scripts allow-forms allow-downloads allow-popups allow-modals" referrerPolicy="no-referrer" /> : section === "pdf-tools" ? <PdfEditor /> : section === "system-users" && authUser?.role === "SUPER_ADMIN" ? <RegistrationRequests token={authToken} /> : section === "publishers" || section === "publisher-requests" ? <PublisherManagement token={authToken} role={authUser?.role ?? "DEALER"} /> : section === "answer-keys" && authUser?.role === "SUPER_ADMIN" ? <ExamWorkspace token={authToken} initialPublicationId={answerKeyTargetId}/> : section === "answer-keys" ? <AnswerKeyManagement token={authToken} readOnly={authUser?.role !== "SUPER_ADMIN"} initialPublicationId={answerKeyTargetId} onAddExam={() => setSection("exam-records")} /> : ["school-add", "school-edit", "school-delete"].includes(section) && (authUser?.role === "SUPER_ADMIN" || authUser?.role === "DEALER") ? <SchoolManagement token={authToken} role={authUser.role} /> : section === "exam-records" && authUser?.role === "SUPER_ADMIN" ? <ExamWorkspace token={authToken}/> : <section className="dashboard-empty">
            <div className="empty-art"><div className="empty-paper"><span className="empty-paper-mark">K</span><i /><i /><i /><div className="empty-bubbles"><b /><b /><b /><b /></div></div><span className="empty-spark">✳</span><span className="empty-orbit" /></div>
            <h2>{section === "exam" ? "İlk sınavınızı yükleyin" : `${activePage.title} işlemlerine başlayın`}</h2>
            <p>{section === "exam" ? "Sınav dosyanızı seçin, değerlendirme ve raporlama sürecini başlatın." : activePage.description}</p>
            <ActionButton data-help-id="panel-page-19" intent="manage" id="main-action" className="button button-navy" onClick={() => window.alert("Bu özellik sonraki geliştirme adımında aktif edilecek.")}><span><UiIcon name="add"/></span> {activePage.action}</ActionButton>
          </section>}
          <div className="dashboard-footnote"><span><UiIcon name="grid"/></span> Optik sınav yönetiminiz için ihtiyacınız olan her şey tek panelde. <ReleaseMark/></div>
        </div>
      </section>
    </main>
  );
}
