# Kurumsal Sınav — Proje hafızası

Son güncelleme: 23 Kasım 2026 · v1.4.2 yerel çalışma · **READY FOR STAGING**, üretim yayını yapılmadı. Son rapor: `docs/v142-release-report.md`; dağıtım kontrolü: `DEPLOYMENT.md` v1.4.2 bölümü. 1. maddedeki işaretli renk alanı referanssız olduğundan KISMEN; v1.4.1 bağımlılık uyarıları ve canlı ortam kabulü açıktır. Bu dosya sır içermez. Yeni oturumda önce bu dosyayı, `git status` çıktısını ve son sürüm raporunu okuyun.

## Amaç ve mimari

Ticari eğitim/sınav platformu: yayınevi cevap anahtarları ve kazanımları, kurum/bayi yönetimi, TXT/FMT optik okuma, sınav değerlendirme, öğrenci/veli erişimi, karne/PDF ve Excel raporları. Kurumsal lacivert/mavi tasarım ve mevcut puanlama kuralları korunur.

npm workspaces: `apps/web` Next.js App Router/React/TypeScript; `apps/api` Express/TypeScript; PostgreSQL/Prisma. Web istemcileri `/api` REST uçlarını kullanır. Genel tarayıcı araçları dosyaları cihazda işler; yetkili panelin TXT/sonuç akışı API ve özel depoda kalıcıdır. Bu iki akışı birbirine karıştırmayın.

## Teknolojiler ve çalıştırma

- Next.js 15, React 19, Express 5, Prisma 6, Zod, SheetJS, PDFKit, Sharp, yerel Tesseract WASM/OCR.
- JWT HS256 + DB oturumu; yeni parolalar scrypt, eski bcrypt uyumluluğu; TOTP, şifreli MFA sırrı, tek kullanımlık kurtarma, güvenilir cihaz.
- Testler: `node:test`/tsx, gerçek localhost PostgreSQL/HTTP, Python Playwright/Chromium, PDF.js/Poppler.
- Kurulum sözleşmesi Node >=20.9; önerilen Node 22. v1.3.3 bu ortamda Node 24.22.1 ile doğrulandı. Eski oturumun Node 18.19.1 sürümü desteklenmez; Sharp testleri bu sürümde başarısız olur. v1.3.8 son kabulü Node 22.23.5 ile yapıldı.
- Bu oturumdaki hedef Node 22 dizini: `/home/burak/.nvm/versions/node/v22.23.5/bin`. Cache runtime dizini artık Node 24 içerebilir; önce `node -v` doğrulayın. Gerektiğinde PATH başına ekleyin; uygulama koduna makineye özgü yol sabitlemeyin.
- Temel komutlar: `npm test`, `npm run test:report`, `npm run build`, `npm run db:generate`; `prisma validate --schema apps/api/prisma/schema.prisma`.
- `.env`, API `.env`, Web `.env.local` ve hosting ortamı desteklenir. Sırları okumadan/yazdırmadan mevcut örnek değişken adlarını `.env.example` üzerinden inceleyin. `NEXT_PUBLIC_*` değişkenlerine sır koymayın.

## Modüller ve gerçek roller

Prisma Role enum: **SUPER_ADMIN, DEALER, SCHOOL_ADMIN, STUDENT, PARENT**. Ayrı PUBLISHER veya REGION rolü/paneli yoktur. Yayınevi bir katalog/içerik nesnesidir; bölge yayınevi/il/ilçe bazlı bayi yetki kuralıdır. Yeni rol varmış gibi yetki genişletmeyin.

- Yönetici: kullanıcı/bayi, içerik, sınav/anahtar/FMT, log ve Sistem Merkezi; TOTP zorunlu; kritik bayi/temsil işlemlerinde son 5 dakika MFA gerekir.
- Bayi ve çalışanları: aynı bayi sahipliği altında kurumlar; yedi işlem izni, bölge kuralları ve Türkiye gününe göre öğrenci kotası. Varsayılan yetkiler açık, bölge serbest, kota sınırsızdır.
- Kurum yöneticisi: kendi kurumunun eski `/api/exams` akışı; bayi optik/yönetici uçlarına erişmez. Aktif kuruma bağlı olmalıdır. Bu sürümde yeni kurum optik paneli eklenmedi.
- Öğrenci/veli: açıkça verilmiş öğrenci sonuç bağlantıları; aktif kurum, yayımlanmış/güncel/silinmemiş sonuç şartı. Öğrenci tek kimlik; veli birden fazla çocuk bağlantısı kullanabilir.
- Misafir: kişisel erişim koduyla sonuç; herkese açık kurum/sınıf dizini yoktur.
- Paylaşım/davet, TXT arşivi, sınav takvimi, cevap anahtarı arşivi, PDF araçları, blog, başvuru ve iletişim, denetim/Test Merkezi ayrı modüllerdir.

## Veritabanı ve özel depolama

`apps/api/prisma/schema.prisma` kaynak otoritesidir. Ana ilişkiler: Dealer → School → Exam/OpticalResult; Publisher → PublishedAnswerKey → OpticalKey/AnswerKeyFile; FmtTemplate; User → AuthSession/TrustedDevice/StudentResultAccess; FmtShare; OpticalTxtFile; DealerRegion/DealerDailyUsage/DealerQuotaStudent/DealerActivity; AuditLog/SystemEvent/Analytics*/SecurityRateBucket.

Sonuçlarda snapshot JSON, anahtar fingerprint'i, kaynak/sonraki revizyon ilişkisi, yayın durumu ve soft delete bulunur. Kimlikler şifrelenir/hashlenir. Bayi kurum sahipliği ve parola değişikliği iptali v1.3.2 DB trigger'larıyla da korunur. Mevcut puan katsayılarını, yanlış götürme, iptal/herkese doğru ve eksik oturum davranışını onaysız değiştirmeyin.

