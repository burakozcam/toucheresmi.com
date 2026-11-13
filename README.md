# Kurumsal Sınav v1.2.5 — Yerel geliştirme

**v1.2.5:** Özdebir tek optik / sözel + sayısal kayıt düzenleri, güvenilir öğrenci eşleştirme, bütün oturum üzerinden tekrar seçimi ve eksik oturumları sıfır saymayan değerlendirme. Karne cevapları sadeleştirildi, renkli grafiklere PDF içinde basılan desenler ve menüye 14 px okunaklı yazılar eklendi. [Doğrulama ve dağıtım notları](docs/v125-release-report.md) · [Değişiklik kaydı](CHANGELOG.md). Yeni migration yok; canlıya aktarım yapılmadı.

**v1.2.1 RC:** Katsayısız değerlendirme, hesap açmadan kişisel kodla sorgu, belirgin karne türleri, ayrı sınav tanımı/anahtar akışı, avatar düzeltmesi ve salt okunur Test Merkezi. [RC raporu](docs/v121-release-report.md) · [Hosting/taşınabilirlik](docs/v121-hosting-portability.md). ProBook ve CAPTCHA çalışmaları kapsam dışıdır; push/deploy yapılmadı.

**v1.2.0:** Sistem 7108 yerleşiminin eski kayıttan etkilenmesi düzeltildi; tüm kayıtlar üzerinden tahmin, bağımsız hesaplı gerçek PostgreSQL kabul testi, profesyonel varsayılan PDF’ler, öğrenciye özel erişim, belirgin arama ve Google reCAPTCHA v2 hazırlığı. Canlı değiştirilmedi. [15 başlıklı kabul raporu ve örnek PDF’ler](docs/v1.2.0-kritik-kabul-raporu.md).

**v1.1.9:** Bağımsız karne/liste şablonları, kademe filtresi, Sonuçlar ekranında öğrenci girişi, FMT tahmini/dönüştürücü ve isteğe bağlı sunucu doğrulamalı Turnstile. Testler, yapılandırma ve 7108 ortam farkı incelemesi [sürüm raporunda](docs/v1.1.9-release.md).

**v1.1.8 RC:** FMT kütüphane ve arama akışı, TXT/FMT/sınav seçimi, panel metinleri, karşılama alanı ve profil görünümü sadeleştirildi. Değerlendirme motoru ve kurum erişim kapsamı korunmuştur. Doğrulama kapsamı [v1.1.8 RC raporunda](docs/v1.1.8-rc-release.md).

**v1.1.4:** Satır bazında sınıf/yayınevi/kaynak içeren toplu FMT kuyruğu; bağımsız hata/tekrar deneme; A/B/C/D PDF seçenekleri ve yalnızca Kurumsal Sınav logosu; SUPER_ADMIN toplu yayınevi logoları (yalnızca web Cevap Anahtarları), sabit login arka planı ve gerçek 404 üzerinde mevcut kuş oyunu. Yeni migration hazırlanmıştır, uygulanmadı. Node >=20.9 ve API için görsel çözümleme/optimizasyon bağımlılığı sharp 0.35.5 gerekir. [Teslim ve dağıtım raporu](docs/v1.1.4-release.md).

**v1.1.3:** Kazanım kodu olmadan onaylı cevap anahtarı/PDF; SUPER_ADMIN Sistem Merkezi (IP izleme modu), özel klasör/dosya ve zamanlanmış paylaşım, görselli blog/profil, sayfa/metin/resim eklenebilen PDF Editörü, takvim ve mobil arayüz düzenlemeleri. Yeni geriye uyumlu migration hazırlanmıştır; uygulanmadı. [Teslim, testler, sınırlar ve canlıya geçiş sırası](docs/v1.1.3-release.md).

**v1.1.1:** F / Fernus ve O / Okulizyon kazanım dosyasından tek yüklemeyle cevap anahtarı ve arşiv kaydı; tam düzenlenebilir önizleme ve açık onay; çoklu FMT kuyruğu, koordinat/TXT/okuyucu doğrulaması ve toplu kayıt. Son kritik ek için `20261109010000_fmt_validation` migration'ı hazırlanmıştır; canlıda çalıştırılmadı. [Kullanım ve doğrulama](docs/v1.1.1-release.md).

