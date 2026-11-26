# v1.1.2 yerel tarayıcı testleri

Bu testler gerçek Express API, üretim Next arayüzü ve gerçek parser/puanlama kodunu kullanır. Prisma metotları izole bellek test kayıtlarına yönlendirilir; canlı DB bağlantısı kullanılmaz. Test betikleri port 4101 (HTTPS) ve paylaşım için 4102 (HTTP SSR) kullanır; sıralı çalıştırın.

Gerekenler: Node 20+, OpenSSL, Playwright ve kurulu Chromium. Test ortamında Playwright modülünü `PLAYWRIGHT_MODULE`, Chromium dosyasını `CHROMIUM_PATH` ile belirtebilirsiniz; bunlar yoksa `playwright` ve varsayılan tarayıcı kurulumu kullanılır. Playwright üretim bağımlılığı değildir.

Repo kökünde:

```sh
npm ci
npm run db:generate
NEXT_PUBLIC_API_URL=https://api.kurumsalsinav.com npm run build
API_INTERNAL_URL=http://127.0.0.1:4102 npm run start -w @optik/web -- --hostname 127.0.0.1 --port 3100
```

Ayrı terminalde sırayla:

```sh
node --import tsx tests/e2e/v112-import-fmt.cjs
node --import tsx tests/e2e/v112-results.cjs
node --import tsx tests/e2e/v112-share.cjs
node tests/e2e/v112-login.cjs
```

API domainine giden **tarayıcı** istekleri testte localhost'a yönlendirilir. Share sayfasının SSR isteği `API_INTERNAL_URL` üzerinden yerel API’ye gider. Bu ortam değişkenini veya test bağlantılarını canlı ayarlara taşımayın. Self-signed test sertifikası ve test çıktıları `/tmp` altında tutulur. Testte oluşturulan sertifika gerçek sunucuda kullanılmaz.

Bağımsız API runtime smoke kontrolü:

```sh
KS_API_PACKAGE_ROOT=/tmp/ks-v112-isolated node tests/api-package-smoke.cjs
```

Bu dizinde API `dist`, `passenger.cjs`, kendi üretim bağımlılıkları ve üretilmiş Prisma istemcisi önceden bulunmalıdır. Paket Web ağacı olmadan hazırlanmalıdır. Smoke testi sahte DB URL’sini kendisi atar; localhost geçici portunda health ve Passenger dinleme sözleşmesini kontrol eder. Gerçek PostgreSQL/Passenger testi yerine geçmez.


## v1.1.3 yerel doğrulaması

Önce Node >=20 ile `NEXT_PUBLIC_API_URL=https://localhost:4443 npm run build` çalıştırın. `node --import tsx tests/e2e/v113.cjs`, 4443 HTTPS API ve 3100 Web sunucularını kendisi açıp kapatır. Gerçek Prisma bağlantısı yerine bellek içi fonksiyonlar kullanır; DATABASE_URL localhost kapalı portuna ayarlanır. Upload dizini /tmp altında oluşturulup temizlenir. Chromium ve Playwright için yukarıdaki PLAYWRIGHT_MODULE / CHROMIUM_PATH seçenekleri geçerlidir. Portlar boş olmalıdır.

Bu test build'ini üretime taşımayın; üretim için doğru API adresiyle yeniden build alın. Test, gerçek PostgreSQL migration'ını veya gerçek Passenger kurulumunu doğrulamaz.


## v1.1.4

Node >=20.9 ile `NEXT_PUBLIC_API_URL=https://localhost:4443 npm run build` sonrasında `node --import tsx tests/e2e/v114.cjs` çalıştırın. Playwright / Chromium ayarları yukarıdakiyle aynıdır. Bu test v113 yerel bellek içi ortamını genişletir; canlı DB kullanmaz. Tek/5 FMT, farklı sınıf/yayınevi, kısmi kayıt hatası ve tekrar, 30 logo + hatalı SVG, değiştirme/silme ve rol kontrolü, web logo kartları, A/B birleşik/ayrı ve tek kitapçık PDF, logosuz yayınevi, sabit login / gerçek login, oturumsuz HTTP 404 / klavye ve dokunmatik oyun kontrollerini kapsar.

`KS_DENY_LOGO_ENGINE=1 node tests/api-package-smoke.cjs` logo motoru modülü yüklenemediğinde derlenmiş API'nin hâlâ başlatılıp health yanıtı verdiğini test eder. Bu işlem de yalnızca yerel sunucu ve sahte DB adresi kullanır. Gerçek Passenger kurulumu ve PostgreSQL migration'ı ayrıca test edilmelidir.


## v1.1.6 TXT yükleme ve karne

Node >=20.9 ile, `NEXT_PUBLIC_API_URL=https://api.kurumsalsinav.com` kullanan yerel Web sunucusunu 3100 portunda açın. Ardından `node --import tsx tests/e2e/v116-upload.cjs` çalıştırın. Test 4101 portunda kendi HTTPS API’sini açar; Prisma işlemlerini bellek kayıtlarına yönlendirir, canlı DB’ye bağlanmaz. Playwright ve Chromium yolları yukarıdaki değişkenlerle verilebilir.

