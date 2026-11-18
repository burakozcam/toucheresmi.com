# v1.3.5 · 2026-11-17 · yerel geliştirme

## v1.3.7 — 18 Kasım 2026 (yerel kabul)

- Ek talep: kurum/sınava özel kalıcı karne logosu; oranlı üst başlık, sağ altta K + Kurumsal Sınav platform imzası, ortada sayfa numarası. Yeni eklemeli logo migration’ı yalnız yerelde doğrulandı.

- Ek talep: karne ayarlarında alttaki kurumsalsinav.com adresini kapatma seçeneği; varsayılan açık, tekli/toplu PDF ve ZIP akışlarında geçerli.

- Sonuç editöründeki düz metin audit açıklamasını JSON sayan render hatası giderildi; eski JSON/metin geçmişi açılır. Okunamayan sonuç boş veriyle yazılmaz; büyük revizyonlar transaction içinde metin snapshot aktarımı kullanır.
- Altın SVG asma kilit, ortak sahne saatiyle kapanma/ışık; yalnız admin/bayi panellerine anlamlı altı buton tonu ve SVG ikonlar; kompakt yayınevi ekleme, Türk bayrağı ve favicon.ico.
- İki worker ile sınırlı TXT/FMT/merge/özet hesapları; 5.000 kayıt ve 100–1.000 sentetik oturum yerel ölçümleri.
- SUPER_ADMIN arama geçmişi (30 gün), üyeye göre sunucu/istemci ayrımlı işlem kayıtları; owner e-postasına özel oyunlar; kapalı soru arşivi altyapısı.
- İki yeni eklemeli migration; production'a uygulanmadı. Özgün canlı merge vakası/cPanel kapasitesi/otomatik audit temizliği açık kabul sınırlarıdır.
- Ayrıntı, gerçek testler, ölçümler ve geri dönüş: [v137 raporu](docs/v137-release-report.md).


- Yayınevi ekleme/iletişim/durum; sınav yayınevi taşıma önizlemesi ve atomik kaydı; mevcut katsayı önizlemesine belirgin bağlantı.
- TXT 5.000 kayıt/öğrenci; tüm satırlarla aynı FMT algoritması; ortalanmış oran, renkli dolum ve açık ayrıntı düğmeleri.
- Dosya uzantı/içerik/yapı ve kaynak sınırları; makro/aktif PDF/görsel decode denetimleri.
- Akademik yıl, doğrulanmış öğrenci sonuç bağlantısı, rastgele ve yalnız özetli kişisel kod; kurum yetkisi, yenileme/iptal, tek seferlik kurum XLSX/PDF çıktısı ve maskeli öğrenci karneleri.
- Üç özgün erişilebilir tanıtım sahnesi ve istenen metadata başlıkları; dekoratif hero yıldızı kaldırıldı.
- Varsayılan kapalı mağaza; ürün/kategori/marka yönetimi, public ürün/marka sayfaları ve sayfalama. XLSX doğrulama/önizleme/onay; tek hatada sıfır değişiklik; tek transaction ve eşzamanlılık koruması; toplu yüzde fiyat işlemi.
- 251 otomatik regresyon; 14 gerçek HTTP/PostgreSQL kabul grubu, API/Web build, Prisma ve yeni boş yerel DB migration zinciri. Ayrıntılı kanıt/sınırlar: `docs/v135-release-report.md`.
- Yeni migration hazırlandı; üretime uygulanmadı. Ödeme/sipariş/kargo ve canlı hosting kabulü sonraki aşama. Deployment/commit/push yapılmadı.

# v1.3.4 · 2026-11-17 · yerel geliştirme

- Kurumsal kimliği koruyan ana sayfa: gerçek karne üreticisinden anonim görsel, kazanım/geçmiş sonuç tanıtımı, örnek gelişim grafiği ve kaydırma hızından bağımsız viewport animasyonları.
- Kompakt rapor oluşturucu; bütün şablonlar korunarak bağımsız genel/kurum katılımı, yeniden yerleşen PDF/Excel alanları; önizleme/tekli/toplu/ZIP ve öğrenci/veli/misafir akışları.
- Sınav, cevap anahtarı, toplu dosya ve sınav hazırlama mevcut bileşenlerle ortak yönetim ekranında; Excel şablonları, PDF-only, manuel/çapraz/kazanım ve sonradan anahtar ekleme korunur. Varsayılan Katsayılar görüntüleme/taslağa uygulama.
- TXT önerisinde önce güvenli arşive yükleme, ardından otomatik seçim; kalıcı başarı bildirimi ve eşzamanlı checksum tekrar koruması. Gerçek eşleşme yüzdesini değiştirmeyen reduced-motion uyumlu shimmer.
- Kaynaklı 81 il/973 ilçe listesi, bağımlı dropdown ve API ilişki doğrulaması; eski yazımlarla uyumlu filtre/yetki/sıralama; salt okunur konum/çakışma raporu. Mevcut veriler otomatik birleştirilmez.
- Temiz release değişimi, ortam/reCAPTCHA ön kontrolü, yedek/saklama/geri dönüş için DEPLOYMENT.md ve ön kontrol betiği.
- 245/245 otomatik regresyon; API/Web production build ve Prisma doğrulaması başarılı. Gerçek HTTP 22+7+5, tarayıcı 9+6 grup; üretim Google/hosting/backup kabulü ayrıca gerekir.
- Yeni migration veya npm bağımlılığı yok. Canlı deploy/veri değişimi/commit/push yapılmadı. Testler ve üretim kabul sınırları: `docs/v134-release-report.md`.

