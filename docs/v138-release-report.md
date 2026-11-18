# KurumsalSınav v1.3.8 — yerel sürüm kabul raporu

18 Kasım 2026. Başlangıç: **43330b7 / v1.3.7**. Hedef: **v1.3.8**. Bu çalışma kaynak kodu ve izole yerel kabul içindir. Commit, push, canlıya aktarım veya production veritabanı işlemi yapılmadı. Kullanıcının `output/pdf/v126`, `v130`, `v132` dosyaları korunmuştur.

## 1. Tasarım değişiklikleri

Yönetim çalışma alanında kategori başlıkları, ince ayırıcılar, menü ikonları, aktif işlem çizgileri, dosya satırları ve kompakt araç çubukları düzenlendi. İşlem paleti yalnız admin/bayi paneline uygulanır. Ana sayfanın mevcut genel renkleri, Türk bayrağı ve altın güvenlik kilidi korunur.

FMT listesi masaüstünde bilgi ve işlemleri aynı satırda gösterir; mobilde okunaklı biçimde iki satıra geçer. Paylaşım listesinde açılır detaylı, çerçeveli kayıtlar kullanılır. Saat artık saniyede bir tüm karşılama alanını güncellemez; dakika gösterimi için 30 saniyelik güncelleme kullanır.

## 2. Tema ve kontrast

HTML varsayılanı aydınlıktır. Başlıkta, içerik boyanmadan önce çalışan küçük tema betiği yalnız geçerli kayıtlı koyu tercihi uygular. İşletim sistemi teması varsayılanı değiştirmez. Depolama kullanılamazsa aydınlık tema çalışır; seçim aynı oturumda uygulanabilir.

Aydınlık yardımcı metin rengi koyulaştırıldı. TXT adı, yükleyen, tarih, durum ve başlık hiyerarşisi düzeltildi. Çöp kutusu SVG oldu; normalde nötr, hover/focus durumunda kırmızıdır. Dokunma alanı en az 44 px, açık silme onayı ve mevcut sunucu kapsamı vardır.

PDF Editörü, PDF araçları ve Belge Tara ortak temaya bağlandı. Tarama yükleme etiketinde lacivert üzerinde koyu metin; sekmelerde beyaz zemin üzerinde beyaz metin ve ZIP penceresindeki buton kontrastı giderildi. Geniş taramada yakalanan Takvim Excel yükleme etiketi ve bayi/faaliyet tablosu yardımcı metinleri de tema değişkenlerine bağlandı. Gerçek Chromium görüntüleri ve hesaplanan renkler kanıtlara kaydedildi.

## 3. Sol menü

- **Sınav İşlemleri:** Sınav Değerlendir → Sınav Sonuçları → Sınav ve Cevap Anahtarı Yönetimi → Sınav Verilerini Düzenle → Veri Silme.
- **FMT Yönetimi:** FMT Paylaş ve İndir → FMT Yönetimi → FMT Dönüştürücü.
- **Paylaşım Yönetimi:** Paylaşım Bağlantıları.

Diğer gruplar ve rol filtreleri korunur. Değerlendirme yeşil, sonuçlar amber, sınav/anahtar mavi, sonuç düzenleme mor, silme kırmızı, FMT indigo, kurum turkuaz, yayınevi turuncu vurgu kullanır. Bütün satır yoğun renge boyanmaz. Klavye focus göstergeleri korunur.

## 4. Birleşik FMT ekranı

`fmt-share` ve eski `fmt-download` bölümleri aynı `FmtSharing` bileşenine gider. Ad/kod araması, sistem/kayıtlı ayrımı, aktif/pasif ve doğrulama bilgisi, FMT/BLDM indirme, mevcutsa yerleşim, tekli/toplu paylaşım birlikte bulunur. Yönetim ekranı ayrı kalır. Eski indirme fonksiyonları ve yeni liste ortak `downloadOpticalFile` yardımcısını kullanır; paylaşım mevcut `FmtShareControls` üzerinden yürür. Public token bağlantıları ve eski API yolları korunmuştur.