TXT dosyaları `STORAGE_DIR` altındaki özel, şifreli arşivdedir. Kök `.env`, `storage/`, gerçek kullanıcı belgeleri ve `test-results/` dağıtım/Git içeriği değildir. JWT/TXT/MFA anahtarlarını değiştirmek eski şifreli kayıtların erişimini etkileyebilir; koruyun.

## Hosting ve deployment

Mevcut plan/kurulum: Veridyen cPanel + Passenger, Neon PostgreSQL, ayrı Next Web/API ve özel dosya deposu; gerçek hesap yapılandırması bu çalışmada doğrulanmadı. Sağlayıcı/depo adı değiştirilmez. `apps/api/passenger.cjs` giriş sözleşmesi korunur; derlenmiş API font/lib/şablon varlıklarını içermelidir.

Üretimde HTTPS API URL'si Web build öncesi gerekir. `RATE_LIMIT_STORE=database`, ayrı MFA anahtarı, CAPTCHA ve doğrulanmış Origin/proxy ayarları mevcut sözleşmedir. `DIRECT_URL` Prisma tarafından otomatik okunmaz. Worker başına ağır iş koruması vardır; dağıtık kuyruk değildir. Ayrıntı: `docs/infrastructure-roadmap.md` ve son sürüm raporları.

**Canlı deploy, migration, seed/reset, veri silme, Git push bu çalışmada yapılmadı.** v1.3.3 yeni migration/bağımlılık gerektirmez. v1.3.2'den eski kurulumda bekleyen migration ve eski kişisel kod indeksi adımları hâlâ geçerlidir; `docs/v132-release-report.md` okunmalıdır.

## v1.3.3 teknik kararları

- Temsil oturumu ana yöneticinin rol/MFA kanıtı ve güvenilir cihazının geçerliliğini de doğrular; cihaz iptali iki oturumu da kapatır.
- Aktif kuruma bağlı olmayan SCHOOL_ADMIN oturumu reddedilir. Sınav oluştururken istenen kurum ve yetki kapsamı Prisma AND ile birleşir; başka kurum isteği sessizce kendi kurumuna çevrilmez.
- Sıralama indeksleri öğrenci/sınıf/kurum/il/ilçe/genel gruplarıyla kurulur. Rekabet sırası, null puan katılımı, anahtar fingerprint'i ve `1e-8` toleransı korunur. Diğer kurumların ham öğrencileri istemciye çıkmaz.
- PDF/Excel sonuç erişimleri Map indekslidir. PDF kart sayfaları öğrenci tamamlanınca flush edilir; öğrenci içi sayfa numarası korunur. Son çıktı hâlâ Buffer'dır, uçtan uca streaming yoktur.
- Excel sınırları: 10 MB giriş, ZIP girdisi 20 MB/toplam 40 MB açılma, sayfa başına başlık dahil 10.001 satır ve 256 sütun, en fazla 64 sayfa ve toplam 2 milyon dikdörtgen hücre alanı. Bir ek satır sentinel olarak okunur; aşımda kısmi veri döndürülmez. Şablon sütun/anlamları değişmez.
- Analitik hem Web hem API'de sabit public yol listesi kullanır; listelerin eşitliği test edilir.
- v1.3.3 sürümü paketler, favicon/OG, footer, statik önizleme ve Sistem Merkezi/Test Merkezi raporunda tutarlıdır. Eski `/release-candidate` adresi yer imleri için çalışır; görünür aday etiketi yoktur.

## Sürüm geçmişi ve kanıtlar

- v1.2.5–v1.2.9: Özdebir ayrı oturumlar/merge, puan profilleri, paylaşım/parola, pano/Excel, yerel OCR ve gerçek anonim kaynak kabulü.
- v1.3.0: A4 kartlar, 1/2 sayfa, tam kazanım metinleri ve genel katılım seçenekleri.
- v1.3.1: öğrenci odaklı ziyaretçi tasarımı.
- v1.3.2: bayi sahipliği/politika/kota, oturum/TOTP/temsil, özel sonuç kodu ve güvenlik migration'ı.
- v1.3.3: mevcut sistemi sağlamlaştırma; ayrıntı `docs/v133-release-report.md`, geçmiş `CHANGELOG.md`.
- v1.3.3: 238 regresyon; gerçek HTTP/PostgreSQL 22 mevcut + 7 ek grup; gerçek Web/API 9 mevcut + 6 ek ekran/tema grubu; API/Web build, Prisma validate/generate ve temiz yerel DB migration zinciri başarılı.
- Sentetik mikrobenchmark: 100.000 toplam / 1.000 kurum öğrencisi sıralaması yaklaşık 225 ms. Gerçek kapasite garantisi değildir. Toplu PDF: 150 öğrenci/300 sayfa, en çok 2 tampon sayfa; çıktı Buffer/font belleği devam eder. Ölçümler rapordadır.
- Kanıtlar `test-results/v133/`, önceki betiklerin güncel çıktıları `test-results/v132/`; bunlar sahte hesap token'ları/QR içerebilir, Git'e eklenmez. PDF görsel QA yerel yapıldı. Depodaki eski PDF klasörleri başlangıçta untracked idi; kullanıcı belgelerini silmeyin.

## Bilinen sınırlar ve sonraki işler