# v1.3.3 · 2026-11-16 · yerel geliştirme

- Temsil oturumunda ana yöneticinin güvenilir cihaz iptali/süre sonu ve MFA kanıtı da denetlenir; güncel yönetici doğrulamasında oturum sahibi/rolü kontrol edilir. Bayi 2FA kanıtı ve kurulumda hesap bazlı deneme sınırı güçlendirildi.
- Aktif kurumu olmayan kurum yöneticisinin mevcut oturumu reddedilir. Başka kurum kimliğiyle sınav oluşturma isteğinin sessizce kendi kurumunda kayıt açması düzeltildi.
- Genel/il/ilçe/kurum/sınıf sıralamalarında indeks ve ikili arama; Excel/PDF/ortalama hesaplarında Map erişimi. Mevcut puanlama, null katılım ve eşit puan toleransı korunur.
- Toplu PDF'de tamamlanan öğrencinin sayfaları flush edilir; 150 öğrenci/300 sayfa testinde en çok 2 sayfa nesnesi tamponda kaldı. Çıktı Buffer olarak üretilmeye devam eder.
- Excel/CSV satırlarının sessizce kırpılması ve aşırı geniş seyrek tablo alanlarının büyük dizilere çevrilmesi engellendi. Türkçe/sıfırlı numara/boş hücre ve eski XLS/XLSX şablon uyumluluğu sınandı.
- Analitik sunucuda da sabit public yol listesine sınırlandı. Güvenlik sayfası 2FA, cihaz/oturum iptali ve panel TXT arşivi ayrımıyla güncellendi; hesap güvenliğinde yüklenme/işlem durumu ve tekrarlı tıklama koruması eklendi.
- Görünür Release Candidate etiketleri kaldırıldı; mevcut adres çalışmaya devam eder. Paket, footer, OG/favicon, statik önizleme, Sistem/Test Merkezi sürümleri v1.3.3'e getirildi; migration durumunun eski sabite bağlı yanlış raporlanması düzeltildi.
- Node 24.22.1: 238/238 regresyon, API/Web build, Prisma validate/generate, temiz sentetik PostgreSQL migration zinciri; gerçek HTTP/DB 22+7 grup, tarayıcı 9+6 grup, Passenger sözleşme smoke testi başarılı.
- Yeni bağımlılık/migration, canlı deploy, reset/seed veya kullanıcı verisi silme yok. Güncel npm audit ağ/onay sınırı nedeniyle tamamlanamadı; önceki sürümün temiz sonucu bu sürüme taşınmadı.
- Kalıcı hafıza: `PROJECT_MEMORY.md`. Bulgular, değişen dosyalar, test kanıtları ve açık kapasite/hosting sınırları: `docs/v133-release-report.md`.

# v1.3.2 · 2026-11-16 · yerel geliştirme

- Tek bayi sahipliği kapsamı; kurum sahibini API ve DB trigger ile sabitleme; öğrenci/veli sonuçlarında yayın, aktiflik, silinme ve son sürüm koşullarını birleştirme; kimliğe göre güvenli erişim taşıma.
- Bayi/çalışan yönetimi, yedi işlem yetkisi, çoklu yayınevi/il/ilçe kuralları ve konum değişikliği onayı. Varsayılan bütün yetkiler açık, bölge serbest ve kota sınırsız.
- Türkiye gününe göre atomik benzersiz öğrenci kotası; önizleme/başarısız/tekrar işlemlerinde tüketim yok; ayrı oturumlarda tek sayım. Sonraki sürümlerde aynı TXT'nin mükerrer kaydedilmesi düzeltildi.
- Filtrelenebilir bayi faaliyetleri, gerçek yöneticiyle ilişkilendirilmiş 15 dakikalık temsil sekmesi, soft delete/geri yükleme geçmişi; yeni/geri yüklenen sürüm otomatik yayımlanmaz.
- Yöneticiye zorunlu, bayiye isteğe bağlı TOTP; yerel QR, ayrı anahtarla şifreli sır, on hash'li tek kullanımlık kurtarma kodu, iptal edilebilir güvenilir cihaz ve DB oturumları. Eski JWT'ler yeniden giriş gerektirir.
- Genel kurum/sınıf dizini kaldırıldı; kişisel kod hash indeksli misafir çözümleme. Aynı sınavdan anonim genel/il/ilçe sıralaması, küçük çapraz kurum ortalamalarını gizleme.
- Özel depolama containment, bounded XLSX/ZIP açma, ortak PostgreSQL rate limiter, ağır iş concurrency sınırı, CORS/Origin/header/CSP düzenlemeleri; audit özetlerinde ham öğrenci değişikliklerini azaltma.
- Bütün karne başlıklarında orijinal web K SVG logosu; v1.3.1 kurumsal lacivert/mavi ziyaretçi tasarımı ve mevcut A4 düzenleri korundu.
- Uyumlu Nodemailer/Zod/PostCSS/deepmerge güncellemeleri; tam ve production npm audit 0. Node 22 API/Web derlemesi, 232/232 regresyon, gerçek PostgreSQL/HTTP 22 grup, gerçek tarayıcı 9 grup ve eski şemadan migration testi geçti.
- Yeni migration ve `.env.example` MFA/rate/proxy alanları; canlıda uygulanmadı. Geçiş, eski sonuç kodlarının MANUEL indekslenmesi, yedek ve geri dönüş: `docs/v132-release-report.md`. Bulgular/kalan riskler: `docs/v132-security-audit.md`.