Öneri eylemleri: FMT mavi, sınav mor, ikisi birlikte turuncu. Gerçek disabled ve yükleme davranışları korunur.

## 5. Mükerrer FMT nedeni ve güvenli çözüm

Kaynakta doğrulanan neden: eski iki liste, `catalog.json` sistem dosyalarını `/templates` veritabanı listesiyle **tekilleştirmeden** birleştiriyordu. Değerlendirme sırasında kalıcı hale gelen `system-fmt-7108`, `system-fmt-8050` ve Özdebir sistem kayıtları bu yüzden ikinci kez görünüyordu.

Yeni `/api/optical/fmt-library` yalnız sunum düzeyinde tekilleştirir. Sistem veya farklı adla yüklenmiş doğrulanmış global kopya için özgün baytların ve doğrulanmış yürütülebilir yerleşimin eşitliği; kayıtlı kopyalar için baytlar, kanonik yerleşim, etkinlik, yayınevi/sınıf kapsamı ve doğrulama bilgisi karşılaştırılır. Tek başına doğrulama zamanı kimlik değildir. Alan konumları, ders sırası, kitapçık/numara/oturum tanımları yerleşim kimliğinin parçasıdır. İsim benzerliği ölçüt değildir; farklı Özdebir düzenleri korunur. Kimlikler `aliases` ile izlenir; sınav ve paylaşım referansları taşınmaz, silinmez veya yeniden üretilmez.

Tekli ve mevcut toplu yazım yolları aynı transaction advisory lock kullanır. Tekli eklemede aynı dosya baytları, yerleşim ve doğrulama yalnız aynı yayınevi/sınıf/kaynak kapsamında tekrar sayılır; farklı sınıf, doğrulama veya özgün kodlama korunur. Mevcut toplu doğrulama kuralları ve transaction kilidi korunmuştur. Gerçek PostgreSQL'de eşzamanlı iki tekrar gönderimin 409 döndüğü, kayıt sayısının değişmediği ve bayi yazımının reddedildiği doğrulandı.

**Sınır:** Production DB'ye bağlanılmadı. Canlıda gerçekten ayrı kopya satırların bulunduğu veya bulunmadığı iddia edilmez. Çözüm muhafazakâr sunum eşlemesidir; veri migrasyonu yoktur.

## 6. PDF kontrolü ve ZIP

Pencere toplam, başarılı, kontrol gerektiren ve yüksek güvenli eşleşme oranıyla açılır. Bu oran OCR/doğrudan okuma güven ölçütüdür; bağımsız doğruluk garantisi değildir. Detaylar kapalıdır. Açılınca en fazla **50** kayıt çizilir; sayfalama, iç kaydırma, şüpheli kayıtları öne alma ve düzenlenebilir numaralar vardır. Şüpheli/boş kayıtlar tek tek kontrol edilmeden ve açık onay verilmeden ZIP etkinleşmez. Boşlar mevcut eşleşmeyen sayfalar dosyasına gider; numara uydurulmaz.

Birincil ZIP düğmesi turuncu, vazgeç nötrdür. Alt işlem çubuğu sticky'dir. İframe içindeki pencere ana tarayıcının görünür yüksekliğine göre sınırlandırılır; açıldığında araç alanı görünür konuma getirilir. Böylece uzun araç sayfası düğmeyi erişilemez hale getirmez.

**Ek gerçek hata:** Eski Tailwind/PDF.js/jsPDF CDN adresleri mevcut CSP tarafından engelleniyordu. CSP gevşetilmedi. Tailwind 3.4.17 çalışma zamanı yerine statik CSS; mevcut jsPDF 2.5.1/AutoTable 3.8.4 yerine aynı sürümlerin yerel dosyaları; zaten depoda bulunan PDF.js 4.10.38 modülü ve worker kullanılır. TextLayer adaptörü mevcut koordinat akışını korur. Lisanslar eklendi; npm çalışma zamanı bağımlılığı eklenmedi.

