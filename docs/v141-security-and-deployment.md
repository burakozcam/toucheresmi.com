# v1.4.1 güvenlik ve dağıtım incelemesi

22 Kasım 2026. Yalnız yerel kaynak ve sentetik localhost verisi. Bu belge hukuki uygunluk belgesi veya bağımsız penetrasyon testi değildir.

## Salt okunur tarama ve bağımlılıklar

`git ls-files -z | node scripts/security-scan-v141.cjs` Git ile izlenen 663 dosyayı envanterler; ikili/vendor dosyalarını içerik taramasından çıkarır. Özel anahtar, sağlayıcı tokenı, gömülü JWT ve uzak DB parolası kalıplarında aday bulgu yok. Satır veya gizli değer yazdırılmaz. Genel regex taraması tüm olası sırları bulmayı garanti etmez; `.env` okunup rapora kopyalanmadı. Yeni kaynaklar da ayrıca aynı tarayıcıyla kontrol edilir.

`npm audit --json --ignore-scripts --cache /tmp/ks-v141-npm-cache` gerçekten tamamlandı. Paket listesi/sürüm metadata'sı npm registry'ye gönderildi; bağımlılıklar değiştirilmedi. Sonuç 0 kritik, 3 yüksek, 1 orta; bunlar dört paket kaydıdır, dört bağımsız açık sayısı değildir.

| Dosya / paket | Önem | Bulgu ve etki sınırı | Öneri |
|---|---|---|---|
| `package-lock.json`: effect 3.21.0 | Yüksek | Schema.TemplateLiteral regex ReDoS, GHSA-7589-6fvf-x4pw. Prisma config/CLI geliştirme zinciri üzerinden gelir; uygulama isteğinin bu API'ye ulaşabildiği kanıtlanmadı. | Effect/Prisma uyumlu düzeltme sürümünü ayrı kontrollü bağımlılık değişikliğinde doğrula; CLI'yi kullanıcı girdisiyle çalıştırma. |
| `package-lock.json`: @prisma/config 6.19.3, prisma 6.19.3 | Yüksek (iki türetilmiş kayıt) | Yukarıdaki effect bağımlılığı nedeniyle audit işaretler. | Aynı düzeltme planı; schema/generate/migration ve API regresyonu gerektirir. |
| `apps/web/package.json` / lock: next 15.5.28 | Orta | GHSA-7qx7-33qx-rqx2 (image SVG rejection), GHSA-f3mh-rxg3-f5g2 (Edge header), GHSA-pc58-hwjq-p385 (forwarded response). App'te Edge route veya proxy-forward senaryosu bu incelemede bulunmadı; bu, tüm istismar yollarının kapalı olduğunun kanıtı değildir. | Uygun Next 15 düzeltmesini ayrı kontrollü değişiklikte uygula, güvenlik ve production build kabulünü tekrarla. Kullanıcı talimatıyla otomatik yükseltme yapılmadı. |
| `apps/web/next.config.ts` | Orta / sağlamlaştırma | CSP'de inline script/style ve iki CDN izin listesi mevcut. Yeni asistan CDN veya LLM kullanmaz. | Nonce ve daha dar CSP ayrı uyum testleriyle ele alınmalı; mevcut PDF/OCR/CAPTCHA akışını bozarak ani daraltma yapılmadı. |
| `apps/api/src/config.ts`, `db.ts`, `server.ts` | Denetlendi | Uzak DB varsayılan engeli, production CAPTCHA/MFA/ortak rate store, CORS/header, JWT oturumu ve özel depolama korumaları korunur. | cPanel proxy, TLS, gerçek Origin ve Neon havuzu staging'de ayrıca doğrulanır. |
| `exam-quality.ts`, `exam-analytics-routes.ts` | Gizlilik sınırı | Kimliksiz DTO; <5 kişi ve küçük tamamlayıcı alt grup gizlenir. Kalite ölçüleri ≥20 tam katılım; KR-20 ayrıca ≥5 tanısal soru. Kurum içi yetkili kullanımdır. | Eşik anonimlik garantisi değildir. Dış paylaşım için yeniden tanımlama risk incelemesi ve veri minimizasyonu gerekir. |

## PDF araçlarında 403

Yerel `public/araclar` ve vendor varlıkları okunabilir; dizinlerde geçiş izni vardır. `644` dosya / `755` dizin yaklaşımı yalnız yayımlanacak genel varlıklar için uygundur. Mevcut `664` / `775` yerel geliştirme modları da diğer kullanıcıya okuma/geçiş sağlıyor; bunlar tek başına 403 kanıtı değildir. Yerel izinler değiştirilmedi. Canlı 403 olayı yeniden üretilmedi; kesin canlı kök neden bulunmuş sayılmaz.