# v1.3.1 · 2026-11-16 · yerel geliştirme

- Lacivert/mavi kurumsal kimlik korunarak öğrenci odaklı ana sayfa: büyük sınav araması, sunucu tarafında gerçek yayımlanmış sınavlar, kapak vitrini, yayınevleri ve kurumsal hizmet bölümü.
- Fareye tepki veren SVG kitapçık/optik/kalem kompozisyonu, durdurulabilir yayınevi şeridi, kaydırmayla gelişen temsili karne grafikleri ve yedi aşamalı optikten karneye hikâyesi. Yeni animasyon bağımlılığı eklenmedi.
- Cevap anahtarı kütüphanesinde kurumsal kapaklar, bozuk görsel alternatifi ve yayınevi kataloğu; ana sayfada “8. sınıf” gibi sınıf aramaları mevcut sınıf filtresine aktarılır.
- Sınav detaylarında yayınevinin aynı sınıftaki diğer denemeleri ve sınava özel Türkçe Open Graph görseli; mevcut canonical, yapılandırılmış veri, robots/sitemap ve özel sonuçların noindex kuralları korunur.
- Herkese açık sayfalarda ortak mavi vurgu, mobil düzen, açık/koyu tema ve azaltılmış hareket görünümü. Giriş, CAPTCHA, çerez tercihleri ve dosya erişim koşulları değişmez.
- Node.js 22 API/Web derlemeleri ve yerel tarayıcı doğrulaması: `docs/v131-release-report.md`. Migration ve canlı dağıtım yoktur.

# v1.3.0 · 2026-11-15 · yerel geliştirme

- Referans görsele uygun dinamik A4 öğrenci karneleri: kurumsal başlık, bilgi/puan kartları, ders tablosu, karşılaştırma grafiği, sıralama/katılım tablosu, bütün derslerin öğrenci ve anahtar cevapları, gerçek performanstan öncelikli kazanımlar.
- İki sayfalık ve kazanımlı karnelerde ders renkleri, kazanım D/Y/B ve başarı göstergeleri; yoğun listelerde iki sütun, uzun satırlarda ölçülmüş satır ve devam sayfası. Aynı ders/açıklamadaki kazanımlar, bütün kodları korunup gruplama açıkça belirtilerek birlikte hesaplanır.
- Genel katılımı göster/gizle ayarı yönetici, öğrenci/veli ve erişim koduyla sonuç PDF akışlarına eklendi; toplu PDF ve ZIP aynı ayarı kullanır.
- Sayfa sınırında PDF’yi reddeden kontrol kaldırıldı; öğrenci başına gerçek 1/1, 1/2, 2/2 veya devam sayfası numaraları.
- Yayınevi seçimindeki label tıklama aktarımı düzeltildi; ortak aramalı bileşen seçim, ESC, dışarı tıklama ve klavye desteğini korur. Önceden sınav oluşturma zorunluluğu getirilmedi.
- Ayrıntılar: `docs/v130-release-report.md`. Yeni migration veya canlı veritabanı işlemi yoktur.

# v1.2.9 · 2026-11-15 · yerel geliştirme