- Bu çalışmada güncel `npm audit` tamamlanamadı: ağ erişimi yoktu; ayrı deneme dependency metadata dış aktarımı nedeniyle otomatik onay denetimince reddedildi. v1.3.2'nin eski temiz sonucu güncel güvenlik kanıtı değildir. İzin sonrası resmî npm audit gerekir.
- Yüz binlerce öğrenci için motor/sorgu/HTTP uçtan uca yük testi yok. `examView` aynı sınavın güncel snapshot'larını belleğe alır; öğrenci merge/yeniden değerlendirme JSON işlemleri hâlâ maliyetlidir. Asenkron rapor kuyruğu, normalize sonuç/ölçülü özet indeksleri, iş idempotency ve revizyonlu cache ayrı staging projesidir.
- Ağır iş sınırı worker bazlıdır. Birçok Passenger worker/ortak depo ve havuz limitleri ölçülmeden ölçek artışı yapılmaz.
- SheetJS ayrıştırması/ZIP açılması senkron; sınırlar risk azaltır, CPU izolasyonu sağlamaz. Excel dev dosyası parçalara bölünmelidir. CSV indirme akışlarında kullanıcı metni/formül güvenliği ayrıca korunmalıdır.
- Gerçek Windows, Microsoft Excel uygulaması, canlı Google/SMTP, TLS/proxy/Neon/cPanel ve gerçek yedek geri yükleme testi yapılmadı. Bağımsız pentest değildir.
- Gerçek Limit PDF kabulü ve bazı resmi puan profili/0,001 gösterim farkı tarihsel raporlarda açık: `docs/v126-release-report.md`, `docs/v128-release-report.md`.
- Test Merkezi sourceDigest değişince eski kabul kanıtını kullanmamalıdır. Yeni testleri `tests/run.ts` içine ekleyin; `npm run test:report` kaynakla tutarlı raporu üretir.

## Sonraki oturum kontrol listesi

1. Kullanıcının yeni talebini ve `git status` ile mevcut değişiklikleri okuyun. Kullanıcı değişikliklerini geri almayın.
2. Node sürümünü doğrulayın; production DB adresini test komutlarına vermeyin. Dosya/DB silme ve deployment için açık yetki gerekir.
3. Son rapordaki test komutlarını seçin. API güvenlik betikleri yalnız `127.0.0.1:55442/ks_v132` kabul eder; aynı portta kullanıcı DB'si varsa yeniden kullanmayın.
4. v1.3.3 testleri yerel `ks-v133-test` isimli Docker PostgreSQL 16 geçici konteyneriyle çalıştırıldı. Konteyner ve test sunucuları iş sonunda durduruldu; canlı servisler etkilenmedi. Docker imajını/sistemi değiştirmeyin.
5. Yeni değişiklikleri CHANGELOG ve bu dosyaya, doğrulama sınırlarıyla birlikte yazın; asla sır eklemeyin.

## v1.3.4 deneyim ve iş akışı

- Ayrıntı ve doğrulama sınırları: `docs/v134-release-report.md`; işletim prosedürü `DEPLOYMENT.md`. Yeni DB migration/bağımlılık yok; canlıya işlem yapılmadı.
- Ortak `ExamWorkspace` mevcut Excel/PDF/manuel/toplu bileşenlerini korur. Eski section bağlantıları güvenli sabit bölüm listesiyle açılır. Yeni ayrı rol/uç yoktur.
- Katılım seçenekleri `showGeneralParticipation` ve `showSchoolParticipation`, varsayılan true. Bütün öğrenci karneleri referans üreticiye gider; flags PDF/Excel görünümüne etkir, sonuç verisine etki etmez. Liste PDF'leri eski görünümü korur.
- Yerel TXT önerisi önce arşive yüklenir; dosya nesnesi tekrar kullanımı ve API sahip/checksum transaction kilidi tekrar kaydı önler. Aynı sahip/aynı içerik aktif kayıt ID'sini tekrar alır. Uploader limit/şifreleme/yetki korunur.
- Konum kaynağı `apps/api/lib/turkey-locations.json`, ortak helper `.ts`, kaynak doğrulaması `docs/turkey-locations-source.md`. DB metin kolonları korunur; yeni yazımlar kanonik. `scripts/audit-school-locations.ts` salt okunur; canlıda otomatik normalizasyon/birleştirme yapılmaz. İl/ilçe dinamik sıralamaları bilinen eski ASCII yazımları birleştirir, geçmiş puan değişmez.
- Ana sayfa `home-report.webp` sentetik PDF'den üretilir; yeniden üretim `scripts/generate-home-report.ts` + Poppler/Sharp. Otomatik sınavlar arası kazanım/gelişim motoru yok; tanıtım bunu açıklar. Yeni animasyon paketi yok.
- Yerel kabul için bu oturumda yeni `ks-v134-test` PostgreSQL konteyneri kullanıldı; 55442/ks_v132 adresi eski test yardımcılarının sabit sözleşmesidir. Kullanıcı/önceki DB tekrar kullanılmadı. Son test sayıları sürüm raporu ve Test Merkezi JSON'da tutulur. Üretim Google/cPanel/Neon/backup restore kabulü açık kalır.

- v1.3.4 son yerel kabul: 245/245 regresyon; API/Web build ve Prisma validate/generate; HTTP 22+7+5 ve tarayıcı 9+6 grup, PDF/ZIP içerik kontrolleri. Test Merkezi digest artık yeni işletim betikleri, paket/lock ve anonim hero görselini de kapsar.

- İş bitiminde bu oturuma ait Web/API test servisleri ve `ks-v134-test` konteyneri durduruldu; sentetik DB/dosyalar silinmedi. Önizleme son kontrolde yerel PDF.js ile gerçek canvas olarak doğrulandı (yerleşik PDF eklentisindeki boş görünüm giderildi).

## v1.3.5 katalog ve öğrenci kodları