10.000 sentetik eşleşme kaydıyla DOM ölçeği test edildi. Gerçek iki sayfalık PDF'de alan seçimi → numara düzeltme → ZIP → tek sayfalık PDF içerikleri doğrulandı. Yerel WASM OCR ve diğer yedi dosya aracı da gerçek indirme ile denendi. **10.000 sayfalık gerçek PDF kapasitesi test edilmedi.**

## 7. Veri Silme

Yeni `/deletion-browser`, yayınevi → sınav → kurum → değerlendirme kademelerini yalnız açıldıkça getirir. Her düzeyde sunucu araması ve 25 kayıtlık SQL sayfalama vardır. Öğrenci snapshot'ları uygulama belleğine/tarayıcıya taşınmaz; öğrenci dizisi uzunluğu ve özetler PostgreSQL'de hesaplanır.

Bayi okul kapsamı ve `canDeleteResult` her istekte sunucuda kontrol edilir. Kurum/anahtar/yayınevi filtreleri birlikte uygulanır. Eski JSON-string snapshot'lar güvenli okunur; bozuk kayıt sayımı ayrıca belirtilir, öğrenci sayısı uydurulmaz. Silme/geri alma mevcut onaylı uçlarda kalır. Kategori açmak veri değiştirmez. İşlem sonrası ağaç ve sayılar yenilenir.

Yeni sorguda `pg_input_is_valid` kullanılır: **PostgreSQL 16+ / işlev kullanılabilirliği staging önkoşuludur**. Yeni indeks veya migration oluşturulmadı.

## 8. Paylaşım Bağlantıları

Açılır detaylı kompakt liste; ad, kategori, oluşturan, durum, oluşturma tarihi ve sayaçlar gösterilir. Aktif yeşil, bitmiş amber, kullanılmış nötr, iptal kırmızıdır. `/api/shares/browser` filtreleme ve 25 kayıtlık sayfalamayı DB'de yapar; eski üyelik davetleri de kapsamda kalır. Liste artık en son 500 kayıtla kesilmez.

Bağlantı/WhatsApp kopyalama, süre düzenleme, süresiz yapma, iptal ve uygun yeniden etkinleştirme mevcut kategori kurallarıyla sunulur. Kullanılmış veya üyelik bağlantısına desteklenmeyen işlem eklenmez. Anahtarlar yeniden üretilmez; ham token hash/şifreli alanlar yeni yanıtta bulunmaz. Gerekli URL yalnız yetkili yönetici/sahibe verilir. Filtre değişiminde eski istek iptal edilir.

## 9. TXT kaynak yönetimi ve güvenilirlik

v1.3.7 lazy worker havuzu, 256 MB worker heap, 60 saniye iş üst sınırı ve 30 saniye idle kapanma korunur. Normal yolda okuyucu seçimi + parse aynı worker çağrısındadır; ikinci kez büyük TXT aktarımı kaldırılmıştır. Yapı eşleşmezse parse ertelenir, mevcut alternatif FMT listesi alınır, aynı doğrulanmış okuyucu kuralları uygulanır. Puanlama, eşleştirme, sıralama ve PDF algoritması değiştirilmedi.

Aynı fiziksel hesap ve **ortak yerel STORAGE_DIR** üzerindeki ayrı lsnode süreçleri, aktif CPU işleri için iki atomik dosya yuvasını paylaşır. Bu, bütün süreçlerdeki resident worker sayısının her an toplam iki olduğu anlamına gelmez: süreç başına lazy/idle havuz ve 30 saniyelik kapanma korunur. Tam yazılmış sahiplik dosyasına hard link ile yer ayırılır; PID ve Linux başlangıç zamanı denetlenir. Ölmüş sürecin yuvası güvenle geri alınır; yaşayan yuvanın süresi doldu varsayılmaz. Ortak depo/hard-link izni staging'de doğrulanmalıdır. Bu mekanizma birden fazla host için dağıtık koordinasyon değildir.