- Cevap anahtarı yüklemede zorunlu mevcut sınav seçimi ve API'nin koşulsuz 409 cevabı kaldırıldı. Excel ve elle giriş aynı onaylı kayıt akışını kullanır; yeni sınav aynı transaction'da oluşturulur, aynı adlı boş sınav korunur. Mevcut anahtarın otomatik üzerine yazılması ve eşzamanlı mükerrer kayıt engellenir.
- Excel/Calc HTML ve TSV panosu hücrelere dağıtılır; tırnaklı satır sonları, sekmeler, Türkçe ve boş sütunlar korunur. 300 soruya kadar satır büyütme, Ctrl/Cmd geri alma/yineleme ve sınır aşımında bütünüyle ret eklendi. Çok satırlı metinler textarea ile düzenlenir.
- Ana sayfa için bağımlılık eklemeyen SVG kitapçık/tarama/değerlendirme/karne döngüsü, hafif parallax, durdurma/oynatma, ekran dışındayken durma ve azaltılmış hareket görünümü eklendi. Yerel index önizlemesi de güncellendi.
- Optik değerlendirme düğmesinin eksik seçimleri açıkça gösterilir. 7108 ve Özdebir için gerçek admin→bayi→TXT→değerlendirme→Excel/PDF kabulü eklendi; mevcut optik hesaplama motoru değiştirilmedi.
- Testler, gerçek hata nedenleri ve dağıtım sınırları: `docs/v129-release-report.md`. Yeni migration yoktur; canlı DB işlemi veya dağıtım yapılmadı.

# v1.2.8 · 2026-11-15 · yerel geliştirme

- 7108 kapasitesi sınav soru sayısından ayrıldı; yayınevi/sınıf bağı kaldırıldı. Boş kitapçık A, boş cevap boş kalır. Kimliği eksik fakat adı bulunan satırlar numara uydurulmadan korunur; tekli/çift oturum birleştirmesi mevcut boş alanları silmez.
- Gerçek Ankara 198 satır ve 40 referans karne karşılaştırıldı; anonim regresyonlar eklendi. Resmî katsayısı bulunmayan Ankara profili otomatik tanımlanmaz.
- Bayi/admin veri tablosunda kimlik, ortak/oturum/ders kitapçığı ve cevap düzenleme; önizleme, geri alma, yeniden hesaplama, değişmez revizyon, denetim kaydı ve öğrenci/veli bağlantılarının taşınması eklendi.
- İki rebuilder kopyasında derslik düğmesi gerçek form gönderir; normalize kampüsler, aynı adın farklı kampüste kullanılması ve mevcut yerleşimler korunur.
- Ortak göz düğmesi, gerçek v2/v3 sağlayıcı seçimi, tüm şifre işlemlerinde CAPTCHA, eksik öğrenci/veli giriş formu ve kalıcı çerez tercihleri düzeltildi. GA4/GTM ortak izne bağlıdır.
- Admin toplu sınav tablosu çoklu hücre yapıştırma, IndexedDB taslakları, bağımsız kayıt sonuçları ve standart cevap/kazanım XLSX dosyaları üretir. Kapak kırpma/önizleme, sunucuda WebP optimizasyonu ve kaldırma eklendi.
- Ziyaretçi cevap anahtarları raf/katalog düzenine geçirildi; dosyalar, detay ve paylaşım yolları korundu. Kapak ve sınav tarihi için additive migration hazırlandı.
- Node 22 API/Web derlemesi ve yerel kabul kanıtları/sınırları: `docs/v128-release-report.md`. Canlı deploy veya canlı DB migration yapılmadı.

# v1.2.7 · 2026-11-15 · yerel geliştirme

- Orijinal 2022 Özdebir tek oturum BLDM içerik imzası eklendi. Eski genel analizde sınıfın 1. konuma ve derslerin yanlış etiketlere bağlanması, eşit okunabilirlikte de yalnız bu kesin eski düzen için düzeltilir. Eski DB satırı ve sonuç revizyonları değişmez.
- Tekli/toplu FMT yüklemesi BLDM kabul eder; tekli yükleme de sunucu analizini kullanır. Özdebir boş kitapçığı önizlemede A kabul edilir; sınav önerilerinde de aynı kural uygulanır.
- O8126 özgün cevap/kazanım/çapraz Excel'i ortak API/tarayıcı parser'ına eklendi. 90 soru ve iki bağımsız cevap sütunuyla A/B çapraz kontrolü yapılır; çelişkiler reddedilir. Kaynak X iptal değeri korunur; PDF'deki T/H kararları otomatik uydurulmaz.
- reCAPTCHA v3 gönderim anında token üretir; backend hostname/action/skor/tarih/tekrar/kota hatasını denetler. Varsayılan eşik 0.5; mevcut hız limitleri korunur. Üretimde anahtarsız/kapalı koruma reddedilir. Public mevcut işlemler ve sonuç PDF'si kapsanır.
- Analitik izin paneli, sabit yol allowlist'i, Search Console metadata alanı ve denetim sonrası etkinleşen GA4 hazırlığı eklendi. GTM container yüklemesi denetim bekler. Öğrenci sonuçları/özel tokenlı yollar analitiğe alınmaz.
- Kök .env yüklemesi, açık API URL önkontrolü ve localhost HTTP build desteği Windows/Linux kurulumunu düzeltir. Yerel uzak DB engeli ve geliştirmede tek Prisma istemcisi eklendi. API/özel Web sayfalarında cache sınırları güçlendirildi.
- Sürüm 1.2.7; yeni migration/deploy yok. Gerçek kaynak, anonim karne, test ve kabul sınırları `docs/v127-release-report.md`; altyapı yol haritası `docs/infrastructure-roadmap.md` içinde.

