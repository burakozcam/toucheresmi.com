# Kurumsal Sınav v1.2.7 — yayın ve doğrulama raporu

Tarih: 15 Kasım 2026. v1.2.6 üzerine yerel değişikliklerdir. Kullanıcılar, sınavlar, mevcut sonuç revizyonları ve şema korunmuştur. Canlı DB bağlantısı, migration/reset/seed, DNS/Cloudflare/Neon değişikliği, GitHub push veya canlı deployment yapılmadı.

**Kabul durumu: koşullu; Özdebir aynı öğrenciyle uçtan uca orijinal karne kabulü açıktır.** Verilen ham TXT gerçek API önizleme/onay/kayıt handler'larından geçti; orijinal üç karnenin cevap ızgaraları motorla karşılaştırıldı. Ancak TXT öğrencisi bu PDF'de yoktur. Bu iki ayrı kanıt aynı öğrencinin TXT→orijinal karne eşleşmesi yerine gösterilmez. Canlı reCAPTCHA anahtarı/hostname kabulü ve gerçek Windows işletim sistemi testi de bekler.

## 1. Özdebir hatasının gerçek nedeni ve neden devam ettiği

Yeni orijinal `2022-2023-ÖZDEBİR-5-6-7-LGS(TEK-OTURUM).bldm`, v1.2.6'nın `verifiedFmtLayout` listesinde bulunan tek oturum dosyasıyla içerik imzası bakımından farklıdır. Sözel ve sayısal orijinaller mevcut imzalarla tanınırken bu dosya **tanınmıyordu**. Değişiklikten önce gerçek dosyada `verifiedFmtLayout=false` ve genel `analyzeFmt` sonucu gözlendi:

- Aynı `SINIF` etiketiyle ilk satırdaki sabit **9**, öğrenci sınıfı sayılarak `grade.start=1` oluyordu; asıl sınıf 26. karakterdeydi.
- İlk `KITAPCIK` seçiliyor, ikinci aynı etiketli alan cinsiyet olarak tanımlanmıyordu.
- 92'de Din yerine Fen, 112'de Fen yerine Sosyal, 132'de Sosyal yerine İngilizce ve 152'de İngilizce yerine `DIN KULT` atanıyordu.
- Satır genişliği yine 171, başlık ve A–D cevap karakterleri geçerli kaldığından genel düzen de doğru düzen kadar satır okuyabiliyordu. `evaluationReader` yalnız **daha fazla satır** okuyan alternatifi seçiyordu. Manuel seçilen yanlış kayıt, eşit sayıda okunan doğrulanmış sistem tanımıyla değiştirilmedi.
- FMT önizlemesi boş kitapçığı reddederken gerçek Özdebir motoru A kabul ediyordu. Böylece geçerli örnek TXT, FMT kaydetme doğrulamasından geçemiyordu.
- Tekli/toplu dosya seçicileri `.bldm` uzantısını reddediyordu. Tekli yükleyici, tanımadığı kaynak için ortak backend analizini çağırmıyordu.
- Sağlanan orijinal O8126 Excel'in `CEVAP ANAH.`, `KAZANIM`, `ÇAPRAZ` yapısı mevcut F/O/genel başlık şemalarına uymuyordu; gerçek `inspectOutcomeFile` çağrısı “başlıkları tanınmadı” hatası verdi. TXT okunsa da anahtar hazırlama zinciri eksikti.

Önceki regresyonlar başka bir tek oturum FMT varyantını, kanonik sistem yerleşimini ve önceden dönüştürülmüş karne/anahtar verisini kullanıyordu. Bu nedenle v1.2.6'daki ders ve puan düzeltmeleri geçerli olsa da yeni **orijinal BLDM varyantı + manuel eski kayıt + özgün Excel** birleşimi sınanmamıştı. Sorun yalnız karakter kodlaması veya katsayı değildi.

## 2. Yapılan kod değişiklikleri

