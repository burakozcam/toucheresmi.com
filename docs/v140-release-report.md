# KurumsalSınav v1.4.0 — yerel geliştirme ve doğrulama raporu

20 Kasım 2026, Türkiye saati. Sürüm adı: **Performans, Kullanıcı Deneyimi, Sınav Yönetimi ve Sistem Yönetimi Güncellemesi**.

Bu çalışma canlıya yayımlanmadı. Aşağıda yerel olarak uygulanan özellikler ile açık kapsam ve kabul maddeleri ayrı belirtilmiştir. Canlı cPanel/Neon ortamı için eksiksiz kabul verilmez.

## 1. Tamamlanan özellikler

- Duyuru ayarlarında gerçek kayıt başarısı/hatası, yükleniyor durumu, tekrar gönderim kilidi ve kaydedilmemiş değişiklik uyarısı. Kayıt ve geçmiş içe aktarma ayrı durumlar gösterir.
- Mevcut raporlar ve CHANGELOG üzerinden **30 tarihsel sürüm/RC olayı**. Kaynak belgesi bulunmayan sürüm uydurulmadı; RC kayıtları kabul adayı olarak belirtilir. İçe aktarma yeni/mevcut/atlanan/başarısız sayılarını verir. İçe aktarım yalnız arşive yazar; pasif/silinmiş kayıtları yeniden açmaz. Doğrulanmamış canlı tarih `null` kalır.
- Rehber yalnız kaynak metadata’sındaki işlevleri anlatır. Aynı satır kontrolünün binlerce kopyası tek rehber maddesidir; başlık/özet gibi farklı işlevlere açık varyant kimliği verilebilir. Canlı dosya/öğrenci/FMT adları açıklamaya alınmaz. Varsayılan sekme Animasyonlu Anlatım; rehber ve sahne açılışta dinamik yüklenir. Tur gerçek kontrolleri çalıştırmaz; ekranı kaplayan katman ve klavye odağı kullanır.
- PDF merkezindeki üç çalışma alanı ve mevcut sekiz araç **aynı 11 kartlık alanda**. Gömülü araçtaki ikinci kart alanı gizlenir. PDF editörü, dosya araçları ve tarayıcı açıldıktan sonra alan değiştirmede korunur. Öğrenci PDF→ZIP tanıtımı eklenmedi.
- Admin FMT Yönetimi ve bayi indirme/paylaşma ekranı aynı kompakt liste bileşenini kullanır. Gerçek kaynak, format, doğrulama ve yayınevi alanlarıyla filtrelenir. Mevcut yönetim/etkinlik, yerleşim, özgün indirme ve toplu paylaşım işlemleri korunur.
- Cevap anahtarlarında sınıf/yayınevi filtreleri ve kayıt sayısı; teknik ID açılır ayrıntıda. Kayıtlar filtre seçmeye zorlamadan gösterilir. Öğrenci erişim kodlarında mükerrer başlık ve işlevsiz üst kısayol kaldırıldı; eylem adı olmayan yeni merkezlerde boş genel düğme çizilmez. Ortak form alt hizası, seçim alanları, login slogan arka planı ve kırmızı güvenli çıkış görünümü iyileştirildi.
- On çift renkli palet; açık/koyu mod ayrı korunur. Tercihler mevcut localStorage düzeninde saklanır; tam yenileme gerekmez. Paletler ortak CSS değişkenlerini kullanır; durum/güvenlik renkleri ayrı kalır.
- Gerçek yayınevi SQL sayfalaması: ilk sayfa 25 kayıt, sunucu araması, 250 ms debounce ve eski isteği iptal etme. Eski dizi API sözleşmesi diğer mevcut istemciler için korunur. Panel bölümleri ve sınav çalışma alanları ihtiyaç olduğunda yüklenir.
- Mevcut optik editörde yuvarlak cevaplar, 3/4/5 seçenek, A–D kitapçık görünümü, çapraz kutuları, kazanım alanları ve ders sırası. Büyük taslaklar 30 soru sayfalanır; değişmeyen soru satırları memo ile korunur. Girilmemiş cevap, H (herkese doğru) ve X (iptal) ayrıdır. Girilmemiş cevap kaydı engeller; yeni bir boş soru anlamı icat edilmedi.
- LGS 90 soru yapısı ve kişisel, değişmez soru yapısı şablonları. Şablon, soruları editöre kopyalar; FMT dosyasını veya geçmiş sınavı değiştirmez. Yeni açık optik yapılarda ders ve soru kapasitesi uyumsuzluğu, eski satır uyarısı modu açık olsa bile değerlendirmeyi durdurur. Geçmiş anahtarların mevcut tolerans politikası değiştirilmez.
- Excel→editör→Excel için mevcut ortak okuyucu ve ilk dokuz şablon kolonu korunur. Opsiyonel ek kolonlar başlangıç puanı, çoklu işaret politikası, seçenek sayısı, özgün ders adı ve kaynak satır metadata’sını korur. Türkçe, çapraz yönü, baştaki sıfırlar, kazanımlar ve H/X durumları test edilir.
- Mevcut sınav aynı anahtar ID’siyle aynı editörden düzenlenir. Gerçek değişiklik özeti, puanı etkileyebilecek değişiklik/kazanım metni ayrımı, son sonuç/kurum sayısı ve değerlendirilen sınavda ONAYLA+gerekçe. Önceki/yeni anahtarlar, fingerprint, kullanıcı ve gerekçe mevcut AuditLog’a aynı transaction içinde yazılır. Multipart dosya güncellemesi bu korumayı atlayamaz.
- Tekrar Değerlendir merkezi mevcut `reEvaluate` motorunu ve worker havuzunu kullanır. Kurum/yayınevi/sınıf/sınav seçimi, gerçek kapsam ve anahtar fingerprint önizlemesi vardır. Kapsamdaki bütün eski anahtarlı yüklemeler birlikte hazırlanır ve **tek transaction** ile yeni sonuç revizyonlarına taşınır. Bir hata tüm kapsamı geri alır. Güncel yüklemeler tekrar çoğaltılmaz. Öğrenci düzeltmeleri ve kaynak TXT bağlantıları korunur. Yeni öğrenci yayını kapalı başlar; eski revizyonlar saklanır.
- Eski anahtara ait sonuç ekranda açıkça işaretlenir; eski revizyon raporu indirildiğinde sınav başlığında önceki anahtar revizyonu belirtilir. Sıralamalar mevcut revizyon uyumu kurallarıyla hesaplanır; PDF talep edildiğinde üretilir.
- Dışa Aktarım Merkezi: işlem kayıtları, yayınevleri, duyurular, kayıtlı FMT, anahtarlar, mağaza ürünleri, TXT arşivi ve takvim için ortak kapsam önizlemesi/kanıt/dosya servisi. Sonuçlar mevcut yetkili rapor ihracını kullanır. JSON/CSV/XLSX, uygun türlerde ZIP; özgün TXT/FMT baytları ve anahtar Excel’i, isteğe bağlı saklanan özgün anahtar dosyaları. ZIP manifesti kayıt/dosya sayısı, filtre, ad, boyut ve SHA-256 içerir.
- İşlem kayıtlarında gerçek adet/dağılım, tablo+indeks alanı, saklama politikası ve son temizlik. Normal gezinme kalıcı audit üretmez. Temizlik ayrı ONAYLA işlemiyle, yalnız dışa aktarımı doğrulanmış ve süresi dolmuş en fazla 100 kaydı kapsar. Tam özgün kayıtların şifreli özel arşivi saklanır. Anahtar revizyonları ve temizlik denetimi silinmez.
- Yedekleme ve Sürüm Kurtarma Merkezi **yalnız menü ve hazırlık sayfasıdır**. Gerçek yedekleme/geri yükleme işlevi yoktur.