## v1.2.6 — 2026-11-15

- Özdebir sözel ve tek optik ders sıraları/İNG takma adları düzeltildi; boş kitapçık uyarıyla A, yapısal alternatif kayıt düzeni ve bütün oturum birleştirme geliştirildi.
- Sonuç toplamada ayrı yüklemelerin birbirinin oturumlarını silmesi düzeltildi. Eksik oturumlar null kalır; mevcut snapshot ve TXT arşivi korunur.
- Başlangıç puanı + ham net × katsayı modeli, sınava özel profil ve admin tarafından yönetilen yeni sınav varsayılanları eklendi. Gerçek 427 O8126 karnesi anonim regresyonlara dönüştürüldü; T/herkese doğru ve profile özel * kuralı doğrulandı. Altı hedef puan eşleşir; beş karnede 0,001 fark açıkça raporlandı.
- FMT/PDF/üyelik için ortak bağlantı yönetimi; korumalı süreli/süresiz PDF erişimi, iptal, sayaç ve şifreli yönetici kopyalama eklendi. Eski hash-only token'lar geri üretilemez.
- Yeni parola oluşturma scrypt/yaygın parola kontrolü/15 karakter; eski bcrypt girişleri korunur. Tek kullanımlık davet sonrası güvenli otomatik oturum, onay akışını atlamadan eklendi.
- Kampüsün aynı Excel içinde harf/boşluk farklılığıyla ayrılması ve mobil derslik formu taşması düzeltildi. Hatalı satırlar atlanır; mevcut liste silinmez.
- Ortak PDF metin normalizasyonu ve cihazda bölgesel WASM OCR, güvenli önizleme/düzeltme eklendi. Gerçek Limit PDF bulunamadığından o belgeye özel kabul açık tutuldu.
- Node 22 test raporlayıcısı ve Webpack build-worker uyumluluğu düzeltildi. Additive migration ve dağıtım gereksinimleri `docs/v126-release-report.md` içindedir; canlı işlem yapılmadı.

# v1.2.5 · 2026-11-14 · yerel geliştirme

- Özdebir Sözel, Özdebir Sayısal ve Özdebir Tek Oturum ayrı sistem seçimleri olarak sunulur. Sözel/sayısal özgün FMT dosyaları indirme ve paylaşım kütüphanesine eklendi; mevcut tek oturum BLDM dosyası korundu.

- Gerçek iki TXT ve üç SEKONIC FMT ile Özdebir 1/2/9 düzenleri doğrulandı: 131/91/171 karakter. Eskişehir dosyasında 209 kayıt → 105 öğrenci; 104 çift oturum, 1 eksik sayısal.
- Kimlik/kurum çelişkileri ayrı tutulur; aynı oturumun en çok geçerli işaretlemeli kaydı kendi kitapçığı ve boşlarıyla bütünüyle seçilir. Bozuk satırlar güvenilir öğrencileri durdurmaz.
- Eksik ders neti/katsayılı neti `null`; mevcut dersler değerlendirilir, eksik oturumda tam sınav puanı üretilmez. Ekran, PDF ve Excel aynı eksiklik bilgisini kullanır.
- Yanlış FMT'de yapısal olarak tekil ve daha güvenilir alternatif denenir; konum kaydırma/doldurma yok. Sonuçlar tamamlandı, uyarılarla tamamlandı ve değerlendirilemedi olarak ayrılır.
- SEKONIC `S` alanları ve sabit değerler desteklendi; sağlanan FMT'lerin tam içerik imzasına özel doğru alan/oturum eşleştirmesi eklendi.
- Boş kitapçık otomatik A yapılmaz; kullanıcı boş kitapçıklar için açık seçim yapabilir. Tek optik gerçek örneğinde bu seçim gereklidir.
- Karne öğrenci cevabı hücresinde renk ve sembol kullanılır; tekrarlayan Durum satırı kaldırıldı. Renkler korunarak vektör desenler, belirgin sınırlar ve grafik değerleri eklendi; 1 sayfalık özet de ders grafiği içerir.
- Menü 14 px/600, grup başlıkları 12 px, belirgin aktif seçim; mobil taşma kontrolü. Sonuç penceresi gerçek sayıları gösterir, sonuç ekranına kurum/sınav seçili geçer.
- Migration ve yeni bağımlılık yok. Veritabanı/kayıt/ham TXT değiştirilmedi. Test kapsamı ve sınırlar: [v1.2.5 raporu](docs/v125-release-report.md).

# v1.2.4 · 2026-11-13 · yerel geliştirme