Yeni işe girişte süreç RSS'i 1 GiB üstündeyse 503; iki yuva doluysa 429 verilir. Gerçek hosting hesabını temsil ettiği doğrulandıktan sonra `CPU_ACCOUNT_PROC_MEMORY=true`, aynı UID süreç RSS toplamını 4 GiB hesap bütçesi, 768 MiB rezerv ve 320 MiB worker payıyla değerlendirebilir. Bu seçenek varsayılan kapalıdır: geliştirme makinesindeki tüm kullanıcı süreçlerini hosting kotası sanmak doğru değildir. UID toplamı paylaşılan sayfaları iki kez sayabilen muhafazakâr bir göstergedir; CloudLinux LVE ölçümü değildir. Fiziksel host RAM/CPU sayısı kabul bütçesi yapılmaz.

500 eşiğine bağlı sleep, yüzde 40 yavaşlatma veya satır örnekleme yoktur. FMT bütün satırları inceler. Normal işlemde yeşil şimşek ve belirsiz ilerleme; önizleme 500 üzeri öğrenci ve gerçek kaynak korumasını bildirdikten sonra yeşil işlemci/akıllı kaynak mesajı gösterilir. Sahte yüzde üretilmez.

Mevcut dosya checksum, önizleme mühürü, güncel anahtar/FMT kontrolü, Serializable kayıt ve atomik snapshot işlemleri korunur. Eski sonuç ve arşiv silinmez. Yeniden ayrıştırmanın kalan kısmı güncel yetki, anahtar ve revizyonu tekrar doğrulamak içindir; tenant/sürüm bağlamı doğrulanmamış cache eklenmedi.

**Kalıcı kuyruk eklenmedi.** Redis/BullMQ/daemon hosting desteği varsayılmadı. İş kimliğiyle kalıcı izleme, yenileme sonrası devam ve tarayıcı kapandıktan sonra tamamlanma garantisi yoktur. Kullanıcı yeniden denemeden arşiv/kayıtlı sonuç durumunu kontrol edebilir. Mevcut 5.000 satır/TXT, 2 MB ve 4.000 karakter sınırları düşürülmedi. Birleşik isteğin parser satır sınırı da korunur; büyük ayrı oturum dosyaları testte mevcut sıralı yükleme/birleştirme akışıyla karşılaştırılmıştır.

## 10. Performans karşılaştırması

| Öğrenci | Tek oturum, ms (v137 → v138) | Önceden birleşmiş, ms | Ayrı iki oturum, ms | Sonuç |
|---:|---:|---:|---:|---|
| 100 | 263 → 209 | 38 → 44 | 72 → 74 | Birebir |
| 300 | 88 → 89 | 86 → 84 | 181 → 173 | Birebir |
| 500 | 153 → 149 | 142 → 135 | 297 → 287 | Birebir |
| 501 | 141 → 134 | 137 → 131 | 285 → 279 | Birebir |
| 1000 | 265 → 259 | 256 → 258 | 538 → 542 | Birebir |
| 3000 | 789 → 798 | 768 → 758 | 1667 → 1603 | Birebir |
| 4995 | 1268 → 1280 | 1287 → 1280 | 2688 → 2681 | Birebir |
| 5000 | 1275 → 1261 | 1287 → 1267 | 2680 → 2683 | Birebir |

5.000 öğrenci için kaynak ölçümü (süreç + worker + sentetik probe istemcisi):

| Akış | Sürüm | CPU toplam, ms | Örneklenmiş RSS tepe, MiB | Loop p95 / max, ms | Yerel HTTP probe p95, ms |
|---|---|---:|---:|---:|---:|
| Tek | v1.3.7 | 1560 | 435.7 | 10.7 / 72.7 | 0.9 |
| Tek | v1.3.8 | 1583 | 389.0 | 10.7 / 72.5 | 0.9 |
| Birleşmiş | v1.3.7 | 1596 | 440.6 | 10.9 / 77.8 | 0.8 |
| Birleşmiş | v1.3.8 | 1574 | 414.6 | 10.9 / 80.5 | 0.8 |
| Ayrı | v1.3.7 | 3281 | 446.0 | 10.8 / 97.5 | 0.8 |
| Ayrı | v1.3.8 | 3316 | 461.9 | 10.6 / 97.7 | 0.8 |

