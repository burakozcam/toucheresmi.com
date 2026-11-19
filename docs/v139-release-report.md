# KurumsalSınav v1.3.9 — yerel geliştirme ve kesinti sonrası denetim

19 Kasım 2026, Türkiye saati. Başlangıç commit: `eee6727` (v1.3.8). **Bu belge canlı yayın veya eksiksiz sürüm kabulü değildir.** Elektrik kesintisinden kalan kaynak ve test çıktıları korunarak denetlendi. Özellikle yardım sisteminin tam işlevsel kapsamı henüz kabul edilmiş değildir; açık maddeler aşağıdadır.

## Duyuru merkezi

`Announcement`, `AnnouncementTarget`, `AnnouncementRead`, `AnnouncementAutomation` modelleri eklendi. `sourceEvent` benzersizliği aynı yayın olayının yeniden denemede ikinci kez duyurulmasını engeller. Kaynak olay kimliği silinmiş kayıtta da korunur. Yayın başlangıcı/bitişi, yönetim durumu, hedef kitle, öncelik, sabitleme, yönlendirme ve kaynak ayrı alanlardır. Liste başına 25 kayıt; arama, kategori, durum, hedefleme ve sayfalama sunucuda uygulanır. Durum/tarih, kategori ve hedef sorguları için indeksler vardır. Sürekli çalışan zamanlayıcı veya Redis eklenmedi.

Yalnız SUPER_ADMIN yönetir; DEALER yalnız yetkili olduğu kayıtları okur. SCHOOL_ADMIN/STUDENT/PARENT için yeni duyuru kanalı açılmadı. Liste, detay ve okundu uçları sunucuda hedeflemeyi denetler. ALL/ADMINS/DEALERS ile belirli bayi, kurum ve panel kullanıcıları desteklenir. Kurum hedefi kurumun sahibi bayi üzerinden değerlendirilir. Yönetim işlemleri audit kaydı üretir; bayi bu uçları kullanamaz.

Varsayılan bitiş **seçilen başlangıç + 7 gün**dür. Süresiz yayın açık seçimdir. Taslak/pasif/arşiv/silinmiş yönetim durumları ile tarihten hesaplanan yayın bekliyor/yayında/süresi dolmuş durumları ayrıdır. Pasif kayıt kullanıcı geçmişinden de kalkar. Geri aktifleştirme tarihleri korur; yeniden yayımlama ayrı bir işlemdir ve yeni 7 günlük pencere açar. Yayını sonlandır işlemi arşiv durumuna geçirir; ileri tarihli bir kayıt yanlış biçimde yayın bekliyor olarak kalmaz ve başlangıç öncesinde kullanıcıya açılmaz. Silme onaylı ve geri alınabilirdir; geri alma pasif duruma döndürür. Duyuru metni HTML olarak çalıştırılmaz; yönlendirmeler sabit panel bölüm listesinden seçilir.

Başarılı cevap anahtarı kayıt işlemi kendi transaction'ında duyuruyu üretir. Geri alınan transaction ve başarısız toplu satır duyuru bırakmaz. Aynı yayın kimliğinin düzenlenmesi/tekrarı yeni olay oluşturmaz. Yayımlanmayan veya yayın zamanı gelmeyen anahtarlar duyuru üzerinden gösterilmez. Cevap anahtarı otomasyonu varsayılan açıktır; FMT/sınav/sürüm otomasyonu varsayılan kapalıdır. FMT ve sınav olayları gerçek kayıt akışlarına bağlıdır; v1.3.9 sürüm duyurusu ayrıca yönetici onayı gerektirir. Commit/build bu onayı vermez.

Panel ana sayfasında yatay, 1–3 kartlık kompakt alan; diğer ekranlarda yalnız Araçlar → Duyurular girişi bulunur. Kartlar elle geçilir; otomatik döndürme eklenmediği için okuma sırasında otomatik kayma yoktur. Kategori renkleri durum renklerinden ayrıdır. Tam sayfada güncel/geçmiş/yönetim, açılır kategori grupları ve ayrı detay penceresi vardır. Hedef seçimi şu an doğrulanmış kayıt kimlikleriyle yapılır; isimle aramalı hedef seçimi henüz geliştirilmedi.

## Geçmiş sürümler

İçe aktarma yalnız yöneticinin açık `POST /api/announcements/history/import` onayıyla çalışır; açılış seed'i değildir. `release:<sürüm>` anahtarıyla idempotent upsert, boş update kullanır; adminin pasife aldığı/sildiği kayıt geri açılmaz. Kayıtlar doğrudan arşivdir; güncel listesine veya yeni duyuru sayısına girmez. Canlı yayın tarihleri doğrulanamadığı için `releaseDate=null`; arayüz uydurulmuş tarih göstermez. Epoch alanları yalnız teknik sıralama değeridir.

| Sürüm | Kullanıcı yeniliği | Doğrulama kaynağı |
|---|---|---|
| 1.2.5 | Ayrı oturumlar ve karne seçenekleri | docs/v125-release-report.md |
| 1.3.0 | Yeni karneler ve kazanım analizi | docs/v130-release-report.md |
| 1.3.4 | Birleşik sınav çalışma alanı, katılım seçenekleri | docs/v134-release-report.md |
| 1.3.5 | Öğrenci erişim kodları ve yayınevi bilgileri | docs/v135-release-report.md |
| 1.3.7 | Sınava özel logo ve yönetim kolaylıkları | docs/v137-release-report.md |
| 1.3.8 | Kompakt listeler, FMT paylaşımı ve PDF araçları | docs/v138-release-report.md |

İçerikler altyapı adresi, gizli anahtar, token veya istismar ayrıntısı içermez. Bu oturumdaki içe aktarma yalnız sentetik yerel test DB'sinde yapıldı.

## Zamanlanmış paylaşım ve panel