- Kaynak rapor `docs/v135-release-report.md`. Yeni migration `20261117220000_v135_catalog_student_portal`: nullable publisher iletişim/açıklama ve 6 yeni katalog/öğrenci erişim tablosu. Eski veriye backfill/silme yok. Production'a uygulanmadı.
- TXT kayıt/öğrenci üst sınırı 5.000; dosya 2 MB, satır 4.000 karakter. FMT puanlama ve tüm satırları inceleme korunur. Ayrı eski 500 öğrenci tavanı da güncellendi.
- Publisher transfer ayrı endpoint, önizleme/confirm, stale guard, takvim/isim çakışması, SUPER_ADMIN, transaction. Genel multipart edit bu yolu atlayamaz; içerik/snapshot değişmez. Bayi bölge izinleri yeni yayıneviyle değerlendirilir.
- StudentPortal akademik yıl+kurum+öğrenci no; 24 karakter/192 bit code, DB yalnız HMAC; JWT purpose/version, yenilemede iptal. Manuel doğrulanmış sonuç grant'leri; numara ile otomatik geçmiş eşleme yok. Revizyonlar kimlik özetiyle izlenir. Kurum yöneticisi, bayi kapsamı ve admin; XLSX dışa aktarım kodları yeniler, bir kez verir. Kurum kodları PDF/XLSX olarak tek seferlik alınır.
- Mağaza varsayılan kapalı. Status dışında public API/SSR kapalıyken 404; admin hazırlığı açık. Kategori/marka/ürün, tek kategori/ürün; HTTPS görsel URL. Ödeme/sipariş yok. Import tam doğrulama+actor-bound önizleme token+snapshot digest; Serializable transaction, stale/DB hatasında rollback; SIL silmez.
- Mevcut JSON yayınevi sunum mapper'ı Decimal prototipini kaldırır; mağaza yanıtları mapper'dan önce JSON-native biçime çevrilir, fiyat string kalır. Bu davranışı silmeyin.
- Yeni tests/e2e/v135-http.cjs ve serve harness yalnız 127.0.0.1:55445/ks_v135 kabul eder; bu çalışma için yeni ks-v135-test konteyneri. Eski test DB'lerini veya production'ı bu scriptlere vermeyin. Sentetik seed/token kanıtları test-results/v135 içinde Git dışındadır.
- 251/251 offline test ve 14 gerçek HTTP/DB grup. 5.000 sentetik 10 soruluk TXT: tek-aday FMT ~360 ms, parse ~3,13 saniye; gerçek 90/120 soruluk üretim kapasitesi değildir. Mevcut PDF regresyonları korunur. Yeni kaynak/migration/fixture digest'e dahildir.
- Canlı deployment, production migration, seed/reset, commit/push yapılmadı. Yeni npm bağımlılığı yok; sürüm bump lock dosyasında yalnız root/API/Web manifest alanlarını değiştirir (libvips 1.3.4 bağımlılıkları korunur).

- v1.3.5 son tarayıcı kabulü: 14/14 grup, altı genişlik/tema kombinasyonu, mağaza kapalı/açık, kurum seçimi ve yeni admin ekranları; hareket açık mobilde sonlu oynatma ve yeniden oynatma. Kod PDF A4 çıktısı ayrıca render edilip incelendi.

- İş sonunda bu oturumun 4015 API / 3115 Web test servisleri ve ks-v135-test konteyneri durduruldu. Sentetik DB/dosyalar ve kullanıcı PDF klasörleri silinmedi. Test Merkezi 251/251 ve 14 HTTP + 14 UI kabulünü güncel kaynak özetiyle gösterir.

## v1.3.7 yerel değişiklik ve kabul

- Rapor: `docs/v137-release-report.md`. Başlangıç commit’i `0a85371` v1.3.6; manifestlerdeki eski 1.3.5 alanları root/API/Web/lock ile 1.3.7’ye hizalandı. Production, commit ve push işlemi yok.
- Admin sonuç editörünün kök nedeni audit `summary` düz metinken JSON.parse çağrılmasıydı. `auditSummaryText` sunum katmanında metin/JSON ayrımı yapar. Sonuç okuma `readResultSnapshot` ile nesne/string-JSON’u doğrular; bozuk veri boşlaştırılmaz, 422 döner. Edit revizyonları da metin snapshot yazımıyla aynı Serializable transaction içindedir.
- CPU işleri en fazla iki process-local lazy worker; kullanıcı başına bir ağır HTTP iş, worker heap 256 MB, 30 sn idle kapanma/60 sn iş üst sınırı. Redis/daemon yok, dağıtık kuyruk değil. Worker arızasında ana thread fallback yok. Gerçek lsnode desteği ve toplam hosting RAM/bağlantı sayısı staging kabulü gerektirir.
- `SearchHistory` gün/ifade sayımı, yalnız gerçek submit; hassas ifade filtresi, rate limit, 30 gün, SUPER_ADMIN liste/temizleme. Yeni `QuestionArchive` yalnız temel; tüm booklet API kapalı. Session/version/booklet/source/answer/rights tam eşleşir, boş politika UNDECIDED.
- Member audit mevcut AuditLog üzerinden; CLIENT_NAVIGATION güvenilir sunucu işlemi değildir. Fiziksel audit saklama/temizleme uygulaması eklenmedi: otomatik onay denetimi bu silme adımını reddetti. Mevcut loglar korunuyor.
- Oyun sahibi kullanıcı tarafından `admin@kurumsalsinav.com` olarak belirlendi. Aktif/doğrudan SUPER_ADMIN oturumu server capability kontrolünden geçer; diğer admin/temsil/bayi/ziyaretçi reddedilir. 404 oyunları izin sonrası mount edilir.
- Altın SVG kilidin dönüş/oturma/ışığı `--scene-progress` saatiyle; panel ActionButton paleti yalnız `.dashboard[data-management=true]`. FMT dönüştürücü araçlar sonunda; yeni bayi FMT yönetim yetkisi yok.
- Yeni migration’lar `20261118180000_v137_search_question_archive` ve `20261118183000_v137_archive_index_name`. Yeni boş `ks-v137-test` PostgreSQL 16 konteynerinde 23 migration, son şema diff’i boş. Önceki migration’lar değiştirilmedi.
- Son regresyon 263/263; yeni HTTP 10 grup, önceki HTTP 14 grup; 4.995 HTTP/rollback ve 5.000 worker hesabı. Gerçek Chromium kanıtları `test-results/v137/ui`; seed/token dosyaları paylaşılmaz. Yerel kapasite koşulları ve sınırlamalar raporda; canlı hosting rakamı değildir.
- Özgün canlı merge hatasının dosyası/anahtar-parent sürümü sağlanmadı; kesin canlı kök neden bulunmuş sayılmaz. Yerel Web build http://localhost:4015 içerir; canlı HTTPS adresiyle yeniden build gerekir. Test süreçleri/konteyneri iş sonunda durdurulur; sentetik veriler ve kullanıcının PDF’leri silinmez.

