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
