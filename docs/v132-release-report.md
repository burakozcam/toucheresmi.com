# Kurumsal Sınav v1.3.2 yayın raporu

16 Kasım 2026 — yerel uygulama ve doğrulama tamamlandı. Canlı migration, Neon değişikliği, GitHub yüklemesi veya cPanel/Passenger dağıtımı yapılmadı. v1.3.1 lacivert/mavi ziyaretçi tasarımı ve mevcut A4 karne düzenleri korunur.

## Kullanıcıya yansıyan değişiklikler

- Süper yönetici paneline **Bayiler** ve **Bayi Faaliyetleri** eklendi. Bayi/çalışan bilgileri, aktiflik, son giriş, kurum/sınav/öğrenci sayıları, günlük kullanım ve kalan kota gösterilir. Faaliyetlerde bayi, kullanıcı, gerçek temsilci yönetici, kurum, sınav, yayınevi, il/ilçe, zaman, işlem ve başarı bilgileri bulunur. Günlük/haftalık/aylık/toplam özetler ve filtreler vardır; varsayılan otomatik sorgulama kapalıdır.
- Yedi işlem yetkisi güncel API isteğinde kontrol edilir: kurum ekleme/düzenleme, değerlendirme, sonuç silme/geri yükleme, sonuç düzenleme, yeniden değerlendirme, PDF/Excel. Mevcut oturumu kapatıp açmak gerekmez.
- Bayi/yayınevi/il/ilçe kuralları çoklu tanımlanabilir; “bütün yayınevleri”, “Türkiye geneli” ve “ilin bütün ilçeleri” desteklenir. Aynı bölge birden fazla bayiye verilebilir; münhasırlık oluşturulmadı. Bölge kontrolü gerçek DB yayınevi ve kurum konumundan yapılır; geçmiş sınavı okuma/izinli raporlama kapanmaz. Kurumun konum değişikliği yönetici onayına gider.
- İsteğe bağlı günlük yeni öğrenci kotası Türkiye gününe göre, transaction ve bayi kilidiyle hesaplanır. Önizleme, başarısız işlem, tekrar dosyası ve aynı sınavın ikinci oturumu fazladan tüketmez. Bayi kendi kullanımını görebilir. Faaliyetteki işlemde değerlendirilen öğrenci sayısı ile kotanın benzersiz yeni öğrenci sayısı farklı ölçümlerdir.
- Sonuç silme soft delete'tir; kullanıcı/bayi/kurum/sınav/zaman/öğrenci sayısı ve geri yükleme kaydedilir. Geri yükleme orijinal veriyi korur, otomatik öğrenci yayını açmaz. Yeniden değerlendirmede önceki sürüm saklanır ve yayından kalkar.
- Yönetici, güncel ikinci faktörle 15 dakikalık bayi temsil sekmesi açabilir. Şifre gösterilmez/değiştirilmez; hedef bayi yetkileri uygulanır, yeniden temsil ve yönetici işlemleri engellenir. Ana yönetici sekmesi korunur. İşlemler gerçek yöneticiye bağlanır.
- Yönetici için zorunlu, bayi için isteğe bağlı TOTP; yerel QR, manuel anahtar, ilk kod doğrulaması ve bir kez gösterilen on kurtarma kodu. Oturumlar/cihazlar panelden iptal edilir. Güvenilir cihaz 30 günlük, HttpOnly/Secure/SameSite=Strict çerezle ve DB hash ile çalışır. Kritik yönetim için son beş dakikada gerçek faktör gerekir.
- Bayi hesabının kapanması kendi çalışan oturumlarını iptal eder. Öğrenci/veli hesabı ve önceden yayımlanmış kendi sonuçları açık kalır.
- Misafir sonuç ekranı kişisel erişim koduyla yalnız ilgili kurumu çözer; bütün kurum/sınıfları listelemez. Önceki kimlik ve CAPTCHA doğrulaması korunur. Mevcut kodlar değiştirilmedi; eski sonuçlar için aşağıdaki indeks hazırlığı gerekir.
- Gerçek aynı sınav katılımından genel/il/ilçe/kurum/sınıf sıralamaları; farklı anahtar fingerprint'leri dışarıda tutulur, aynı kişinin oturumları bir kez sayılır. Diğer kurumun kişi listesi dönmez. Beş kişiden veya iki kurumdan küçük çapraz kurum ortalamaları gösterilmez.
- PDF başlıkları, web sitesinin orijinal `kurumsal-sinav.svg` K logosunun aynı path/rengini kullanır. Bayi logosu veya yeniden çizilmiş alternatif eklenmedi. Tek/iki sayfa, kazanımlı, toplu, öğrenci/veli PDF'leri ortak kaynak kullanır. Mevcut tablolar ve kazanım düzeni korunur.