- `verified-fmt.ts`: yeni orijinal dosyanın normalize içerik SHA-256 imzası `7e4d65fa5dd75c60fbc9989d50a1e017cdcbc92a684603690864d0317d3e60bc` doğrulanmış tek oturum düzenine bağlandı. Dosya adına veya serbest ders ismine güvenilmez. Özgün dosya değiştirilmedi.
- `ozdebir-layout.ts`, `evaluation-reader.ts`: v1.2.6 genel analizinin **tam eski yapısı** için eşit satır okunabilirliğinde doğrulanmış aile seçilir ve uyarı verilir. Diğer, benzer genişlikli rastgele şablonlara bu istisna uygulanmaz. Mevcut DB şablonu/güncel sonuçları otomatik yazılmaz; yeni değerlendirmede seçilir.
- `fmt-preview.ts`, `optical-exam-matching.ts`: aileye özel boş kitapçık A kuralı önizleme ve sınav önerilerine taşındı. Dolu geçersiz kitapçık değiştirilmez. Diğer yayınevlerinin davranışı korunur.
- Tekli/toplu Web FMT yükleyicileri: FMT/BLDM kabulü; tekli dosyada da sunucu analizinin kullanılması.
- `lib/optical-import/parsers/ozdebir.js`: başlıklara ve üç sekmeye dayanan özgün Excel parser'ı. 90 soru, altı ders, kazanım kod/metni, A/B sıra permütasyonu ve bağımsız B cevap sütunu doğrulanır. Çelişkili çapraz veya eksik sekme hata verir. Aynı modül API ve tarayıcıda kullanılır. Yeni soru kaynak bilgisi mevcut `general` enum'u ile saklanır; yeni DB enum/migration gerekmez.
- `scoring-profile.ts` değiştirilmedi: inceleme ve test, mevcut profilin yeni anahtar oluşturma uçlarına ve gerçek değerlendirme motoruna bağlı olduğunu doğruladı. Yeni parser katsayı uydurmaz; onaylanan Özdebir 8 profili anahtar oluşturulurken uygulanır. Mevcut anahtarlar otomatik değişmez.
- reCAPTCHA, env, Prisma singleton, analitik rızası ve cache değişiklikleri aşağıdaki bölümlerdedir. Mevcut PDF, Excel, kullanıcı/davet ve sonuç revizyon API'leri korunur.

## 3. Kaynak dosyalar ve gerçek akış testi

Ham öğrenci dosyaları depoya kopyalanmadı. PDF'den yalnız sıra, D/Y, puan ve cevap ızgarası alındı; ad, TC, öğrenci/kurum numarası ve üstbilgiler çıkarıldı. A→C, B→D, C→A, D→B dönüşümü mevcut anonim TXT'lerle tutarlıdır. Özgün Excel yalnız cevap anahtarı/kazanım içerir; testteki worksheet JSON'unda öğrenci kaydı yoktur. BLDM yalnız okuyucu tanımıdır. Kaynak/fixture bilgileri `tests/fixtures/ozdebir/manifest.json` içindedir.

- Yeni TXT SHA-256: `4a973b09785fd7cdfabd25415aaf0e1ae4e82a1d8ee6fcba0201912cd919f466`; önceki anonim tek optiğin kaynak hash'iyle aynı.
- Yeni PDF SHA-256: `5f1933039f40bcd332c7c7dec756ecc1f7d107066961a6287e0e87fe7fd230a1`; **3 sayfa**, eski 427 sayfalık kaynak değildir.
- TXT Windows-1254 olarak çözülünce 171 karakterdir. Alan boşlukları korunur. UTF-8'e çevrilmiş eşdeğer anonim kayıtlar ve BOM/çok bayt regresyonları da test takımında bulunur.
- Öğrenci no 10–14, TC 15–25, sınıf 26, kitapçık 28; tek oturum Türkçe 52–71, Matematik 72–91, Din 92–101, Fen 112–131, Sosyal 132–141, İngilizce 152–161. Din/Sosyal/İngilizce'nin kalan onluk alanları boş rezervdir.
- Sözel 131: Türkçe 52–71, Din 72–81, Sosyal 92–101, İngilizce 112–121. Sayısal 91: Matematik 52–71, Fen 72–91. Yeni sözel/sayısal BLDM'ler bu kanonik tanımlara eşleşti. Split örneğin gerçek kaynağından önceki sürümde üretilmiş anonim 209 satır/105 öğrenci regresyonu korundu; bu talepte yeni ham split TXT verilmedi.