Bu test, boş FMT deposunda sistem 7108 seçimini, bilgisayardan TXT yüklemeyi, önizleme/onay/kaydı, sol menüden kayıtlı sınavı açmayı, tek/toplu karneyi, liste + karneyi, sınıf Excel’ini, analizi ve mobil taşmayı kontrol eder. Güncel FMT/anahtar katalogları erişilemese bile kayıtlı karne açılmalıdır. Logo animasyonunun 1 saniye başlangıç gecikmesi, 5 saniye döngüsü ve reduced-motion davranışı da denetlenir.

FMT hata senaryoları da test edilir: kurum/anahtar servisi 503 döndüğünde FMT seçimi korunur; FMT servisi 503 döndüğünde açıklama ve yeniden yükleme gösterilir; yeni FMT liste adresinin HTML 404 yanıtında eski `/templates` adresi kullanılır.

Sınav kataloğu ayrıca yayınevi → sınav gruplarıyla, FMT seçilmeden açılır. Yayın görünürlüğü kapalı ve eski `active=false` anahtarlı sınavın değerlendirilmesi, yalnız PDF kaydında eksik eşleştirme açıklaması, açık/koyu tema ve mobil yükleme düzeni doğrulanır.


## Sonuçlar / iki oturum / PDF-Excel-ZIP

`node --import tsx tests/e2e/results-workflow.cjs`, 3100 portunda açık Web uygulamasıyla ve 4101 portunda kendi yerel HTTPS API’siyle çalışır. Prisma bellek kayıtlarına yönlendirilir. İki ayrı dosya/yüklemede oturum birleştirme, kurumdan sınav seçme, genel/kurum/sınıf sıraları, PDF/Excel/ZIP, TC gizleme, öğrenci numarası/TC ile yalnız eşleşen karne sorgusu, yönetim yetkisi ve kaldırma/geri alma sınanır. `PLAYWRIGHT_MODULE` ve `CHROMIUM_PATH` yukarıdaki gibi verilebilir. Sonuç dosyaları `/tmp/ks-e2e-*` altında oluşur.

Bu test, kullanıcı numarasını/TC’sini bilen kişinin kimliğini doğrulamaz. Kimlik doğrulamasız sonuç sorgusu kullanıcının açık tercihiyle uygulanmıştır; yalnız eşleşen kayıt döndürülmesi ve yönetim uç noktalarının oturum istemesi test edilir.


## Kalıcı TXT arşivi ve PostgreSQL JSONB regresyonu

`txt-archive-postgres.cjs` yalnız `localhost`/`127.0.0.1` üzerinde, adı **ks_qa** olan silinebilir bir test veritabanını kabul eder. Gerçek kullanıcı veritabanı kullanmayın. Boş test DB’sine `DATABASE_URL=... npm run db:migrate:deploy` uygulayın; 3100 portunda doğru API adresiyle derlenmiş Web’i başlatın. Ardından:

```sh
DATABASE_URL='postgresql://TEST_USER:TEST_PASSWORD@127.0.0.1:TEST_PORT/ks_qa' node --import tsx tests/e2e/txt-archive-postgres.cjs
```

Test sentetik bayi, kullanıcı, kurum ve sınavlar oluşturur; gerçek Prisma, dosya sistemi ve PostgreSQL JSONB kullanır. 4101 HTTPS API’sini kendisi açıp kapatır. Arşiv dosyaları `/tmp/ks-txt-postgres-*`, görüntüler `/tmp/ks-txt-archive-*` altındadır. Gri/yeşil dosya durumları, yenileme sonrası saklama, seçilen alt küme, farklı sınavlarda tekrar kullanım, ayrı oturumda yeniden değerlendirme, kurum kapsamı, 10 dosya sınırı, şifreli disk dosyaları ve il→ilçe→kurum akışı iki ekranda doğrulanır. `results-workflow.cjs` bellek arşiviyle PDF/Excel/ZIP ve öğrenci sonuçları regresyonunu korur.

## v1.1.9

Üretim build'inden sonra 3100 portunda yerel Web açıkken `node tests/e2e/v119-login.cjs` giriş yerleşimini, rol parametrelerini ve eski öğrenci bağlantısını doğrular. `node --import tsx tests/e2e/v119-human.cjs` kendi geçici localhost portunu açar; Turnstile etkin yapılandırmasında API'nin doğrulamayı atlayamadığını taklit Siteverify ile sınar. `results-workflow.cjs` ayrıca bağımsız PDF şablonları, FMT içerik tahmini ve 7108→8050 indirmeyi test eder. Playwright/Chromium için yukarıdaki ortam değişkenleri geçerlidir. Hepsi anonim veri kullanır; üretim bağlantısı veya dağıtım yapmaz.

## v1.2.0 kabul kanıtı