**Yeni sınav akışı:** Ayrı yükleme/sonuç ekranları, sınıf listeleri ve analiz, kontrol özeti ve anahtar düzeltmelerinde sonuç sürümleri. `20261108210000_result_revisions` migration'ı gerekir; [kullanım ve dağıtım notları](docs/7108-optical-evaluation.md#ayrı-yükleme-ve-sonuç-akışı).

**v1.0.6:** Gerçek örneklerle doğrulanan [Palme 8050 hazır yerleşimi](docs/8050-layout.md), kaynak/hedef FMT arasında TXT dönüştürme, indirilebilir kontrol raporu, genişletilmiş FMT alan/sabit tanımları ve gerçek giriş sayfasında kurumsal hareketli gradient. [Sürüm ve doğrulama notları](docs/v1.0.6-release.md).

**Öğrenci / veli erişimi:** Bayi hesap ve açık sonuç bağlantısı oluşturur, sonucu yayımlar; öğrenci/veli `/sonuclarim` ekranında yalnızca kendi karnelerini görür. Bayilere **FMT İndir** menüsü eklendi. Yeni migration ve kullanım: [öğrenci/veli portalı](docs/student-parent-portal.md).

**7108 optik değerlendirme:** Tek sınav kaydı üzerinden bağımsız ana sayfa/değerlendirme görünürlüğü, yayınevi → sınıf → sınav seçimi; admin FMT ve soru bazında cevap anahtarı ekleme; bayi TXT yükleme/önizleme, oturum birleştirme, A/B kitapçık eşleştirme, kayıtlı sonuç geçmişi, Excel listesi ve PDF karne akışı eklendi. Kurulum ve yeni migration bilgisi: [7108 kullanım ve doğrulama notları](docs/7108-optical-evaluation.md).

Next.js Web, Node.js API ve PostgreSQL/Prisma tabanlı sınav yönetim uygulaması.

v1.0.5: 2.500 satırlık düzenlenebilir Excel takvimi, onaylı yayınevi/seri eşleştirme, yükleme geçmişi ve güvenli geri alma; derslik düzeltmeleri, mobil oyunlar, tek kullanımlık hesap kurulumu ve kurumsal OG görseli. Ayrıntılı değişiklikler, test sınırları ve GitHub/cPanel adımları [sürüm raporunda](docs/v1.0.5-release.md), özet [changelog dosyasında](CHANGELOG.md).

## Önerilen teknoloji seti

- **Backend:** Node.js 20+, TypeScript, Express, Zod. Başlangıçta anlaşılır REST API; büyüdükçe modüller NestJS'e taşınabilir.
- **Frontend:** Next.js App Router ve React. Yönetim panelleri ve herkese açık başvuru sayfaları aynı uygulamada.
- **Veritabanı:** PostgreSQL ve Prisma ORM. Kurum/bayi ilişkileri ve veritabanı migrasyonları için uygundur.
- **Kimlik doğrulama:** bcrypt parola özeti ve imzalı JWT. Rol seçimi arayüz kolaylığıdır; yetki API tarafında kullanıcı kaydından doğrulanır.
- **Dosya yükleme:** İleride API'de Multer/Busboy ve S3 uyumlu nesne depolama; ham TXT dosyaları web kökünde tutulmamalıdır.
- **PDF:** İlk tercih HTML şablonlarını PDF'e dönüştürmek için Playwright. Basit belge/etiketlerde pdfmake alternatif olabilir.
- **Test ve kalite:** Vitest/Jest, Supertest, ESLint, Prettier; CI'da migration ve test adımları.

## Başlangıç