## 2. Düzeltilen hatalar ve gerçek nedenler

- Duyuru ayar formu kayıttan sonra başarı durumu üretmiyor ve tıklamayı kilitlemiyordu. İçe aktarma da yalnız `ok` döndürüyordu. Gerçek sonuç durumları eklendi.
- Tarihsel duyuru kataloğu yalnız altı seçilmiş sürümü içeriyordu. Gerçek belgelerdeki eksik olaylar eklendi. Admin ana sayfa görünürlüğü mevcut rol/hedef/tarih kurallarıyla yerel olarak doğrulandı; özgün canlı görünmeme olayının verileri elde olmadığı için kesin canlı kök neden iddia edilmez.
- Rehberde önceki DOM taraması aynı kontrolün her satırını ayrı ekliyor ve satır etiketini okuyordu. Kararlı işlev/varyant kimliği ve kaynak etiketi kullanılır.
- Dosyadan değerlendirmeye sahnesinde aktif satırın `max-height` geçişi toplam yüksekliği değiştiriyordu. Şeritler yerini korur, yalnız opacity/transform değişir. Anlatım süresi ve ortak saat korunur.
- Mobilde çerez bildirimi Yardım düğmesini kapatıyordu. Gerçek bildirim yüksekliği ölçülür; düğme bunun üzerinde yer alır, observer temizlenir.
- Log aktarımının kendi önizleme denetimi, aktarılacak son kayıtları değiştirerek önizlemeyi geçersiz kılıyordu. Audit kapsamı imzalı önizleme zamanıyla sabitlenir; sonradan değişen gerçek kayıtlar yine reddedilir.
- Eski boş/geçersiz anahtarlara güvenli düzenleme fingerprint’i eklenir; önceki ham JSON revizyonda saklanır. Normal sınav değerlendirme fingerprint algoritması korunur.