`tests/verify-local-ozdebir.cjs` ile **verilen ham TXT + verilen özgün Excel + verilen özgün BLDM** çalıştırıldı. Gerçek `/preview` ve `/evaluate` handler'ları, önizleme tokenı, uyarı onayı ve transaction içindeki yeniden denetimler kullanıldı. Yalnız Prisma yöntemleri bellekle değiştirildi; PostgreSQL bağlantısı yoktur. Sonuç:

| Ölçüm | Sonuç |
|---|---:|
| Kayıt / öğrenci | 1 / 1 |
| Birleştirilen sözel+sayısal çift | 0 (tek oturum) |
| Eksik sözel / sayısal | 0 / 0 |
| Reddedilen / mükerrer kayıt | 0 / 0 |
| Kitapçık | Boş kaynak → uyarıyla A |
| Okunan cevap alanı | 90 |
| Ham net | 5 |
| Hesaplanan puan | 225.26170733333333 |

| Ders | Doğru | Yanlış | Boş | Net |
|---|---:|---:|---:|---:|
| Türkçe | 5 | 15 | 0 | 0 |
| Sosyal | 2 | 8 | 0 | -0.6666666666666665 |
| Din | 3 | 7 | 0 | 0.6666666666666665 |
| İngilizce | 2 | 8 | 0 | -0.6666666666666665 |
| Matematik | 7 | 13 | 0 | 2.666666666666667 |
| Fen | 7 | 12 | 0 | 3 |

Fen'de özgün Excel'in A 11/B 14 sorusu **X/iptal** olduğu için D/Y/B toplamı 19'dur. İptal cevap eksikliği diye doldurulmadı. Bu tablodaki hesap, verilen anahtarla bir hesaplama kanıtıdır; öğrencinin kesin bu sınava katıldığının veya puanının yayınevi karnesiyle aynı olduğunun kanıtı değildir.

## 4. Orijinal karnelerle karşılaştırma ve sınırlar

Yeni PDF'de TXT'deki öğrencinin numarası veya normalize edilmiş adı eşleşmedi (**0 eşleşme**). Kaynaklar farklı öğrenci kapsamındadır. PDF'deki kişileri TXT öğrencisine eşitlemek, eksik sayısal cevapları başka karneden almak veya aynı ad varsayarak birleştirmek yapılmadı.

Üç sayfanın sabit koordinatlı cevap ızgaraları ayrı çıkarıldı ve anonimleştirildi. Her sayfanın kendi üzerinde gösterilen cevap anahtarı ve T/herkese doğru kuralı kullanıldı. Sonuç **18/18 ders D/Y/net eşleşmesi**:

| Sayfa | Toplam D | Toplam Y | Ham toplam net | PDF puanı | Yuvarlanmamış motor puanı | Üç ondalık |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 16 | 8 | 40/3 | 258.345 | 258.344948 | 258.345 |
| 2 | 41 | 29 | 94/3 | 293.003 | 293.00282433333336 | 293.003 |
| 3 | 29 | 16 | 71/3 | 262.703 | 262.70311833333335 | 262.703 |

Sayfa 1 yalnız sayısal, sayfa 3 yalnız sözel cevap/anahtar gösterir; sayfa 2 tamdır. Bu tablo, PDF'nin gösterdiği mevcut ders netlerinin başlangıç puanına eklenmesini yeniden hesaplar. Motorun TXT'de eksik oturum için **tam puanı null tutma** politikası korunur; eksik oturumdan 500 üzerinden tam puan veya uydurma cevap üretilmez. PDF 1/3'teki kısmi puan sunumu uygulamanın tam sınav kabulüyle karıştırılmaz.

**Özgün Excel ile karne düzeltmeleri farklıdır:** Excel'de Fen A 11 X'tir; PDF A'da Fen 2 ve 11 T/herkese doğru, B'de 2 ve 14 T gösterir. Kaynak Excel, PDF'ye bakılıp sessizce değiştirilmedi. O8126 karne eşleşmesi için yönetici güncel duyuruyu doğrulayıp editörde ilgili soruları H/T olarak onaylamalıdır. Her iki kural motor regresyonuyla sınanır. Katsayılar bu karne grubuna dayanan düzenlenebilir varsayılandır, evrensel Özdebir resmî modeli değildir.