## Varsayılanlar ve veri geçişi

Migration: `apps/api/prisma/migrations/20261116010000_dealer_security/migration.sql`. SQL transaction içinde çalışır. Yeni tablolar oturum/cihaz, bayi bölgesi, günlük kullanım/öğrenci hash defteri, faaliyet, konum onayı, ortak rate limiter ve kişisel kod hash indeksidir. MFA alanları User'a, politika alanları Dealer'a eklenir.

| Alan | Mevcut ve yeni bayi varsayılanı |
|---|---|
| Yedi işlem yetkisi | Hepsi açık |
| Bölge modu | Serbest, bütün yayınevleri ve bölgeler |
| Günlük öğrenci kotası | Sınırsız (`null`) |
| Bayi TOTP | İsteğe bağlı, başlangıçta kapalı |
| Yönetici TOTP | İlk yeni girişte zorunlu kurulum |
| Otomatik faaliyet yenileme | Kapalı |

Mevcut dolu kurum `dealerId` değerleri değişmez. Yalnız DEALER kullanıcısının eski bayi bağlantısı yoksa ona legacy bayi oluşturulur; yalnız sahipsiz ve o bayi kullanıcısının oluşturduğu kurum bu mevcut ilişkiye bağlanır. Yönetici tarafından oluşturulmuş sahipsiz kurum rastgele bir bayiye atanmaz. Ayrı test DB'sinde dört eski kurumla bu koşullar doğrulandı. Bundan sonra DB trigger mevcut kurumun sahipliğini değiştirmeyi reddeder. Bilinçli veri düzeltmesi gerekiyorsa uygulama içinden sahiplik transferi açmak yerine ayrı incelenmiş bakım planı gerekir.

Eski JWT'lerde yeni session/JTI kaydı bulunmadığından yeniden giriş gerekir. Bu, migration sonrası beklenen davranıştır. Eski öğrenci sonuçları, şifre hash'leri, optik arşiv byte'ları ve karne verileri yeniden yazılmaz. Eski RESULT_DATA_EDIT audit özetindeki ham öğrenci değişiklikleri yalnız değişiklik sayısı ve sonuç ID'sine indirgenir; sonuç snapshot'ı değiştirilmez. Bu audit minimizasyonu kod geri almayla tersine çevrilmez.

## Doğrulama

| Kontrol | Sonuç |
|---|---|
| Node.js 22.16.0: `npm test` | 232/232 geçti |
| Gerçek PostgreSQL + HTTP güvenlik matrisi | 22/22 senaryo grubu geçti |
| Gerçek Web/API/DB tarayıcı testi | 9/9 grup, 0 sayfa hatası |
| Endpoint yöntem/yol envanteri | 195; 156 özel yöntem anonim reddi, admin yöntemlerinde bayi reddi |
| Eski şemadan migration + sahiplik/varsayılan testi | Geçti |
| Prisma schema/migration diff, izole DB | Boş fark |
| API TypeScript + Web production build | Geçti |
| Tam / production npm audit | 0 / 0 bildirilen açık |
| Yerel Git metin geçmişi gizli değer desen taraması | 1.385 blob, 0 eşleşme; 71 binary/büyük dosya kapsam dışı |
| Gerçek PDF export / render | Sentetik özet 2, iki sayfalık 4, kazanımlı 4 sayfa; iki sayfalık örneğin ilk iki sayfası görsel incelendi |

