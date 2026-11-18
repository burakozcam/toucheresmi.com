# KurumsalSınav v1.3.7 — yerel geliştirme ve kabul raporu

18 Kasım 2026 · Başlangıç commit’i: `0a85371` (v1.3.6). O commit’in paket manifestleri 1.3.5 taşıyordu; root/API/Web ve lock dosyasının ilgili alanları 1.3.7 olarak eşitlendi. Önceki raporlar ve `PROJECT_MEMORY.md` incelendi.

**Durum:** Ek tasarım talimatları uygulandı. Aşağıdaki yerel kabuller başarılıdır. Özgün canlı TXT hatasının kesin kök nedeni ve gerçek cPanel kapasitesi doğrulanmadığından, bu rapor koşulsuz production kabulü değildir. Production veritabanına, hosting’e, gerçek öğrenci dosyalarına ve kullanıcının mevcut PDF’lerine işlem yapılmadı. Commit, push veya deployment yapılmadı.

## 1. Gerçek hata nedeni ve veri koruması

### Adminin eski bayi sonucunu düzenlemesi

Kök neden snapshot JSON’u değil, **işlem geçmişinin veri sözleşmesiydi**: `result-edit.ts` GET yanıtında hassas geçmiş özetini bilerek `Sonuç verileri düzenlendi.` metnine dönüştürüyor; `result-editor.tsx` bunu `JSON.parse(h.summary)` ile tekrar JSON kabul ediyordu. Geçmiş dizisinde bir kayıt bulunduğunda React render sırasında `Unexpected token 'S'` oluşuyordu.

- Geçmiş açıklaması metin olarak gösteriliyor. Eski JSON özetleri biçimlendirilebiliyor; hatalı eski özet de metin olarak kalıyor. HTML çalıştırılmıyor. Sonuç cevap verisi ile audit açıklaması birbirine karıştırılmıyor.
- Snapshot okuması nesne JSON, PostgreSQL `jsonb::text` aktarımı ve eski string içine kodlanmış JSON’u destekliyor. Eksik/okunamayan öğrenci veya soru verisi **422 / RESULT_SNAPSHOT_UNREADABLE** ile işlemi durduruyor; boş sonuç üretip kaydetmiyor. Eski eksik `warnings` metadata’sına varsayılan verilebiliyor; cevap/öğrenci alanlarına varsayılan üretilmiyor.
- Düzenleme okuması ve yeni revizyon yazımı da v1.3.6’daki metin aktarımını kullanıyor. Büyük nesne ağacı native Prisma motoruna tekrar aktarılmıyor. Metadata + snapshot + erişim bağlantıları aynı Serializable transaction içinde; özgün sürümler korunuyor.
- Gerçek yerel PostgreSQL/HTTP kabulü: bayinin string-JSON eski sonucu adminle açıldı, değişiklik önizlendi, yeni revizyona kaydedildi ve yeniden açıldı. Özgün snapshot birebir korundu. Başka bayi erişimi 404, eski önizlemeyle tekrar yazma 409, bozuk sonuç 422; bozuk kayıtta yeni satır yazılmadı. Gerçek Chromium’da düz metin geçmişli editör açıldı; istemci hatası yok.

### TXT ve oturum birleştirme

Önceki indeksli eşleştirme, puan/net/sıralama, tüm satırları inceleyen FMT ve kitapçık çaprazları korunuyor. CPU işlemleri ortak fonksiyonların aynısını worker’da çağırıyor; yeni bir puanlama algoritması yok.

- Tek oturumlu A ve B TXT, birleştirme açık/kapalı, mevcut sonuca ikinci yükleme yolları gerçek HTTP/DB ile geçti; kanonik cevaplar korundu.
- Regresyon paketi ayrıca ayrı/birleşik oturum, eksik oturum, kimlik/numara çelişkisi, farklı kurum, tekrar kayıt, 7108/8050 ve Özdebir senaryolarını kapsıyor. Belirsiz kimlikler zorla birleştirilmiyor. Önceden tam okunmuş tek oturum iki oturum diye bölünmüyor.
- Okunamayan eski parent snapshot artık birleştirmeye boş veri olarak girmez; açıklamalı ret alır.
- **Sınır:** Kullanıcının canlıda hata veren özgün TXT’si, seçilen FMT/anahtar sürümü ve hata anındaki parent sonucu sağlanmadı. Aynı dosyanın merge açıkken canlıda neden hata verdiği kesin olarak yeniden üretilemedi. Yerel kabul, o canlı olayın kesin kök nedeninin bulunduğu anlamına gelmez. Canlı kabul öncesi bu vaka anonim kopyayla staging’de tekrar edilmeli.

