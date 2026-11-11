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