## 3–4. Zaten mevcut olan ve yeniden kullanılan yapılar

`ExamWorkspace`, `OpticalKeyEditor`, `parseWorkbook`, `outcome-preview`, `opticalQuestionsSchema`, `reEvaluate`, `opticalSummary`, sonuç revision/supersedes ilişkileri, `carryReaderGrants`, bayi kapsam/izin denetimleri, worker/CPU lease, `StoredZip`, özel TXT şifrelemesi, FMT özgün bayt indirmesi/paylaşımı ve duyuru sourceEvent benzersizliği yeniden kullanıldı. İkinci puan motoru, bağımsız sınav kaydı, yeni rol, yeni kuyruk veya ikinci log sistemi oluşturulmadı. Audit arşivi, mevcut kayıtların silme öncesi koruma kopyasıdır.

## 5–6. Performans ve ölçümler

- Sayfalama, bölüm/çalışma alanı code splitting, 30 soruluk editör ve memo satırlar gerçek yük azaltma değişiklikleridir. Canlı gecikme, FPS veya kapasite kazancı yüzdesi ölçülmedi.
- Son Web build `/panel`: 25,5 kB sayfa, 139 kB ilk JS. Bu bir önce/sonra ağ hız karşılaştırması değildir.
- Chromium sahne karşılaştırması, eski max-height kuralını aynı sahnede yeniden uygulayarak yapılır; tam eski sürüm benchmark’ı değildir. Masaüstü ve mobilde yaklaşık 6,984 px yükseklik aralığı ayrılmış alanla 0 px’e iner. Ayrıntılar yerel `browser-acceptance.json` içindedir.
- Mevcut özel PDF/ZIP ortak hazırlığı korunur. Bu sürüm için bütün karne şablonlarının yeni karşılaştırmalı kapasite testi yapılmadı.

## 7. Güvenlik

Yetkilendirme API’de kalır. Merkezî dışa aktarım ve audit temizliği yalnız SUPER_ADMIN; bayi yalnız mevcut izinli sonuç ihracını kullanır. Projede ayrı normal ADMIN rolü bulunmadığından yeni rol türetilmedi. Yeni kapsamlar `schoolScope` ile AND birleşir. İndirmeler kimlik doğrulamalıdır; önizleme HMAC’i kullanıcı/kapsam/veri özeti/zamanla bağlıdır. Cache `private, no-store` kalır; hassas global istemci cache’i eklenmedi.

CSV formül başlatıcıları kaçırılır, Excel metinleri formül hücresi olarak yazılmaz, dosya adları temizlenir ve ID ile ayrılır. Özgün dosya aktarımı özel depo sınırını doğrular. Şifre, token, bağlantı adresi ve audit serbest metin özeti normal dışa aktarım alanlarına alınmaz. Audit temizliği, indirme hash’i ve AES-GCM korumalı tam özel arşivi doğrular. Arşiv başka kullanıcı tarafından temizleme yetkisi vermez. Bilinmeyen/hatalı aktarım tam başarılı gösterilmez.

## 8. Önemli dosyalar