Tek koşumda göreli süre değişimi -20.4% ile +17.0% arasında. İlk soğuk 100 kayıt bu aralığa dahildir. Artış görülen vakalar da tabloda/ham raporda korunur. Ortam Node v22.23.5; izole, ayrılmış fiziksel çekirdek veya LVE simülasyonu yoktur.

Aynı makinede, Node 22, aynı 90 soruluk sentetik 7108 kayıtları ve aynı çekirdek algoritmalar kullanıldı. Baseline havuzu `git show 43330b7` ile alınan gerçek v1.3.7 worker kodudur. Sekiz büyüklük × tek oturum/önceden birleşmiş/ayrı oturum = 24 karşılaştırma vardır. Ayrı oturumlar, 1/2 kayıt işaretli 7108 verisiyle iki dosya olarak parse edilip mevcut birleştirme fonksiyonuyla birleştirilir. Bütün FMT aileleri veya işaretsiz legacy büyük dosyalar için performans kanıtı olduğu iddia edilmez. Şifrelemenin rastgele zarfı dışındaki bütün değerlendirme verisi ve özet SHA-256 değerleri karşılaştırılır. Her dosyanın bütün satırlarının FMT incelemesine girdiği doğrulanır.

Ölçüm CPU, örneklenmiş RSS, event-loop gecikmesi, worker ve yerel HTTP probe içerir. CPU-only koşumunda DB sorgusu sıfırdır; bu bir optimizasyon iddiası değildir. İlk 100 kayıt soğuk worker başlangıcını içerir. Tek koşum sonuçları p95 kapasite testi veya istatistiksel hızlanma kanıtı değildir. Küçük vakalardaki ek dosya kabulü maliyeti ve ölçüm gürültüsü gizlenmez. Yapay yavaşlatma uygulanmamıştır; genel bir hızlanma/azalan bellek garantisi verilmez.

Güncel 4.995 kayıt, 90 soru, gerçek yerel HTTP/PostgreSQL:

| Aşama | ms | Süreçte gözlenen DB sorgusu farkı |
|---|---:|---:|
| TXT arşiv | 55 | 9 |
| FMT önerisi | 257 | 7 |
| Sınav önerisi | 415 | 13 |
| Önizleme | 1746 | 22 |
| Kayıt | 2279 | 43 |
| Sonuç sorgusu | 1060 | 11 |
| Tekrar önizleme | 3378 | 37 |
| Boyut sınırı reddi (413) | 10 | 3 |
| 5.001 satır reddi (400) | 11 | 4 |
| Rollback önizleme | 1577 | 21 |
| Kasıtlı snapshot hatası / rollback (500) | 2026 | 37 |

Örneklenmiş tepe RSS: **1086.1 MiB**; 50 ms monitörde gözlenen en yüksek ek gecikme: **605.1 ms**.
Eşzamanlı `/api/account`: 24 istek, tamamı 200; p95 38.1 ms, max 38.3 ms.
Eşzamanlı `/api/health`: 25 istek, tamamı 200; p95 5.3 ms, max 10.4 ms.

Gerçek HTTP/DB 4.995 kayıt koşumu arşiv, FMT/sınav önerisi, önizleme, kayıt, sonuç, tekrar işleme ve kasıtlı snapshot hatasında rollback'i kapsar. Sorgu sayıları aynı süreçte audit ve normal API probe'larını da içeren fark ölçümüdür; yalnız ilgili SQL işleminin mutlak sorgu sayısı değildir. CPU/RSS, API + HTTP istemcisi + worker'ları birlikte içerir. Önceki rapordaki ~685,9 MiB ile yeni tepeyi farklı ölçüm düzenlerinde bellek iyileşmesi diye karşılaştırmak doğru değildir. JSON aktarımı ve büyük sonuç serileştirmesi hâlâ bellek maliyetidir.