`FmtShare.startsAt` nullable eklendi; eski bağlantılar null başlangıçla çalışır. FMT tekli/toplu ve cevap anahtarı PDF paylaşımı hemen/ileri tarih, süre/özel bitiş/süresiz seçeneklerini destekler. Süre ileri başlangıçtan hesaplanır. Görüntüleme, doğrudan indirme ve metadata uçları başlangıç ve bitişi sunucuda kontrol eder. Yönetim listesi yayın bekliyor/aktif/süresi doldu/iptal/kullanıldı ayrımını korur. Paylaşım süresi duyuru süresinden bağımsızdır. Kullanılmış üyelik daveti yeniden etkinleştirilmez veya süresiz yapılmaz.

Kaynakta doğrulanan yönetim kategorileri FMT, cevap anahtarı PDF ve üyelik/kayıttır. Kategori açılmadan liste çekilmez; açılan kategori SQL üzerinden 25'li sayfalanır. Mevcut sahiplik/yetkiler korunur. Kesinti sonrası kontrolde başlangıç zamanı detay satırına eklendi; bitiş düzenlemesinin tarayıcı saat dilimi yerine Türkiye saatini kullanması sağlandı.

Karşılama/tarih/saat/150 özlü söz bileşeni yalnız panel ana sayfasında mount edilir. PDF ve Belge Araçları merkezi mevcut PDF editörü, dosya/sayfa araçları ve tarayıcıyı sekmelerde toplar. Yalnız seçilen çalışma alanı yüklenir, açılmış alan sekme değiştirirken korunur; panelden ayrılma onaylıdır. Mevcut yerel PDF/OCR bağımlılıkları ve eski URL'ler korunur.

Masaüstü menü 200–380 px aralığında ayarlanır; varsayılan 260 px. Pointer capture ve requestAnimationFrame/CSS değişkeni kullanır. Yerel tercih saklanır. Ok tuşları 10 px değiştirir; Home/çift tıklama sıfırlar. Mobil/tablet düzeni ayrı responsive kuralları korur.

## Karne ZIP: doğrulanan neden ve değişiklik

v1.3.8 tarayıcı ZIP yolu her öğrenci için ayrı HTTP/PDF isteği yapıyordu. Aynı sınav snapshot'ları, hazırlama/sıralama/ortalamalar ve metadata her öğrencide yeniden hesaplanıyordu. Yeni yol tek yetkili istek ve istek kapsamındaki ortak view/özet/öğrenci indeksini kullanır. Sonuç, logo veya sıralama için kurumlar arası global cache yoktur. Yalnız değişmez font baytları süreçte yeniden kullanılır; PDF belge/font nesneleri paylaşılmaz.

Her PDF sırayla oluşturulur; sınırsız paralellik eklenmedi. İş v1.3.8 ortak CPU kabul mekanizmasından yuva alır ve öğrenciler arasında event loop'a döner. STORE ZIP özel depoda bir PDF tamponuyla yazılır; tüm PDF'ler sunucu RAM'inde biriktirilmez. PDF'lerin kendi sıkıştırması korunur. Özel geçici dizin/dosya izinleri 0700/0600; başarılı, hatalı ve iptal edilen isteklerde temizlik yapılır. Kaynak hazırlama hatasının da CPU yuvasını bırakması kesinti sonrası düzeltildi. Sürecin zorla öldürülmesinden kalabilecek özel geçici dosyalar için ayrı temizlik politikası henüz yoktur.

Tarayıcı ilerlemesi küçük JSON kontrol çerçeveleri ve ham ZIP bloklarıyla aktarılır; Base64 kullanılmaz. Bitiş çerçevesi ve boyut uyuşması olmadan başarı/indirme verilmez. Tarayıcı tamamlanan ZIP'i Blob olarak tutar; uçtan uca diske yazma iddiası yoktur.

**Altı öğrencide dakikalar süren özgün canlı olay yeniden üretilemedi.** Aşağıdaki yerel sentetik ölçümler tekrar hazırlamayı kanıtlar; ağ, Neon, cPanel/lsnode bekleme süresi veya üretim darboğazı için kesin neden iddiası değildir.

## Performans karşılaştırması

Kesinti öncesi kaydedilmiş `test-results/v139/performance.json`: Node 22.23.5, Linux x64, 11 senaryo × iki sürüm = 22 örnek. Her örnek taze süreç, gerçek izole yerel PostgreSQL ve gerçek PDF üreticisini kullanır. v1.3.8 kaynakları `/tmp/ks-v139-baseline` altında `eee6727` sürümündendir. Eski tarayıcı ZIP birikimi aynı süreçte taklit edilir; yetkilendirme/HTTP indirme bu ölçüme dahil değildir. Her hücre tek örnektir; istatistiksel kapasite sonucu değildir.

| Öğrenci / şablon | Toplam saniye eski → yeni | Sorgu eski → yeni | CPU ms eski → yeni | Tepe RSS MiB eski → yeni | Health p95 ms eski → yeni |
|---|---:|---:|---:|---:|---:|
| 1 / two-page-card | 0.257 → 0.265 | 10 → 10 | 474 → 495 | 204.1 → 204.6 | 194 → 208 |
| 6 / two-page-card | 0.886 → 0.670 | 60 → 10 | 1543 → 1204 | 222.5 → 216.1 | 196 → 162 |
| 25 / two-page-card | 2.808 → 2.363 | 250 → 10 | 4348 → 3570 | 230.4 → 233.8 | 125 → 89 |
| 100 / two-page-card | 10.645 → 8.323 | 1000 → 10 | 15611 → 11407 | 251.3 → 245.8 | 82 → 76 |
| 500 / two-page-card | 80.495 → 38.163 | 5010 → 10 | 117207 → 50498 | 338.8 → 315.2 | 84 → 71 |
| 1 / summary-card | 0.294 → 0.219 | 10 → 10 | 586 → 416 | 204.0 → 204.4 | 231 → 170 |
| 1 / detailed-card | 0.211 → 0.215 | 10 → 10 | 403 → 416 | 204.5 → 203.2 | 154 → 168 |
| 6 / summary-card | 0.828 → 0.779 | 60 → 10 | 1435 → 1392 | 222.0 → 225.3 | 168 → 157 |
| 6 / detailed-card | 0.764 → 0.778 | 60 → 10 | 1340 → 1355 | 221.6 → 219.2 | 168 → 193 |
| 25 / summary-card | 2.494 → 2.220 | 250 → 10 | 3895 → 3438 | 229.3 → 233.6 | 121 → 125 |
| 25 / detailed-card | 2.744 → 2.023 | 250 → 10 | 4261 → 3097 | 231.9 → 234.3 | 105 → 84 |

