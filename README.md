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
2. `cp .env.example apps/api/.env` komutuyla API ortam dosyasını oluşturup bağlantı, güçlü JWT anahtarı ve `ADMIN_EMAIL` / `ADMIN_PASSWORD` değerlerini düzenleyin. Admin parolası en az 12 karakter ve en fazla 72 UTF-8 bayt olmalıdır.
3. `npm install`
4. `npm run db:generate`
5. `npm run db:migrate`
6. `npm run db:seed` (ilk süper yöneticiyi oluşturur; admin bilgileri `.env` içindeki `ADMIN_EMAIL` ve `ADMIN_PASSWORD` değerlerinden alınır ve parola bcrypt ile hash'lenir.)
7. Ayrı terminallerde `npm run dev:api` ve `npm run dev:web`.

API varsayılan olarak `http://localhost:4000`, web uygulaması `http://localhost:3000` adresindedir. Web'in API adresini farklı bir ortamda `NEXT_PUBLIC_API_URL` ile belirtin. Giriş sayfasındaki **Üye ol** formuyla gönderilen üyelik talepleri varsayılan olarak `PENDING` durumundadır; yönetici onayı olmadan kullanıcı hesabı oluşturulmaz ve giriş yapılamaz. Süper yönetici panelindeki **Sistem Kullanıcıları → Üyeler** bölümünden talepler ve kayıtlı kullanıcılar listelenebilir, onaylanabilir, erişimleri kapatılabilir veya ilişkili kayıtlar izin verdiğinde silinebilir. Yönetici mevcut şifreleri göremez; yeni şifre belirleme isteği API'de bcrypt ile hash'lenerek kaydedilir. İncelenmiş başvuruların parola özetleri tutulmaz; bekleyen başvuruların parola özeti onay sırasında kullanıcı hesabına aktarılır. Admin e-posta ve ilk şifre yalnızca API `.env` dosyasındaki `ADMIN_EMAIL` ve `ADMIN_PASSWORD` değerlerinden seed edilir; gerçek değerleri kaynak koduna veya depoya eklemeyin. Yönetici tarafından kapatılan veya silinen hesapların mevcut JWT oturumları da sonraki API isteğinde geçersiz kılınır.
İletişim formunun otomatik e-posta gönderebilmesi için API `.env` dosyasında SMTP sağlayıcınızın `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` ve sağlayıcınızda doğrulanmış `SMTP_FROM` değerlerini ayarlayın. `CONTACT_EMAIL` varsayılanı `destek@kurumsalsinav.com` adresidir. SMTP parolalarını kod deposuna eklemeyin. Web farklı bir port veya domaindeyse API'deki `WEB_ORIGIN` değerini o adrese ayarlayın.

## v1.0.2 geliştirmeleri

v1.0.2; süper yönetici için yayınevi ve cevap anahtarı yönetimini, bayi kapsamlı kurum ekleme/listelemeyi ve sınav kayıt ekranını içerir. Kurum tekrarları normalize edilmiş kurum adı, il ve ilçe birlikte değerlendirilerek engellenir; aynı isim farklı il veya ilçelerde kullanılabilir. Benzer kayıt girişimleri otomatik hesap askıya alma yerine yönetici inceleme listesine alınır. Cevap anahtarlarının görünen yayın tarihi `publishedAt` alanında tutulur; kayıt oluşturulma zamanı korunur. Herkese açık cevap anahtarı detayları yalnızca yayımlanmış kayıtlardan üretilir.

`apps/api/prisma/migrations/20261106220000_v1_0_2_management` migration'ı mevcut kayıtları silmez veya sıfırlamaz. Eski kurumlara mevcut satırları korumak için benzersiz geçiş anahtarı verilir; cevap anahtarı yayın tarihi başlangıçta `createdAt` değerinden doldurulur. Üretim ortamında migration uygulanmadan önce yedek alınmalı, migration çıktısı incelenmeli ve ayrıca açık onay alınmalıdır. `migrate reset`, `db push` veya seed bu özellikleri yayımlamak için kullanılmamalıdır.

Web tarafında sürüm `apps/web/config/site.ts` üzerinden yönetilir. Yayımlanmış cevap anahtarı detay sayfaları, canonical/meta verileri, `robots.txt` ve `sitemap.xml` desteklenir. Yönetim ve giriş sayfaları indekslemeye kapalıdır. Doğrulanamayan kişi atıflı motivasyon alıntıları kullanılmamıştır; panel mesajları ayrı bir JSON dosyasında proje adına yazılmış özgün metinlerdir. Mevcut gizlilik politikası sayfası bulunmadığından footer'a böyle bir bağlantı eklenmemiştir.

## v1.0.3 geliştirmeleri

v1.0.3; sınav listesinde kampüs alanı olmadan derslik tanımlamayı, esnek Excel sütun eşleştirmeyi, kampüs/seans bazında kapasiteyi, sırayla veya dengeli dağıtımı, sabit/aynı/farklı derslik kurallarını ve yazdırılabilir yoklama çizelgelerini ekler. Yoklama çıktısı tarayıcının yazdırma ekranından **PDF olarak kaydedilir**; sunucu tarafında PDF dosyası saklanmaz. Excel ve öğrenci listeleri tarayıcıda işlenir.

İletişim mesajları artık SMTP yapılandırması olmasa da veritabanındaki yönetici gelen kutusuna kaydedilir. `SUPER_ADMIN` için `/api/admin/contact-messages`, `/api/admin/contact-messages/:id`, `/api/admin/audit-logs` ve `/api/admin/audit-log-users` API'leri eklendi. Başarılı yönetim değişiklikleri ve giriş denemeleri hassas istek gövdeleri kaydedilmeden denetim kayıtlarına alınır. Yayınevi silme ilişkili sınav, cevap anahtarı veya talep bulunursa engellenir.

Yeni veritabanı tabloları için `apps/api/prisma/migrations/20261107190000_v1_0_3_contact_audit` migration'ı eklendi. Migration mevcut tabloları veya kayıtları silmez. Üretime geçmeden önce yedek alın, migration SQL'ini ve gerçek veritabanı migration durumunu inceleyin; bu geliştirme kapsamında canlı migration veya deployment çalıştırılmamıştır. Optik TXT dönüşümü için örnek FMT/TXT kayıt dosyaları depoda bulunmadığından herhangi bir optik kayıt konumu/formatı tahmin edilmemiş ve dönüşüm desteği tamamlandı olarak sunulmamıştır.

## cPanel production dağıtımı

Web uygulamasındaki API istekleri `NEXT_PUBLIC_API_URL` üzerinden yapılır (giriş/kayıt, yönetici üyelik/kullanıcı işlemleri ve iletişim formu). Bu değişken Next.js build sırasında derlemeye gömüldüğünden canlı değeri build'den önce ayarlayın:

```sh
NEXT_PUBLIC_API_URL=https://api.kurumsalsinav.com npm run build
```

cPanel uygulama ortamında API için `WEB_ORIGIN=https://kurumsalsinav.com` ayarlayın. Değerde sondaki `/` olmamalıdır; API CORS yalnızca bu origin'e izin verir. API başlangıçta cPanel'in verdiği `PORT` değerini, yoksa `API_PORT` değerini (varsayılan `4000`) kullanır.

API ortamında en azından `DATABASE_URL`, `JWT_SECRET` (rastgele, en az 32 karakter), `WEB_ORIGIN` ve cPanel `PORT` sağlanmıyorsa `API_PORT` ayarlayın. Neon PostgreSQL bağlantı URL'sini sır olarak saklayın ve SSL kullanın (`sslmode=require`). Migration çalıştırırken Neon'un doğrudan (pooled olmayan) bağlantı URL'si tercih edilir. Web uygulamasına build esnasında `NEXT_PUBLIC_API_URL` verin. İsteğe bağlı e-posta değişkenleri için yukarıdaki SMTP bölümüne bakın. `.env` dosyalarını repoya yüklemeyin.

Monorepo kök dizininde (Node.js 20+, Linux/cPanel) temel dağıtım sırası:

**Üretim için bu örneği mevcut Neon ortamında doğrudan çalıştırmayın.** `20261106000000_publisher_answer_key_support` migration'ının geçmişte başarısız olduğu bildirildi. Önce `_prisma_migrations` ile tablo/enum durumunu salt okunur inceleyin; migration resolve veya deploy kararı için veritabanı sahibinin açık onayı gerekir. Canlıya yazan hiçbir komut bu çalışma kapsamında çalıştırılmamıştır.

```sh
npm ci
npm run db:generate
# Yalnızca yedekleme, migration durumu incelemesi ve açık onaydan sonra:
npm run db:migrate:deploy
# Seed yalnızca ilk yönetici hesabının ilk kurulumu için, ayrı onayla:
npm run db:seed
NEXT_PUBLIC_API_URL=https://api.kurumsalsinav.com npm run build
```

`npm run db:seed` yalnızca ilk yönetici hesabı için bir kez çalıştırılmalıdır; API ortamında `ADMIN_EMAIL` ve `ADMIN_PASSWORD` tanımlı olmalıdır. Parola en az 12 karakter ve en fazla 72 UTF-8 bayt olmalıdır. Seed mevcut e-posta kaydının parolasını değiştirmez. cPanel API uygulamasının başlangıç komutu `npm run start -w @optik/api` (`apps/api/dist/src/server.js`), Next.js web uygulamasının başlangıç komutu `npm run start -w @optik/web` (`next start`) olabilir; uygulama kök dizini, startup yöntemi ve port yönlendirmesi cPanel sağlayıcısının Node.js uygulama modeline göre ayarlanmalıdır. İki uygulama aynı monorepo kökünü kullanamıyorsa yalnızca `apps/api` veya `apps/web` klasörlerini ayırıp kopyalamak yerine workspace bağımlılıklarını ve build çıktısını birlikte dağıtacak bir düzen kurun.

Canlıya çıkış checklist'i:

- [ ] cPanel Node.js sürümü 20 veya üstü ve web uygulaması için Next.js SSR desteği doğrulandı.
- [ ] `api.kurumsalsinav.com` ve `kurumsalsinav.com` DNS/SSL sertifikaları etkin ve HTTPS üzerinden erişilebilir.
- [ ] Neon üretim veritabanı oluşturuldu; `DATABASE_URL` API uygulama ortamına eklendi, bağlantıda SSL etkin.
- [ ] API ortamında güçlü `JWT_SECRET`, `WEB_ORIGIN=https://kurumsalsinav.com` ve cPanel'in verdiği `PORT` ayarlandı.
- [ ] Web build'inde `NEXT_PUBLIC_API_URL=https://api.kurumsalsinav.com` kullanıldı.
- [ ] `npm ci`, `npm run db:generate`, `npm run db:migrate:deploy` ve `npm run build` başarıyla tamamlandı.
- [ ] İlk `npm run db:seed` API ortamındaki `ADMIN_EMAIL` / `ADMIN_PASSWORD` ile bir kez çalıştırıldı; sırlar loglarda veya repoda paylaşılmadı.
- [ ] API `https://api.kurumsalsinav.com/api/health` üzerinden `{"status":"ok"}` döndürüyor.
- [ ] Giriş, üyelik başvurusu, yönetici onayı ve panelde kullanıcı listesi canlı ortamda kontrol edildi.
- [ ] Tarayıcı geliştirici konsolunda CORS/HTTPS hatası yok; izin verilmeyen origin'lerden gelen istekler engelleniyor.
- [ ] SMTP kullanılacaksa canlı e-posta gönderimi doğrulandı; yedekleme ve log inceleme yöntemi belirlendi.

## Tek dosyalık önizleme

Ana dizindeki `index.html` dosyasını dosya yöneticisinden çift tıklayarak açabilirsiniz. Bu, giriş gerektirmeyen bağımsız bir arayüz önizlemesidir; kimlik doğrulama ve panel erişimi kapalıdır. Gerçek kayıt ve giriş için Next.js uygulamasını kullanın.

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