`v120-postgres.cjs` yalnız `127.0.0.1:55432/ks_qa` veritabanını kabul eder. Boş, geçici PostgreSQL 16 ortamında mevcut migration'lar uygulandıktan sonra `node --import tsx tests/e2e/v120-postgres.cjs` çalışır. Anonim bağımsız sınavın arşiv, manuel/tahminli FMT, A/B, D/Y/B, puan, kayıt, tekrar, yetki ve PDF zincirini doğrular; gerçek üretim bağlantısı kabul etmez. CAPTCHA sağlayıcısı taklit edilir. Üç örnek PDF `output/pdf/` altına yazılır.

3100'de üretim Web build'i açıkken `node tests/e2e/v120-ui.cjs` arama (gecikmeli ilk liste yanıtı dahil), mobil/klavye ve Google widget-token akışını taklit verilerle sınar. Playwright/Chrome yolları yukarıdaki ortam değişkenleriyle verilir.

`node --import tsx tests/e2e/v120-pdf-stress.ts` geçici stres PDF'lerini, ardından `python3 tests/e2e/v120-pdf-qa.py` kenar boşluğu/boş sayfa/başlık/kayıt kontrollerini üretir. Python kontrolü yalnız standart kütüphane ve Poppler kullanır; npm bağımlılığı eklemez. Üretim storage, yedek veya canlı migration işlemi yoktur.

## v1.2.1 RC

`tests/v121.test.ts` null katsayı, gerçek PDF sayfa/içerik, tanım oluşturma/mükerrer kontrolü, Test Merkezi yetki/rapor ve görünür yayınevi adı regresyonlarını içerir. Kök `npm run test:report` için Node 22.8+ gerekir; sabit yerel Node suite'i sentetik DB URL'si ve özel `/tmp` deposuyla çalışır. Gerçek durumlar API assets raporuna yazılır; Web üzerinden çalıştırma yolu yoktur.

Production Web build'i yalnız `127.0.0.1:3100` üzerinde açıkken, Node 22.8+ ile `node tests/run-v121-acceptance.cjs` sabit beş kabul betiğini sırayla çalıştırır. Playwright/Chromium için yukarıdaki `PLAYWRIGHT_MODULE` ve `CHROMIUM_PATH` kullanılabilir. Gerçek API/DB yerine test taklitleri kullanılır; production connection URL verilmez. CAPTCHA yapılandırması değiştirilmez ve gerçek sağlayıcı testi yapılmaz. Çıktılar `test-results/`, `/tmp` ve anonim örnek PDF'ler `output/pdf/v121-*.pdf` altındadır.

Bu koşumdan sonra `npm run test:report` aynı kaynak SHA-256 ile eşleşen kabul sonuçlarını birleştirir; eski veya çalıştırılmamış betiklere başarı vermez. `npm run build -w @optik/api` JSON raporu dist varlıklarına kopyalar. Gerçek PostgreSQL staging ve cPanel/Passenger kabulü ayrı kalır. Tam sonuç: `docs/v121-release-report.md`.

## v1.2.3 TXT öneri ve sonuç penceresi

Yerel Web sunucusu `http://127.0.0.1:3100` üzerinde açıkken `node tests/e2e/v123-ui.cjs` çalıştırılır. Tüm API yanıtları sentetiktir; gerçek hesap/veritabanı kullanılmaz. FMT/sınav yüzdeleri, turuncu birlikte uygulama, uyarılı değerlendirme penceresi, il/ilçe/kurum/sınav seçilmiş sonuç ekranı, yükleyen etiketi ve TXT silme doğrulanır. Playwright ve Chromium için yukarıdaki ortam değişkenleri kullanılabilir.

## v1.2.8 gerçek PostgreSQL ve tarayıcı kabulü

Node 22/npm 10, Python Playwright ve Chromium gerekir. Yalnız `127.0.0.1:55438/ks_v128` adresindeki **geçici test** PostgreSQL 16 veritabanını kullanın; v128 betikleri başka adresleri reddeder. Bu veritabanında mevcut migration'ları uygulayın. Bağlantıyı `DATABASE_URL` ortam değişkenine aktarın; üretim bağlantısı veya gerçek Google anahtarları vermeyin.

```sh
npm run db:generate
npm run db:migrate:deploy
mkdir -p /tmp/v128-evidence
V128_KEEP_SERVER=true node --import tsx tests/e2e/v128-integration.cjs
```

Son komut yerel API'yi 4000 portunda açık bırakır. Ayrı terminalde Web'i oluşturup `apps/web` dizininden başlatın:

```sh
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 NEXT_PUBLIC_RECAPTCHA_SITE_KEY=mock-google-public npm run build
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 npm run start -w @optik/web -- -p 3100
```

Bağlantı değişkenini aynı geçici DB'ye ayarladığınız başka terminalde:

```sh
node --import tsx tests/e2e/v128-security.cjs
python3 tests/e2e/v128-ui.py
python3 tests/e2e/v128-covers.py
```