Bazı küçük örneklerde süre veya RSS artışı vardır; tüm şablonlarda hızlanma iddiası yoktur. 500 öğrencilik iki sayfalık örnekte 80,495 → 38,163 saniye; 5.010 → 10 sorgu görülmüştür. Sağlık uçları yanıt vermiştir; bu, giriş/değerlendirme dahil bütün API uçlarının eşzamanlı yük kabulü değildir. JSON dosyası ilk PDF, öğrenci başına PDF, metadata, ZIP, SQL süreleri ve yeni view alt aşamalarını ayrıca içerir. Font/logo, kazanım hesaplama, sıkıştırma, yetkilendirme, gerçek ağ ve tarayıcı indirme sürelerinin tamamı ayrı ayrı ölçülmedi; talebin 9.1 ölçüm matrisi bu nedenle henüz eksiksiz değildir. Kontrollü paralel PDF üretiminin karşılaştırmalı kazancı ölçülmedi.

## Yardım motoru ve gerçek kapsam

Ortak yardım motoru sayfa/rol/akış tanımlarını, kararlı kaynak `data-help-id` değerlerini ve yalnız mevcut rolde mount edilmiş kontrolleri kullanır. Kontrol açıklamaları, sentetik animasyonlu anlatım ve gerçek sayfada güvenli vurgulama vardır. Eğitim gerçek kayıt/silme/paylaşma/değerlendirme başlatmaz. Yardım açılana kadar motor/rehber verisi dinamik yüklenir. Oynat/duraklat/tekrar/önceki/sonraki/bölüm seçimi, sekme görünürlüğü ve reduced-motion desteği bulunur. Kesinti sonrası tekrarlanan bileşenlerin alanları turdan düşmesin diye ID bazlı tekilleştirme kaldırıldı; etiketlerin seçim listesindeki bütün değerleri yutması ve iframe vurgu koordinatları düzeltildi.

Kaynak envanteri: **84 dosyada 709 kontrol şablonu**. Bu, görünür alan sayısı veya ayrıntılı açıklaması insan tarafından onaylanmış kontrol sayısı değildir. Dinamik satırlar aynı kaynak şablonundan çoğalabilir. **21 kaynak etiketi ayrıca incelenmelidir.** `tests/v139.test.ts` AST üzerinden gerçek JSX kontrolü ile kayıt/ID eşleşmesini doğrular. Anlamlı işlev açıklamasını ve bütün koşullu/rol durumlarını tek başına kanıtlamaz.

**Eksiksiz yardım kabulü verilmedi.** Kontrol açıklamalarının önemli kısmı kontrol türü/etiketi üzerinden geneldir; her düğmenin önkoşul, sonucu, hata ve onay davranışının tekil içerik denetimi bitmedi. PDF HTML/JS araçlarının iç kontrolleri ve sandbox Sınav Listesi Düzenleyici içeriği JSX envanterine dahil değildir. Tüm önemli iş akışları için özel animasyon sahnesi kabulü ve tüm rollerin koşullu durum testleri tamamlanmadı. Bayi rehberinde yönetici kontrollerinin gizlenmesi ayrıca tarayıcıda sınandı.

Aşağıdaki tablo **kayıtlı kontrol şablonlarını** gösterir; tamamlanmış belge kapsamı olarak okunmamalıdır. Ayrıntılar `docs/v139-help-inventory.json` ve `apps/web/app/panel/help-controls.json` içindedir.

| Kaynak ekran/bileşen | Envantere kayıtlı kontrol |
|---|---:|
| `panel/account-security.tsx` | 8 |
| `panel/action-button.tsx` | 1 |
| `panel/announcements.tsx` | 42 |
| `panel/answer-archive-file-input.tsx` | 2 |
| `panel/answer-key-file-input.tsx` | 9 |
| `panel/answer-key-management.tsx` | 36 |
| `panel/audit-log-management.tsx` | 7 |
| `panel/blog-management.tsx` | 12 |
| `panel/bulk-answer-keys.tsx` | 13 |
| `panel/bulk-exams.tsx` | 18 |
| `panel/calendar.tsx` | 3 |
| `panel/coefficient-choice.tsx` | 3 |
| `panel/coefficient-help.tsx` | 1 |
| `panel/coefficient-profiles.tsx` | 7 |
| `panel/contact-inbox.tsx` | 4 |
| `panel/cover-editor.tsx` | 8 |
| `panel/create-user.tsx` | 7 |
| `panel/data-grid.tsx` | 1 |
| `panel/dealer-activities.tsx` | 6 |
| `panel/dealer-management.tsx` | 23 |
| `panel/dealer-status.tsx` | 1 |
| `panel/exam-management.tsx` | 5 |
| `panel/exam-picker.tsx` | 4 |
| `panel/exam-report-logo.tsx` | 3 |
| `panel/exam-results.tsx` | 22 |
| `panel/exam-workspace.tsx` | 1 |
| `panel/file-management.tsx` | 27 |
| `panel/fmt-bulk-upload.tsx` | 22 |
| `panel/fmt-downloads.tsx` | 2 |
| `panel/fmt-guess.tsx` | 3 |
| `panel/fmt-manager.tsx` | 6 |
| `panel/fmt-mapping-table.tsx` | 1 |
| `panel/fmt-sample-preview.tsx` | 5 |
| `panel/fmt-share-controls.tsx` | 7 |
| `panel/fmt-sharing.tsx` | 4 |
| `panel/legacy-key-link.tsx` | 3 |
| `panel/manual-key-entry.tsx` | 1 |
| `panel/match-meter.tsx` | 1 |
| `panel/motivation-banner.tsx` | 5 |
| `panel/optical-admin.tsx` | 22 |
| `panel/optical-analysis.tsx` | 1 |
| `panel/optical-checks.tsx` | 1 |
| `panel/optical-evaluation.tsx` | 18 |
| `panel/optical-key-editor.tsx` | 20 |
| `panel/optical-layout-editor.tsx` | 12 |
| `panel/optical-revisions.tsx` | 8 |
| `panel/page.tsx` | 23 |
| `panel/password-setup.tsx` | 2 |
| `panel/pdf-share-controls.tsx` | 7 |
| `panel/publication-definition.tsx` | 5 |
| `panel/publisher-logos.tsx` | 9 |
| `panel/publisher-management.tsx` | 20 |
| `panel/publisher-transfer.tsx` | 4 |
| `panel/reader-accounts.tsx` | 14 |
| `panel/registration-requests.tsx` | 12 |
| `panel/report-preview.tsx` | 2 |
| `panel/result-deletion.tsx` | 9 |
| `panel/result-editor.tsx` | 13 |
| `panel/schedule-import.tsx` | 31 |
| `panel/schedule-management.tsx` | 26 |
| `panel/school-location-select.tsx` | 3 |
| `panel/school-management.tsx` | 13 |
| `panel/scoring-settings.tsx` | 3 |
| `panel/search-history.tsx` | 6 |
| `panel/searchable-select.tsx` | 3 |
| `panel/share-links.tsx` | 15 |
| `panel/share-schedule.tsx` | 4 |
| `panel/stored-key-editor.tsx` | 4 |
| `panel/student-code-management.tsx` | 7 |
| `panel/system-center.tsx` | 8 |
| `panel/test-center.tsx` | 2 |
| `panel/txt-converter.tsx` | 12 |
| `pdf-duzenleyici/editor.tsx` | 1 |
| `pdf-duzenleyici/scanner.tsx` | 14 |
| `location-fields.tsx` | 2 |
| `password-field.tsx` | 2 |
| `report-type-buttons.tsx` | 1 |
| `answer-pdf-options.tsx` | 4 |
| `sinav-takvimi/schedule-calendar.tsx` | 10 |
| `theme-toggle.tsx` | 1 |
| `human-verification.tsx` | 1 |