Test kaynakları `tests/e2e/v132-security.cjs`, `v132-ui.py`, `v132-migration.py`, `v132-history-scan.py`, `v132-inventory.cjs` ve `tests/v132.test.ts` altındadır. Yerel `test-results/v132/` Git tarafından dışlanır; sahte test şifreleri/token'ları, OTP/kurtarma ekranları ve seed dosyası dışarı yüklenmemelidir. Test DB adresleri yalnız yerel QA portuna sabitlenmiştir; bu dosyaları canlı DB'ye yönlendirmeyin.

Sentetik PDF örnekleri: `output/pdf/v132/qa-summary.pdf`, `qa-two-page.pdf`, `qa-outcomes.pdf`. Test anahtarındaki yapay ağırlıklar örnek amaçlıdır; yayınevi gerçek sınav puanı olarak yorumlanmamalıdır. Önceki Özdebir ve diğer FMT regresyonları birim/handler seviyesinde korundu; yeni gerçek HTTP değerlendirme matrisi sentetik 7108 kullanır.

Açıkların teknik nedeni, dosya/satırları, testleri ve kalan riskler: [güvenlik denetimi](v132-security-audit.md). Tam API listesi: [endpoint envanteri](v132-endpoint-inventory.md).

## Operatörün kontrollü canlı geçişi

Bu bölüm uygulandı anlamına gelmez; canlıya geçiş için hazırlanmış adımlardır.

