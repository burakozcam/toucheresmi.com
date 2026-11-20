# v1.3.9 çalışma kaydı

19 Kasım 2026, Türkiye saati. Başlangıç `eee6727`. Kullanıcının `output/pdf` dosyaları korunur. Canlı DB/deploy/migration/seed/reset/db push, Git commit ve push yapılmaz.

## Kesintiden kurtarılan durum

- Duyuru veri modeli, yönetim API/UI, otomatik yayın olayları ve tarih/yetki denetimleri kaynakta mevcut.
- Geçmiş sürümler açık admin importu ile arşive alınır; seed yok, idempotent ve silme/pasif durumları korunur.
- Zamanlanmış tekli/toplu FMT ve cevap anahtarı PDF paylaşımları, kategori bazlı SQL sayfalama mevcut.
- Karşılama yalnız panel ana sayfasında, PDF araçları tek merkezde, menü 200–380 px ayarlanabilir.
- ZIP tek istek/ortak hazırlık/özel diske yazım; v138 CPU sınırları korunur. Kesinti öncesi 22 örnek performans JSON'u korunmuştur; aynı ölçüm sebepsiz tekrar edilmedi.
- Ortak lazy yardım motoru ve üç tanıtım sahnesi mevcut. **Yardımın eksiksiz kabulü henüz verilmedi.**

## Bu devam oturumunda yapılanlar

- Önceki test logları denetlendi. Eski Chromium logundaki iki sandbox/sessionStorage hatası yeniden koşumda tekrarlanmadı; kesin neden iddiası yok.
- Test çalıştırıcısı V8 heap 512 MB ile sınırlandı; uygulama kaynak kabul eşikleri değişmedi. İlk sınırsız heap koşumundaki iki RSS sınırı hatası gizlenmedi.
- ZIP kaynak hazırlama hatasında CPU lease'in bırakılması düzeltildi. İptal/temizlik ve parçalı/yarım/hatalı indirme için iki yeni anlamlı regresyon eklendi.
- Paylaşım detayına başlangıç zamanı, bitiş düzenlemesine tutarlı Türkiye saati eklendi.
- Yardım turunda tekrarlanan bileşenlerin farklı alanlarının kaybolması, seçeneklerin alan etiketine yığılması ve iframe vurgu koordinatları düzeltildi.
- Gerçek takvim/ortak bileşenler ve Link kontrolleri envantere katıldı: 84 dosyada 709 kontrol şablonu; 21 etiket inceleme bekliyor.
- Tarayıcı sayımının React state hazır olmadan 0 yazması giderildi. Betik `data-controls-ready` bekler ve envantere bağlı işlem ekranlarında sıfırı hata sayar. Son gerçek sayımlar `test-results/v139/help-browser-coverage.json` içindedir.
- İleri tarihli duyuruda Yayını sonlandır işlemi arşive geçirir; yanlış yayın bekliyor durumu kaldırıldı. Başlangıç öncesi kullanıcı erişimi yine kapalı; gerçek HTTP testi eklendi.
- `docs/v139-release-report.md`, PROJECT_MEMORY, CHANGELOG ve DEPLOYMENT güncellendi; tam kabul olmadığı açıkça yazıldı.

## Doğrulama ve yerel ortam

- Node 22.23.5. Son çevrimdışı koşum: 278/278 başarılı, 0 atlanan. 269 eski test korunur.
- Gerçek sentetik PostgreSQL/HTTP: 20 grup başarılı; gerçek ilerleme çerçeveli indirmede 6 ayrı PDF, CRC ve terminal başarı doğrulandı.
- Chromium: açık/koyu 1440/390 px, duyuru/rehber/menü/PDF/tanıtım dahil 8 grup başarılı. Son kaynakla yeniden koşum da başarılı; sıfır pageerror.
- Prisma validate ve Web production build başarılı. API build başarılı; son test raporu kopyası son kabul eşlemesinden sonra yenilendi.
- Sentetik DB `ks-v139-test`, `127.0.0.1:55449/ks_v139`; yalnız sentetik veriler. Test betikleri farklı DB adresini reddeder. Test sonunda konteyner durduruldu; silinmedi, sentetik veriler korundu. Yeniden test için yalnız bu konteyner başlatılır. Gerçek DB değişmedi.
- Test Merkezi raporunun `sourceDigest` eşleşmesi ve gerçek HTTP/tarayıcı kanıtları son teslimde doğrulandı. Çalıştırılmayan eski kabul betikleri `not_run` kalır.
- Dört görsel örnek doğrudan incelendi; 34 ekran görüntüsünün tümü kusursuz diye raporlanmadı.