- v1.3.7 son durum: 263/263 kaynakla eşleşen Test Merkezi; 11/11 Chromium grubu, disabled geçiş kontrastı dahil. Web/API yerel servisleri ve yalnız ks-v137-test durduruldu; test verileri silinmedi. Özgün TXT/cPanel ve fiziksel audit saklama kabul sınırları raporda açık.

- v1.3.7 PDF footer ek talebi: `showSiteAddress` varsayılan true. Panel export, public-result PDF ve reader PDF doğrulanmış seçenek alır; tüm öğrenci karneleri referenceReportPdf footer’ında yalnız domain metnini atlar, sayfa numarası kalır. Panel/public/reader mevcut karne ayarlarına checkbox ve web karne önizlemesine aynı flag eklendi. Altı şablon × tekli/toplu PDF regresyonu ve Poppler görsel QA, `tests/v134.test.ts` ve `test-results/v137/pdf-footer`. Migration/üretim işlemi yok.

- Sınava özel logo ek talebi: `ExamReportLogo` okul+anahtar unique kaydı, `20261118193000_v137_exam_report_logo` ek migration (yerelde toplam24; production’a uygulanmadı). Admin/bayi `canEditResult` ile PUT, kendi okulunda canExport ile GET; raster2MB/4MP doğrulama ve1200×240pxPNG normalizasyonu (512KB üstünde640×128 fallback) `report-logo-image.ts`. Metadata zenginleştirme yalnız ilgili okul/sınav logosunu PDF’ye yükler; yeni student-portal PDF akışında da okul/anahtar bağlamı taşınır (public JSON’a eklenmez).
- `ExamReportLogo` panel bileşeni checkbox/file/save/preview; PDF başlığı sabit53pt, customlogo300×31pt alana oranlı sığar. Özel logoda üst platform kilitlenmesi kaldırılır; her sayfanın sağ altında orijinal K+Kurumsal Sınav kalır, .com yok. Pageno altortada; showSiteAddress bağımsız solaltURL. Web karne önizlemesi de panelde bu görseli kullanır.
- Logo HTTP8/8, gerçek bayi UI4/4, öncekiportalHTTP14/14; geniş/dik/kare PDF renderQA ve Node266/266. Kanıt test-results/v137/report-logo. Başka bayi/kurum/sınavın logosu okunup değiştirilemez; snapshotrevizyonları değişmez. Logo motoru lazy import: modül yoksa API boot’u yerine yükleme503 alır.


## v1.3.8 çalışma alanı ve kabul sözleşmesi

- Rapor: `docs/v138-release-report.md`; başlangıç/canlı referans `43330b7`. Root/API/Web/lock sürümleri 1.3.8. Yeni migration yok, mevcut 24 dosya değişmedi. Production/commit/push yok; kullanıcının önceden untracked PDF'leri korunuyor.
- Tema varsayılan light, root head betiği yalnız kayıtlı dark uygular; sistem tercihi kullanılmaz. PDF iframe aynı origin parent'tan tema ve görünür yükseklik alır; modal açılışı araç alanını görünür yapar. CSP gevşetilmedi. PDF.js mevcut yerel 4.10.38, jsPDF 2.5.1/AutoTable 3.8.4 yerel aynı sürümler; Tailwind 3.4.17 statik utility CSS. Lisanslar vendor altında.
- `fmt-share` ve `fmt-download` aynı bileşen. `fmt-display-library.ts` byte/layout/active/publisher/grade/validation eşliğiyle muhafazakâr sunum tekilleştirir; DB referansları değişmez. Aynı FMT adları birleştirme gerekçesi değildir. Yazım yolları advisory lock 1387108 kullanır. Tekli tekrar kontrolü yayınevi/sınıf/kaynak, özgün bayt, yerleşim ve doğrulama bağlamını korur; farklı kapsam/okuyucu/kodlama yeni kaydı engellemez. İndirme ortak helper, paylaşım mevcut bileşen.
- `/deletion-browser`: yetkili okul ID'lerinden DB agregasyonu, 25 kayıt/düzey; snapshot öğrenci dizisi uygulamaya çekilmez. JSON string/bozuk veriyi ayırır. `pg_input_is_valid` nedeniyle PostgreSQL 16+ staging kontrolü gerekir. `/api/shares/browser`: DB filtreleme/sayfalama; eski API ve public tokenlar korunur.
- CPU `readParse` normalde okuyucu+parse tek aktarım; eşleşme eksikse parse alternatif liste sonrasına ertelenir. Çekirdek algoritma değişmedi. `resource-admission.ts`: ortak özel storage/same host altında hard-link tabanlı iki yuva, PID/start-time ile ölü süreç kurtarma; 1 GiB süreç RSS kabul tavanı. `CPU_ACCOUNT_PROC_MEMORY=true` ancak `/proc` UID'nin gerçek CloudLinux hesabını temsil ettiği doğrulanınca açılır; varsayılan kapalı. Host RAM/CPU hesabın kotası sayılmaz. Kalıcı kuyruk/job-resume yok.
- 5.000 satır/TXT, 2 MB, 4.000 karakter korunur. Büyük ayrı oturum karşılaştırması iki dosyanın mevcut sıralı parse/merge akışıdır; tek istekte >5.000 ham satır destekleniyor denmez. 10.000 PDF kontrol kaydı arayüz testidir, gerçek PDF kapasitesi değildir.
- 150 özgün söz/10 kategori; eski 50 kaynaklı ifade `verified-quotes.json` arşivinde. Kayıtlı sıra ilerler, API yok; saat 30 sn güncellenir. Ana sayfa 9 modülü kullanıcı işlevlerine göre sayar, servis/process sayısı değildir; akademik gelişim motoru ve kapalı kitapçık sayılmaz.
- Yeni izole konteyner `ks-v138-test`, eski harness uyumu için localhost 55445/ks_v135. Önceki konteynerler kullanılmadı. Tarayıcı koşucu `v138-browser-acceptance.cjs` kendi 4015 API/3115 Web servislerini açıp kapatır. Kaynak digest yeni web/data ve jsPDF varlıklarını kapsar; v138 acceptance kanıtı yalnız aynı digest'te kullanılabilir.
- Ölçüm ve doğrulamanın son sayıları raporda ve Test Merkezi JSON'dadır. Worker benchmark'ı gerçek 43330b7 havuzuyla aynı çekirdeği karşılaştırır; 24 sonuç hash'i eşliği zorunlu. HTTP sorgu sayıları eşzamanlı normal probe/audit'i de içeren süreç farkıdır. Yerel kapasite hosting taahhüdü değildir.