- FMT ve sınav önerilerine yüzdeye göre kırmızı–sarı–yeşil renklenen animasyonlu dolum eklendi.
- Aynı öğrencinin tekrar eden TXT satırları yüklemeyi durdurmadan birleştirilir. Derslerde daha çok işaretlemeli kayıt kendi kitapçığıyla kullanılır; kimlik alanlarında daha dolu kayıt tercih edilir, boş alanlar mevcut bilgiyi silmez.

# v1.2.3 · 2026-11-13 · yerel geliştirme

- TXT uzunluk, kimlik ve tekrar sorunları uyarıyla değerlendirilir. Birleşen derslerde daha çok işaretlemeli kayıt kullanılır; eşitlikte ilk kayıt korunur.
- FMT ve sınav önerileri yüzdeleriyle birlikte gösterilir; ayrı ayrı veya turuncu “İkisini de uygula” düğmesiyle seçim alanlarına uygulanır.
- TXT arşivinde yükleyen bayi/Admin ve silme düğmesi gösterilir. Silme arşivden kaldırır, kaydedilen sonuçları korur.
- Değerlendirme bitince uyarıları ve olası etkilerini açıklayan pencere açılır; sonuç ekranına kurum ve sınav seçilmiş olarak geçilir.

# v1.2.2 RC.2 · 2026-11-12 · yerel geliştirme

- TXT değerlendirmesinde FMT/sınav sınıfı ve soru dağılımı farkları yüklemeyi engellemez; eşleştirilemeyen cevaplar boş değerlendirilir, fazla işaretlemeler atlanır ve uyarılar kaydedilir.
- Sınav önerisi öğrenci kimliği, yinelenen satır ve oturum birleştirme kontrollerinden bağımsız olarak cevap alanlarından hesaplanır; kısa anahtar sonrası işaretlemeler öneriyi engellemez.
- Din K.ve A.B. ders adı eşleştirmesi eklendi. Web, API, paketler ve önizleme sürümü RC.2 olarak eşitlendi.
- Canlıya dağıtım veya push yapılmadı.

# v1.2.2 RC · 2026-11-12 · yerel geliştirme

- Cevap anahtarı ekleme için yöneticiye özel, yayınevi ve sınıfa göre gruplanan Sınav Ekle ekranı; kayıtlı sınavdan doğrudan anahtar ekleme.
- XLS/Excel içe aktarmada `İ`, `X` ve `İPTAL` iptal cevapları olarak eşlenir; soru düzenleyicide seçenek adı İPTAL olarak görünür.
- TXT ve FMT seçildiğinde uygun cevap anahtarları, işaretli öğrenci cevap dizilerine göre yüzde benzerlikle önerilir; seçim kullanıcıda kalır.
- Öğrenci/okul karne türleri ve PDF/Excel işlemleri net adlarla gruplandı; yinelenen karne şablonu seçicileri kaldırıldı.
- Sürüm numarası v1.2.2 RC.1 olarak güncellendi. Canlıya dağıtım veya push yapılmadı.

## v1.2.0 · 2026-11-12 · yerel kabul adayı

- Sistem 7108 tanımı eski veritabanı yerleşimi tarafından gölgelenmez; geçmiş kayıtlar korunur.
- Tüm TXT satırları, sabit kod, genişlik ve alan türleriyle FMT tahmini; geçersiz kitapçık değerlendirmeyi durdurur.
- Gerçek PostgreSQL ve bağımsız beklenen değerlerle yükleme → kayıt → PDF kabul testi.
- Profesyonel özet/ayrıntılı karne, okul tablosu, gerçek ortalamalar, cevap/kazanım analizi ve önizleme.
- Öğrenci hesabından yetkili profesyonel PDF; hesapsız sorguda okul/sınav/öğrenci erişim kodu.
- Belirgin cevap anahtarı araması ve salt okunur listede sunucu araması.
- Google reCAPTCHA v2 seçeneği, süre/hostname/tekrar kontrolü; anahtarsız varsayılan kapalı.
- Yeni migration/bağımlılık yok; canlıya dağıtım ve Git push yapılmadı.
- [Kabul raporu, açık sınırlar ve CAPTCHA kurulum adımları](docs/v1.2.0-kritik-kabul-raporu.md).

## v1.1.9 · 2026-11-11

- Karne ve liste çıktı aileleri ayrıldı; mevcut tasarımlar ve örneklere dayanan ek PDF seçenekleri.
- Sonuçlarda kademe filtresi, yayımlanmış sonuç kapsamı ve belirsiz öğrenci numarası koruması.
- Öğrenci/veli girişi Sonuçlar'a, yönetici alanı login sayfasının altına taşındı.
- Açıklanabilir FMT tahmini ve sistem 7108/8050 ile FMT DÖNÜŞTÜRÜCÜ.
- İsteğe bağlı Turnstile, sunucuda Siteverify/action/hostname kontrolü.
- 7108 alan bazlı hata açıklamaları ve kodlama/satır sonu regresyonları; gerçek TXT doğrulandı; hata veren kayıtlı yerleşim henüz doğrulanmadı.
- Yeni migration yok; [v1.1.9 raporu](docs/v1.1.9-release.md).