## Sıradaki gerekli işler

1. Ayrıntılı yardım içerik kabulü: tüm kontrollerin gerçek sonucu/önkoşulu/hatası/onayı; koşullu ekranlar ve bütün roller. Genel kontrol açıklamalarını işleme özel içerikle tamamla.
2. PDF HTML/JS ve sandbox Sınav Listesi Düzenleyici iç kontrollerinin rehberi; önemli akışlara özel yeterli animasyonlar. Mevcut 709 sayısını tamamlanmış açıklama sayısı gibi kullanma.
3. Talep 9.1'deki bütün performans alt aşamaları, gerçek ağ/hosting olayı, kontrollü paralellik ve normal yetkili API yükünün birlikte ölçümü.
4. Tüm görsellerin son kabulü; mobil sabit yardım/çerez alanı yakınlığı, yardım başlığının uzun içerikte görünmesi ve gerçek OCR/kamera/PDF işlevleri.
5. İsimle aramalı duyuru hedef seçimi UX'i ve zorla kapanmış süreçlerden kalan özel rapor dosyalarının güvenli temizlik politikası.
6. Bu açıklar kapanmadan sürümü eksiksiz veya canlıya hazır ilan etme. Canlıya aktarım yapma.


## Ana sayfa animasyon denetimi — ek çalışma

- Kullanıcının yeni 9.1–9.10 talimatı uygulandı; yalnız yeni üç sahne değil, gerçek `app/page.tsx` üzerindeki bütün anlatımlar/şerit/giriş hareketleri ve metinler incelendi.
- Otomatik sınavlar arası kazanım karşılaştırması tanıtımı gerçek tek sınav kazanım analiziyle değiştirildi. 2.000 kişilik zaman sayacı ve kapasite izlenimi kaldırıldı; gerçek kurum/sınıf/öğrenci raporu seçenekleri gösterilir.
- Diyagram 12 işlevsel alan gösterir. Önceki PDF/rapor alanı birleşik belge merkeziyle bir kez sayılır; duyuru, rehber ve zamanlanmış paylaşım kullanıcı akışları eklenir. Bağımsız servis/sunucu iddiası yoktur.
- Duyuru sahnesi varsayılan 7 gün, kategori, yatay kart ve geçmişi; paylaşım sahnesi bitiş/süre dolmasını; yardım sahnesi güvenli anlatım, TXT sürükleme, açılan seçimler ve gerçek düğme etiketini kapsar.
- PDF merkezi önizlemesi mevcut araç kartında kompakt olarak eklendi; yeni uzun bölüm veya öğrenci PDF ZIP tanıtımı yok. Altın kilit ve Türk bayrağı kaynakları başlangıç commit'iyle aynıdır.
- Ortak saat/sahne ilerlemesi, viewport/visibility/reduced-motion duraklamaları; yayınevi şeridinin gizli kopyası, kontrolü ve görünürlük davranışı denetlendi. Mobil uzun modül etiketleri ve koyu tema kategori kontrastı düzeltildi.
- Kabul betikleri: `tests/e2e/v139-home.cjs` + `.py`; gerçek production Web, sentetik public API, DB/kimlik bilgisi yok. Kanıtlar `test-results/v139/home-audit/`. Son kabul sonuçları sürüm raporunun “Ana Sayfa Tanıtım ve Animasyon Denetimi” bölümüne yazılır.
- Sayım: 10 ürün sahnesi, 13 hareket grubu; bölüm girişlerinin üç yerleşimiyle 15 animasyon örneği. Katalog boşken yayınevi şeridi yoktur. Bu sayılar hosting veya teknik kapasite iddiası değildir.
- Bu ek çalışma panel yardımındaki bütün kontrol/rol açıklamalarını ve önceki tam performans matrisini kapatmaz; üstteki eksikler geçerlidir. Canlıya aktarım/commit/push yapılmadı.


### Ana sayfa eki — son kabul