Animasyonlu akışlar `help-flows.ts`, ortak sentetik ekranlar `training-scene.tsx` içindedir. Varsayılan ekranların gerçek tarayıcı sayımları `test-results/v139/help-browser-coverage.json` dosyasındadır; diyaloglar/kapalı ayrıntılar bu taramaya dahil değildir. Bu tarama ayrıntılı tüm-rol kapsamı sayılmaz. Kapalı mağaza/oyunlar için yeni ürün rehberi tasarlanmadı; kapalı modüllerin yayın durumu değiştirilmedi.

## Ana sayfa tanıtımları

Mevcut animasyonlar korunarak duyuru merkezi, etkileşimli yardım ve zamanlanmış paylaşım için üç sahne eklendi. Sentetik içerik, panel içi duyuru kanalı ve zamanından önce kapalı dosya erişimi anlatılır. Yeni dış animasyon paketi, e-posta/SMS/push iddiası veya PDF ZIP için ayrı tanıtım sahnesi eklenmedi. Ortak görünürlük/sekme/reduced-motion mekanizması kullanılır.

## Testler ve görsel doğrulama

- Son çevrimdışı test raporu: `apps/api/assets/test-center-report.json`; **278/278 başarılı**, 0 atlanan, 0 başarısız. Önceki 269 test korunur; 9 yeni v1.3.9 testi vardır. Kesinti sonrası ilk sınırsız heap koşumunda iki kaynak kabul testi RSS eşiğine takılmıştı. Uygulamanın bellek eşiği değiştirilmedi; test çalıştırıcısı 512 MB V8 heap sınırıyla çalıştırıldı ve bütün beklentiler korundu.
- Gerçek sentetik PostgreSQL/HTTP: `tests/e2e/v139-http.cjs`, **20 kontrol grubu başarılı**. Duyuru CRUD/yetki/hedefleme, transaction rollback, idempotency, geçmiş, başlangıç/bitiş, FMT/PDF doğrudan erişim, sahiplik, ZIP/temizlik ve gerçek HTTP ilerleme çerçeveleri kapsanır.
- Kesinti sonrası son Chromium koşumu: `tests/e2e/v139-browser.cjs`, **8 kontrol grubu başarılı**, sıfır pageerror. Kesinti öncesi logdaki iki sandbox/sessionStorage hatası bu koşumda tekrarlanmadı; özgün hata nedeni kesinleştirilmedi. Son yardım değişikliklerinden sonra yeniden production build ve daha güçlü kontrol sayımıyla tarayıcı kabulü de geçti.
- Görseller: `test-results/v139/ui/`; açık/koyu, 1440/390 px ana sayfa, duyuru geçmişi/yönetim formu, yardım animasyonu/turu, PDF merkezi ve üç tanıtım sahnesi. 34 ekran görüntüsü dosyası bulunur. Tarayıcı betiğinin başarılı olması bütün görüntülerin insan/ajan tarafından görsel olarak incelendiği anlamına gelmez; son görsel inceleme kapsamı ilerleme kaydında belirtilir.
- Prisma validate, API ve Web production build başarılı. Build'in localhost API adresiyle alınması canlı artifact kabulü değildir.

Önceki bütün sürümlerin DB/tarayıcı kabul betikleri bu oturumda yeniden çalıştırılmadı. Önceki sonuçlar v1.3.9'un yeni kanıtı olarak işaretlenmez. Öğrenci/bayi hesapları, tek/çift oturum, değerlendirme/puanlama, karne/kazanım, TXT/FMT, güvenlik ve kaynak yönetimi çevrimdışı regresyonlarla korunur; gerçek MFA/SMTP/CAPTCHA/Neon/cPanel ve özgün canlı dosyalar için staging kabulü ayrıca gerekir.

## Migration, canlıya geçiş ve geri dönüş

Yeni eklemeli migration: `apps/api/prisma/migrations/20261119210000_v139_announcements_scheduled_shares/migration.sql`. Yalnız nullable paylaşım başlangıcı, duyuru tabloları ve indeks/ilişkiler ekler; önceki migration'lar değiştirilmez, mevcut veriler silinmez. Migration zinciri kesinti öncesi sentetik `ks-v139-test` üzerinde uygulanmıştı; kesinti sonrası gerçek HTTP testleri aynı izole şemada çalıştı. Üretimde hiçbir migration/seed/reset/db push/migrate dev/migrate deploy çalıştırılmadı.