## v1.1.8 RC — 11 Kasım 2026 · yerel doğrulama

- Uygulama, Web, API, sağlık bilgisi, footer ve favicon sürümleri 1.1.8 olarak güncellendi.
- FMT alan sırası karşılaştırması düzeltildi; kalıcı TXT arşivi, tikle toplu değerlendirme ve il/ilçe/kurum seçimi eklendi.
- 133 test, gerçek PostgreSQL tarayıcı testi ve üretim derlemesi geçti. Yeni arşiv migration’ı dağıtımda uygulanmalıdır.
- Ayrıntılar: [v1.1.8 RC raporu](docs/v1.1.8-rc-release.md). Canlı dağıtım yapılmadı.

## v1.1.6 RC — Kasım 2026 · yerel geliştirme

- FMT kütüphane ve arama akışı, TXT/FMT/sınav seçimi, panel metinleri, karşılama alanı ve profil görünümü sadeleştirildi.
- Sınav değerlendirme motoru, cevap anahtarları, FMT/TXT içeriği ve kurum erişim kapsamı korunmuştur.
- Test: 124/125 geçti; Sharp native görüntüleme hatası. Build: derleme/lint/type geçti; sayfa verisi toplamada `/cevap-anahtarlari/[slug]` başarısız.
- Ayrıntılar: [güncel RC raporu](docs/v1.1.8-rc-release.md).

## v1.1.5 RC — 10 Kasım 2026 · yerel doğrulama

- Panel karşılama ve RC kutlama sayfası; ölçülü, reduced-motion uyumlu RC işareti.
- Cevap anahtarı görünürlüğü için satır ve toplu kontroller; kurum oluşturma ve FMT filtreleri sınav yüklemede.
- Okul/sınıf listesi ve karne sıralama kontrolleri; footer tarihi 10 Kasım 2026.
- Doğrulama sonuçları ve tamamlanmayan kapsam için [RC teslim raporu](docs/v1.1.5-rc-release.md).

# Kurumsal Sınav

## v1.1.1 — 9 Kasım 2026 · dağıtım bekliyor

- Kritik ek: ayrı F/O parser modülleri, bütün soruların düzenlenebilir önizlemesi, dosyaya bağlı açık onay, ham kaynak satırlarının korunması ve onaylanan tablodan cevap Excel’i. Mevcut sınava bağlanarak güncelleme.
- Yeni bütün FMT kayıtlarında koordinat/kapasite/TXT testi, kodlama ve okuyucu beyanı; doğrulama kanıtının şablonda saklanması. `20261109010000_fmt_validation` migration'ı hazır, canlıda çalıştırılmadı.
- 97 otomatik test; kapsamlı liste `1.1.1.txt`.

- F / Fernus XLS ve O / Okulizyon XLSX kazanım dosyalarını tek dosyayla içe aktarma; cevaplar, A/B çaprazları, kazanımlar ve sınav adı önizlemesi. Fernus kitapçık sekmeleri arasında cevap tutarlılığı kontrolü.
- Tek F/O kazanımı için ayrı cevap/kazanım arşiv kayıtları; ana sayfa ve değerlendirme görünürlükleri bağımsız. Resmî kodu olmayan metinler açıkça belirtilen METİN- iç kodlarıyla korunur.
- En fazla 30 FMT için çoklu seçim kuyruğu, dosya bazında ad/alan düzenleme, bilinmeyen formatta TXT testi, onaylı kayıtları tek işlemde toplu ekleme.
- Ana sayfa, uygulama ve favicon sürümü v1.1.1. Cevap anahtarı formunda yeni kayıt tarihi İstanbul takvim gününe göre başlar.
- Son kritik eklerle `20261109010000_fmt_validation` migration'ı gerekir; önceki özelliklerin migration gereksinimleri geçerlidir.

## v1.0.6 — 8 Kasım 2026 · dağıtım bekliyor

- FMT alan çakışma/sınır kontrolleri, örnek TXT ile alan önizlemesi ve kimlik alanı maskeleme.
- Elle veya Excel ile soru ekleme, A/B/C/D ve kazanım düzenleme; kayıtlı anahtarda eşzamanlı değişiklik kontrolü. Arşivde kazanım Excel önizlemesi ve geçerli örnekli şablon.

- Sınav Yükle ve Sınav Değerlendir / Sonuç Al ayrı ekranlar; toplu/sınıf listeleri, liste + karne ve soru/kazanım analizi, Excel/PDF çıktıları.
- Yükleme/yayımlama öncesi kontrol özeti, anahtar değişiminde net/puan önizlemeli yeni sonuç sürümü; eski kayıtların korunması ve öğrenci/veli yayınının kontrollü sürüm geçişi.
- Yeni migration: `20261108210000_result_revisions`; canlıya uygulanmadı.