Yerel ölçümler mevcut %2000 CPU / 4 GB / NPROC 250 / EP 50 / I/O 50 MB/sn / IOPS 1024 hesabının kapasite garantisi değildir. Canlıda yük testi yapılmadı.

## 11. Test sayısı ve sonuçları

| Kabul | Gerçek sonuç |
|---|---|
| Node / Test Merkezi | **269/269**, hata/atlanan/çalıştırılmayan tekil test: 0 |
| Önceki portal/yayınevi/mağaza HTTP/DB | **14/14 grup** |
| v1.3.7 sonuç, merge, MFA/temsil, kapalı özellik HTTP/DB | **10/10 grup** |
| Sınava özel logo HTTP/PDF/DB | **8/8 grup** |
| Yeni FMT, tekrar engeli, paylaşım, silme/geri alma ve izolasyon HTTP/DB | **11/11 grup** |
| Gerçek 4.995 kayıt HTTP/DB | Arşiv/tahmin/önizleme/kayıt/sonuç/tekrar/sınırlar/rollback başarılı; normal API probe'larının tamamı 200 |
| Yeni Chromium tema/menü/ZIP/ölçek | **11/11 grup**, 390/1440 px × açık/koyu; aktif çizgi, ince scrollbar ve klavye odağı dahil |
| Önceki Chromium güvenlik/owner/tahmin | **11/11 grup** |
| Önceki bayi logo Chromium | **4/4 grup** |
| Gerçek rapor önizleme / PDF / XLSX / öğrenci ZIP | **3/3 grup** |
| Gerçek PDF kesme/ZIP, yerel OCR ve diğer araçlar | **9/9 grup** |
| Geniş salt okunur kontrast taraması | **62 ekran/tema görünümü** (31 ekran × 2 tema), kalan ölçüm bulgusu **0** |
| Ayrı Node süreçleri | İki ortak yuva ve ölü PID kurtarma: **2/2 kontrol** |
| v137/v138 worker matrisi | **24/24 değerlendirme hash'i birebir** |
| Prisma | Validate/generate ve 24 migration sonrası **boş diff** |
| Production build | API + Web başarılı; mevcut Autoprefixer `start` uyarısı derlemeyi engellemez |
| İzole derlenmiş API | Excel/PDF/font, health ve Passenger giriş sözleşmesi smoke başarılı; gerçek Passenger kurulumu testi değildir |
| Derlenmiş CPU worker | Gerçek `dist/src/cpu-worker.js` üzerinden readParse + summary başarılı |

Görsel tarama, görünür metinlerin gerçek hesaplanan renk/arka plan birleşimini ölçer. Hedef ekranların masaüstü/mobil görüntüleri ve modal durumları ayrıca kaydedilip görsel olarak incelendi. Bu sonuç bütün olası veri/modalların otomatik tam kapsam garantisi değildir.

Test Merkezi yalnız kayıtlı raporu okur; açılışta test çalıştırmaz. Kaynak özeti yeni veri dosyalarını ve yerelleştirilen PDF varlıklarını da kapsar. Sürüme ait kabul kanıtı `test-results/v138-acceptance.json` üzerinden güncel digest ile bağlanır. Tarihsel betikler tekil test/assertion sayısı olarak eklenmez; çalıştırılmayan betikler başarılı gösterilmez. Eski 266 test korunmuş; söz/veri ve script-module sözdizimi beklentileri yeni davranışa uyarlanmış; 3 anlamlı regresyon eklenmiştir.