API/Prisma, PostgreSQL, dosya arşivi, yeniden hesaplama, iframe ve tarayıcı işlemleri gerçektir. Google siteverify/JavaScript kontrollü taklittir; gerçek Google v2 challenge kabulünün yerine geçmez. İsteğe bağlı `V128_SOURCE_TXT` ve `V128_SOURCE_XLSX`, integration komutuna özgün yerel kaynakların yollarını verir; bu dosyalar Git'e veya rapora kopyalanmaz. Varsayılan koşum anonim fixture kullanır.

`/tmp/v128-evidence/seed.json` yalnız yerel test hesap/token bilgilerini içerir ve paylaşılmaz. Aynı dizindeki `integration.json`, `security.json`, `browser.json`, `covers-browser.json` sayısal sonuçları ve anonim ekran görüntüleri kabul kanıtıdır. Koşum sonunda yerel API/Web süreçlerini kapatın. Test derlemesini canlıya taşımayın.

## v1.2.9 uçtan uca sınav ve pano kabulü

Yukarıdaki v1.2.8 geçici PostgreSQL kurulumu (`127.0.0.1:55438/ks_v128`) ve `V128_KEEP_SERVER=true` API koşumu kullanılır; her koşum yeni anonim kullanıcı/kurum oluşturur. Üretim Web'i test API'siyle derleyip 3100 portunda açın. Node 22/npm 10 ve Python Playwright/Chromium gerekir. Yeni migration yoktur.

```sh
node tests/e2e/v129-fixtures.cjs
DATABASE_URL='postgresql://TEST_USER:TEST_PASSWORD@127.0.0.1:55438/ks_v128' node tests/e2e/v129-authoring.cjs
```

Gerçek Calc pano testi için ayrı, geçici kullanıcı profiliyle LibreOffice'i başlatın; kendi açık ofis oturumunuzu kullanmayın:

```sh
libreoffice -env:UserInstallation=file:///tmp/v129-libreoffice --headless --accept='socket,host=127.0.0.1,port=20129;urp;StarOffice.ComponentContext' --norestore --nodefault --nofirststartwizard
```

Başka terminalde UNO modülü bulunan Python ile `python3 tests/e2e/v129-calc-clipboard.py` çalıştırın. Script 5×5, 90×1, 90×8 ve çok satırlı hücre seçimlerinin gerçek HTML/plain-text transferlerini anonim verilerle `/tmp/v129-evidence/calc-clipboard.json` dosyasına yazar.

```sh
python3 tests/e2e/v129-workflow.py
node tests/e2e/v129-exports.cjs
python3 tests/e2e/v129-hero.py
```

Workflow gerçek admin/bayi giriş formlarını kullanır; hazır token ile girişi atlamaz. Excel/elle giriş, 90 soruluk toplu kayıt, gerçek tarayıcı panosu ve Ctrl+V/Ctrl+Z/Cmd+Z işleyicisi, 7108/Özdebir değerlendirmesi ve indirme düğmeleri doğrulanır. `v129-exports.cjs` 199 öğrencinin XLSX verilerini snapshot'larla karşılaştırır; eksik oturum hücreleri boş kalmalıdır. PDF metni `pdftotext`, sayfaları `pdftoppm` ile kontrol edin. Hero testi yedi genişlik/iki tema ve hareket tercihlerini sınar; FPS ölçümü yalnız tanısaldır.

`v128-ui.py`, `v128-covers.py` ve `v128-security.cjs` bu sürümde de regresyon olarak çalıştırılır. Uzun UI koşumları kaynak sınırlı ortamda `V128_UI_WIDTHS=320,375,390` ve `V128_UI_WIDTHS=768,1024,1280,1920` gruplarıyla yürütülebilir; varsayılan yine yedi genişliktir. Grupların JSON sonuçlarını ayrı saklayın. Microsoft Excel uygulamasından kopyalama, macOS yerel Cmd+V ve gerçek Google doğrulaması bu yerel koşumlarla doğrulanmış sayılmaz.

Kabul çıktıları `/tmp/v129-evidence/` altındadır; seed/token dosyalarını paylaşmayın. Bu test derlemesi gerçek HTTPS API/public anahtarlarla yeniden build alınmadan canlıya taşınmaz.

## v1.3.5 izole kabul

`tests/e2e/v135-http.cjs` ve `v135-serve.cjs` yalnız `postgresql://ks135@127.0.0.1:55445/ks_v135` kabul eder; ortamda başka DATABASE_URL varsa durur. Yeni, boş ve yalnız bu koşuma ait PostgreSQL üzerinde migration zincirini uygulayın. HTTP betiği sentetik kayıtlar oluşturur, yalnız test DB rate sayaçlarını temizler ve rollback deneyi için geçici test trigger'ı kullanır. Üretimde çalıştırılmaz.

1. `node --import tsx tests/e2e/v135-http.cjs`
2. Web'i `NEXT_PUBLIC_API_URL=http://localhost:4015` ile build edin.
3. `node --import tsx tests/e2e/v135-serve.cjs` ve Web'i `npm run start -w @optik/web -- -p 3115` ile başlatın.
4. `python3 tests/e2e/v135-ui.py`