- Kullanıcının gerçek FMT/TXT örnekleriyle doğrulanan Palme Ortaokul 8050 hazır yerleşimi, tam içerikten FMT tanıma ve 7108 → 8050 dönüşümü eklendi; sınav numarası alanı desteklendi. [8050 kullanım notları](docs/8050-layout.md).

- Kaynak/hedef FMT arasında satır bazında TXT dönüşümü; alan/ders eşleme, sabit kodlar ve hizalama, UTF-8/Windows-1254 ve CRLF/LF.
- Sığmayan veriyi kesmeyen kontrol, açık kayıp onayı, önizleme ve CSV kontrol raporu.
- Şifre girilen `/login` ekranında ayrı, görünür ve sakin hareketli kurumsal gradient; açık/koyu tema ve hareket azaltma desteği.
- Ana sayfa ve statik önizleme sürümü `v1.0.6`.

- Öğrenci ve veli girişleri, kişisel sonuç/PDF karne ekranı, veli için çocuk filtresi; diğer öğrencilerin kayıtlarını göndermeyen özel sonuç yanıtları.
- Bayi kapsamlı hesap/davet yönetimi, açık sonuç bağlantısı, yayımlama ve erişim kaldırma; eski oturumları geçersiz kılan hesap kapatma/yeniden davet akışı.
- Bayilere FMT indirme menüsü ve seçili FMT indirme; yeni dosyalarda özgün baytlar, eski 7108 şablonlarında Windows-1254 korunur.
- Yeni migration: `20261108200000_student_parent_portal`; canlıya uygulanmadı.

- Cevap anahtarı arşivi ve değerlendirme aynı sınav kaydına bağlandı; ana sayfa ve değerlendirme görünürlükleri bağımsız seçilebiliyor. Bayi yayınevi → sınıf → sınav seçiyor; eksik cevap/kazanım verisiyle değerlendirmeye açma engelleniyor.
- PDF metnine göre ayırmada gerçek karakter kutuları kullanılarak dosya adlarına komşu etiketlerin karışması düzeltildi; değişken uzunluklu numara ve isimler doğrulandı.
- Birleşik katalog migration'ı: `20261108190000_unified_exam_catalog`; canlıya uygulanmadı.

- Admin için FMT yükleme, TXT alan eşleme ve şablon sürümleme/pasife alma.
- Nartest kazanım Excel’i ve genel Excel şablonundan A/B eşleştirmeli değerlendirme anahtarı ekleme.
- Üye bayi için kurum kapsamlı TXT önizleme, sözel/sayısal oturum birleştirme, değerlendirme ve sonuç arşivi.
- Detaylı Excel listesi, soru detayları, tek/toplu PDF karne ve kurum/şube karşılaştırmaları.
- H/X soru kuralları, çoklu işaret ve Türkçe dosya kodlaması; kimlik numarası ve ham TXT saklamayan sonuç kopyaları.
- Yeni migration: `20261108180000_optical_evaluation`; canlıya uygulanmadı.

Kullanım, puan sınırları ve kurulum: [7108 optik değerlendirme](docs/7108-optical-evaluation.md).

## v1.0.5 — 8 Kasım 2026

- Sınav takviminde 2.500 satır, 50 satırlık düzenlenebilir önizleme, filtreleme, satır ekleme/silme, toplu yayınevi atama, hariç tutma ve Excel dışa aktarma.
- Mevcut yayınevlerinden tam eşleşme ve onaylı öneriler; kalıcı eşleştirmeleri görüntüleme/düzenleme/silme; ayrı seri ve kaynak isim alanları.
- Türkçe tarihler ve Excel 1900/1904 tarih hücreleri; UTC tarih standardı ve geçersiz gün kontrolü.
- API'de 100 kayıtlık gruplar, kısmi başarı, mükerrer atlama, gerçek kayıt sayıları ve ilerleme; yükleme geçmişi ve düzenlenmiş/ilişkili kayıtları koruyan geri alma.
- Takvimde toplu düzenleme ve kayıt listesinde sayfalama.
- Derslik ekleme düğmesinde uygulama içi modal; eklemede yerleşimlerin korunması; güvenli düzenleme/silme.
- Yılan için kaydırma, üç oyunda ortak ve hatırlanan ses tercihi; yeni Blok Zamanı oyunu.
- Yönetici oluşturduğu kullanıcıya 30 dakikalık tek kullanımlık şifre belirleme bağlantısı ve düzenlenebilir WhatsApp paylaşımı.
- Mevcut logolu, Türkçe karakter destekli OG PNG; ana sayfa ve giriş metadata alanları.
- Tarama öncesinde renk seçimi, tutarlı görsel dönüştürme araç adları ve mobil iyileştirmeler.

Testler, sınırlamalar ve dağıtım: [v1.0.5 sürüm raporu](docs/v1.0.5-release.md).