Son toplu kabul 18 Kasım 2026 18:48 UTC'de tamamlandı. Test Merkezi kaydı son kabul kanıtlarıyla eşleştirildi ve API yeniden derlenerek dağıtım çıktısındaki raporun aynı olduğu doğrulandı. Yalnız bu çalışmaya ait `ks-v138-test` konteyneri verileri silinmeden durduruldu; tarayıcı test çalıştırıcısı kendi API/Web süreçlerini kapattı.

Yeni browser/HTTP scriptleri yalnız localhost sentetik veri kullanır. Testler gerçek kullanıcı, production DB, e-posta veya dış mesajlaşma kullanmaz. Görüntüler ve ham ölçümler Git dışındaki `test-results/v138/` altındadır; seed/token dosyaları paylaşılmaz.

## 12. Ana sayfa animasyonları

Cevap değerlendirme sahnesi 9,2 saniyeye genişletildi: ritmik cevap kontrolü → 486/500 temsili puan → ders satırları olan örnek karne → yeniden başlama. Karne 90 soru / 85 doğru / 3 yanlış / 2 boş bilgisiyle, 12 cevaplık gösterimin devamı olarak sunulur; 486 bir gösterim değeridir, gerçek motor hesabı olduğu iddia edilmez.

Hero karneye 4,8 saniyelik 8 px transform süzülmesi eklendi. IntersectionObserver ve belge görünürlüğüyle ekran dışında durur; reduced-motion'da çalışmaz. Sistem mimarisi aynı sahne saati, durdur/oynat, yeniden başlatma, ilerleme ve reduced-motion kurallarını kullanır. Yeşil modül göstergeleri ve mavi veri akışı sağlık/uptime ekranı olarak sunulmaz. Sunucu kapasitesi, adresleri ve sürümleri ana sayfaya eklenmedi.

## 13. Doğrulanmış işlevsel modül sayısı

Tanıtımdaki **9 modül**, kullanıcı iş akışına göre gruplandırılmış yazılım yetenekleridir; servis, sunucu, dosya veya paralel çalışan process sayısı değildir.

| Modül | Kaynak dayanağı |
|---|---|
| Optik değerlendirme | `optical-core.ts`, `optical-routes.ts` |
| FMT tanıma | `fmt-inference.ts`, `evaluation-reader.ts` |
| Sınav önerisi | `optical-exam-matching.ts` |
| Puan ve sıralama | `opticalSummary`, `result-rankings.ts` |
| Kazanım analizi | `optical-analysis.ts` |
| PDF ve raporlama | `result-reference-pdf.ts`, `result-routes.ts` |
| Öğrenci ve kurum | `student-portal.ts`, `reader-routes.ts`, okul yönetimi uçları |
| Veri yönetimi | `txt-archive-routes.ts`, `result-routes.ts` |
| Güvenlik ve yetki | `auth-sessions.ts`, `mfa-core.ts`, `dealer-policy.ts` |

Otomatik sınavlar arası akademik gelişim motoru yeni bağımsız modül diye sayılmadı. Kapalı Sıfır Hata Kitapçığı sayılmadı ve açılmadı.

## 14. Özlü sözler

10 eğitim kategorisinde 150 farklı özgün ifade vardır. Atıf KurumsalSınav'dır; uydurma ünlü atfı yoktur. Önceki 50 kaynaklı sözün kaynak/not bilgileri `verified-quotes.json` içinde korunur. Önceki/sonraki ve kapatma düğmeleri çalışır; sıra yerelde saklanır, yeniden açılışlarda ilerler. API veya DB sorgusu yoktur.

## 15. Migration ve veri güvenliği

v1.3.8 için **yeni migration yok**. Mevcut migration dosyaları değiştirilmedi. Yeni `ks-v138-test` konteynerinde mevcut 24 migration uygulandı; Prisma diff boştur. DB adı/localhost portu eski test harness sözleşmesinden `ks_v135`/55445 kalır; eski konteyner/DB yeniden kullanılmadı.

Production reset/seed/db push/migrate dev/migrate deploy yapılmadı. FMT, öğrenci, sonuç, kurum, bayi, yayınevi ve paylaşım kayıtları canlıda değiştirilmedi. Rol/MFA/temsil, kişisel kodlar, oyun sahipliği ve kapalı kitapçık API'si regresyon kapsamındadır.