Canlıya geçiş önkoşulları: yardım ve ayrıntılı performans kabul açıklarını kapatma; bağımsız staging migration ve geri dönüş doğrulaması; korumalı DB/storage/ortam yedeği; Node 22 ile gerçek HTTPS API adresine temiz API/Web build; `.cpu-admission` ve özel `report-temp` izinleri; proxy buffering/timeouts ve büyük ZIP indirme/iptal testleri; çoklu lsnode süreçleri toplam RAM kabulü. Yeni tablolar olmadan kod etkinleştirilmez. DEPLOYMENT.md ana işletim sözleşmesi korunur.

Geri dönüşte Web/API birlikte doğrulanmış v1.3.8 tam artifact'ına döner; eklemeli tablolar/başlangıç alanı silinmez. Öğrenci/kurum/bayi/sonuç/TXT/FMT/paylaşım/anahtarlar korunur. DB geri yüklemesi yeni yazımları kaybettirebileceğinden otomatik yapılmaz. Test sonunda yalnız `ks-v139-test` sentetik konteyneri durduruldu; verileri silinmedi. Bu çalışma commit, push veya deploy yapmadı.

## Açık kabul maddeleri

1. Her işlevi ayrıntılı açıklayan tam yardım içeriği, PDF HTML/JS ve Sınav Listesi Düzenleyici rehberi, bütün koşullu durumlar ve rol matrisi.
2. Animasyonların her temel gerçek iş akışını yeterince göstermesine ilişkin kapsamlı kabul; genel sahnelerin yerine gereken özel sahneler.
3. Talep 9.1'deki bütün performans alt aşamaları, gerçek ağ/hosting olayı, kontrollü paralellik ve normal yetkili API yükünün birlikte ölçümü.
4. Bütün görüntülerin son görsel incelemesi; gerçek dosyayla OCR/kamera/PDF düzenleme ve PDF içerik/logo/kazanım çeşitliliği için kapsamlı staging kabulü.
5. Hedef kimliği alanları yerine isimle aramalı seçim UX'i; zorla kapanmış süreçlerden kalan özel geçici raporların güvenli temizlik politikası.

Bu maddeler kapanmadan v1.3.9 için “eksiksiz tamamlandı” veya “canlıya hazır” sonucu çıkarılmamalıdır.


## Son görsel inceleme ve yardım sayımı

Görsel olarak incelenen örnekler: `announcements-editor-dark-390.png`, `help-animation-light-1440.png`, `pdf-center-dark-desktop.png`, `discovery-1-dark-390.png`. Bu örneklerde açık/koyu yüzeylerde metin okunabiliyor; mobil duyuru formu tek sütun ve tanıtım sahnesi yatay taşmıyor. Mobilde sabit yardım/çerez düğmelerinin form alanlarına yakınlığı ve uzun yardım diyaloglarının başlık görünürlüğü ayrıca iyileştirme adayıdır. Bu dört inceleme bütün ekranların kusursuzluğu iddiası değildir.

Kesinti sonrası ilk ekran taraması yardım state'i güncellenmeden sayım yapabildiği için çok sayıda 0 kontrol yazmıştı. Betik artık `data-controls-ready=true` durumunu bekler ve envantere bağlı işlem ekranlarında sıfır kontrolü hata sayar. Sandbox Sınav Listesi Düzenleyici içerisine erişim beklenmez; bu açık kapsam olarak tutulur. Son tarama, varsayılan durumdaki gerçek kontrol sayılarını aşağıda gösterir. Her satır yalnız yönetici varsayılan görünümüdür; koşullu formlar ve bütün rollerin toplamı değildir.

| Ekran | Görünür rehber kontrolü | Rol / durum |
|---|---:|---|
| Sınav Değerlendir | 14 | SUPER_ADMIN / varsayılan |
| Sınav Sonuçları | 18 | SUPER_ADMIN / varsayılan |
| Sınav ve Cevap Anahtarı Yönetimi | 589 | SUPER_ADMIN / varsayılan |
| Sınav Verilerini Düzenle | 4 | SUPER_ADMIN / varsayılan |
| Veri Silme | 7 | SUPER_ADMIN / varsayılan |
| FMT Paylaş ve İndir | 27 | SUPER_ADMIN / varsayılan |
| FMT Yönetimi | 22 | SUPER_ADMIN / varsayılan |
| FMT DÖNÜŞTÜRÜCÜ | 7 | SUPER_ADMIN / varsayılan |
| Paylaşım Bağlantıları | 10 | SUPER_ADMIN / varsayılan |
| Kurum Yönetimi | 105 | SUPER_ADMIN / varsayılan |
| Yayınevleri | 14 | SUPER_ADMIN / varsayılan |
| Öğrenci / Veli Hesapları | 7 | SUPER_ADMIN / varsayılan |
| Duyurular | 38 | SUPER_ADMIN / varsayılan |
| Takvim | 6 | SUPER_ADMIN / varsayılan |
| Sınav Listesi Düzenleyici | 0 | SUPER_ADMIN / varsayılan |
| PDF ve Belge Araçları | 3 | SUPER_ADMIN / varsayılan |
| Bayiler | 11 | SUPER_ADMIN / varsayılan |
| Bayi Faaliyetleri | 11 | SUPER_ADMIN / varsayılan |
| Üyeler | 34 | SUPER_ADMIN / varsayılan |
| Öğrenci Erişim Kodları | 7 | SUPER_ADMIN / varsayılan |
| Arama Geçmişi | 6 | SUPER_ADMIN / varsayılan |
| Test Merkezi | 2 | SUPER_ADMIN / varsayılan |
| Yayınevi Logoları | 4 | SUPER_ADMIN / varsayılan |
| Sistem Merkezi | 5 | SUPER_ADMIN / varsayılan |
| Blog | 9 | SUPER_ADMIN / varsayılan |
| Dosya Yönetimi | 11 | SUPER_ADMIN / varsayılan |
| Gelen Kutusu | 2 | SUPER_ADMIN / varsayılan |
| İşlem Kayıtları | 7 | SUPER_ADMIN / varsayılan |
| Sınav Takvimi | 21 | SUPER_ADMIN / varsayılan |
| Hesap Ayarları | 12 | SUPER_ADMIN / varsayılan |