Kod/tanıtım için gerçek öğrenci verisi kullanılmaz. `test-results/v135` yerel, Git dışında kabul kanıtıdır; `ui-seed.json` sentetik oturum token'ları içerir ve paylaşılmaz. UI koşumu mağaza görünürlüğünü yalnız test DB'de değiştirir, sonunda kapatır. İş sonunda yalnız bu koşumun servislerini ve test konteynerini durdurun.

## v1.3.5 son kalite düzeltmeleri (v136 QA betikleri)

Yukarıdaki **yalnız izole** `ks135@127.0.0.1:55445/ks_v135` PostgreSQL ortamı kullanılır. Başka `DATABASE_URL` kabul edilmez. Önce `v135-http.cjs` ile yerel temel fixture'ları oluşturun; canlı API/DB kullanmayın. Migration eklenmez.

```sh
npm test
node --import tsx tests/e2e/v135-http.cjs
QA_PHASE=final node --max-old-space-size=256 --import tsx tests/e2e/v136-http.cjs
NEXT_PUBLIC_API_URL=http://localhost:4015 npm run build
```

API: `node --max-old-space-size=256 --import tsx tests/e2e/v135-serve.cjs`; Web: `npm run start -w @optik/web -- --hostname 127.0.0.1 -p 3115`. Ardından sırayla:

```sh
python3 tests/e2e/v136-ui.py
python3 tests/e2e/v136-visual-details.py
python3 tests/e2e/v136-api-memory.py
```

Python Playwright/Chromium gerekir; üretim bağımlılığı değildir. HTTP testi 4.995 sentetik 7108 kaydını arşivler, tahmin eder, değerlendirir, sonuç/sıralamayı açar; 2 MB/5.001 retlerini ve gerçek PostgreSQL trigger hatasıyla transaction rollback'ini kontrol eder. Yapay cevap anahtarı her koşumda farklıdır; biriken test katalogları eşit öneriler oluşturmaz. Bellek testi ayrı süreçteki API'nin Linux `/proc` RSS/HWM değerlerini ölçer. Tek süreçli HTTP koşumunun RSS değeri, test istemcisinin JSON belleğini de içerir.

Görsel test dört genişlik/iki tema, bütün sahnelerin tekrar/durdurma/görünürlük ve çubuk senkronunu, gerçek tarayıcıyla yükleme/öneri/kaydı doğrular. Ek görsel kontrol doluş renklerini, en az 4.5:1 metin kontrastını ve optik formdaki doğru/yanlış renklerini ölçer. Sonuçlar ve ekran görüntüleri `test-results/v136` altındadır; `*-seed.json` test oturumlarını paylaşmayın.

CPU karşılaştırması için yalnız yerelde `node --import tsx tests/e2e/v136-parser-baseline.cjs` eski okuyucuyu, `QA_READER=current node --import tsx tests/e2e/v136-parser-baseline.cjs` güncel okuyucuyu çalıştırır. Eski okuyucu bu dosyada yaklaşık iki dakika CPU kullanır; canlı sunucuda çalıştırmayın. Ayrıntılar: `docs/v135-quality-followup.md`. İş sonunda yalnız kendi yerel API/Web süreçlerinizi ve test konteynerinizi durdurun. Yerel API adresiyle oluşmuş Web build'ini canlıya taşımayın.

Yalnız API tahmin/kayıt değişikliğinden sonra kısa tarayıcı regresyonu: `V136_UPLOAD_ONLY=1 python3 tests/e2e/v136-ui.py`. Bu koşum beş yükleme kontrolünü `ui/checks-upload.json` dosyasına yazar; tam animasyon kabulünün yerine geçmez ve önceki `ui/checks.json` dosyasını ezmez.

## v1.3.7

Yalnız bu koşuma ait yeni PostgreSQL 16 konteyneri ve `postgresql://ks135@127.0.0.1:55445/ks_v135` sentetik adresi. Eski test DB/kullanıcı verisini yeniden kullanmayın. Yeni migration zincirini yalnız bu boş test DB’ye uygulayın.

- `node --import tsx tests/e2e/v135-http.cjs`: önceki 14 HTTP/DB regresyonu.
- `node --import tsx tests/e2e/v137-http.cjs`: eski bayi snapshot’ı, edit/koruma, merge A/B, rol/oyun/flag/arama/audit/temsil kabulleri; sentetik UI seed oluşturur.
- `QA_PHASE=v137 node --max-old-space-size=256 --import tsx tests/e2e/v136-http.cjs`: 4.995 gerçek HTTP/rollback koşumu.
- `node --max-old-space-size=512 --import tsx tests/e2e/v137-capacity.cjs`: 8 TXT boyutu ve 100/300/500/1000 farklı sentetik öğrenci oturumu; kullanıcı/API aynı süreç ölçülür. Canlıda çalıştırılmaz, hosting kapasitesi sayılmaz.
- Web’i `NEXT_PUBLIC_API_URL=http://localhost:4015 npm run build` ile üretin; API için `v137-serve.cjs`, Web için `NEXT_PUBLIC_API_URL=http://localhost:4015 API_INTERNAL_URL=http://127.0.0.1:4015 npm run start -w @optik/web -- --hostname 127.0.0.1 -p 3115`.
- `python3 tests/e2e/v137-ui.py`: gerçek Chromium, tema/kontrast, SVG fazları, ekran dışı pause, yayıncı düğmesi, eski sonuç editörü, owner/ziyaretçi 404.