### Hata sözleşmesi ve favicon

Genel sunucu hatası Türkçe işlem açıklaması, `code: INTERNAL_ERROR`, `requestId` ve kullanıcıya takip kodu veriyor. Kod yetkili sunucu kaydındaki kategori/route ile ilişkilendiriliyor; yanıt öğrenci ham verisi, bağlantı parolası veya stack içermiyor. Zod doğrulaması, çakışma, boyut, worker kapasitesi/kaynak/zaman aşımı ayrı ele alınıyor. Mevcut ağ/HTTP/iptal ayrımı korunuyor.

`public/favicon.ico`, mevcut marka SVG’sinden 16/32/48 px PNG katmanlarıyla üretildi. Gerçek tarayıcıda `/favicon.ico` HTTP 200.

## 2. Tasarım ve animasyon

- Kalkan kaldırıldı. Yeni özgün SVG asma kilit: altın/bronz metal yüzey, katmanlı kenar, işlenmiş detaylar, anahtar yuvası ve metal kelepçe. Emoji/Unicode kullanılmıyor.
- Kelepçe açık görünür; optik kontrol ve maskeleme aşamasından sonra dönerek hizalanır ve yuvaya oturur. Sonrasında tek hafif ışık geçişi vardır. Kapanma ve ışık `--scene-progress` üzerinden mevcut sahne saatiyle hesaplanır; bağımsız döngü/timer yoktur.
- Güvenlik sahnesi 6,8 sn; aktif zaman 6 sn + 800 ms son görünüm. Açık kilit yaklaşık %60’ta görünür; %76–87,5 arası kapanır; %90–99 ışık geçişi. İsim maskeleme mevcut fazdadır. Durdurma, ekran dışı bekleme, yeniden görünme ve reduced motion davranışı korunur. Reduced motion kilidi kapalı son durumda gösterir.
- Diğer dört sahnenin süreleri/örnek puanı/hesaplama dışı tanıtım niteliği korunur. Mevcut 486/500 ve yayınevleri arası kazanım örneği gerçek puanlama koduna bağlanmaz.
- Ortak `ActionButton` yalnız sunum bileşenidir. Mevcut `onClick`, `onSubmit`, `disabled` ifadeleri ve rol kontrolleri korunmuştur. Altı anlam: turuncu değerlendirme/toplu uygulama, mor ileri araç/önizleme, kırmızı silme/iptal, yeşil kaydet/onayla, mavi yönetim, nötr ikincil işlem. Aç/kapat gibi iki yönlü işlemlerde renk o anki eyleme göre değişir.
- Renk CSS’i **yalnız `.dashboard[data-management=true]`** altında, SUPER_ADMIN ve DEALER için geçerlidir. Ana sayfa butonlarına panel paleti uygulanmaz. Hover, active, disabled, klavye odağı, loading ve reduced motion spinner stili vardır. Renk metin ve SVG ikonlarla desteklenir; mevcut sayfadaki uygun ikonlar çiftlenmez.
- Ana sayfa/paneldeki dekoratif klavye okları ve sembollerin yerine ortak yerel SVG sistemi kullanıldı; yeni ikon/font/animasyon bağımlılığı eklenmedi. Klavye kullanım açıklamalarındaki yön tuşu adları korunur.
- Panelde başlık/sayısal veri, aktif menü, ortak kart ve buton hiyerarşisi düzenlendi. Mevcut DM Sans/Manrope sistemi değişmedi; yeni font lisansı/yüklemesi eklenmedi. Mevcut Google font isteği ve sans-serif fallback devam eder.
- Yayınevi ekle düğmesi flex büyümesinden bağımsız, sağa hizalı ve **42 px** yükseklikte doğrulandı; 390/1440 px ve iki tema.
- Bayide mevcut araç `txt-converter` / FMT Dönüştürücü’dür; Araçlar’ın altına taşındı. Kaynakta bayiye açık ayrı FMT Düzenle yetkisi yoktu. Adminin FMT düzenleme yetkisi bayiye açılmadı.
- Giriş yakınında 3:2 oranlı küçük SVG Türkiye bayrağı eklendi; ay/yıldız yerleşimi [standart SVG geometrisiyle](https://commons.wikimedia.org/wiki/File:Flag_of_Turkey.svg) karşılaştırıldı.

FMT/sınav tahmini için v1.3.6’daki `--ink` düzeltmesi korundu ve yeniden gerçek tarayıcıda doğrulandı. Her iki kartta metin kontrastı **açık 14,07:1 / koyu 12,72:1**. Yayınevi ekle düğmesi **8,75:1 / 6,75:1**. Yüzde dolan katmandan bağımsız merkezde; kırmızı/sarı/yeşil metre kodu değişmedi. Ekran görüntüleri incelendi, yalnız DOM varlığına göre kabul verilmedi.

## 3. Yeni yönetim özellikleri ve erişim

### Arama Geçmişi

Ana sayfa formunun gerçek submit olayı ayrı, hatası aramayı engellemeyen bir POST gönderir. Her tuş kaydedilmez. `SearchHistory` aynı gün/ifade için sayım, ilk/son zaman tutar; tarih filtresi, toplam/en çok arananlar, sayfalama ve açık onayla temizleme SUPER_ADMIN ekranındadır. Kayıt başına hesap, IP, cihaz veya oturum alanı yoktur. Mevcut sistem güvenlik/rate-limit altyapısı ayrıca çalışmaya devam eder.

120 karakter tavanı; e-posta, uzun numara/telefon, URL, parola/token göstergesi ve etiket benzeri girdiler kayda alınmaz. Bu sezgisel minimizasyon her kişisel ismi tanıma garantisi değildir. Kullanıcıya kişisel bilgi yazmaması bildirilir. Her kullanıcı kaynağı için 20/dk ve global 600/saat sınırı, parametrik Prisma sorguları ve React metin gösterimi vardır. 30 günlük saklama: eski satırlar okuma filtresinde gizlenir; arama/admin isteğiyle en fazla saatlik bakımda fiziksel temizlenir. Trafik yokken çalışan bağımsız cron/daemon eklenmedi; bu durumda fiziksel temizlik bir sonraki ilgili isteğe kadar gecikebilir.

### Üyeler → İşlem kayıtları

Her gerçek üyenin yanında düğme; mevcut admin audit ekranının o üyeye filtrelenmiş görünümü. Tarih/sayfa filtresi, zaman, ilgili referans, sonuç ve Türkçe işlem adları gösterilir. Doğrulanmış sunucu işlemleri ile `CLIENT_NAVIGATION` açıkça ayrılır; istemci bildirimi gerçek sunucu işlemi diye sunulmaz. Temsil işlemlerinin aktörü gerçek admindir. Ham cevap, parola/token veya form gövdesi yeni audit kaydına yazılmaz. SUPER_ADMIN dışında uçlar 403; üyelerin kayıt değiştirme/silme API’si yoktur. Kaydedilmemiş eski faaliyetler üretilmez.

**Audit saklama sınırı:** Mevcut geçmiş korunmuştur. Otomatik fiziksel audit silme politikası eklenmedi: otomatik onay denetimi, komuta eklenen geri döndürülemez audit silme adımını yetkilendirme riskiyle reddetti. Silme gerçekleştirilmedi; güvenli alternatif olarak mevcut kayıtlar korunarak özellik tamamlandı. Audit için kurumun onaylayacağı fiziksel saklama/temizleme süresi canlı önkoşuludur; arama geçmişinin açıkça istenen 30 günlük politikası bundan ayrıdır.

### 2FA ve bayi temsili

Mevcut TOTP, QR/enrollment, kurtarma kodları ve güvenilir cihaz altyapısı zaten mevcut. Güvenlik gereksinimi kaldırılmadı. Hesap Ayarları → Oturumlar ve iki aşamalı doğrulama yönlendirmesi hata metnine eklendi. Kritik temsil için son 5 dakika MFA şartı sürer. Yerel HTTP’de eski MFA reddi, güncel MFA ile temsil, temsil sırasında bayi hesap değişikliğinin reddi ve çıkıştan sonra ana admin oturumunun korunması geçti. Yeni parola-doğrulama kaydı başarılı oturumla karıştırılmaz; asıl oturum oluşunca başarı kaydı tutulur. Gerçek kullanıcının telefonuyla QR okutma/production çerez/proxy kabulü yapılmadı.

### Oyunlar

Kullanıcının belirttiği **admin@kurumsalsinav.com** + aktif SUPER_ADMIN + doğrudan oturum, sunucuda `/api/owner/games` ile kontrol edilir. Diğer admin, bayi, ziyaretçi ve temsil oturumu erişemez. Oyunlar onay yanıtından sonra mount edilir; izin düzenli/odak dönüşünde yenilenir. Normal ziyaretçi sıradan 404 görür. Üst seçici: Kule Rotası, İz Takibi, Blok Atölyesi. Büyük başlık gizli, alan genişletildi; oyun değişimi eski bileşeni unmount eder. Mekanikler değiştirilmedi.

### Kapalı soru arşivi temeli

Yeni `QuestionArchive`: sınav/yayınevi/sürüm/sınıf/ders/oturum/kitapçık, özgün ve kanonik soru numarası, cevap, özel dosya anahtarı/hash/tür ve hak durumu/süre referansları. `planWrongQuestions` yalnız tam kaynak+sürüm+oturum+çapraz+cevap eşleşmesini ve kullanım hakkını kabul eder; eksik içerik başka soruyla doldurulmaz. Ders gruplama, yeniden numaralama, özgün numara ve kaynak/cevap anahtarı PDF sözleşmesinde korunur. Boş soru ürün politikası `UNDECIDED`.

Flag sabit kapalı; `/api/zero-error-booklets` tüm roller için 404. Public/öğrenci arayüzünde yazı/duyuru/buton yok. Tam kesme editörü, dosya yükleme, lisans yönetim UI’si ve öğrenci PDF üretimi **geliştirilmedi**; sonraki sürüme bırakılan kapsamdadır. Çekirdek planlayıcı yetkilendirme yapmaz; ileride açılacak servis önce öğrenci/result grant’ini ve dosya erişimini doğrulamalıdır. Şimdiki kapalı API bu yolu açmaz.

## 4. Performans ve test ortamı

Yeni, yalnız bu oturuma ait **ks-v137-test**, PostgreSQL 16, localhost:55445; eski test konteynerleri ve production DB kullanılmadı. Node **22.23.5**, Linux, 12 mantıksal CPU, yaklaşık 15,0 GiB host RAM. Bu koşullar CloudLinux’un 4 GB RAM / %2000 CPU / 250 NPROC / 50 EP sınırlarının simülasyonu değildir. Web localhost:3115, API localhost:4015. Kapasite koşumunda DB havuzu 6, ana Node heap 512 MB; worker başına heap 256 MB.

### İzolasyon

En fazla iki lazy worker, kullanıcı başına bir ağır HTTP işlemi. FMT, okuyucu seçimi, sınav karşılaştırması, parse, merge ve özet aynı üretim fonksiyonlarıyla worker’da çalışır. Üçüncü CPU işi 429; kaynak/worker arızası 503; 60 sn üst sınır 504. İşsiz worker 30 sn sonra sonlanır. Redis/BullMQ/kalıcı servis bağımlılığı yok. Worker başlatılamazsa ana thread’de ağır hesaplamaya sessizce dönülmez. Mevcut önizleme bağlama, checksum/mükerrer denetimi ve atomik kayıt korunur.

Bu **process bazlı** sınırdır; birden fazla Passenger süreci için dağıtık kuyruk veya genel hesap limiti değildir. Asenkron job-id/durable queue eklenmedi. Dosya/sonuç JSON parse/stringify, HTTP serileştirmesi, sonuç okuma/sıralama ve bazı PDF/Excel işlemleri ana süreçte kalır. Worker heap tavanı toplam RSS tavanı değildir. Gerçek hosting’de worker thread ve süreç/havuz davranışı staging’de doğrulanmalıdır.

### TXT sentetik ölçümü

90 soruluk tam 7108 kayıtları. Bütün satırlar FMT tahmininde incelendi. Parse+özet süresi; ilk satır worker soğuk başlatmasını içerir. Tek koşum, p95 örneklemi değildir.

| Kayıt | Parse + özet (ms) | Tüm satır FMT (ms) | Süreç RSS anlık (MiB) |
|---:|---:|---:|---:|
| 10 | 201 | 10 | 191.2 |
| 100 | 34 | 3 | 195.2 |
| 300 | 88 | 5 | 199.9 |
| 500 | 131 | 5 | 201.4 |
| 1000 | 252 | 8 | 212.6 |
| 3000 | 779 | 19 | 258.8 |
| 4995 | 1200 | 29 | 305.0 |
| 5000 | 1193 | 34 | 327.8 |

İlk gerçek HTTP/DB 4.995 kayıt ölçümü (`test-results/v137/http4995-baseline.json`): arşiv 61 ms, FMT 295 ms, sınav önerisi 93 ms, önizleme 2.000 ms, kayıt 2.488 ms, sonuç ekranı 1.226 ms. Tek API/istemci sürecinde gözlenen tepe RSS yaklaşık **685,9 MiB**; istemci ve worker belleği dahildir. Kasıtlı snapshot SQL hatasında transaction rollback doğrulandı. Önceki v1.3.6 raporundaki ayrı API RSS ~471 MiB farklı süreç/ölçüm düzenidir; bu rakamlardan bellek iyileşmesi sonucu çıkarılamaz.

### Eş zamanlı öğrenci oturumları

1.000 farklı sentetik öğrenci hesabı/oturumu, her öğrenciye ayrı iki soruluk yayımlanmış sonuç ve grant. Aşağıdaki her batch sırasında 5.000 kayıtlık 90 sorulu parse+özet worker işi de çalışır. Bunlar kısa, tek seferlik batch ölçümleridir; uzun süreli soak testi veya 90 soruluk portal kapasitesi değildir. İstemci ve API aynı süreçtedir; CPU, event loop ve RSS istemci yükünü de içerir.

| Eş zamanlı hesap | Ort. ms | p95 ms | p99 ms | Hata | RSS MiB | Loop p95/max ms | CPU toplam ms |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 100 | 165 | 241 | 245 | 0% | 434.4 | 21.7 / 85.9 | 2005 |
| 300 | 330 | 545 | 568 | 0% | 477.0 | 26.1 / 83.2 | 2919 |
| 500 | 478 | 701 | 735 | 0% | 497.5 | 71.8 / 194.1 | 3500 |
| 1000 | 917 | 1538 | 1591 | 0% | 502.9 | 98.2 / 313.8 | 5721 |

Bütün portal istekleri HTTP 200; her oturumun yalnız kendi tek sonuç/öğrenci referansını aldığı ayrıca doğrulandı (0 içerik doğrulama hatası). Sağlık p95 sırasıyla 12 / 455 / 524 / 1572 ms; bütün sağlık yanıtları 200. Süreçte 26 thread; test DB toplam 10 bağlantı görüldü (havuz 6 + diğer yerel kabul servisi/izleme bağlantıları). RSS tabloda batch sonu anlık değerdir; tüm batch için örneklenmiş tepe bellek iddiası değildir. CPU ms ana süreç ve worker’ları içerir, çok çekirdekte duvar saatinden büyük olabilir. Aynı hostta diğer kabul/build süreçleri de çalışabildi; dedike çekirdek izolasyonu uygulanmadı. Ham ölçümler `test-results/v137/capacity.json` içinde; ilk koşum `capacity-initial.json` olarak korundu.

## 5. Migration, güvenlik ve doğrulama

Yeni migration’lar:

1. `20261118180000_v137_search_question_archive`: yalnız SearchHistory ve QuestionArchive tabloları, kontroller ve indeksler. Var olan sonuç/anahtar/kurum tablolarında reset, silme, backfill veya kolon değişikliği yok.
2. `20261118183000_v137_archive_index_name`: PostgreSQL’in uzun adı kısaltmasıyla oluşan indeks adı farkını açık, kısa isimle hizalar. Önceden uygulanmış dosyaya dokunulmadı; yalnız indeks adı değişir.

23 migration yeni boş test DB’sine uygulandı. Son `prisma migrate diff` **boş**; fiziksel şema ile Prisma modeli eşleşiyor. Production migration çalıştırılmadı. SQL dosyaları incelendi.

Yerel son kabuller:

- Node regresyon / Test Merkezi: **263/263**.
- Önceki gerçek HTTP/PostgreSQL kabulü: `v135-http.cjs` **14/14** (yayınevi, mağaza, portal, export ve rollback).
- Yeni gerçek HTTP/PostgreSQL kabulü: `v137-http.cjs` **10/10** grup (eski sonuç, korunan revizyon, bozuk veri, merge A/B, rol/owner/flag, arama, audit ve temsil).
- `v136-http.cjs` güncel kodla 4.995 kayıt yükleme/tahmin/kayıt/sonuç ve snapshot rollback akışı başarılı.
- Gerçek Chromium: **11/11 grup**; güvenlik SVG’si, faz/çubuk/durdurma, ekran dışı bekleme, reduced motion, mobil/tema, kompakt yayınevi düğmesi, gerçek eski sonuç editörü, tahmin okunurluğu ve owner/ziyaretçi 404 doğrulandı. Son ayrıntılı sonuç `test-results/v137/ui/checks.json`.
- API ve Web production build başarılı; mevcut CSS’deki bazı `align-items:start` Autoprefixer uyarıları hata değildir.
- Yeni bağımlılık yok. Kimlik/kurum/rol kontrolleri korunuyor; canlı güvenlik/pentest kabulü değildir.

UI, HTTP ve kapasite çıktıları Git dışında `test-results/v137/`; 4.995 eski QA koşumu `test-results/v136/v137.json`. Token içeren `ui-seed.json` paylaşılmaz. Kullanıcının önceden untracked `output/pdf/v126`, `v130`, `v132` dosyaları korunmuştur.

## 6. Canlı önkoşulları ve geri dönüş

Canlıya geçmeden önce:

- Uygulama, DB ve özel storage’ın doğrulanmış yedeği; var olan JWT/TXT/MFA şifreleme anahtarları korunmalı.
- Özgün merge hatası anonim dosya + o andaki FMT/anahtar/parent sürümüyle staging’de tekrar edilmeli. Bu kabul açıkken tüm canlı TXT hatalarının giderildiği iddia edilmemeli.
- cPanel/lsnode’da worker_threads, Passenger süreç sayısı, toplam RAM/NPROC/EP, Neon bağlantı havuzu ve gerçek proxy/timeout davranışı doğrulanmalı. Yerel sanal kullanıcı rakamı hosting taahhüdü olarak yayımlanmamalı.
- Audit kayıtları için kurumun onayladığı fiziksel saklama/temizleme politikası kararlaştırılmalı; bu teslimatta otomatik audit silme yok.
- Yeni migration’lar staging sonrası yetkili işletim adımıyla uygulanmalı; uygulama kodu migration’dan önce yayımlanmamalı. Oyun sahibinin e-postası doğrulandı: admin@kurumsalsinav.com.
- Gerçek telefonla 2FA kurulum/kurtarma, güvenilir cihaz, HTTPS/CORS, temsil dönüşü ve gerçek öğrenci portalı staging kabulü yapılmalı.
- **Yerel Web build’i http://localhost:4015 ile üretildi; canlıya kopyalanmaz.** Doğru production HTTPS API adresiyle yeniden build alınmalı. DB/storage/test fixture ve test token’ları dağıtıma eklenmez.

Geri dönüş: önceki `0a85371` Web/API artifact’larına birlikte dönülür; şifreleme anahtarları değiştirilmez. Yeni tablolar eski uygulamayı etkilemez; acil dönüşte DROP/reset ile silinmez. Yeni sonuç revizyonları ve özgün TXT/snapshot’lar korunur; DB geri yüklemesi ancak ayrıca doğrulanmış işletim planıyla yapılır. Bu oturumun yerel Web/API servisleri ve ks-v137-test konteyneri durduruldu; sentetik DB ve dosyalar silinmedi.

## Ek: PDF karne altındaki site adresi seçeneği

Karne alma ayarlarına **“Karne altında kurumsalsinav.com yazısını göster”** seçeneği eklendi. Varsayılan açık. Panelde önizleme, tekli/toplu PDF ve öğrenci başına ZIP çıktıları aynı seçimi kullanır; mevcut öğrenci/veli ve kişisel sonuç karne ayarlarında da seçenek bulunur. `showSiteAddress` API üzerinden doğrulanır, verilmezse eski görünüm korunur. Yetkilendirme ve sonuç verisi değişmez; migration gerekmez.

PDF üretiminde yalnız alt site adresi atlanır, sayfa numaraları korunur. Altı karne şablonunda tekli/toplu açık-kapalı karşılaştırması yapıldı: sayfa sayısı aynı, PDF metnindeki tek fark site adresi. İki sayfalık örneğin son sayfası Poppler ile render edilip açık/kapalı görseller incelendi. Kanıtlar `test-results/v137/pdf-footer` altında; bunlar sentetik QA dosyalarıdır. Güncel regresyon sayısı Test Merkezi raporundadır.

## Ek: Sınava özel karne logosu ve sağ alt platform imzası

Karne alma ayarlarında **“Sınava özel logo tanımla / ekle”** kutusu, görsel seçimi, önizleme ve **“Logoyu kaydet”** düğmesi bulunur. Logo **kurum + sınav** bazında kalıcıdır; aynı sınavı kullanan başka kurumlara veya başka sınavlara aktarılmaz. Yetkili admin/bayi, mevcut `canEditResult` izniyle ayarı değiştirebilir; sonuç dışa aktarma yetkisiyle kendi kurumunun ayarını okuyabilir. Kutuyu kapatıp kaydetmek varsayılan başlığı geri getirir; görsel yeniden etkinleştirme için korunur.

- PNG/JPEG/WebP en fazla 2 MB, 4 milyon piksel. Sunucu gerçek dosya biçimini doğrular, EXIF yönünü uygular, metadata’yı atar ve oranı koruyarak en fazla 1200×240 PNG’ye dönüştürür; 512 KB üstündeki çıktıyı 640×128 sınırında yeniden küçültür. URL/SVG/bozuk/çok büyük görsel reddedilir. Kaydedilen PNG, PDF’de başlığın ayrılmış en fazla 300×31 pt alanına kırpılmadan sığdırılır; 53 pt başlık yüksekliği ve içerik başlangıcı değişmez. Kaynak çözünürlüğü baskı için korunur; aynı logo toplu PDF içinde tek görsel kaynağı olarak yeniden kullanılır. Özel logo varken üstteki platform logosu/yazısı yerine bu görsel kullanılır. Görsel işleme motoru yalnız yükleme sırasında lazy olarak açılır; kullanılamıyorsa açıklamalı 503 verilir.
- Her öğrenci karne sayfasının **sağ altında küçük orijinal K logosu + “Kurumsal Sınav”** kalır. Bu imzada `.com` bulunmaz. Sayfa numarası alt ortadadır; sol alttaki URL’nin önceki aç/kapat seçeneği bağımsızdır.
- Panelde tekli/toplu PDF ve ZIP; mevcut öğrenci/veli ve kişisel kod PDF’leri aynı karne üreticisini kullanır. Yeni öğrenci portalının PDF akışına da yetkilendirilmiş okul/sınav bağlamıyla logo yükleme eklendi. Ham görsel audit özetine yazılmaz; mevcut sonuç snapshot’ı/revizyonu güncellenmez.
- Yeni migration `20261118193000_v137_exam_report_logo`: yalnız `ExamReportLogo` tablosu ve indeks/ilişkileri. **Production’a uygulanmadı.** Yerel sentetik DB’de toplam 24 migration güncel; Prisma diff boş. Canlıya bu kod alınmadan önce yeni migration yetkili işletim adımıyla uygulanmalı. Geri dönüşte tablo/sonuç silmek gerekmez.
- Görsel QA: geniş, dik ve kare örnekler; iki sayfalı PDF’nin başlık/altlıkları Poppler ile render edilip incelendi. Gerçek HTTP/PostgreSQL **8/8** grup: kaydetme, yeniden okuma, okul/sınav izolasyonu, başka bayi reddi, düzenleme yetkisi, hatalı görselde eskiyi koruma, gerçek PDF ve sonuç verisinin değişmemesi.
- Gerçek bayi paneli Chromium kabulü **4/4** grup: checkbox/dosya/kaydetme, URL kapalı gerçek indirme, 390/1440 px açık/koyu tema, sınavı yeniden seçince kalıcı logonun gelmesi. Önceki portal/yayınevi/mağaza HTTP regresyonu **14/14**. Son Node/Test Merkezi regresyonu **266/266**; API/Web production build başarılı.

Kanıtlar: `test-results/v137/report-logo/` (HTTP, tarayıcı, sentetik PDF ve görüntüler) ile `test-results/v137/pdf-branding/` (geniş/dik/kare). Test token’ları ve seed dosyaları paylaşılmaz. Kullanıcının mevcut PDF dosyaları değiştirilmedi; bu ayar yeni oluşturulan karnelere uygulanır.