- v1.3.8 kaynak sınırı aktif CPU işleri içindir. Süreç başına 30 sn idle havuz devam eder; toplam resident worker sayısı global iki sanılmamalı. LVE belleği ve Passenger process sayısı staging kabulünde birlikte ölçülür.
- Son yerel kabul: Node 22.23.5 ile 269/269 regresyon, 24 birebir performans karşılaştırması, güncel HTTP/tarayıcı grupları, 62 ekran/tema kontrast görünümü (0 bulgu), gerçek PDF/XLSX/ZIP ve derlenmiş worker/paket kontrolleri geçti. Ayrıntılar `docs/v138-release-report.md` içinde. Test Merkezi ve derlenmiş kopyası güncel kaynak özetiyle eşleşir. Yalnız `ks-v138-test` durduruldu; sentetik DB ve kullanıcının önceki PDF dosyaları silinmedi. Commit/push/dağıtım ve production DB işlemi yapılmadı.


## v1.3.9 kesinti sonrası durum

- Başlangıç `eee6727`; ayrıntılı denetim/teslim kaydı `docs/v139-release-report.md`, devam noktası `docs/v139-progress.md`. **Yardım sistemi eksiksiz kabul edilmedi; canlıya hazır denmemeli.** Mevcut kullanıcı PDF dosyaları korunur.
- Duyuru modeli/API/yönetim/ana sayfa, açık onaylı idempotent geçmiş importu; zamanlanmış FMT/PDF paylaşımı, kategori bazlı SQL listeler; yalnız ana sayfada karşılama, birleşik PDF merkezi ve 200–380 px menü kaynakta var.
- Yeni migration `20261119210000_v139_announcements_scheduled_shares`: eklemeli duyuru tabloları + nullable FmtShare.startsAt. Yalnız sentetik `ks-v139-test`, 127.0.0.1:55449/ks_v139 üzerinde kullanıldı. Canlıya uygulanmadı; prod migration/seed/reset/db push/migrate dev/deploy yasak talimatı sürer.
- ZIP tek istek/ortak view, değişmez font baytları ve istek kapsamlı özet/öğrenci indeksleri kullanır. Özel diske STORE ZIP, bir PDF tamponu, v138 ortak CPU lease, iptalde temizlik. İlerleme ham ikili çerçeve; terminal boyut doğrulaması olmadan başarı yok. Tarayıcı tamamlanan ZIP'i Blob olarak tutar. Kurum/sonuç/logo için global cache yok.
- Kaydedilmiş 22 sentetik performans örneğinde 6 öğrenci iki sayfa 0,886 → 0,670 sn, 60 → 10 sorgu; 500 öğrenci 80,495 → 38,163 sn, 5.010 → 10 sorgu. Özgün canlı dakikalar süren vaka yeniden üretilemedi. Alt aşamaların tamamı ve kontrollü paralellik henüz ölçülmedi. Gerçek hosting kapasitesi iddiası değildir.
- Kesinti sonrası 278/278 çevrimdışı regresyon (269 eski + 9 yeni), 20 gerçek yerel HTTP grubu, 8 Chromium grubu, Prisma validate, API/Web production build başarılı. Test kaynak digest'i eşleşir. Node 22.23.5, test runner heap 512 MB; uygulamanın RSS/CPU kabul eşikleri azaltılmadı. Çalıştırılmayan eski entegrasyon betikleri başarılı işaretlenmez.
- Yardım motoru lazy yüklenir; sentetik animasyon ve gerçek tur kayıt başlatmaz. 84 dosyada 709 JSX/Link kontrol şablonu envantere kayıtlı, 21 etiket incelemesi bekler. Bu rakam tekil ayrıntılı açıklama tamamlanma sayısı değildir. PDF HTML/JS ve sandbox Sınav Listesi Düzenleyici iç kontrolleri, her koşullu/rol durumunun anlamlı anlatımı ve özel animasyon kabulü eksiktir. Bayi yardımında admin kontrollerinin çıkmaması test edildi.
- Yardım geliştirme kuralı: yeni kullanıcı kontrolünde kararlı yardım hedefi, işleme özel açıklama/önkoşul/uyarı ve ilgili rol/akış güncellenir; `scripts/help-inventory.cjs` açıkça çalıştırılır. Envanter eşleşmesi, içerik kalitesi testinin yerine geçmez.
- Bu oturum commit/push/deploy veya canlı veri işlemi yapmadı. Localhost API ile Web build canlıya kopyalanmaz. Sonraki adım raporun açık kabul maddeleri, özellikle eksiksiz yardım ve tam performans ölçüm matrisidir.


## v1.3.9 ana sayfa denetimi eki

- Tüm gerçek ana sayfa sahneleri v139 kaynaklarıyla denetlendi; ayrıntı `docs/v139-release-report.md` → “Ana Sayfa Tanıtım ve Animasyon Denetimi”. Yanlış otomatik sınavlar arası kazanım anlatımı tek sınav analizine çevrildi; 2.000 kişilik kapasite sayacı kaldırıldı.
- 12 işlevsel alan, 10 ürün sahnesi; kompakt PDF kartı mevcut araç satırındadır. Duyuru 7 gün/geçmiş, paylaşım başlangıç/aktif/bitiş, güvenli yardım akışı tamamlandı. Bu, bütün panel yardımının eksiksiz olduğu anlamına gelmez.
- Altın kilit ve bayrak kaynakları değişmedi. Teknik test/kaynak/kapasite sayıları müşteriye pazarlanmaz. ZIP karne tanıtımı eklenmez. `v139-home.cjs/.py` gerçek Chromium + sentetik public API kullanır, DB gerektirmez.