Kanıtlar `test-results/v137`; seed/token dosyaları paylaşılmaz. İş sonunda yalnız kendi test servislerinizi ve `ks-v137-test` konteynerini durdurun. Bu localhost Web build’i canlıya taşınmaz.


### v1.3.7 karne logosu eki

Aynı izole sentetik DB’de logo migration’ını uyguladıktan sonra `node --import tsx tests/e2e/v137-report-logo.cjs` çalışır. Yeni sahte kurum/sınav/diğer bayi fixture’ları oluşturur; logo kaydetme, kurum/sınav izolasyonu, gerçek PDF, devre dışı bırakma ve sonuç snapshot’ını koruma denetimleri yapar. Seed, `test-results/v137/report-logo/ui-seed.json` içindedir; paylaşılmaz.

Web’i yerel4015 API ile build/start ve `v137-serve.cjs` ile API’yi başlattıktan sonra `python3 tests/e2e/v137-report-logo-ui.py` gerçek bayi arayüzünde yükleme/kaydetme/PDF indirme, mobil/tema ve kalıcılığı doğrular. `tests/v134.test.ts` geniş/dik/kare logoları ve hatalı görsel retlerini de içerir. Poppler çıktıları ve sentetik PDF’ler test-results altında; kullanıcının mevcut PDF’leri değiştirilmez. İş sonunda kendi servis/konteynerlerinizi durdurun.

## v1.4.2: geçici PostgreSQL ve gerçek Chromium kabulü

`tests/e2e/v142-env.cjs` yalnız **127.0.0.1:55452 / ks_v142_acceptance** adresini kabul eder; farklı bir `DATABASE_URL` ile çalışmayı reddeder. Üretim veritabanına bağlanmaz. Bu adreste ayrı, silinebilir bir PostgreSQL 16 test ortamı hazırlayın; mevcut migration zincirini yalnız bu test veritabanına uygulayın. Test ortamı parolası/kayıtları sentetiktir; üretim yapılandırmasına kopyalamayın. Yeni şema migration'ı yoktur.

- `NEXT_PUBLIC_API_URL=http://localhost:4022 npm run build -w @optik/web`
- `node tests/e2e/v142-browser.cjs`: yeni sentetik fixture'lar ve HTTP kontrolleri; ardından localhost API 4022 / Web 3122, Chromium masaüstü/tablet/mobil ve tema/menü/rapor/FMT/PDF/bayi dönüşü; kendi başlattığı sunucuları kapanışta sonlandırır.
- `node --import tsx tests/e2e/v142-http.cjs`: yalnız yeni API kabulü; tek başına yerel geçici port açar ve kapatır.
- `KS_QA_PROFILE=v142 node --import tsx tests/e2e/v132-security.cjs`: mevcut kapsamlı yetki/oturum/değerlendirme paketi aynı izole DB'de, 4024 portunda. 429 iş korumasından sonra yeniden gönderilen isteğin de kota sınırını aşamadığı doğrulanır; koruma gevşetilmez.
- `KS_QA_PROFILE=v142 node --import tsx tests/e2e/v141-http.cjs`: öğrenci/veli/analiz/asistan/karne regresyonu aynı izole DB'de. Bu iki eski dosyada varsayılan v132/v141 test adresleri korunur; alternatif profil de sabit localhost adresidir.
- `npm run check:static -- --with-build`: public ve derlenmiş Next statik dosyaları için salt okunur izin denetimi.

Birim/regresyon: `npm test`. `test-results/v142` ekran görüntüleri, sentetik indirmeler ve JSON kabul kayıtlarını içerir. `ui-seed.json` **yalnız sentetik test oturumları** içerir, `.gitignore` kapsamındadır ve paylaşılmamalıdır. Tarayıcı testleri localhost dışındaki HTTP(S) isteklerini engeller. Test build'i üretim artifact'ı değildir. Çıktıları önceki sürüm test klasörleri veya gerçek kullanıcı dosyalarıyla karıştırmayın.


## v1.4.5: planlayıcı, menü ve çıktılar (DB gerekmez)

```sh
KS_LOW_RESOURCE_BUILD=1 NEXT_PUBLIC_API_URL=http://localhost:4045 node node_modules/next/dist/bin/next build apps/web
NEXT_PUBLIC_API_URL=http://localhost:4045 node node_modules/next/dist/bin/next start apps/web --hostname 127.0.0.1 --port 3145
```