## Ana Sayfa Tanıtım ve Animasyon Denetimi

Bu ek çalışma, halka açık gerçek Next.js ana sayfasındaki eski/yeni bütün tanıtımları kapsar. Panel rehberinin tüm işlevler için eksiksiz olduğu sonucunu değiştirmez. Canlıya aktarım, commit, push ve veritabanı işlemi yapılmaz.

### Sayım ve işlevsel alan kararı

Ana sayfada **10 ürün anlatımı**, karne görseli hareketi ve yayınevi şeridiyle **12 ayrı animasyon alanı** bulunur. Bunlara üç mevcut bölümde kullanılan ortak giriş geçişi eklendiğinde **13 animasyon grubu / 15 yerleşim örneği** vardır. Bu sayım yayınevi kataloğu dolu olan görünümü esas alır; katalog boşken şerit mount edilmez. Sayım birimi açıkça ayrılmıştır: bölüm girişleri tek ortak hareket türü, üç DOM yerleşimidir. Ürün anlatımlarının biri mevcut araç satırındaki kompakt PDF kartıdır; yeni uzun PDF tanıtım bölümü eklenmedi.

Mimari gösterim **12 doğrulanmış işlevsel alan** içerir. Önceki dokuz alan korunur; PDF ve raporlama alanı birleşik belge araçlarını da kapsar ve mükerrer sayılmaz. Duyuru merkezi ve kullanım rehberi eklenir; mevcut paylaşım işlevi artık zamanlanmış paylaşım olarak ayrı kullanıcı akışıyla görünür. Bu gruplama sunucu/worker/mikroservis sayısı değildir. Kod tabanında kendiliğinden ortaya çıkan tek mutlak modül sayısı olduğu iddia edilmez; bu diyagramın kullanıcı işlevleri esas alınarak belirlenmiş kapsamıdır.

| İşlevsel alan | Kaynakta doğrulanan karşılığı |
|---|---|
| Optik değerlendirme | `panel/optical-evaluation.tsx`, API `optical-routes.ts` |
| FMT tanıma | `panel/fmt-guess.tsx`, API `fmt-inference.ts` |
| Sınav önerisi | `panel/exam-picker.tsx`, API `optical-exam-matching.ts` |
| Puan ve sıralama | API `optical-core.ts`, `result-rankings.ts` |
| Kazanım analizi | API `optical-analysis.ts`, `result-reference-pdf.ts` |
| Rapor ve belge araçları | `panel/exam-results.tsx`, `pdf-duzenleyici/editor.tsx`, `scanner.tsx`, yerel PDF araçları |
| Öğrenci ve kurum | `panel/school-management.tsx`, `reader-accounts.tsx`, `student-code-management.tsx` |
| Veri yönetimi | TXT arşivi, kayıtlı sonuçlar, `result-editor.tsx`, `result-deletion.tsx` |
| Güvenlik ve yetki | Mevcut hesap/kurum/sonuç erişim denetimleri; tanıtımda yalnız genel fayda |
| Duyuru merkezi | `announcements.ts`, panel `announcements.tsx` |
| Kullanım rehberi | `help-center.tsx`, `help-flows.ts`, `training-scene.tsx`; eksiksiz kapsam iddiası yok |
| Zamanlanmış paylaşım | `fmt-share.ts`, `share-window.ts`, panel `share-schedule.tsx` |

Mavi akışlar hazırlama → değerlendirme → sonuç → rapor ve kayıt/yayın → duyuru → kullanıcı yollarını temsil eder. Yeşil noktalar temsili işlev göstergesidir; gerçek servis sağlık/uptime ölçümü değildir. Diyagramın başlığı da “işlevsel alan / temsili kullanıcı iş akışı” der. Altın güvenlik kilidi SVG'si ve Türk bayrağı kaynakları `eee6727` ile bayt düzeyinde aynıdır.

### Her mevcut animasyon için karar ve doğrulama

Kaynaklar aksi belirtilmedikçe `apps/web/app/` altındadır. Görseller `test-results/v139/home-audit/` dizinindedir. “4/4” aydınlık/koyu × 1440/390 px son durum görüntülerini belirtir. Gerçek animasyon saatleri ayrıca Chromium'da masaüstü ve mobil genişlikte adım adım çalıştırılır; aşağıdaki son kabul kaydı sonuçları belirtir.