## 16. Bilinen sınırlar

- Gerçek Veridyen/CloudLinux/lsnode/Neon üzerinde worker, hard-link, ortak storage, UID görünürlüğü, process sayısı, DB havuzu ve proxy zaman aşımı kabulü yapılmadı.
- Aktif CPU işi sınırı, farklı lsnode süreçlerinin 30 saniyeye kadar tutabildiği idle worker belleğini tek bir global havuzda birleştirmez. Toplam resident süreç/worker sayısı ve LVE belleği staging’de ayrıca sınanmalıdır.
- Admission hesap genelinde tüm PDF/Excel/sonuç belleğini yöneten bir işletim sistemi kotası değildir. Büyük JSON ve rapor tamponları maliyet olmaya devam eder.
- Kalıcı kuyruk/job-resume yoktur. Worker geçicidir; Passenger sonlandırması tamamlanma garantisini kaldırır.
- Ayrı oturum yüksek hacim ölçümü dosyaları sırayla parse/merge eder; 5.000 üzeri birleşik ham satırla tek parser çağrısı destekleniyor iddiası yoktur.
- Gerçek 10.000 sayfalık PDF, üretim kapasitesi, gerçek telefonla 2FA, SMTP, production TLS/proxy ve yedek geri yükleme kabulü yapılmadı.
- Yeni PostgreSQL JSON doğrulama işlevi staging'de kontrol edilmelidir. Canlı FMT verisi fiziksel birleştirmeye tabi tutulmadı.
- Tarihsel bütün bağımsız e2e araçları tekrar koşulmadı; gerçek çalıştırılan güncel regresyonlar aşağıdaki kabul kanıtlarıyla sınırlıdır. Rapor bunları bütün olası ekran durumlarının veya bağımsız pentestin kanıtı saymaz.

## 17. Canlıya geçiş önkoşulları

1. Kaynak ve bu rapor incelenir; gerçek API HTTPS adresiyle temiz Web/API build alınır. **Yerel localhost build canlıya kopyalanmaz.**
2. Uygulama/DB/özel storage ve mevcut JWT/TXT/MFA anahtarları için doğrulanmış yedek alınır. Eski migration eksikleri v1.3.7 raporuna göre operatörce kontrol edilir.
3. PostgreSQL 16+ ve `pg_input_is_valid` doğrulanır. Aynı host/same UID/ortak mutlak `STORAGE_DIR` ve hard-link izinleri sınanır. Her release ayrı `.cpu-admission` kullanmamalıdır.
4. LVE/process/havuz limitleriyle gerçek TXT ve rapor işlemleri staging'de ölçülür. `CPU_ACCOUNT_PROC_MEMORY` ancak ölçüm kapsamı doğrulanınca açılır. Fiziksel host loadavg hesap CPU kullanımı sayılmaz.
5. İki tema, bayi/admin izinleri, eski FMT linki, gerçek TXT oturum birleştirme, rapor/ZIP, 2FA/temsil ve rollback smoke yapılır. Test dosyaları/seed/token/yerel storage dağıtıma eklenmez.
6. Kontrollerden sonra dağıtım ayrıca yetkili işletim adımıdır. Bu çalışma bunu başlatmaz.

## 18. Geri dönüş

Web ve API birlikte **43330b7 / v1.3.7** tam artifact'larına döndürülür; yalnız `.next` değiştirilip API yeni bırakılmaz. v1.3.8 migration içermediği için DB rollback, reset veya kayıt silme gerekmez. Sonradan oluşan sonuçlar, TXT'ler, paylaşım anahtarları ve logo tablosu korunur. Admission dosyaları DB verisi değildir; yalnız yaşayan v1.3.8 süreçleri durduktan sonra özel işletim incelemesi yapılır. Aktif process varken kilitleri elle temizlemek kapasite korumasını bozar.