- Duyuru: `apps/api/src/announcements.ts`, `announcement-history.ts`, `announcement-import.ts`; `apps/web/app/panel/announcements.tsx`.
- Rehber/PDF: `help-center.tsx`, `help-controls.json`, `scripts/help-inventory.cjs`, `lib/help-control.ts`, PDF `editor.tsx`, `public/araclar/pdf-tools.html`, `analytics-consent.tsx`, `styles.css`.
- Panel/listeler: `panel/page.tsx`, `exam-workspace.tsx`, `publisher-management.tsx`, `fmt-manager.tsx`, `fmt-sharing.tsx`, `answer-key-management.tsx`, `theme-toggle.tsx`, `lib/palettes.ts`.
- Optik: `optical-key-editor.tsx`, `optical-question-row.tsx`, `exam-template-picker.tsx`, `stored-key-editor.tsx`, `critical-confirmation.tsx`, `reevaluation-center.tsx`; API `exam-template-core.ts`, `key-revision.ts`, `batch-reevaluation.ts`, `optical-core.ts`, `optical-review.ts`, `optical-routes.ts`, `cpu-jobs.ts`/`cpu-worker.ts`.
- Excel: `apps/api/lib/answer-key-rows.ts`, `optical-import/index.js`; `apps/web/lib/load-sheetjs.ts` ve mevcut dosya önizleme bileşenleri.
- Sistem: `exports.ts`, `export-core.ts`, `audit-maintenance.ts`, `audit-retention.ts`, `member-activity.ts`, `server.ts`; merkez ekranları ve `.env.example`.
- Şema/migration, paket sürümleri, `tests/v140.test.ts`, `tests/e2e/v140-*.cjs`/`.py` ve mevcut test doubles. PDF test çıktıları artık `test-results/regression-pdfs` altındadır.

## 9–11. Bağımlılık, migration ve veri uyumluluğu

Yeni npm bağımlılığı veya ücretli servis yoktur. Eklemeli migration: `20261120120000_v140_exam_structures`. Yalnız kişisel, değişmez `OpticalExamTemplate` tablosu ve sahip/zaman indeksi ekler; mevcut satırları/ilişkileri değiştirmez. Yeni soru metadata’sı opsiyoneldir. Eski sınavlar yeni şablona otomatik bağlanmaz. Geçmiş sonuçlar geriye dönük hesaplanmaz.

Yalnız yeni `ks-v140-test`, `127.0.0.1:55450/ks_v140` üzerinde 26 migration uygulandı. Şema diff’i boş, Prisma validate/generate başarılı. Canlıya migration uygulanmadı. Eski/yeni API worker’larını karıştırmadan aynı yazılım sürümüyle geçiş yapılmalıdır; otomatik sürüm geri alma uygulanmadı.

## 12–13. Testler ve ilk başarısız denemeler

Son doğrulama sayıları aşağıdaki teslim ekiyle kesinleştirilir. Önceki sürümlerin kabulü bu sürüme taşınmaz.

- Çevrimdışı kapsam; auth/izin/izolasyon, FMT/TXT, tek/çok oturum, değerlendirme, net/puan/sıralama, PDF/ZIP ve Excel regresyonlarını yeniden kullanır.
- Yeni gerçek HTTP/PostgreSQL grupları; iki bayi, anahtar revizyonu, stale kayıt, tüm kapsam rollback, öğrenci düzeltmeleri, idempotent tekrar, gerçek Excel multipart, açılabilir SHA doğrulamalı anahtar/TXT/FMT ZIP, aktarım stale proof, bozuk TXT, şifreli audit arşivi ve saklama korumalarını sınar.
- Chromium; admin/bayi görünümü, rehber tekrarı/varsayılanı/tur güvenliği, duyuru geri bildirimi, SQL liste sayfası, PDF çalışma alanı, optik Excel indirme, merkezler, on palet/açık-koyu, mobil taşma ve gerçek animasyon adımlarını kapsar.
- İlk 286/290 koşumda eski handler doubles yeni count/audit/transaction ve ONAYLA sözleşmesini kapsamıyordu. Güncellenen doubles ile hedefli 25 test ve sonra tam koşum geçti. Yeni güvenlik davranışı gerçek DB testleriyle ayrıca doğrulandı.
- İlk Chromium koşumlarında seçim alanı adları ve PDF kartının ilk yüklenme görünürlüğü düzeltildi. Mobil çerez/Yardım çakışması gerçek hataydı ve giderildi. Yedekleme sayfası testi ortak Yardım düğmesini yanlış sayıyordu; işlem alanına daraltıldı.
- Aktarım testleri gerçek 10/dakika sınırına takıldı. Testler aralıklı çalıştırılır; uygulama sınırı gevşetilmedi.
- Canlı hosting/Neon/proxy, gerçek Windows/Excel uygulaması, kamera/OCR, SMTP/Google, bütün rollerin bütün koşullu ekranları ve kontrolsüz büyük yük testi yapılmadı. Güncel bağımlılık güvenlik taraması/pentest iddiası yoktur.