- 27/27 ana sayfa Chromium grubu, temiz çıkış 0; bütün 10 sahnenin masaüstü/mobil adımları, dört tema/genişlik görünümü, 99 metin/görünüm kontrastı, viewport/visibility/reduced-motion ve gerçek ara sahneler doğrulandı.
- Son 278/278 regresyon ve Web build başarılı; mevcut PDF artifact'ları yedeklenip geri yüklendi. Ana sayfa JS manifesti gzip +1.202 bayt (%1,02); ağır bağımlılık/çalışma alanı yüklenmedi, canlı hız/kapasite vaadi yok.
- Kanıt: `test-results/v139/home-audit/acceptance.json`, `browser.log`, `live-capture.log`, PNG/JPG'ler ve bundle JSON'ları. Önceki genel HTTP/panel kanıtları yeniden koşulmuş gibi işaretlenmez.
- Ana sayfa denetimi kapandı. Üstteki ayrıntılı panel yardım/perf/staging eksikleri devam eder. Test servisleri kapatıldı; DB gerektiren konteyner başlatılmadı. Commit/push/deploy yok.

## v1.4.0 — 20 Kasım 2026 çalışma kaydı

Başlangıç: v1.3.9, yalnız output/pdf/v126,v130,v132 kullanıcı dosyaları untracked. AGENTS.md bulunmadı. İstek: ekli v1.4.0 kapsamı (0–26). Canlı veri, migration, deploy, seed/reset, commit/push yapılmayacak.

### Aşamalar ve devam noktası

1. Devam ediyor: duyuru kayıt geri bildirimi/arşiv sayımları, rehberde benzersiz işlevler, birleşik PDF kartları.
2. Bekliyor: ortak FMT listesi, kompakt anahtarlar, hizalama, login/çıkış, on tema.
3. Bekliyor: panel code splitting, gerçek yayınevi sayfalaması, güvenli cache ve animasyon kararlılığı.
4. Bekliyor: audit inceleme/saklama, ortak dışa aktarım, yazılı onay, yedekleme hazırlığı.
5. Bekliyor: mevcut optik editörü genişletme, şablonlar, Excel çift yönlü aktarım, anahtar revizyon kaydı, mevcut yeniden değerlendirme erişimi.
6. Bekliyor: regresyon/typecheck/build, sürüm tutarlılığı ve Türkçe teslim raporu.

### Mevcut yapılar (yeniden oluşturulmayacak)

ExamWorkspace, OpticalKeyEditor, Excel parseWorkbook/outcome-preview, opticalQuestionsSchema, reEvaluate, sonuç fingerprint/revizyon ve yayımlama kontrolleri, FMT özgün bayt indirme/paylaşma, announcement sourceEvent idempotency, özel ZIP ve CPU sınırı mevcut. Şema değişikliği henüz gerekmiyor. Önceki test sonuçları bu sürümün kabulü sayılmaz.

### Doğrulama ve riskler

Henüz v1.4.0 testi çalıştırılmadı. Canlı performans/FPS ölçümü yok. Mevcut Excel sözleşmesi cevap A–E/H/X ve A–D ders içi konumları destekliyor; boş (girilmemiş) cevap kaydedilemez. H=tüm cevaplar doğru, X=iptal; yeni anlam uydurulmayacak. Eski sınavlara şablon otomatik bağlanmayacak. Hassas kaynak/veri dosyaları okunmayacak.

### v1.4.0 uygulama durumu — ara doğrulama