- Ana sayfa ekinin son kabulü: 27/27 Chromium grubu temiz çıkış, 278/278 regresyon, Web build; 10 sahne/12 işlevsel alan. Görünüm başına 99 kontrast örneği geçti. Manifest gzip +1.202 bayt (%1,02); gerçek hosting performans vaadi değil. Detay ve kanıtlar sürüm raporundadır.


## v1.4.0 — yerel uygulama ve önemli devam kuralları

- Kaynak rapor `docs/v140-release-report.md`; çalışma kaydı yeni kopya yerine `docs/v139-progress.md` içine eklendi. Başlangıçta tracked kullanıcı değişikliği yoktu. Canlı DB/deploy/duyuru/commit/push yok.
- Duyuruların 30 belgeli sürüm/RC kataloğu `sourceEvent` ile idempotent arşivlenir; pasif/silinmiş kayıtlar ve doğrulanmamış tarih korunur. Yeni release1.4.0 yalnız ayrı admin onayıyla yayımlanır.
- Rehber canlı kayıt etiketini okumaz; kaynak metadata ID/varyantına göre tekilleştirir. Envanter etiketi sıfır boş olabilir; bu bütün koşullu işlev açıklamalarının kabul edildiği anlamına gelmez.
- Admin/bayi FMT listesi ortak; PDF üç çalışma alanı+sekiz araç aynı kart grid'inde. Gömülü PDF kartları çiftlenmez; açılan alan korunur. Öğrenci PDF ZIP tanıtımı yok.
- Yeni additive migration `20261120120000_v140_exam_structures`: değişmez kişisel soru yapıları. FMT fiziksel yerleşiminden ayrıdır. Eski sınavlar yeni şablona bağlanmaz. Yalnız yeni `ks-v140-test`, localhost55450/ks_v140 üzerinde uygulandı; diğer test/production DB'leri kullanılmadı.
- Optik editör 30 satır/memo, 3/4/5 seçenek, A–D çapraz/görünüm ve mevcut Excel modelini kullanır. İlk dokuz kolon sabit; opsiyonel metadata kolonları scoreBase/multipleMark/optionCount/özgün ders/source'ı korur. Eski anahtarların satır toleransı korunur; yeni açık optik yapılarda FMT kapasitesi aşılamaz.
- Anahtar revision AuditLog'a eski/yeni JSON/fingerprint+gerekçe olarak transaction içinde yazılır; temizlenmez. Değerlendirilmiş anahtarda ONAYLA zorunlu, multipart bypass engelli. Eski boş anahtar güvenle tamamlanabilir.
- Batch re-evaluate mevcut motor/worker ile en fazla100 yükleme/5000 öğrenci kaydı; bütün kapsam tek transaction, hata tümünü geri alır. Eski sürümler/öğrenci düzenlemeleri/TXT kullanımları korunur. Yeni öğrenci yayını kapalıdır. Sonuçlara stale anahtar durumu eklenir; eski revizyon raporu başlığında belirtilir.
- Merkezî exports SUPER_ADMIN; CSV/XLSX güvenliği, imzalı kapsam+digest, özgün TXT/FMT ve manifest. Audit önizlemesi asOf ile kendi loglarından korunur. Tam audit arşivi mevcut TXT anahtarıyla özel dizinde şifrelenir; indirme SHA ve ONAYLA olmadan temizlik olmaz, süresi dolan en çok100 kayıt. Anahtar revision/cleanup süresiz korunur. Audit cron'u yok; mevcut teknik SystemEvent/analytics timer'ı korunur.
- Eski PDF testleri ilk koşumda output/pdf/v126 ve v130 örneklerini yeniden yazdı. Başlangıç yedeği bulunamadı; önceki baytlar korunmuş/geri yüklenmiş sayılmaz. Kullanıcı bilgilendirildi. Bu üç test artık test-results/regression-pdfs kullanır. Bundan sonra output altına yazan testleri çalıştırmadan hedef yollarını inceleyin. Özgün TXT/FMT ve canlı veriler etkilenmedi.
- Şablonda keyfi oturum dağılımı/TYT/AYT, bazı isimle seçiciler, yıl alanı olmayan katalog yıl filtreleri, sınırsız streaming, bütün koşullu yardım/tema kabulü ve canlı hosting performansı açık. Yedekleme merkezi yalnız hazırlık sayfasıdır. Son test sayıları ve süreç kapanışı rapor teslim ekindedir.


## v1.4.1 — öğrenci, anonim analiz ve kabul