`node scripts/pdf-assets-preflight.cjs` yalnız public beyaz listedeki dosyaların varlık, boyut, SHA ve okuma/geçiş izinlerini denetler. Gerçek HTTP için yerel production Next üzerinde araç HTML/JS/CSS ve PDF.js cevapları ayrıca kontrol edilir. Bu test Apache/WAF/Passenger yetkisini doğrulamaz.

Canlıya geçişte yetkili operatör:

1. Tarayıcı Network kaydından 403 alan tam yolu ve isteğin Web/API origin'ini belirler; Apache/cPanel hata kaydı ve WAF kuralını aynı zamanla karşılaştırır. Gizli tokenı ekran görüntüsü veya rapora almaz.
2. `public/araclar` ve gerekli `public/vendor` dosyalarının eksiksiz aktarıldığını, hash/isim büyük-küçük harfini ve Passenger static document root eşleşmesini doğrular. Bu dizinleri özel API STORAGE_DIR ile karıştırmaz.
3. Gerekirse yalnız bu genel varlıkların dosyalarını 644, dizinlerini 755 yapar. `.env`, özel storage, TXT ve şifreli arşive toplu chmod uygulanmaz. Bu oturum hiçbir canlı izin değiştirmedi.
4. `.htaccess` deny, dizin listeleme, MIME/WASM/modül türleri, symlink ve hotlink/WAF kısıtlarını inceler. Güvenlik korumasını genel olarak kapatmaz; doğrulanmış yola özel düzeltmeyi staging'de dener.
5. Aynı araçları aydınlık/karanlık ve mobilde açar. PDF soru kesme projesi bu sürüme eklenmedi.

## Gerçek öğrenci verisine geçiş kontrol listesi

- Veri sorumlusu/veri işleyen rolleri, kurum sözleşmeleri, alt işleyenler, aydınlatma metni ve hukuki işleme şartı yetkin hukuk/mahremiyet ekibiyle belirlenmeli.
- Öğrenci yaşı, veli bilgilendirmesi/yetkisi, özel nitelikli veri toplama sınırı, amaç/süre ve gerekli veri alanları somutlaştırılmalı.
- Neon/hosting/SMTP ve olası yurt dışı veri aktarımı, güncel yükümlülükler ve sözleşmeler hukuk ekibince değerlendirilmelidir; bu çalışma hukuki tamamlanma iddia etmez.
- Kurumdan ayrılma, hesap/bağlantı iptali, erişim talebi, düzeltme, silme/anonimleştirme ve tüm kopyalarda saklama/silme prosedürü yazılmalı. Soft delete tek başına nihai silme değildir.
- Üretim erişimleri en az ayrıcalıkla verilmeli; MFA ve yetki gözden geçirme, denetim gerekçeleri ve kişisel veri içerebilen serbest metin politikası belirlenmeli.
- Gerçek yedekleme/şifreleme anahtar yönetimi, RPO/RTO, ayrı kopya, yetkili geri yükleme tatbikatı ve olay bildirim planı doğrulanmalı. Mevcut Yedekleme Merkezi bunları yapmaz.
- PDF/Excel/ZIP indirenlerin yerel dosya saklama ve paylaşım politikası belirlenmeli. Kamuya toplu rapor paylaşımı için küçük grup/çıkarım riski ayrıca incelenmeli.
- Yeni anonim DTO'lar, yetki testleri, no-store ve sınırlı sohbet teknik risk azaltır; KVKK uyumluluğunun tamamlandığını kanıtlamaz.

Kontrol listesinin teknik/idari güvenlik ve saklama-imha başlıkları için resmî başvuru kaynakları: [KVKK veri güvenliği açıklaması](https://www.kvkk.gov.tr/Icerik/2040/Veri-Guvenligine-Iliskin-Yukumlulukler) ve [silme/yok etme/anonimleştirme yönetmeliği](https://www.kvkk.gov.tr/Icerik/5441/KISISEL-VERILERIN-SILINMESI-YOK-EDILMESI-VEYA-ANONIM-HALE-GETIRILMESI-HAKKINDA-YONETMELIK). Uygulamanın kurum bazlı hukuki değerlendirmesi bu kontrol listesinden ayrıca yapılmalıdır.

## Dağıtım

Yeni DB şeması veya migration yok; mevcut AuditLog inceleme kararlarını tutar. `EXAM_QUESTION_REVIEW` fiziksel otomatik log temizliğinden korunur. Üretimde sürüme geçiş için mevcut JWT/TXT/MFA anahtarları korunmalı, gerçek HTTPS API adresiyle Web yeniden derlenmeli, bağımlılık uyarıları ve staging kabulü kapatılmalı. Yerel kabul build'i `http://localhost:4021` içindir ve doğrudan üretime taşınmaz. Otomatik deploy/restart, canlı migration, seed/reset, Git push yapılmadı.