Eski anonim 427 karne regresyonu da tekrar geçti: 2.562 dersin D/Y/net değerleri eşleşir; katsayı yuvarlama sınırı nedeniyle 422/427 puan üç ondalıkta tam eşleşir. Diğer beşindeki 0,001 gösterim farkı v1.2.6 raporunda açıktır; bu sürümde kaynak puanları zorla eşitleme yapılmadı.

## 5. reCAPTCHA v3 durumu

Mevcut sunucu/istemci v2 yaklaşımı v3'e geçirildi. Web, konfigürasyonu ortak ve yeniden kullanılabilir şekilde alır; Google betiğini ve tokenı yalnız gönderimde ister. Hatalı girişten sonra yeni token üretilir. Öğrenci sonuç PDF'si de sorgudaki tüketilmiş tokenı tekrar kullanmaz. Görsel kutu gerektirmez; eski v2 ve Turnstile doğrulama testleri bozulmadı.

Kapsam: kullanıcı girişi, üyelik kaydı, ayrı kurum/bayi başvurusu API'si, iletişim, açık sonuç sorgulama ve sonuç PDF'si. Herkese açık “şifremi unuttum” endpoint'i yoktur; mevcut yetkili yönetici sıfırlaması/davet/parola değiştirme akışı korunur.

Backend `success`, tam hostname, action, sayısal risk skoru (varsayılan 0.5), iki dakika süre, gelecek zaman toleransı ve sağlayıcı hata/kota mesajlarını kontrol eder. Ham token saklanmaz; süreçte hash/TTL tekrar engeli, Google'da tek kullanım denetimi vardır. Ağ istekleri sekiz saniyede kesilir; erişilememe/başarısızlık kullanıcıya yeniden denenebilir hata verir. Düşük skorda hesap kalıcı bloke edilmez. Hız sınırlaması Google çağrısından önce çalışır. Eşik environment ile düzenlenebilir; captcha kapatılarak üretim hatası gizlenmez.

API yalnız `secret` ve `response` gönderir; öğrenci adı/TC/no/cevap/puan body'ye eklenmez. Web yalnız sabit action adı kullanır. Google tarayıcı IP/cihaz/bağlantı meta verilerini kendi hizmeti kapsamında işleyebilir; bunu “Google'a hiç veri gitmez” diye sunmuyoruz.

API'de RECAPTCHA_SECRET_KEY, Web build'de NEXT_PUBLIC_RECAPTCHA_SITE_KEY kullanılır. WEB_ORIGIN doğru canlı origin olmalı; hostname buradan türetilebilir. Üretimde iki sağlayıcının da kapalı olması veya etkin sağlayıcının anahtarının eksik olması başlangıcı reddeder. Gerçek cPanel değişkenleri okunmadı/değiştirilmedi; gerçek Google doğrulaması **henüz yapılmadı**. Cluster'da yerel limitlerin merkezileştirilmesi yol haritasında açıklanır.

## 6. Windows derleme sorunu ve ortamlar

Linux'ta da hiçbir API URL'si tanımlamadan Web build çalıştırılarak aynı **Failed to collect page data for /sitemap.xml** hatası yeniden üretildi. `sitemap.ts`, `lib/api.ts` dosyasını modül yüklenirken import eder; production'da eksik NEXT_PUBLIC_API_URL için atılan hata fonksiyonun fetch try/catch'ine ulaşmadan oluşur. Önceki kök .env.example bu değişkeni içermiyordu ve workspace Web komutu kök env'yi yüklemiyordu.

Web komutları artık Node tabanlı platform bağımsız wrapper ile Web'e ait Next env dosyalarını ve ortak kök .env'yi yükler; kabuk/cPanel değerlerini ezmez. Eksik URL için sitemap'in örtük hatası yerine başlangıçta açık yapılandırma mesajı verilir. Sadece localhost/127.0.0.1/::1 adreslerinde HTTP production-build yerel testi kabul edilir; gerçek host için HTTPS zorunludur. API de kaynak/derlenmiş dizinde kendi paket env'si ve ortak kök env'yi bulur. `.env.example`, README PowerShell/Linux adımları ve örnek JWT uzunluğu güncellendi.