| Animasyon | Önceki durum | Güncel durum / değişiklik | Karar ve gerekçe | Gerçek işlev kaynağı | Görsel kanıt |
|---|---|---|---|---|---|
| Öğrenci karnesi (`LiveReport`) | 12 örnek cevap, temsili tam sınav puanı ve karne | Normal karne/kazanım tanıtımı korundu; ortak saat ve terminal adım doğrulandı | **Koruma**: gerçek karne tasarımı ve sentetik veri açıklaması doğru | `home-demos.tsx`, `result-reference-pdf.ts`, `report-templates` | `00-<tema>-<genişlik>-final.png`, 4/4 |
| Kişisel sonuç/gizlilik (`SecurityScene`) | Temsili cevap formu, maskeleme ve altın kilit | Aynı görsel ve genel kişisel erişim faydası korundu | **Koruma**: iç güvenlik mimarisi açıklanmadan gerçek kişisel erişim anlatılır | `home-demos.tsx`, `security-lock.tsx`, öğrenci/sonuç erişimi | `01-*`, 4/4 |
| Kazanım analizi (`AcademicProgress`) | Farklı yayınevlerinde aynı kazanımın zaman içindeki otomatik karşılaştırılması izlenimi | Seçili tek sınavın üç örnek kazanımı; doğru/yanlış ve başarı çubukları | **Güncelleme**: mevcut kaynakta otomatik sınavlar arası kazanım eşleştirme motoru yok | `optical-analysis.ts`, `result-reference-pdf.ts`, `panel/optical-analysis.tsx` | `02-*`, 4/4 |
| İşlevsel mimari (`SystemArchitecture`) | Sabit dokuz düğüm, merkezden her düğüme bağlantı | Dinamik sayımdan 12 alan; 4×4 çevre düzeni ve doğrulanmış kullanıcı akışları | **Güncelleme**: yeni alanlar görünür, birleşik PDF alanı tek, ayrı servis iddiası yok | `system-architecture.tsx`; yukarıdaki modül tablosu | `03-*`, 4/4 |
| TXT/FMT/sınav önerisi (`InferenceScene`) | TXT → FMT → sınav → değerlendirme, son seçimi kullanıcı yapar | Doğru iş akışı korundu | **Koruma**: otomatik kesin sınav seçimi veya fiziksel optik tarama iddiası yok | `panel/optical-evaluation.tsx`, `fmt-guess.tsx`, `exam-picker.tsx` | `04-*`, 4/4 |
| Toplu değerlendirme/rapor (`BatchScene`) | Animasyon süresinde 0 → 2.000 sayaç | Örnek kayıt kontrolü, kurum/sınıf/öğrenci raporu ve PDF/Excel seçimi | **Güncelleme**: hız/kapasite izlenimi kaldırıldı; mevcut rapor seçenekleri gösterilir | `panel/exam-results.tsx`, `result-routes.ts`, `report-templates` | `05-*`, 4/4 |
| Duyuru merkezi (`AnnouncementDiscovery`) | Başarılı kayıt → duyuru → panel kartı; yaşam döngüsü kısmi | Başarılı kayıt, otomatik duyuru, hedef kitle, kategori, yatay kart, varsayılan 7 gün ve geçmiş | **Güncelleme**: yalnız panel ana sayfası ve Araçlar → Duyurular; zil/SMS/push/e-posta gönderimi yok | `announcements.ts`, `announcement-core.ts`, `panel/announcements.tsx`, `panel/page.tsx` | `06-*`, 4/4 |
| Etkileşimli yardım (`HelpDiscovery`) | İmleç ve TXT/FMT/sınav vurguları | Güvenli örnek anlatım; dosya sürükleme, açılan seçimler, gerçek değerlendirme düğmesi etiketi ve tamamlanma | **Güncelleme**: gerçek rehber davranışı; eğitim kayıt oluşturmaz, tüm yardım eksiksiz denmez | `help-center.tsx`, `training-scene.tsx`, `panel/optical-evaluation.tsx` | `07-*`, 4/4 |
| Zamanlanmış paylaşım (`ScheduledShareDiscovery`) | Gelecek başlangıç ve aktifleşme; bitiş yok | Tür/zaman seçimi, bekliyor → başlangıç → aktif → bitiş → süresi doldu | **Güncelleme**: dosya başlangıç öncesi ve bitiş sonrası kapalı; gösterilen bağlantı yalnız temsili etiket | `share-window.ts`, `share-security.ts`, `fmt-share.ts`, `share-schedule.tsx` | `08-*`, 4/4 |
| PDF ve Belge Araçları (`PdfDiscovery`) | Araç satırında yalnız statik PDF bağlantısı; aktif sayfada ayrı PDF animasyonu yoktu | Aynı kartta PDF düzenleme / dosya-sayfa / belge tarama önizlemesi | **Kompakt ekleme**: birleşik merkezi doğru tanıtır; yeni büyük bölüm yok | `pdf-duzenleyici/editor.tsx`, `scanner.tsx`, `public/araclar/pdf-tools.html`, `pdf-page-editor.js` | `09-*`, 4/4 |
| Ana karne görseli | Sentetik gerçek PDF tasarımı, giriş ve süzülme | Görsel korunur; görünürlük ve canlı reduced-motion değişikliği durdurur | **Koruma + kaynak düzeltmesi** | `page.tsx`, `HomeEffects`, `home-report.webp` | `full-*` |
| Yayınevi şeridi | Katalogdan gelen yayınevleri; gizli ikinci DOM kopyası; belge görünürlüğü eksik | Gerçek katalog korunur; gereksiz kopya kaldırıldı; durdur/oynat ve sekme/ekran görünürlüğü denetlenir | **Güncelleme**: aynı tanıtımı çoğaltmadan daha az DOM ve doğru duraklama | `home-motion.tsx`, `/api/publishers` mevcut public katalog | `full-*`; gözlemci/kontrol testleri |
| Bölüm girişleri | Mevcut sınav vitrini, kurum ve araç satırı giriş geçişleri | Aynı üç yerleşim ve kurumsal renkler korunur | **Koruma**: tekrar oynayan uzun sahne eklenmez; reduced-motion statik | `HomeEffects`, `styles.css` | `full-*`; görünürlük testi |

`ProgressReport` ve `ScrollStory` eski exportları gerçek ana sayfada mount edilmiyordu. Bunlar animasyon sayısına katılmadı; aynı işlevleri tekrar eden kullanılmayan exportlar `home-motion.tsx` içinden temizlendi. `HeroWorkflow` kaynak dosyası da mevcut ana sayfaya bağlı değildir ve aktif animasyon sayısına katılmaz. Kök `index.html`, Next.js public ana sayfasının sunulan kaynağı değildir; bu kabul gerçek `app/page.tsx` çıktısını sınar.

### Metin, istatistik ve güvenli tanıtım denetimi