1. Node.js 20+ ve PostgreSQL 16+ kurun.
2. `cp .env.example apps/api/.env` komutuyla API ortam dosyasını oluşturup bağlantı, güçlü JWT anahtarı ve `ADMIN_EMAIL` / `ADMIN_PASSWORD` değerlerini düzenleyin. Admin parolası en az 12 karakter ve en fazla 72 UTF-8 bayt olmalıdır.
3. `npm install`
4. `npm run db:generate`
5. `npm run db:migrate`
6. `npm run db:seed` (ilk süper yöneticiyi oluşturur; admin bilgileri `.env` içindeki `ADMIN_EMAIL` ve `ADMIN_PASSWORD` değerlerinden alınır ve parola bcrypt ile hash'lenir.)
7. Ayrı terminallerde `npm run dev:api` ve `npm run dev:web`.

API varsayılan olarak `http://localhost:4000`, web uygulaması `http://localhost:3000` adresindedir. Web'in API adresini farklı bir ortamda `NEXT_PUBLIC_API_URL` ile belirtin. Giriş sayfasındaki **Üye ol** formuyla gönderilen üyelik talepleri varsayılan olarak `PENDING` durumundadır; yönetici onayı olmadan kullanıcı hesabı oluşturulmaz ve giriş yapılamaz. Süper yönetici panelindeki **Sistem Kullanıcıları → Üyeler** bölümünden talepler ve kayıtlı kullanıcılar listelenebilir, onaylanabilir, erişimleri kapatılabilir veya ilişkili kayıtlar izin verdiğinde silinebilir. Yönetici mevcut şifreleri göremez; yeni şifre belirleme isteği API'de bcrypt ile hash'lenerek kaydedilir. İncelenmiş başvuruların parola özetleri tutulmaz; bekleyen başvuruların parola özeti onay sırasında kullanıcı hesabına aktarılır. Admin e-posta ve ilk şifre yalnızca API `.env` dosyasındaki `ADMIN_EMAIL` ve `ADMIN_PASSWORD` değerlerinden seed edilir; gerçek değerleri kaynak koduna veya depoya eklemeyin. Yönetici tarafından kapatılan veya silinen hesapların mevcut JWT oturumları da sonraki API isteğinde geçersiz kılınır.
İletişim formunun otomatik e-posta gönderebilmesi için API `.env` dosyasında SMTP sağlayıcınızın `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` ve sağlayıcınızda doğrulanmış `SMTP_FROM` değerlerini ayarlayın. `CONTACT_EMAIL` varsayılanı `destek@kurumsalsinav.com` adresidir. SMTP parolalarını kod deposuna eklemeyin. Web farklı bir port veya domaindeyse API'deki `WEB_ORIGIN` değerini o adrese ayarlayın.

## v1.0.2 geliştirmeleri

v1.0.2; süper yönetici için yayınevi ve cevap anahtarı yönetimini, bayi kapsamlı kurum ekleme/listelemeyi ve sınav kayıt ekranını içerir. Kurum tekrarları normalize edilmiş kurum adı, il ve ilçe birlikte değerlendirilerek engellenir; aynı isim farklı il veya ilçelerde kullanılabilir. Benzer kayıt girişimleri otomatik hesap askıya alma yerine yönetici inceleme listesine alınır. Cevap anahtarlarının görünen yayın tarihi `publishedAt` alanında tutulur; kayıt oluşturulma zamanı korunur. Herkese açık cevap anahtarı detayları yalnızca yayımlanmış kayıtlardan üretilir.

`apps/api/prisma/migrations/20261106220000_v1_0_2_management` migration'ı mevcut kayıtları silmez veya sıfırlamaz. Eski kurumlara mevcut satırları korumak için benzersiz geçiş anahtarı verilir; cevap anahtarı yayın tarihi başlangıçta `createdAt` değerinden doldurulur. Üretim ortamında migration uygulanmadan önce yedek alınmalı, migration çıktısı incelenmeli ve ayrıca açık onay alınmalıdır. `migrate reset`, `db push` veya seed bu özellikleri yayımlamak için kullanılmamalıdır.

Web tarafında sürüm `apps/web/config/site.ts` üzerinden yönetilir. Yayımlanmış cevap anahtarı detay sayfaları, canonical/meta verileri, `robots.txt` ve `sitemap.xml` desteklenir. Yönetim ve giriş sayfaları indekslemeye kapalıdır. Doğrulanamayan kişi atıflı motivasyon alıntıları kullanılmamıştır; panel mesajları ayrı bir JSON dosyasında proje adına yazılmış özgün metinlerdir. Mevcut gizlilik politikası sayfası bulunmadığından footer'a böyle bir bağlantı eklenmemiştir.

## v1.0.3 geliştirmeleri

### Yönetici hesapları, takvim ve değerlendirme şablonu v2

Yönetici **Üyeler → Kullanıcı ekle** üzerinden bayi hesabı açabilir. Geçici şifre yalnızca oluşturma yanıtında gösterilir; veritabanında bcrypt özeti tutulur. `mustChangePassword` işaretli kullanıcılar yalnızca hesap bilgisini okuyabilir ve `/api/account/password` üzerinden kendi şifresini belirleyebilir. Diğer korunan API uçları bu işlem bitene kadar 403 döner. Yeni şifre belirlenince önceki token geçersiz olur ve yeni oturum verilir.

`/sinav-takvimi`, sınıf (1–12 / TYT / AYT) ve ay filtreli herkese açık takvimdir. Aynı güne birden fazla yayınevi sınavı eklenebilir; gün kutusunda ilk dört sınav ve tümünü açan bağlantı bulunur. Kapsam ve eşleşen yayımlanmış cevap anahtarı detay sayfasındadır. Yönetici panelinde açılır sınıf/yayınevi listeleri içeren Excel şablonu, yükleme önizlemesi, tek kayıt ekleme/düzenleme ve toplu silme bulunur. Excel yeni kayıt ekler; aynı yayınevi/sınıf/deneme/tarih tekrarları transaction ile reddedilir. Yayınevi sistemde önceden bulunmalıdır. Excel'de tarih sütunu metin biçimindedir: YYYY-AA-GG.

**Bu özellikler için `20261108000000_account_setup_exam_schedule` migration'ı gerekir.** Mevcut kullanıcılara `mustChangePassword=false` eklenir; mevcut kayıtlar silinmez. Yeni takvim tablosu eklenir. API'nin yeni sürümü yayımlanmadan önce yedek, gerçek migration geçmişi ve SQL incelenerek migration uygulanmalıdır; bu çalışma canlı migration çalıştırmaz. Önceden bildirilmiş başarısız migration konusu için aşağıdaki dağıtım uyarıları geçerlidir.

Değerlendirme şablonu v2'de öğrenci cevapları ders başına tek hücrede yazılır (örn. 8 soru: `ABCD--EA`; boş soru `-`). Eski soru-sütunlu v1 şablonlar da okunur. İsteğe bağlı Kazanım Kodu / Kazanım Adı sütunları Cevap Anahtarı sayfasına eklenir. Karne; 100/500 yerel ölçek, renkli/siyah beyaz çıktı, ders grafikleri, dosyadaki okul/şube sırası, kazanım analizi ve isteğe bağlı soru bazında aynı okulun diğer öğrencilerinin doğru oranını içerir. Karşılaştırmaya yalnızca aynı dosyadaki aynı okul öğrencileri dahildir; Türkiye geneli karşılaştırma yapılmaz. İptal sorular puandan ve soru oranlarından çıkarılır.

LGS ve YKS soru sayıları/ağırlıkları 2026 MEB/ÖSYM kılavuzlarından `apps/web/config/exam-presets.ts` içine kaynaklarıyla eklenmiştir. TYT %33/%17/%33/%17; AYT SAY/EA/SÖZ alanları ve tüm 160 soruluk kitapçık için ayrı seçenekler vardır. YKS yüzdeleri yerel net hesabında soru sayısına bölünür. Resmî puanlar standart puan ve yıllık sınav istatistikleri gerektirdiğinden burada üretilmez. 500 ölçeği resmî LGS/YKS puanı değildir. Yeni kılavuz çıktığında kaynaklar ve yapılandırma güncellenmelidir.

Cevap Anahtarları'nda **Toplu ekle**, en fazla 100 dosyayı ayrı sınav satırları olarak hazırlar; her satırın yayınevi/sınıf/adı düzenlenebilir ve kazanım dosyası eşlenebilir. Yüklemeler sırayla ve ayrı işlemlerle yapılır; başarılı satırlar tekrar gönderilmez. Bağlantı hatası sonrası tekrar denemeden önce kayıt listesini kontrol edin. Dosyalar hem herkese açık hem yönetici indirmelerinde yayın adı/yayınevi/sınıf ve dosya türüne göre yeniden adlandırılır.

**K ile Uçma Zamanı** ve **Kıvrıla Kıvrıla K** ayrı menü öğeleridir. Karşılama ile özlü sözler tek kutudadır; 50 farklı kaynaklı söz arasında ileri/geri gidilir. Yabancı eserlerden kısa alıntılar Türkçe çeviri olarak işaretlidir. Bildirim lambası kaldırılmış, menü yatay taşması ve yayınevi durum hizaları düzenlenmiştir.

`/pdf-duzenleyici`, mevcut araçların yanında kamera/dosya ile belge tarama sunar. Kamera yalnızca kullanıcı isteğiyle ve HTTPS/localhost ortamında izin verilirse açılır; kapanışta medya izleri durdurulur. Tarama; siyah beyaz, gri veya renkli görünüm, kontrast/eşik, 90° dönüş ve kenar kırpma içerir. PDF/PNG/JPG/JPEG/WebP çıktıları desteklenir; çoklu görseller ZIP olur. OCR ve perspektif düzeltme yapılmaz. PDF'den görsele dönüşüm ve görseller arası dönüşümde PNG/JPEG/WebP seçilebilir. `/verilerinizin-guvenligi` gerçek uygulama önlemlerini, dış kaynakları ve sertifika doğrulama sınırlarını açıklar; bağımsız güvenlik sertifikası iddiası içermez.

### Önceki arayüz geliştirmeleri

- `/sinav-degerlendir`: Düzenlenebilir ders/soru/katsayılarla Excel şablonu indirme; doldurulmuş XLSX dosyasını doğrulama; öğrenci, toplu karne ve okul/şube listeleri. En fazla 500 öğrenci, 300 soru ve 10 MB desteklenir. Dosyalar tarayıcıda işlenir; öğrenci verisi API'ye gönderilmez. PDF çıktısı yazdırma penceresindeki **PDF olarak kaydet** seçeneğiyle alınır. İptal sorular hesap dışıdır. Katsayılı net resmî LGS/YKS puanı değildir.
- Cevap anahtarları dizini sunucuda oluşturulur; yayınlar ilk HTML'de, sayfalama bağlantıları ve CollectionPage/ItemList verisiyle sunulur. Filtreli sayfalar yinelenen indeksleri önlemek için noindex/follow kullanır. Yeni değerlendirme sayfası site haritasına eklenmiştir.
- Ana sayfada cevap anahtarı talep formu, değerlendirme bağlantısı, hareketli kurumsal gradient ve LGS/YKS sayaçları; footer'da v1.0.3. Tarihlerin resmî kaynakları sayaçlarda bağlantılıdır. Talep mesajları mevcut yönetici gelen kutusuna etiketli metin olarak gider; otomatik yayımlama yapılmaz.
- Mola alanında K logosuyla rastgele kuleli uçuş ve yılan oyunları; klavye/dokunmatik kontroller, duraklatma ve cihazda en iyi skor. Sözlerin gerçek kişi atıfları ve kaynak bağlantıları bulunur.
- Liste düzenleyicide sayısal oturum doğrudan eklenir; düğme Excel indirme alanında da bulunur. Derslik düzenleme/silme diyalogları iframe içinde çalışabilen sayfa içi diyaloglardır. Okul Adı ve Sınıf/Şube sütunları tanınır; öğrenci numarası okul bazında, TC ayrı kimlik türü olarak kontrol edilir.
- SheetJS CE 0.20.3, lisansıyla birlikte `apps/web/public/vendor` içinde tutulur. Excel işlevleri çalışma anında dış CDN istemez. PDF araçlarının diğer kütüphaneleri ve mevcut Tailwind/font kaynakları dış bağlantı kullanmayı sürdürür.

Hesap ayarları `/api/account` üzerinden veritabanına kaydedilir. Şifre değişince önceki JWT geçersiz olur; bu sürüme geçişte eski token biçimini kullananların yeniden giriş yapması gerekir. Cevap anahtarı yüklemeleri dosya doğrulamasından sonra ilişkili kayıtları tek işlemle oluşturur; başarısız yüklemeler temizlenir. Girişte 10 dakikada 20, kayıtta 30 dakikada 8 istek/IP sınırı vardır. Sınırlar tek API sürecinin belleğinde tutulur; birden çok API süreci arasında paylaşılmaz. Ters proxy arkasında gerçek istemci IP'si için barındırma yapılandırması ayrıca doğrulanmalıdır; uygulama doğrulanmamış forwarded başlıklarına güvenmez.

Bu değişiklikler yeni migration gerektirmez. FMT/öğrenci modüllerinin eksik özellikleri ve okul yöneticisinin sınav ekranı kapsamı değiştirilmemiştir. `npm test` hesaplama, XLSX geri okuma, oturum iptali, hız sınırı ve liste dağıtım senaryolarını çalıştırır. Tarayıcı içi yazdırma ve mobil etkileşimler için canlı öncesi tarayıcı kontrolü gerekir.

v1.0.3; sınav listesinde kampüs alanı olmadan derslik tanımlamayı, esnek Excel sütun eşleştirmeyi, kampüs/seans bazında kapasiteyi, sırayla veya dengeli dağıtımı, sabit/aynı/farklı derslik kurallarını ve yazdırılabilir yoklama çizelgelerini ekler. Yoklama çıktısı tarayıcının yazdırma ekranından **PDF olarak kaydedilir**; sunucu tarafında PDF dosyası saklanmaz. Excel ve öğrenci listeleri tarayıcıda işlenir.

İletişim mesajları artık SMTP yapılandırması olmasa da veritabanındaki yönetici gelen kutusuna kaydedilir. `SUPER_ADMIN` için `/api/admin/contact-messages`, `/api/admin/contact-messages/:id`, `/api/admin/audit-logs` ve `/api/admin/audit-log-users` API'leri eklendi. Başarılı yönetim değişiklikleri ve giriş denemeleri hassas istek gövdeleri kaydedilmeden denetim kayıtlarına alınır. Yayınevi silme ilişkili sınav, cevap anahtarı veya talep bulunursa engellenir.

Yeni veritabanı tabloları için `apps/api/prisma/migrations/20261107190000_v1_0_3_contact_audit` migration'ı eklendi. Migration mevcut tabloları veya kayıtları silmez. Üretime geçmeden önce yedek alın, migration SQL'ini ve gerçek veritabanı migration durumunu inceleyin; bu geliştirme kapsamında canlı migration veya deployment çalıştırılmamıştır. Optik TXT dönüşümü için örnek FMT/TXT kayıt dosyaları depoda bulunmadığından herhangi bir optik kayıt konumu/formatı tahmin edilmemiş ve dönüşüm desteği tamamlandı olarak sunulmamıştır.

## cPanel production dağıtımı

v1.1.2 için güncel bağımlılıklar, Passenger başlangıcı, migration sırası ve doğrulama sınırları: [v1.1.2 dağıtım raporu](docs/v1.1.2-release.md). Aşağıdaki tarihsel genel notları uygulamadan önce bu raporu izleyin.

Web uygulamasındaki API istekleri `NEXT_PUBLIC_API_URL` üzerinden yapılır (giriş/kayıt, yönetici üyelik/kullanıcı işlemleri ve iletişim formu). Bu değişken Next.js build sırasında derlemeye gömüldüğünden canlı değeri build'den önce ayarlayın:

```sh
NEXT_PUBLIC_API_URL=https://api.kurumsalsinav.com npm run build
```

cPanel uygulama ortamında API için `WEB_ORIGIN=https://kurumsalsinav.com` ayarlayın. Değerde sondaki `/` olmamalıdır; API CORS yalnızca bu origin'e izin verir. API başlangıçta cPanel'in verdiği `PORT` değerini, yoksa `API_PORT` değerini (varsayılan `4000`) kullanır.

API ortamında en azından `DATABASE_URL`, `JWT_SECRET` (rastgele, en az 32 karakter), `WEB_ORIGIN` ve cPanel `PORT` sağlanmıyorsa `API_PORT` ayarlayın. Neon PostgreSQL bağlantı URL'sini sır olarak saklayın ve SSL kullanın (`sslmode=require`). Migration çalıştırırken Neon'un doğrudan (pooled olmayan) bağlantı URL'si tercih edilir. Web uygulamasına build esnasında `NEXT_PUBLIC_API_URL` verin. İsteğe bağlı e-posta değişkenleri için yukarıdaki SMTP bölümüne bakın. `.env` dosyalarını repoya yüklemeyin.

Monorepo kök dizininde (Node.js 20+, Linux/cPanel) temel dağıtım sırası:

**Üretim için bu örneği mevcut Neon ortamında doğrudan çalıştırmayın.** `20261106000000_publisher_answer_key_support` migration'ının geçmişte başarısız olduğu bildirildi. Önce `_prisma_migrations` ile tablo/enum durumunu salt okunur inceleyin; migration resolve veya deploy kararı için veritabanı sahibinin açık onayı gerekir. Canlıya yazan hiçbir komut bu çalışma kapsamında çalıştırılmamıştır.

```sh
npm ci
npm run db:generate
# Yalnızca yedekleme, migration durumu incelemesi ve açık onaydan sonra:
npm run db:migrate:deploy
# Seed yalnızca ilk yönetici hesabının ilk kurulumu için, ayrı onayla:
npm run db:seed
NEXT_PUBLIC_API_URL=https://api.kurumsalsinav.com npm run build
```

`npm run db:seed` yalnızca ilk yönetici hesabı için bir kez çalıştırılmalıdır; API ortamında `ADMIN_EMAIL` ve `ADMIN_PASSWORD` tanımlı olmalıdır. Parola en az 12 karakter ve en fazla 72 UTF-8 bayt olmalıdır. Seed mevcut e-posta kaydının parolasını değiştirmez. cPanel API uygulamasının başlangıç komutu `npm run start -w @optik/api` (`apps/api/dist/src/server.js`), Next.js web uygulamasının başlangıç komutu `npm run start -w @optik/web` (`next start`) olabilir; uygulama kök dizini, startup yöntemi ve port yönlendirmesi cPanel sağlayıcısının Node.js uygulama modeline göre ayarlanmalıdır. İki uygulama aynı monorepo kökünü kullanamıyorsa yalnızca `apps/api` veya `apps/web` klasörlerini ayırıp kopyalamak yerine workspace bağımlılıklarını ve build çıktısını birlikte dağıtacak bir düzen kurun.

Canlıya çıkış checklist'i:

- [ ] cPanel Node.js sürümü 20 veya üstü ve web uygulaması için Next.js SSR desteği doğrulandı.
- [ ] `api.kurumsalsinav.com` ve `kurumsalsinav.com` DNS/SSL sertifikaları etkin ve HTTPS üzerinden erişilebilir.
- [ ] Neon üretim veritabanı oluşturuldu; `DATABASE_URL` API uygulama ortamına eklendi, bağlantıda SSL etkin.
- [ ] API ortamında güçlü `JWT_SECRET`, `WEB_ORIGIN=https://kurumsalsinav.com` ve cPanel'in verdiği `PORT` ayarlandı.
- [ ] Web build'inde `NEXT_PUBLIC_API_URL=https://api.kurumsalsinav.com` kullanıldı.
- [ ] `npm ci`, `npm run db:generate`, `npm run db:migrate:deploy` ve `npm run build` başarıyla tamamlandı.
- [ ] İlk `npm run db:seed` API ortamındaki `ADMIN_EMAIL` / `ADMIN_PASSWORD` ile bir kez çalıştırıldı; sırlar loglarda veya repoda paylaşılmadı.
- [ ] API `https://api.kurumsalsinav.com/api/health` üzerinden `{"status":"ok"}` döndürüyor.
- [ ] Giriş, üyelik başvurusu, yönetici onayı ve panelde kullanıcı listesi canlı ortamda kontrol edildi.
- [ ] Tarayıcı geliştirici konsolunda CORS/HTTPS hatası yok; izin verilmeyen origin'lerden gelen istekler engelleniyor.
- [ ] SMTP kullanılacaksa canlı e-posta gönderimi doğrulandı; yedekleme ve log inceleme yöntemi belirlendi.

## Tek dosyalık önizleme

Ana dizindeki `index.html` dosyasını dosya yöneticisinden çift tıklayarak açabilirsiniz. Bu, giriş gerektirmeyen bağımsız bir arayüz önizlemesidir; kimlik doğrulama ve panel erişimi kapalıdır. Gerçek kayıt ve giriş için Next.js uygulamasını kullanın.

Next.js iletişim formu API'deki `/api/contact` ucuyla SMTP üzerinden destek adresine e-posta gönderir; bunun çalışması için yukarıdaki SMTP ayarları gerekir. Tek dosyalık statik HTML demosu backend olmadan e-posta gönderemez; formu e-posta uygulamasında gönderime hazır bir taslak açar. Harita ve e-posta uygulaması için internet/açılış uygulaması gerekir.

Panel demosunda hesap ayarları, hafta sonları/resmî tatil işaretleri bulunan gezilebilir takvim, görsel arka planlı küçük bir kuş oyunu ve giriş sonrası Araçlar menüsünde Sınav Listesi Düzenleyici ile PDF/Excel araçları bulunur. Sınav listesi ve PDF/Excel araçları dosyaları tarayıcıda işler; Excel/PDF işlevleri için internet bağlantısı ve ilgili kütüphanelerin yüklenmesi gerekir. Kuş oyunu özgün ve hafif bir mini oyundur. Dini bayram tarihleri takvimde 2025–2030 aralığı için sabitlenmiştir; resmî tatil tarihleri üretim kullanımından önce doğrulanmalıdır.

## Mevcut temel

- Rol tabanlı oturum açma ve JWT ile korunan yönetici başvuru listesi.
- Bayi/okul başvurularının API üzerinden kaydedilmesi.
- Kullanıcı, bayi, okul, FMT alan eşlemesi, TXT yükleme işi, sınav, ders/cevap anahtarı ve optik kayıt Prisma modelleri.
- Ana sayfa, rol seçimi/oturum formu ve bayi/kurum başvuru formu.

7108 için FMT eşleme, TXT doğrulama, oturum birleştirme, değerlendirme, sonuç arşivi ve liste/karne akışı [optik değerlendirme modülünde](docs/7108-optical-evaluation.md) uygulanmıştır. FMT’ler arası TXT dönüşümü [v1.0.6’da](docs/v1.0.6-release.md) eklenmiştir. Diğer optik formatlar için gerçek, doğrulanmış TXT yerleşimleri ve üretim dağıtım doğrulaması gerekir.

## Çok kiracılı erişim kuralı

İsteklerde tenant kimliği istemciden gelen değere göre yetkilendirilmemeli; doğrulanmış kullanıcının rolü ve `dealerId`/`schoolId` ilişkileri üzerinden kapsam belirlenmelidir. Süper yönetici tüm kurumlara erişebilir; bayi kendi okullarıyla, okul kullanıcısı yalnızca kendi okuluyla sınırlandırılmalıdır. Dosya işleme ve rapor uçları da aynı kapsam kontrollerini uygulamalıdır.