1. Bakım penceresi ve staging hazırlayın. Neon DB yedeği/PITR geri dönüş noktası, bütün özel `STORAGE_DIR`, mevcut `JWT_SECRET`, varsa `TXT_STORAGE_KEY` ve diğer sunucu secret'larını güvenli yedekleyin. Yedeğin geri açılmasını staging'de deneyin. DB ve dosya yedeği aynı zaman aralığını kapsamalıdır.
2. **Mevcut JWT_SECRET veya TXT anahtarını bu güncelleme için değiştirmeyin.** Mevcut kimlik şifreleri JWT_SECRET'ten, TXT arşivi TXT_STORAGE_KEY veya fallback JWT_SECRET'ten türetilir. Plansız rotasyon eski verinin çözülememesine yol açabilir. Yeni MFA anahtarı bunlardan ayrı tutulmalıdır.
3. Sunucuda yeni `MFA_ENCRYPTION_KEY` değerini güvenli secret yönetiminde üretin: 32 rastgele byte'ın 64 hex karakter gösterimi. `.env.example` yalnız boş alan adını içerir. Aynı anahtar bütün API worker'larında aynı ve yeniden başlatmalarda sabit olmalı; kaybı MFA sırlarını okunamaz yapar. Secret'ı Git'e, NEXT_PUBLIC değişkenine veya destek mesajına yazmayın.
4. `RATE_LIMIT_STORE=database` ayarlayın; production memory store kabul etmez. `TRUST_PROXY_CIDRS` yalnız gerçek Passenger/reverse proxy IP/CIDR'leri biliniyorsa tanımlanmalıdır; blanket trust kullanılmamalıdır. `WEB_ORIGIN` tam HTTPS Web origin'i; `NEXT_PUBLIC_API_URL` gerçek HTTPS API adresi olmalı. Güvenilir cihaz için Web/API aynı site altında HTTPS kullanmalıdır; farklı site kurulumunda Strict çerez gönderimi operatörce sınanmalıdır.
5. Node 22 ile kilit dosyasından `npm ci`, `npm run db:generate`, `npm test`, `npm run build` çalıştırın. Build sırasında `NEXT_PUBLIC_API_URL` doğru olmalıdır. API assets kopyalama adımı orijinal logo/fontları dağıtım dizinine alır. İşlem sırasında gerçek DB adresinin staging olduğunu kontrol edin.
6. Önce staging, sonra onaylı bakım penceresinde production için `npm run db:migrate:deploy` uygulayın. `db:seed`, `migrate reset` veya `db push --accept-data-loss` kullanmayın. Migration için gereken DDL rolü ile günlük uygulama rolünü ayırın; günlük rol asgari yetkili olmalıdır. Sahiplik trigger'ı ve kısıtların kurulduğunu kontrol edin.
7. **API/Web trafiğini açmadan önce**, doğru DB ve eski JWT_SECRET ile `npm run security:index-public-codes -w @optik/api` çalıştırın. Bu MANUEL adım eski yayımlanmış kişisel sonuç kodlarının hash indeksini hazırlar; yalnız sayıları yazdırır. Migration veya startup tarafından otomatik çalıştırılmaz. Script source/tsx kullanır; build ve bu bakım adımı bitene kadar dev bağımlılıkları mevcut olmalıdır. Aynı komut tekrar çalıştırılabilir. Kodları listeleyen destek/rapor çıktısı oluşturmayın.
8. API ve Web'i birlikte güncelleyin, Passenger süreçlerini kontrollü yeniden başlatın. Yeni JWT yapısı nedeniyle tüm kullanıcılar yeniden giriş yapar. İlk yönetici parola girişinde QR/manuel TOTP kurulumu, ilk kod doğrulaması ve on kurtarma kodunun güvenli saklanması gerekir. Bayide kurulum isteğe bağlıdır. Çalışan davetleri tek kullanımlık şifre kurulumu bağlantısıdır; gerçek şifre yöneticiye gösterilmez.
9. İki test bayisiyle izolasyon, öğrenci/veli yayını, eski kişisel sonuç kodu, şifreli TXT indirme, PDF/Excel, 2FA, HTTPS güvenli çerezi, proxy adresi/rate limit ve çıkış testlerini staging/hosting üzerinde tekrarlayın. Canlı gerçek öğrenci ekranlarını test raporuna/GitHub'a koymayın. Başarıdan sonra bakım penceresini kapatın.

Üretimde TLS sonlandırma, CDN cache, güvenlik header'ları, DB bağlantı havuzu/limitleri, SMTP, CAPTCHA anahtarları ve dosya sahipliği/izinleri bu yerel çalışma ile doğrulanmadı. İlgili dağıtım belgeleri korunur; bu sürüm otomatik uzak işlem yapmaz.

## Geri dönüş ve anahtar kaybı

Eski kod tek başına yeni session/2FA denetimini uygulamaz; sıradan dosya geri kopyalama güvenlik gerilemesi oluşturur. Yeni tabloları körlemesine düşürmeyin. Trafiği kapatın, olaydan sonraki yazmaları koruyun ve staging'de hazırlanmış geri dönüşü uygulayın. Tam geri dönüş gerekiyorsa eşleşen DB + özel dosyalar + aynı anahtarlar yedeğini birlikte geri yükleyin; bakım penceresi sonrası işlemlerin uzlaştırılması gerekir. Eski audit ham verisini geri yüklemek ayrıca veri minimizasyonunu geri alır.

MFA anahtarı kaybında önce güvenli yedekten aynı anahtarı geri yükleyin. Herhangi bir API'de “yöneticiye MFA'sız geçiş” yoktur. Kullanıcı parola + kurtarma koduyla reset yapabilir; yönetici tekrar kurulum challenge'ı alır. Bütün faktörlerin ve anahtar yedeğinin kaybı kimlik doğrulanmış, ayrı operatör kurtarma prosedürü gerektirir; bu çalışma gizli bir bypass eklemedi.
