# Kurumsal Sınav — Proje hafızası

Son güncelleme: 17 Kasım 2026 · v1.3.5 · yerel geliştirme. Bu dosya sır içermez. Yeni oturumda önce bu dosyayı, `git status` çıktısını ve son sürüm raporunu okuyun.

## Amaç ve mimari

Ticari eğitim/sınav platformu: yayınevi cevap anahtarları ve kazanımları, kurum/bayi yönetimi, TXT/FMT optik okuma, sınav değerlendirme, öğrenci/veli erişimi, karne/PDF ve Excel raporları. Kurumsal lacivert/mavi tasarım ve mevcut puanlama kuralları korunur.

npm workspaces: `apps/web` Next.js App Router/React/TypeScript; `apps/api` Express/TypeScript; PostgreSQL/Prisma. Web istemcileri `/api` REST uçlarını kullanır. Genel tarayıcı araçları dosyaları cihazda işler; yetkili panelin TXT/sonuç akışı API ve özel depoda kalıcıdır. Bu iki akışı birbirine karıştırmayın.

## Teknolojiler ve çalıştırma

- Next.js 15, React 19, Express 5, Prisma 6, Zod, SheetJS, PDFKit, Sharp, yerel Tesseract WASM/OCR.
- JWT HS256 + DB oturumu; yeni parolalar scrypt, eski bcrypt uyumluluğu; TOTP, şifreli MFA sırrı, tek kullanımlık kurtarma, güvenilir cihaz.
- Testler: `node:test`/tsx, gerçek localhost PostgreSQL/HTTP, Python Playwright/Chromium, PDF.js/Poppler.
- Kurulum sözleşmesi Node >=20.9; önerilen Node 22. v1.3.3 bu ortamda Node 24.22.1 ile doğrulandı. Shell varsayılan Node 18.19.1 desteklenmez; Sharp testleri bu sürümde başarısız olur.
- Bu çalışma ortamındaki uyumlu Node dizini: `/home/burak/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`. Gerektiğinde PATH başına ekleyin; proje için makineye özgü yol sabitlemeyin.
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