Ayrı terminalde `python3 tests/e2e/v145-ui.py` çalıştırın. Chromium/Playwright gerekir. Tarayıcı localhost:4045 API yanıtlarını sentetik hesap/boş katalogla karşılar; API sunucusu, gerçek oturum veya veritabanı gerekmez. Dış ağ engellenir. Gerçek sürükleme/taşıma/süre/çakışma, mobil dokunma, yerel kayıt, dolu 336 kartlık haftanın üç indirmesi, menü durumu/klavye/hareket ve ana sayfa bağlantısı test edilir. Kanıtlar `test-results/v145` altındadır. İş sonunda kendi Web önizlemenizi durdurun. Bu localhost derlemesi canlıya taşınmaz.

`npm run test:v145` plan modeli ile yalnız geçici dosya sistemleri ve localhost HTTP üzerinde dağıtım/doğrulama senaryolarını çalıştırır. Veridyen, Passenger veya Neon’a erişmez. Canlı yayın ve NPROC ölçümleri için `docs/v145-manual-deployment.md` kullanın.


## v1.4.6: destek ve geçici erişim (yalnız yeni test DB)

Yeni, silinebilir PostgreSQL 16 konteynerini `127.0.0.1:55466` üzerinde kullanıcı `ks146`, sentetik parola `synthetic-v146-local-only`, veritabanı `ks_v146_acceptance` ile hazırlayın. Mevcut kullanıcı/üretim DB'sini kullanmayın. Migration zincirini yalnız bu yeni veritabanına uygulayın ve Prisma Client'ı yerelde üretin:

```sh
DATABASE_URL=postgresql://ks146:synthetic-v146-local-only@127.0.0.1:55466/ks_v146_acceptance node node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma
DATABASE_URL=postgresql://ks146:synthetic-v146-local-only@127.0.0.1:55466/ks_v146_acceptance node node_modules/prisma/build/index.js generate --schema apps/api/prisma/schema.prisma
npm run test:v146
```

HTTP testi kendi geçici localhost sunucusunu açar/kapatır, gerçek Prisma/veritabanı işlemleri ve test saati kullanır. `v146-env.cjs` farklı DB adresini reddeder. Yeni fixture hesapları üretir; `test-results/v146/ui-seed.json` yalnız sentetik oturum/kod/bağlantı içerir ve paylaşılmaz.

Üretim Web'i `NEXT_PUBLIC_API_URL=http://localhost:4046 KS_LOW_RESOURCE_BUILD=1 node node_modules/next/dist/bin/next build apps/web` ile üretin. Ayrı terminallerde `node --import tsx tests/e2e/v146-serve.cjs` ve `NEXT_PUBLIC_API_URL=http://localhost:4046 node node_modules/next/dist/bin/next start apps/web --hostname 127.0.0.1 --port 3146` açın; ardından `python3 tests/e2e/v146-ui.py`. Yeni UI koşumu için önce HTTP testini yeniden çalıştırarak yeni tek kullanımlık bağlantı ve okunmamış bildirim fixture'ları oluşturun. Dış tarayıcı ağı engellenir. Test sonunda yalnız kendi servislerinizi ve v146 test konteynerinizi durdurun. Localhost Web build'i canlıya taşınmaz; gerçek yayın için `docs/v146-manual-deployment.md` kullanılır.


## Mobil menü ve simge şeridi

DB gerekmez. `NEXT_PUBLIC_API_URL=http://localhost:4046 KS_LOW_RESOURCE_BUILD=1 npm run build -w @optik/web` ile yerel build üretin; `NEXT_PUBLIC_API_URL=http://localhost:4046 npm run start -w @optik/web -- --hostname 127.0.0.1 --port 3146` ile açın. Ardından `python3 tests/e2e/mobile-menu.py` çalıştırın.

Test 4046 API yanıtlarını tarayıcıda sentetik hesaplarla karşılar, dış HTTP(S) trafiğini engeller. Dokunmatik 320/390/768/844 görünümler, iki tema, aç/kapat/araç seçimi, touchStart/touchMove/touchEnd ile kapanış sonrası kaydırma, katman ve odak temizliği, azaltılmış hareket, masaüstü genişliği ve rol filtreleri denetlenir. Kanıtlar `test-results/mobile-menu` altındadır; ayrıntılar `docs/mobile-menu-fix.md`. Fiziksel telefon testi değildir. İş sonunda yalnız kendi localhost Web sürecinizi kapatın; yerel API adresiyle oluşan build canlıya taşınmaz.

## Öğrenci girişi, değerlendirme ve ana sayfa kabulü

`tests/e2e/student-evaluation-env.cjs` yalnız `127.0.0.1:55476/ks_student_evaluation` sentetik PostgreSQL adresini kabul eder. Yeni, silinebilir PostgreSQL 16 ortamı `ksqa` kullanıcısı ve `synthetic-local-only` test parolasıyla hazırlanır. Mevcut migration zincirini yalnız bu yeni test DB’sine uygulayın; yeni şema veya bağımlılık eklenmemiştir.

