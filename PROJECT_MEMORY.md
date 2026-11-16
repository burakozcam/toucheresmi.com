# Kurumsal Sınav — Proje hafızası

Son güncelleme: 16 Kasım 2026 · v1.3.3 · yerel geliştirme. Bu dosya sır içermez. Yeni oturumda önce bu dosyayı, `git status` çıktısını ve son sürüm raporunu okuyun.

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
