# Optik Okuma, Ölçme-Değerlendirme ve Raporlama Platformu

Multi-tenant optik okuma uygulamasının başlangıç monoreposu.

## Önerilen teknoloji seti

- **Backend:** Node.js 20+, TypeScript, Express, Zod. Başlangıçta anlaşılır REST API; büyüdükçe modüller NestJS'e taşınabilir.
- **Frontend:** Next.js App Router ve React. Yönetim panelleri ve herkese açık başvuru sayfaları aynı uygulamada.
- **Veritabanı:** PostgreSQL ve Prisma ORM. Kurum/bayi ilişkileri ve veritabanı migrasyonları için uygundur.
- **Kimlik doğrulama:** bcrypt parola özeti ve imzalı JWT. Rol seçimi arayüz kolaylığıdır; yetki API tarafında kullanıcı kaydından doğrulanır.
- **Dosya yükleme:** İleride API'de Multer/Busboy ve S3 uyumlu nesne depolama; ham TXT dosyaları web kökünde tutulmamalıdır.
- **PDF:** İlk tercih HTML şablonlarını PDF'e dönüştürmek için Playwright. Basit belge/etiketlerde pdfmake alternatif olabilir.
- **Test ve kalite:** Vitest/Jest, Supertest, ESLint, Prettier; CI'da migration ve test adımları.

## Başlangıç

1. Node.js 20+ ve PostgreSQL 16+ kurun.
2. `cp .env.example apps/api/.env` komutuyla API ortam dosyasını oluşturup bağlantı ve gizli anahtarı düzenleyin.
3. `npm install`
4. `npm run db:generate`
5. `npm run db:migrate`
6. `npm run db:seed` (ilk süper yöneticiyi oluşturur; şifre ortam değişkeninden alınır.)
7. Ayrı terminallerde `npm run dev:api` ve `npm run dev:web`.

API varsayılan olarak `http://localhost:4000`, web uygulaması `http://localhost:3000` adresindedir.
İletişim formunun otomatik e-posta gönderebilmesi için API `.env` dosyasında SMTP sağlayıcınızın `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` ve sağlayıcınızda doğrulanmış `SMTP_FROM` değerlerini ayarlayın. `CONTACT_EMAIL` varsayılanı `destek@kurumsalsinav.com` adresidir. SMTP parolalarını kod deposuna eklemeyin. Web farklı bir port veya domaindeyse API'deki `WEB_ORIGIN` değerini o adrese ayarlayın.

## Tek dosyalık önizleme

Ana dizindeki `index.html` dosyasını dosya yöneticisinden çift tıklayarak açabilirsiniz. Bu, giriş ve panel etkileşimleri olan bağımsız bir arayüz demosudur; Next.js uygulamasından ve backend/veritabanından bağımsızdır. Demo kullanıcı adı/şifresi `burak` / `burak` olarak ön yüzde bulunur; gerçek kullanıcılara açmayın.

Next.js iletişim formu API'deki `/api/contact` ucuyla SMTP üzerinden destek adresine e-posta gönderir; bunun çalışması için yukarıdaki SMTP ayarları gerekir. Tek dosyalık statik HTML demosu backend olmadan e-posta gönderemez; formu e-posta uygulamasında gönderime hazır bir taslak açar. Harita ve e-posta uygulaması için internet/açılış uygulaması gerekir.

Panel demosunda hesap ayarları, hafta sonları/resmî tatil işaretleri bulunan gezilebilir takvim, görsel arka planlı küçük bir kuş oyunu ve giriş sonrası Araçlar menüsünde Sınav Listesi Düzenleyici ile PDF/Excel araçları bulunur. Sınav listesi ve PDF/Excel araçları dosyaları tarayıcıda işler; Excel/PDF işlevleri için internet bağlantısı ve ilgili kütüphanelerin yüklenmesi gerekir. Kuş oyunu özgün ve hafif bir mini oyundur. Dini bayram tarihleri takvimde 2025–2030 aralığı için sabitlenmiştir; resmî tatil tarihleri üretim kullanımından önce doğrulanmalıdır.

## Mevcut temel

- Rol tabanlı oturum açma ve JWT ile korunan yönetici başvuru listesi.
- Bayi/okul başvurularının API üzerinden kaydedilmesi.
- Kullanıcı, bayi, okul, FMT alan eşlemesi, TXT yükleme işi, sınav, ders/cevap anahtarı ve optik kayıt Prisma modelleri.
- Ana sayfa, rol seçimi/oturum formu ve bayi/kurum başvuru formu.

Henüz eklenmesi gerekenler: gerçek kullanıcı/tenant yönetim CRUD'ları, FMT eşleme arayüzü ve satır ayrıştırıcı, TXT dosya doğrulama, puanlama motoru, raporlar/PDF, denetim kayıtları, hız sınırlama ve üretim dağıtım ayarları.

## Çok kiracılı erişim kuralı

İsteklerde tenant kimliği istemciden gelen değere göre yetkilendirilmemeli; doğrulanmış kullanıcının rolü ve `dealerId`/`schoolId` ilişkileri üzerinden kapsam belirlenmelidir. Süper yönetici tüm kurumlara erişebilir; bayi kendi okullarıyla, okul kullanıcısı yalnızca kendi okuluyla sınırlandırılmalıdır. Dosya işleme ve rapor uçları da aynı kapsam kontrollerini uygulamalıdır.