- Rapor: `docs/v141-release-report.md`, 82 maddelik başlangıç/son durum tablosu. Canlı DB/deploy/restart/izin/duyuru/commit/push yok; başlangıçtaki untracked kullanıcı PDF klasörleri korunur. Yeni bağımlılık ve migration yok.
- `student-insights.ts` mevcut opticalSummary/merge motorunu; `student-assistant.ts` 18 niyet/126 kaynak ifade, normalizasyon ve sınırlı ders/sınav bağlamını kullanır. Yalnız STUDENT; PARENT/admin/bayi dışlanır. İki öğrenci girişinde ortak StudentWorkspace. Sohbet yalnız bileşen belleğinde en fazla 12 soru; salt okunur POST’lar mutasyon audit’i üretmez. Karşılama student-welcome.ts ile en fazla beş kaydın yalnız kendi satır/özetini SQL’de ayırır; sınıf JSON’u uygulamaya taşınmaz, puan yeniden hesaplanmaz. Kişisel kod yolunda identityKey doğrulanır. Kanıtlı aynı içerik/kuralda puan rekoru ve anlamlı net artışı ortak welcomeHighlights ile hesaplanır. Oturumda aynı sonuç bildirimi yinelenmez; ağır analiz isteğe bağlıdır.
- Hesap analizi en son 100 açık grant metadata’sından en fazla beş uygun sınavı seçer; içerik/kural eşdeğerliği yoksa sayısal gelişim/gerileme iddiası üretmez. Tek sorudan kesin kazanım sonucu çıkarılmaz. Kişisel kodda mevcut açık grant ve revizyon çözümleme kullanılır; yeni numarayla otomatik ilişki yok.
- `exam-quality.ts` mevcut canonical A sırası ve soru analizine eklenir. <5 ve küçük tamamlayıcı şube gizlenir; sınıf kırılımı/kimlik metadata’sı DTO’ya girmez. Korelasyon en az20 tam katılım, KR-20 ayrıca en az5 tanısal soru; sıfır varyansta null. Şüpheli işaret otomatik hata kararı değildir. Okul önerisi ≥2 sınav/≥3 uygun soruyla, anormal sorular çıkarıldıktan sonra yeniden hesaplanır.
- `/api/exam-analytics` kendi rol/kapsamlı okul listesine sahiptir; SCHOOL_ADMIN eski genel `/api/schools` engelini aşarak tüm kurumları göremez. Analiz en fazla5.000 kaynak öğrenci/100 yükleme, worker2 ve kullanıcı1 etkin iş sınırındadır; dağıtık kuyruk değildir. İnceleme AuditLog’da kurum+sınav+fingerprint ile saklanır; bayi canEditResult ve PDF canExport kuralları uygulanır. EXAM_QUESTION_REVIEW fiziksel temizlik dışında kalır.
- Genel analizde mevcut çoklu işaret=boş politikası düzeltildi. Eski `/results/:id/analysis` küçük grupta artık null count/suppressed alır; eski UI açık mesaj verir. İki sayfalık şablonda ders içinde anahtar/öğrenci çifti ve tam kazanımlar; 87 Özdebir kazanımı iki A4’te korunur, çok uzun içerik devam eder.
- Kompakt listeler mevcut işlemleri korur. FMT önerileri isim/içerik/yerleşim/katalog kapasitesiyle ihtiyatlıdır; FMT sınava otomatik bağlanmaz. Paylaşımda tek kategori seçimi; yayınevi native modal ve arama; oyun motorları aynı, menü Mola Alanı.
- Son yerel kabul: 308/308 çevrimdışı test, 19 gerçek HTTP/DB ve 16 Chromium grubu; API/Web build, Prisma validate, yeni boş DB’de mevcut26 migration. Test Merkezi kaynak digest’i ve kabul JSON’u son kaynakla eşleşir. Önceki ayrı e2e betikleri bu sürümde not_run kalır.
- Yerel test DB yalnız bu oturumun ks-v141-test, 127.0.0.1:55451/ks_v141. Test harness sabit bu DB’yi ister; eski/production DB kullanılmaz. Kanıtlar test-results/v141 içinde Git dışı; ui-seed.json sentetik erişim tokenı/kodu içerir, dağıtılmaz.
- Güncel npm audit gerçekten çalıştı: effect/Prisma zincirinde3 yüksek, Next15.5.28’de1 orta paket kaydı. Kullanıcı otomatik paket yükseltmesini yasakladığı için değiştirilmedi. Yeni canlı 403 kök nedeni doğrulanmadı; yerel public varlıklar200 ve izinler okunabilir. Güvenlik/gerçek veri hazırlığı belgesi hukuki uygunluk ilanı değildir.
- Yerel saf hesap benchmark’ı5.000×90 için genel analiz yaklaşık81ms, süreç RSS yaklaşık121MB; DB/ağ/Passenger/eşzamanlı toplu PDF kapasitesi değildir. Gerçek düşük güçlü cihaz ve bütün koşullu ekran/tema kabulü açık.

- Teslimde 4021 API/3121 Web portları kapalı; yalnız ks-v141-test durduruldu. Sentetik kayıtlar/kanıtlar ve kullanıcının önceki PDF klasörleri silinmedi.


## v1.4.2 yerel teslim notu

Başlangıç commit'i `45c3013aaa2484991c3218993cddf2875284f961`; commit/push/deploy yok. Ana sayfa sıralaması ve animasyon boyutları, ortak tema/işlem stilleri, açılır kategori menüsü ve URL geçmişi, rapor çalışma alanı, birleşik FMT, Son Giriş ve bayi temsil dönüşü yerelde tamamlandı. Eski FMT adresleri `fmt-upload` alanına açılır. Okul yöneticisinin yalnız anonim analiz yetkisi korunur. Rapor kataloğu 1.000 kurum/5.000 ilişki sınırını açık hatayla bildirir; öğrenci snapshot'larını katalogda taşımaz.

Temsil tokenı artık URL'ye verilmez; imzalı bayi kimliği içerir ve her istekte asıl/çocuk AuthSession doğrulanır. Asıl oturum sekmeye özel sessionStorage'da tutulur. `/api/security/impersonation/end` yalnız asıl yöneticiyle çocukları iptal eder. Normal çıkış asıl oturum/çocukları sonlandırır. Mevcut bayi iş yetkileri korunur; temsil sırasında şifre/MFA/hesap sahibinin güvenlik ayarları değiştirilemez.

Yeni migration veya paket yükseltmesi yok. Mevcut 26 migration yalnız yeni geçici localhost PostgreSQL'de doğrulandı. 312/312 birim/regresyon, 21/21 yeni HTTP, 22/22 kapsamlı güvenlik, 19/19 öğrenci/analiz ve 25/25 Chromium kontrolü geçti. Test çıktıları `test-results/v142` altında; sentetik oturum fixture'ı paylaşılmaz. Kaynak public ve `.next/static` izin kontrolü `npm run check:static -- --with-build`; canlı izin ve HTTP 200 kontrolü ayrıca operatör tarafından yapılır. Yerel build localhost:4022 içindir, canlıya kopyalanmaz. Ayrıntılar `docs/v142-release-report.md` içindedir.