```sh
DATABASE_URL=postgresql://ksqa:synthetic-local-only@127.0.0.1:55476/ks_student_evaluation node node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma
node --import tsx tests/e2e/student-evaluation-http.cjs
KS_LOW_RESOURCE_BUILD=1 NEXT_PUBLIC_API_URL=http://localhost:4076 npm run build -w @optik/web
```

Ayrı terminallerde `node --import tsx tests/e2e/student-evaluation-serve.cjs` ve `NEXT_PUBLIC_API_URL=http://localhost:4076 npm run start -w @optik/web -- --hostname 127.0.0.1 -p 3176` çalıştırın; ardından `python3 tests/e2e/student-evaluation-ui.py`. HTTP testi gerçek Prisma/HTTP, yeni sentetik kayıtlar, 555/678 ekleme-güncelleme, tekrar yükleme, kurum/öğrenci izolasyonu, kontrollü geç transaction hatası ve güvenli tanılama kullanır. UI testi ilk kurum listesini gerçek API’den alır; boş/hata/eski yanıt senaryolarını ayrıca tarayıcıda denetler. Gerçek kişisel kod, öğrenci A/B ve veli parola girişi, PDF/asistan, 320/390/1440 genişlik, iki tema ve hareket tercihleri kapsanır. Dış tarayıcı HTTP(S) trafiği engellidir. Arka arkaya UI koşumlarında korumaları gevşetmeyin; kendi sentetik API sürecinizi yeniden başlatarak süreç içi test sayaçlarını sıfırlayın.

Kanıtlar `test-results/student-evaluation` altındadır. `ui-seed.json` yalnız sentetik oturum/parola/kod içerir ve paylaşılmaz. Localhost Web derlemesi yayın paketi değildir. İş sonunda yalnız kendi API/Web süreçlerinizi ve test konteynerinizi kapatın. Manuel GitHub → cPanel akışı değişmemiştir.


## v1.4.8: öğrenci erişimi, kod yönetimi ve tanıtımlar

Yalnız bu görev için oluşturulan yeni, silinebilir PostgreSQL 16 ortamı: `127.0.0.1:55478/ks_v148_acceptance`, kullanıcı `ksqa`, sentetik parola `synthetic-local-only`. `v148-env.cjs` başka `DATABASE_URL` kabul etmez. Canlı Neon/veri kullanılmaz.

```sh
DATABASE_URL=postgresql://ksqa:synthetic-local-only@127.0.0.1:55478/ks_v148_acceptance node node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma
DATABASE_URL=postgresql://ksqa:synthetic-local-only@127.0.0.1:55478/ks_v148_acceptance node node_modules/prisma/build/index.js generate --schema apps/api/prisma/schema.prisma
node --import tsx tests/e2e/v148-http.cjs
KS_LOW_RESOURCE_BUILD=1 NEXT_PUBLIC_API_URL=http://localhost:4078 API_INTERNAL_URL=http://127.0.0.1:4078 npm run build -w @optik/web
node tests/e2e/v148-browser.cjs
```

HTTP kabulü gerçek Express/Prisma ve transaction işlemleriyle numara/kurum/yayın sınırlarını, 16/24 karakterli kodları, tek öğrenci kod oluşturma/yenileme/iptalini, rol/kurum izolasyonunu ve Excel/PDF yenileme/oturum kapanmasını sınar. Rollback deneyi yalnız geçici test DB’sinde trigger kullanır. Fixture’lar sentetiktir; gerçek kullanıcı kodu yazılmaz.

Tarayıcı çalıştırıcısı localhost:4078 API ile üretim Web’i localhost:3178 üzerinde kendisi açar ve sonunda kapatır. Python Playwright + Chromium gerekir. `v148-ui.py` gerçek yönetim/öğrenci akışlarını, kontrollü gecikmiş kurum listelerini, 320/390/1440 iki tema, hareket/durdurma/yeniden oynatmayı, görsel hatası yedeğini ve HTTP sitemap/robots/asset yanıtlarını doğrular. `v148-evaluation-ui.py` gerçek panel kontrollerinde yalnız preview/evaluate yanıtlarını sentetik olarak değiştirerek sıfır uyarı, gerçek uyarı ve başarısız işlemi ayırır. Son olarak API kapalıyken sitemap HTTP fallback’i denenir. Tüm dış tarayıcı ağı engellenir.

Kanıtlar `test-results/v148` altındadır. `ui-seed.json`, yönetim ekran görüntüleri ve kod indirmeleri sentetik erişim bilgisi içerir; paylaşılmaz, Git dışındadır. Önceki `student-evaluation-ui.py` eski giriş/animasyon kabulüne aittir; güncel davranış için v148 koşumunu kullanın. Yerel API adresiyle oluşan build canlıya taşınmaz. Manuel yayın adımları: `docs/v148-release-report.md`.