- Tamamlandı (yerel kod): duyuru ayar kayıt durumu ve kilidi, arşiv içe aktarma sayımları ve 14 doğrulanmış geçmiş sürüm, tarihleri koruyan etkinleştirme, rehberde metadata/işlev tekilleştirme ve varsayılan lazy animasyon, birleşik 11 PDF kartı, ortak FMT listesi/gerçek filtreler, öğrenci başlığı/hizalama/login/çıkış ve on CSS paleti.
- Tamamlandı (yerel kod): 25'li SQL yayınevi sayfalaması/debounce/abort, bölüm ve çalışma alanı code splitting, 30 satırlı memo optik editör, 3/4/5 seçenek ve A–D görünümü, ders sırası, LGS ve değişmez kişisel soru yapısı kopyaları, aynı Excel okuyucusuyla çift yönlü alan koruma, kayıp/iptal/H ayrımı.
- Tamamlandı (yerel kod): önceki/yeni anahtarı saklayan korumalı AuditLog revizyonu, değerlendirilen anahtarda ONAYLA+gerekçe, başka dosya yükleme yolundan korumayı atlama engeli, eski anahtar sonucu durum bilgisi; kapsamın tüm yüklemelerini aynı transaction'da yeniden değerlendiren merkez ve mevcut worker/hesaplama motorunun kullanımı.
- Tamamlandı (yerel kod): sekiz katalog/arşiv veri türü için merkezi önizleme/proof/dosya servisi; sonuç için mevcut yetkili rapor ihracı; SHA manifestli özgün TXT/FMT ZIP ve anahtar Excel ZIP, güvenli CSV; gerçek log saklama/alan ölçümü, indirme hash'i ve şifreli özgün arşivle en fazla 100 kayıt temizliği. Anahtar revizyonu ve temizlik denetimi süresiz korunur. Normal gezinme artık kalıcı audit değildir.
- Yedekleme merkezi yalnız hazırlık sayfası. Otomatik bakım çalışmıyor/kurulmadı diye açıkça gösterilir. Gerçek yedekleme/geri yükleme eklenmedi.
- İlk tam koşum 286/290: eski izole handler doubles yeni count/audit/transaction çağrılarını ve ONAYLA sözleşmesini kapsamıyordu. Doubles güncellendi; 25 hedefli test ve sonra 290/290 tam regresyon başarılı. Gerçek izolasyon/rollback doğrulaması ayrıca 18 HTTP/DB grubuyla başarılı.
- Yeni `20261120120000_v140_exam_structures` eklemeli migration yalnız yeni `ks-v140-test`, `127.0.0.1:55450/ks_v140` sentetik DB'ye uygulandı. 26 migration başarılı. Canlı DB değişmedi.
- İlk Chromium koşumu ilk altı gruptan sonra seçim alanı erişilebilir adı nedeniyle durdu; açık aria-label eklendi, tekrar kabul bekliyor. İlk API/Web production build başarılı; son kaynak build ve tarayıcı kabulü devam ediyor.
- **Test yan etkisi:** ilk tam regresyon eski testlerin `output/pdf/v126` ve `v130` içindeki test PDF'lerini yeniden üretti. Başlangıç kopyası bulunamadı; önceki baytlar geri yüklenmiş sayılmaz. Kullanıcı bilgilendirildi. Üç testin çıktı yolu `test-results/regression-pdfs` yapıldı. `v132` klasörüne bu testler yazmaz. Özgün TXT/FMT ve canlı veri etkilenmedi.

### Açık kabul / kapsam sınırları

- Yeni şablonlar ders/soru/kitapçık/seçenek yapısını kopyalar. Keyfi oturum dağılımı, ayrı kitapçık cevap harfleri ve doğrulanmamış TYT/AYT yapıları uydurulmadı; mevcut okuyucunun tek/sözel/sayısal oturum motoru korunur.
- Akademik yıl alanı olmayan kataloglara yeni yıl filtresi uydurulmadı. Geniş yeniden değerlendirme tek sınavla, en fazla 100 yükleme/5.000 öğrenci kaydıyla sınırlıdır; daha büyük kapsam kurum/bayiye daraltılır. Bayi filtresi API'de mevcut; UI kurum/yayınevi/sınıf/sınav kullanır.
- Dışa aktarım kayıtları 100 (anahtar/FMT) veya 1.000 (diğer kataloglar) ile sınırlıdır; sınırsız streaming iddiası yoktur. Sistem FMT örneklerinin merkezden toplu ZIP ihracı yerine mevcut FMT indirmeleri korunur. Mağaza görsel URL'leri korunur, dış sunuculardan görsel toplama yoktur.
- Otomatik log temizleme cron'u kurulmadı; hukuki/kurumsal saklama politikasının işletmeci tarafından doğrulanması gerekir. Şifreli audit arşivleri ayrıca korunur; TXT_STORAGE_KEY korunmalıdır.
- Bütün rollerin/koşullu kontrollerin ayrıntılı içerik ve gerçek cihaz kabulü tamamlanmış sayılmaz. Canlı Neon/cPanel/ağ hızları, 60 FPS ve önce/sonra kapasite ölçülmedi.
- Sonraki adım: son Chromium/mobil/tema kabulü, son test/build/digest eşlemesi, migration şema diff, Türkçe sürüm raporu; yalnız bu oturumun sunucularını/konteynerini durdur. Canlı yayın/duyuru/Git push yapma.

