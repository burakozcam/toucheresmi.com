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