**Node 22.16.0 + npm 10.8.2 üzerinde Linux tam API/Web build geçti.** Node 24.22.1 üzerinde de API/Web build ve regresyonlar geçti. Windows 11 çalıştırma ortamı bulunmadığından gerçek Windows build yapılmış sayılmaz. Shell'e özgü env ataması veya POSIX dosya yolu yeni npm komutlarına eklenmedi. Yeni boş yerel PostgreSQL kurulumu operatör adımıdır; canlı veritabanına otomatik migration/seed yoktur.

## 7. Testler, karne ve Excel

- Son Node regresyon takımı: **214/214 geçti**, başarısız/atlanmış/çalıştırılmamış 0. Test Merkezi JSON'u 1.2.7 olarak güncellendi.
- Yeni testler: orijinal BLDM varyantı; eski manuel düzen/eşit satır sayısı; boş kitapçık önizlemesi/sınav önerisi; özgün üç sekmeli Excel/A-B çapraz çelişkisi; yeni üç karne 18 ders/puan; v3 skor/action/hostname/tarih/tekrar/kota/ağ; üretim anahtar ve yerel uzak DB engeli; analitik yol filtreleri; gerçek API önizleme/onay/kayıt sözleşmesi.
- Yeni kaynaklı anonim API sonucunun Excel satırları XLSX'e yazılıp geri okunarak puan hücresi karşılaştırıldı. Aynı snapshot'tan gerçek karne PDF'si oluşturulup metindeki üç ondalıklı puan doğrulandı. Mevcut anonim referans PDF ayrıca Poppler ile render edilip görsel olarak kontrol edildi; kesilme veya üst üste binme görülmedi. Eski şablonlu/kazanımlı PDF, Excel, HTML ve kimlik/kurum izolasyonu regresyonları korunur; karne şablonu yeniden tasarlanmadı.
- Chromium 1440/390 px: gerçek Web arayüzü → gerçek preview handler → uyarı onayı → gerçek evaluate handler → doğru kurum/sınav sonuç ekranı geçti. DB yöntemleri bellekle değiştirilmiş yerel fixture API ve anonim öğrenci kullanıldı; gerçek PostgreSQL veya canlı kullanıcı testi değildir. Yatay taşma ve JS sayfa hatası yoktur.
- Tarayıcıda Google/login yanıtları taklit edilerek: gönderim öncesi execute=0; iki başarısız girişte iki yeni token ve action=login doğrulandı. Consent olmadan iç analitik dahil istek yok; kabulden sonra yalnız public sabit yol metriği var; query içeren URL ve yapılandırılmamış Google etiketi dışlandı.
- İlk test turlarındaki sürüm beklentisi, yeni parser'ın kaynak enum'u ve tarayıcı fixture/seçici hataları giderildi. Bunlar son test takımında başarısız kalmadı. Build'de mevcut `autoprefixer: start` uyumluluk uyarısı var; derlemeyi engellemiyor.
- Gerçek Windows OS, canlı Google anahtarı, fiziksel optik okuyucu, canlı PostgreSQL ve 100/500/1.000/10.000 yük testleri **çalıştırılmadı**. Bunlar başarılı diye işaretlenmez.

## 8. Google, KVKK ve altyapı

Search Console meta doğrulaması, GA4 kimliği/onay ayarı, kullanıcı analitik izin paneli ve yol allowlist'i hazırdır. Gerçek hesap kimlikleri verilmedi; Google servisleri aktif/kurulmuş sayılmaz. GTM için kimlik alanı ve güvenli geçiş planı vardır; denetlenmemiş container yüklenmez. Sitemap/robots korunur, özel API/Web cache başlıkları eklendi. Google/Cloudflare/Neon/PM2/yedek/CI/PageSpeed/yük testi ayrıntıları `infrastructure-roadmap.md` içindedir.

