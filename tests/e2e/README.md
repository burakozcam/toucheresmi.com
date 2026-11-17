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