## 14. Tamamlanmayan kapsam ve kabul sınırları

- Şablon ekranında keyfi oturum sayısı/ders dağılımı ve seçenek harfi de değişen kitapçık modeli uygulanmadı. Mevcut doğrulanmış tek/sözel/sayısal okuyucular korunur. TYT/AYT gibi yeni hazır yapılar doğrulanmış proje kaynağı olmadan eklenmedi.
- Anahtar/FMT aktarımı 100, diğer kataloglar 1.000 kayıtla sınırlıdır. Sınırsız uçtan uca streaming yoktur; büyük arşivler filtreyle bölünür. Sistem FMT örnekleri mevcut indirme ekranındadır; merkez yalnız kayıtlı kütüphaneyi aktarır. Mağaza görsel URL’leri korunur, dış sunuculardan görsel toplayan ZIP eklenmedi.
- Anahtar Excel aktarımı standart şablonun anlamsal alanlarını korur; kaynak dosyanın bütün görsel stilini aynen üretme sözü verilmez. F/O içe aktarımları mevcut sözleşmeleriyle korunur.
- Katalogda akademik yıl alanı yoksa yıl filtresi uydurulmadı. Yeniden değerlendirme tek sınav, en fazla 100 yükleme/5.000 öğrenci kaydı kapsamındadır. UI kurum/yayınevi/sınıf/sınav sunar; bayi daraltması API’dedir. Sayı, ayrı yüklemelerde aynı kişiyi içerebilen öğrenci kaydı sayısıdır. Anahtar düzenleme ekranı öğrenci sayısı uydurmaz; gerçek sonuç/kurum sayısı gösterir.
- İsimle aramalı bütün merkez filtre seçicileri tamamlanmadı; bazı filtreler gerçek kayıt ID’si ister. Bütün sayfalardaki bütün koşullu kontrollerin ayrıntılı rehber içerik kabulü verilmedi; kaynak metadata’sının sıfır boş etiketi olması bunun yerine geçmez.
- Audit otomatik temizleme cron’u kurulmadı. Mevcut teknik SystemEvent/analytics uygulama içi bakımı korunur; audit temizliği ayrı kontrollü işlemdir. Süreci zorla öldürme halinde özel geçici dosyalar için ayrıca işletim temizliği gerekir. Şifreli audit arşivlerinin uzun süreli saklama/hosting dışı yedek politikası işletmeci tarafından belirlenmelidir.
- Canlı admin duyuru olayı, canlı menü hızları, 60 FPS, bütün tema/ekran metinlerinin sayısal kontrastı ve gerçek üretim kapasitesi doğrulanmadı.

## 15–16. Canlıya aktarım öncesi işlemler

1. Açık kabul maddelerini staging’de doğrulayın; bu raporu tam üretim kabulü olarak kullanmayın.
2. Geçerli Neon ve özel dosya yedeğini operatörün mevcut prosedürüyle alın. Bu sürümün hazırlık sayfası yedek almaz.
3. Bekleyen migration zincirini kontrol edip yeni eklemeli migration’ı staging’de deneyin; ardından onaylı üretim planına göre uygulayın. Bu çalışma canlı komut çalıştırmadı.
4. Web’i gerçek HTTPS `NEXT_PUBLIC_API_URL` ile yeniden build edin. Yerel kabul build’i yalnız `http://localhost:4020` kullanır; bu adres üretime taşınmaz.
5. cPanel Node 22/Passenger, özel STORAGE_DIR izinleri, mevcut JWT/TXT/MFA anahtarları ve bağlantı havuzu düzenini koruyun. Audit arşivleri mevcut TXT_STORAGE_KEY ile şifrelenir; anahtarı değiştirip eski arşivleri erişilemez bırakmayın.
6. Opsiyonel `AUDIT_RETENTION_*_DAYS` değerlerini kurum/yasal politikanızla doğrulayın. Varsayılanlar hukuki zorunluluk iddiası değildir; süreleri uzatabilirsiniz. Audit temizliği için indirme/arşivleme ve ONAYLA ayrı gerekir.
7. Güvenilir zamanlama ileride kurulacaksa Türkiye 04.00 değerlendirilmelidir. cPanel/cron saat dilimi doğrulanmadan görev kurulmuş/çalışıyor sayılmaz. Bu sürüm otomatik audit silme görevi kurmaz.
8. v1.4.0 duyurusu hazırlanmıştır; otomasyon ayarını kaydetmek ve ayrı yayın onayı gerekir. Burada canlı duyuru yayımlanmadı. Git push/deployment yapılmadı.