- Dosyadan değerlendirmeye sahnesinin asıl sayfa hareketi kaynağı ayrıca bulundu: aktif açıklama şeritlerinde `max-height:0 → 25px` geçişi, eski ve yeni satırların geçiş sırasında toplam yüksekliğini değiştiriyordu. Şeritler artık alanını korur; opacity/transform değişir. Anlatım süresi/ortak saat değiştirilmedi. Masaüstü/mobil gerçek adım ölçümü son Chromium kabulüne eklendi.
- Mobil gerçek testte çerez bildirimi Yardım düğmesini kapatıyordu. Bildirim yüksekliği ResizeObserver ile CSS değişkenine aktarılır, Yardım düğmesi bu alanın üzerinde konumlanır; observer kapanışta temizlenir.
- 291/291 regresyon başarılı (eski boş anahtarın revizyonu da test edilir). Son kaynak digest'i, son arayüz düzeltmelerinden sonra yeniden eşlenecek. Teknik SystemEvent/analytics için mevcut uygulama içi 30 günlük bakım korunur; yeni audit temizliği kendiliğinden çalışmaz, bu iki durum birbirinden ayrıdır.

### v1.4.0 — son doğrulama ve teslim

- Son kaynak: 292/292 regresyon, 0 başarısız/atlanan; 20 gerçek HTTP/DB grubu; 30 belgeli sürüm/RC ve bakım durumu için 3 hedefli grup; 17 Chromium grubu, sıfır pageerror. API/Web build, Prisma validate/generate, 26 migration, boş şema diff ve git diff --check başarılı.
- Rehber kaynak envanteri 754 kontrol şablonudur; bir dinamik PDF kart başlığı kaynakta ikon olarak görünür, çalışma anındaki sabit araç adı metadata’sı ayrıca incelendi; bütün koşullu içeriklerin kabul sayısı değildir. Binlerce satırdan tek işlev sayımı tarayıcıda doğrulandı.
- Dosyadan değerlendirmeye 1440/390 px kontrollü ölçüm: eski max-height kuralı 6,984 px, ayrılmış şeritler 0 px yükseklik aralığı; yeni ölçümde scroll farkı 0 px. FPS/hosting kapasitesi iddiası yok.
- Test Merkezi son sourceDigest ile eşlendi; yalnız gerçekten çalıştırılan dört v140 kabul betiği passed. Eski kabul betikleri not_run kalır. Rapor derlenmiş API varlıklarına kopyalandı.
- Teslim raporu `docs/v140-release-report.md` 18 rapor başlığını, gerçek açık kapsamı, canlıya geçiş işlemlerini ve output/PDF yan etkisini içerir. CHANGELOG, PROJECT_MEMORY, DEPLOYMENT ve sürümler 1.4.0 ile güncellendi. Yeni bağımlılık yok.
- Kaynak uygulaması bu oturum için tamamlandı; rapordaki model/kapsam/staging kabul maddeleri açık. Otomatik audit cron'u ve gerçek yedekleme/geri yükleme uygulanmış sayılmaz. Canlı duyuru/migration/deploy, Git commit/push yok.
- İş sonunda bu oturuma ait yerel API/Web/Chromium servisleri kapandı; yalnız `ks-v140-test` durduruldu. Sentetik veriler ve arşivler silinmedi. Önceki konteynerler ve canlı servisler değiştirilmedi. Son kaynak/derlenmiş Test Merkezi raporu eşleşmesi yeniden doğrulandı.

- Son görsel denetimde öğrenci kodları üstündeki işlevsiz kısayol kaldırıldı; boş eylem adı olan yeni merkezlerde genel + düğmesi çizilmez. Mobil form yüklendikten sonra denetlenir. PDF araçları ve duyuru görünüm sekmeleri kaynakça tanımlı varyantlarla ayrı işlev olarak korunur; dinamik kayıt satırları tekilleşmeye devam eder.