- 2.000 öğrenci sayacı, “Binlerce cevap” başlığı ve otomatik sınavlar arası kazanım karşılaştırması kaldırıldı. Örnek öğrenci puanı/cevap sayıları açıkça sentetik karne verisidir; sistem kapasitesi istatistiği değildir.
- Sınav vitrini ve yayınevi şeridi mevcut public katalogdan gelir. Blog mevcut yayımlanmış yazıları gösterir; sahte kullanım/başarı sayısı üretilmez. Mağaza mevcut yayın durumuna göre koşulludur; kapalı özellik açılmadı.
- Yardım teknik envanteri, test/sorgu/dosya sayısı, CPU/RAM, yerel performans süreleri, eşzamanlı kullanıcı veya garanti edilmiş hız müşteriye gösterilmez.
- v139 yerel sentetik karne ölçümleri yalnız teknik raporda kalır; canlı SLA veya kapasite vaadine dönüştürülmedi. ZIP karne üretimi için tanıtım sahnesi eklenmedi.
- PDF tanıtımı yalnız gerçek merkezdeki araçları gösterir: eklenen sayfaya metin/görsel, dosya/sayfa işlemleri ve mevcut metin tanıma/eşleştirme, kamera/dosyadan kırpma/döndürme/indirme. Belge tarayıcıya OCR özelliği yakıştırılmaz; özgün PDF metnini sınırsız düzenleme vaadi verilmez. Footer ve hedef sayfa başlığı da PDF ve Belge Araçları adıyla tutarlıdır.
- Gerçek öğrenci/kurum verisi, paylaşım tokenı, hassas bağlantı/altyapı, gizli yönetim modülü veya güvenlik iç işleyişi kullanılmadı. Test kataloğu tamamen sentetiktir; DB bağlantısı kurulmaz.

### Kaynak tüketimi ve yükleme karşılaştırması

Yeni npm/animasyon kütüphanesi eklenmedi. Ortak `useHomeScene` saati çizim, adım ve ilerleme çubuğunu yönetir. Ekran/sekme görünmezken RAF iptal edilir; kullanıcı durdurması ve reduced-motion aynı saati durdurur. Son aşama okunabilir bekleme süresiyle gösterilir. Dekoratif yayınevi/karne hareketleri de belge görünürlüğü ve hareket tercihine bağlıdır. PDF/OCR çalışma alanı ve kütüphaneleri ana sayfada yüklenmez; yalnız örnek HTML/SVG çizimleri vardır.

Build manifestine bağlı ana sayfa JS karşılaştırması `bundle-before.json` ve `bundle-after.json` içindedir. Son ölçüm/kabul rakamları aşağıdaki son koşum kaydına eklenir. Gzip dosya hesabı gerçek CDN sıkıştırma veya saha yükleme süresi ölçümü değildir; yeni içerik maliyeti gizlenmez. Gerçek hosting hızlanması iddiası yoktur.


### Son ana sayfa kabul sonucu

- `node tests/e2e/v139-home.cjs`: **27/27 kontrol grubu başarılı, çıkış 0**, sıfır Chromium `pageerror`; 10 ürün sahnesi, 12 işlevsel alan. Production Web ve yalnız sentetik public katalog kullanıldı. Veritabanı/gerçek kullanıcı verisi kullanılmadı.
- Dört görünümde 10'ar sahne: aydınlık/koyu × 1440/390 px. Mobil ve masaüstünde bütün sahne adımları gerçek Chromium RAF akışıyla çalıştırıldı; son adım, durdur/oynat/tekrar, ilerleme/saat uyumu ve ekran dışında zamanın ilerlememesi doğrulandı. Deterministik saat için Playwright Clock kullanıldı; uygulama adımı dışarıdan değiştirilmedi. Belge görünürlüğü handler'ları `visibilitychange` ve `document.hidden` emülasyonuyla, reduced-motion hem başlangıçta hem açık sayfada değişimle sınandı.
- Her görünümde 99 metin örneğinin hesaplanan kontrastı kaydedildi. En düşük oran aydınlıkta **4,52:1**, koyuda **5,76:1**; bütün örnekler ilgili boyut eşiğini geçti. Bu örnekleme, bütün ürün için erişilebilirlik sertifikası değildir.
- Duyuru yaşam döngüsünün hazırlama/yayında/geçmiş ve paylaşımın bekliyor/aktif/süresi doldu durumları gerçek sahne adımları beklenerek sınandı. Sanal saatten bağımsız ikinci Chromium koşumunda duyuru kartı, TXT sürükleme, FMT listesi ve sınav listesi dört gerçek zamanlı ara görüntüyle ayrıca doğrulandı; bu koşum da çıkış 0.
- 40 final sahne görüntüsü, 20 masaüstü/mobil oynatma görüntüsü, 4 tam sayfa, 6 yaşam döngüsü ve 4 gerçek zamanlı ara kare kullanıldı. Bütün final sahneler dört tema/genişlik birleşiminde temas sayfalarıyla incelendi; gerçek zamanlı ara kareler ayrıca doğrudan açıldı. Dosyalar `00…09-<tema>-<genişlik>-final.png`, `*-playing-1440.png`, `*-playing-390.png`, `full-*`, `detail-*`, `wall-clock-*` ve `review-*` adlarıyla kaydedilmiştir. Önceki başarısız denemelerin ek yerel görüntüleri bu sayıya katılmaz.
- Son çevrimdışı regresyon: **278/278 başarılı, 0 atlanan, çıkış 0**. Bu koşumda mevcut PDF artifact'ları yedeklenip aynı baytlarla geri yüklendi. Web production build başarılı. Kaynak digest'i test raporuyla eşleşir. Bu ekte önceki 20 HTTP ve 8 panel tarayıcı grubu yeniden koşulmadı; eski kanıtlar tarihsel olarak korunur, yeni ana sayfa kabulüyle aynı koşum gibi sunulmaz.

- Ana sayfa build manifestindeki JS'nin yerel gzip hesabı: **117,846 → 119,048 bayt**, fark **+1,202 bayt (%1.02)**. Yeni anlatımların bu küçük yükleme maliyeti açıkça kaydedilir; yükleme süresinin düştüğü veya hiç değişmediği iddia edilmez. Yeni ağır kütüphane, PDF/OCR çalışma alanı yüklemesi veya ek tanıtım API çağrısı eklenmedi. Sahada LCP/INP/hosting yük testi bu çalışmanın sonucu değildir.

Bu kapsamın ana sayfa tanıtım denetimi tamamlandı. Önceki panel yardımının tam kontrol/rol kapsamı ve geniş performans kabul açıkları aynen devam eder; v1.3.9 bütünü bu ek nedeniyle canlıya hazır ilan edilmez.