Güvenlik sayfasına reCAPTCHA'nın amacı ve Google bağlantıları ile isteğe bağlı analitik açıklaması eklendi. Analitik için kabul/red ve sonradan değiştirme mümkündür. Tam hukuki aydınlatma işletmeci tarafından tamamlanmalıdır: veri sorumlusu ve başvuru iletişimi, veri kategorileri/işleme amaçları, hizmet sağlayıcılar, saklama süreleri, işleme hukuki sebebi, yurt dışı aktarım mekanizması ve kişi hakları somut hesaba/işleme göre belirlenmelidir. reCAPTCHA'nın güvenlik amacı, tüm teknik verilerin otomatik olarak “zorunlu çerez” sayıldığı anlamına gelmez; ayrı değerlendirme gerekir. Çocuk/veli verisi işleyen ürünün bu hizmetlerle veri akışı kurumun sorumlu ekibince incelenmelidir. Bu kod değişikliği tam KVKK uyumluluk beyanı değildir.

Referanslar: [Google reCAPTCHA v3](https://developers.google.com/recaptcha/docs/v3), [token doğrulaması](https://developers.google.com/recaptcha/docs/verify), [GA4 manuel pageview](https://developers.google.com/analytics/devguides/collection/ga4/views), [GA4 Enhanced Measurement](https://support.google.com/analytics/answer/9216061?hl=en), [Next env değişkenleri](https://nextjs.org/docs/app/guides/environment-variables), [KVKK Çerez Rehberi](https://www.kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber), [KVKK çerez aydınlatma kararı](https://www.kvkk.gov.tr/Icerik/7595/2022-1358). Bunlar teknik/hukuki inceleme kaynaklarıdır; Google hesabı veya hukuki sözleşme kurulmuş değildir.

## 9. Yetkili canlıya aktarım sırası

1. Operatör mevcut DB ve özel depoyu yedekler; TXT_STORAGE_KEY/JWT_SECRET ve gerçek mutlak STORAGE_DIR değerlerini güvenli saklar. Eski şablon/anahtar/sonuçları otomatik silmez.
2. İncelenmiş kodu ayrı sürüm olarak build eder. .env, ham öğrenci kaynakları, test API sunucusu, geçici loglar ve gerçek dosyalar deployment artifact'ına alınmaz. Web'e gerçek HTTPS API adresi ve public v3 site key **build sırasında**, API'ye secret ve doğru hostname/origin verilir.
3. Bu sürüm yeni migration içermez. v1.2.6'dan bekleyen migration varsa yalnız operatörün onaylı yayın işlemi uygulanır. `migrate dev/reset/seed` canlıda çalıştırılmaz.
4. Eski Özdebir anahtarı içe aktarılamadıysa özgün Excel ile onay ekranından yeniden hazırlanır. Önceden kaydedilmiş katsayılar otomatik değişmez; seçili profil ve özel soru kararları yönetici tarafından kontrol edilir. FMT için doğrulanmış Özdebir tanımı veya yeni analiz edilmiş orijinal BLDM kullanılır; eski sonuçlar kendiliğinden yeniden puanlanmaz.
5. **Aynı öğrencileri içeren TXT ve orijinal karne** ile D/Y/net, ayrı oturum kitapçıkları, iptal/H soruları, puan, Excel ve PDF karşılaştırılır. Mevcut dosya kapsamı bu adımı tamamlamaz; Özdebir tam kabulü bu doğrulamaya bağlıdır.
6. Google test hesabı/canlı domain'de login/register/contact/results action'ları, düşük skor/expiry/replay ve erişilememe hataları kontrol edilir. Gerçek öğrencilerin bilgileri Google test araçlarına girilmez. Anahtar eksikliğinde API'nin kapalı korumayla başlamadığı doğrulanır.
7. Analitik varsayılan kapalı kalır. Hesap/çerez/aktarımı tamamlanınca yalnız gerekli etiketler rızayla etkinleştirilir. Cloudflare/DNS/Neon/PM2 değişiklikleri ayrı onaylı altyapı işi olarak yürütülür. Önce health ve özel sonuç izolasyonu, sonra sınırlı kullanıcı kabulü yapılır; sorun varsa önceki kod sürümüne dönülür.