## 17. Bilinen risk ve test yan etkisi

İlk tam test koşumunda eski testlerin `output/pdf/v126` ve `output/pdf/v130` içindeki örnek PDF’leri yeniden yazdığı fark edildi. Başlangıç yedeği bulunamadı; önceki dosya baytlarının geri döndürüldüğü iddia edilmez. Kullanıcı çalışma sırasında bilgilendirildi. Üç test artık `test-results/regression-pdfs` kullanır. `v132` klasörüne bu testler yazmaz. Özgün TXT/FMT ve canlı sınav verileri etkilenmedi. Bu yan etki, mevcut yerel dosyaları koruma hedefindeki istisna olarak kayda geçirilmiştir.

Yeni kişisel şablon tablosu için production migration gereklidir. Art arda büyük aktarımlar ve audit arşivleri disk kullanabilir; özel depolama kapasitesi izlenmelidir. Sonuçlar kendiliğinden yayımlanmaz; yeniden değerlendirme sonrası yayın kontrolü operatörün sorumluluğundadır.

## 18. Devam noktası

`docs/v139-progress.md` son v1.4.0 bölümünü ve bu raporun açık kapsamını okuyun. Öncelik: doğrulanmış hazır sınav/oturum yapıları, geniş kapsam filtreleri, büyük aktarım stratejisi, koşullu rehber/tema kabulü ve staging cPanel/Neon doğrulaması. Gerçek otomatik yedekleme/geri yükleme ayrı projedir: şifreli bağımsız saklama, SHA-256, sürüm öncesi yedek, hata bildirimi, test geri yükleme ve yeni sınavları koruyan geri dönüş planı gerektirir.

## Teslim doğrulaması

| Kontrol | Sonuç |
|---|---|
| Son kaynakla çevrimdışı regresyon | **292/292**, 0 başarısız, 0 atlanan/çalıştırılmayan |
| Gerçek sentetik PostgreSQL/HTTP | **20 grup** |
| Tarihçe ve bakım hedefli ek kontrol | **3 grup**, 30 sürüm/RC |
| Chromium üretim build kabulü | **17 grup**, 0 JavaScript sayfa hatası |
| API / Web production build | Başarılı; son API ve son Web kaynakları derlendi |
| Prisma validate/generate | Başarılı |
| Yeni boş test DB migration zinciri | **26 migration**, son şema diff’i boş |
| Git diff whitespace kontrolü | Başarılı |
| Test Merkezi kaynak özeti | Son kaynakla eşleşir; çalıştırılmayan eski kabul betikleri not_run kalır |

Kanıtlar `test-results/v140/`, `test-results/v140-acceptance.json` ve `apps/api/assets/test-center-report.json` içindedir. Token içeren `ui-seed.json` dağıtım/Git içeriği değildir. Sonuç raporu derlenmiş API varlıklarına da kopyalandı. İki örnek ekran doğrudan görsel olarak incelendi; bütün ekranların kusursuz kabul edildiği söylenmez.

Tarihçe genişletilirken eski hassas sözcük testi Türkçe “arama” kelimesindeki “ram” parçasını yanlış eşleştirdi. CPU/RAM denetimi sözcük sınırına alındı; gerçek hassas içerik kontrolleri korunur. Son 292 test başarılıdır.

Sahne ölçümünde otomasyonun yumuşak kaydırması karşılaştırmadan ayrıldı: 1440/390 px'de yeni şerit yüksekliği aralığı 0 px, ölçüm sırasında kaydırma farkı 0 px; önceki max-height kuralı yaklaşık 6,984 px yükseklik değişimi üretir. Bunlar kontrollü sentetik arayüz ölçümleridir.

Yeni anahtar revizyonları önceki/yeni soru JSON'unu saklar. Mevcut genel dosya değiştirme politikasının tamamı ayrı bir sürümlü dosya arşivine dönüştürülmedi; saklanmayan eski dosyaların sonradan geri getirilebildiği iddia edilmez.

İş sonunda yerel test API/Web/Chromium süreçleri kapandı; yalnız bu oturumun `ks-v140-test` konteyneri durduruldu. Sentetik kayıtlar ve arşivler silinmedi. Canlı servisler ve önceki konteynerler değiştirilmedi.
