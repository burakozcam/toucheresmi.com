# Altyapı yol haritası · v1.2.7

15 Kasım 2026. Bu belge bir geçiş planıdır. Veridyen cPanel, DNS, Cloudflare ve Neon hesabı değiştirilmedi. Ölçülmüş bir kapasite veya performans kazancı beyanı yoktur.

## Mevcut durum ve güvenli değişiklikler

Next.js Web, Express API, Prisma 6/PostgreSQL ve özel dosya deposu korunur. Web'in kullanıcıya özel sayfalarına `private, no-store` ve `noindex` başlıkları eklendi. API cevapları varsayılan olarak `private, no-store` alır. Next.js bazı Cache-Control başlıklarını kendisi yönetebilir; CDN geçişinde aşağıdaki bypass kuralları ayrıca zorunludur. Prisma geliştirme hot reload sırasında global tek istemciyi kullanır. Bu bir bağlantı havuzu ölçümü değildir.

## Cloudflare CDN, proxy ve TLS

1. Mevcut DNS kayıtlarını, MX/SPF/DKIM/DMARC kayıtlarını ve TTL değerlerini dışa aktarın. cPanel sertifikasını, API CORS origin'ini, gerçek depolama yolunu ve erişim izinlerini kaydedin. Önce ayrı test alan adı kullanın.
2. Alan adı sahibinin onayıyla nameserver geçişi planlayın. Sertifikayı doğruladıktan sonra Full (strict) TLS seçin. SSL/DDoS hizmeti sağlayıcının hesabında doğrulanmadan kurulmuş sayılmaz.
3. Önbelleği öncelikle içerik hash'i taşıyan `/_next/static/`, statik CSS/JS/font ve herkese açık görsellerle sınırlandırın. Kullanıcı avatarı veya özel dosyayı uzantısına bakarak public cache'e almayın. `Cache Everything` kullanmayın.
4. `/api/*`, `/panel*`, `/login*`, `/hesap-kur*`, `/sonuclar*`, `/sonuclarim*`, `/fmt-paylasim*`, `/dosya-paylasim*`, Authorization içeren istekler, özel tokenlı sorgular ve tüm POST/PATCH/DELETE isteklerinde **bypass cache** uygulayın. Private/no-store başlıklarına uyun. Yetkili ve yetkisiz iki ayrı tarayıcıyla içerik ve `CF-Cache-Status` denetleyin.
5. Origin doğrudan erişimini ve proxy kaynaklarını doğrulayın. API bugün forwarded IP başlıklarına güvenmez; ortak proxy IP'si hız limitlerini topluca etkileyebilir. `trust proxy=true` eklemeyin. Yalnız doğrulanmış proxy ağları ve ağ erişim kuralıyla IP güven zinciri kurun. Bu testten önce canlı proxy açmayın.
6. Geri dönüş için eski DNS kayıtlarını ve origin sertifikasını koruyun. Geçiş sonrası hesap, TXT yükleme, özel PDF, CORS ve süre/iptal paylaşım testlerini çalıştırın.

## Neon PostgreSQL ve Prisma

- Canlı bağlantı dizgesi incelenmedi; havuzun etkin olduğu veya bağlantı sınırının yeterli olduğu iddia edilmez. Operatör Neon panelinde endpoint'in pooled olup olmadığını denetlemelidir. Uygulamanın `DATABASE_URL` değişkeni için Neon'un verdiği pooled URL'yi kullanın; TLS ve parametreleri sağlayıcının önerisine göre koruyun.
- `DIRECT_URL` örneği migration operatörüne ayrılmıştır. Mevcut Prisma şeması geriye uyumluluk için hâlâ `DATABASE_URL` kullanır; **DIRECT_URL otomatik okunmaz**. Migration oturumunda `DATABASE_URL`'yi geçici olarak onaylı direct URL'ye ayarlayın. Havuzlanan çalışma URL'sini ayrı tutun. Shell ve PowerShell değişken atama sözdizimleri farklıdır; URL'leri komut geçmişine yazmayın.
- `prisma generate` veritabanı şemasını değiştirmez. `migrate dev`, `reset`, `db push` ve `seed` canlıya uygulanmaz. Bu sürümde yeni migration yoktur; v1.2.6 ve önceki bekleyen migration'lar için yalnız yedek/onay sonrası `migrate deploy` uygulanır.
- Her worker ayrı havuz oluşturur. Worker sayısı × bağlantı sınırı ile web/API/operatör bağlantılarının toplamını Neon kotası içinde bütçeleyin. Havuz bekleme süresi, aktif/boş bağlantılar, sorgu p95/p99 ve hata oranını ayrı ölçün. Ölçmeden `connection_limit` artırmayın.
- Yerel/test API, localhost dışı DB'yi varsayılan olarak reddeder. Ayrı bir uzak test DB'si gerekiyorsa yalnız o ortam için `ALLOW_REMOTE_DATABASE=true` kullanılabilir; canlı DB adresini testlere vermeyin.

## HTML karne ve PDF maliyeti

Mevcut HTML karne, `Ekranı yazdır` ve sunucu PDF indirmesi korunur. Yeni analitik izin kutusu baskıda gizlenir. Karne incelemesinde HTML'i, bireysel arşivlemede tarayıcının PDF olarak kaydet seçeneğini tercih edin. Mevcut kazanım/şablonlu PDF indirmesi kaldırılmaz. Toplu sunucu PDF işi için kuyruk, kullanıcı başına eşzamanlı iş sınırı, zaman aşımı ve kontrollü geçici dosya temizliği planlayın. PDF cache anahtarına sonuç revizyonu, anahtar profili, şablon, dil ve yetki kapsamı dahil edilmeden çıktı paylaşmayın.

## VPS, PM2 ve merkezi durum

cPanel/Passenger mevcut başlangıç yöntemi olarak kalır; PM2 paylaşımlı hosting için zorunlu değildir. VPS denemesinde önce tek API worker ve tek Web süreciyle başlayın. PM2 cluster API için test edilebilir; uygulama yalnız CPU çekirdeği sayısına bakarak çoğaltılmaz.

Cluster önkoşulları: merkezi Redis hız limiti/iş kuyruğu, paylaşılan dosya deposu, tek görev zamanlayıcı lideri, ortak sırlar ve tutarlı saat. Bugünkü rate limit, CAPTCHA tekrar engeli ve bazı trafik tamponları süreç belleğindedir. Google'ın tek kullanımlık token doğrulaması sürse de yerel sayaçlar cluster genelinde birleşmez. Redis `SET NX` + TTL ile token hash'lerini ve limitleri merkezileştirin; ham token saklamayın. Job tekrarlarını idempotent tasarlayın; işlere yalnız özel depo referansı verin. Çok worker'a geçmeden bu kabulü tamamlayın.

`STORAGE_DIR` canlıda mutlak olmalıdır: Linux `/srv/kurumsal-sinav/storage`, Windows geliştirmede `C:/kurumsal-sinav/storage`. Mevcut canlı yol kendiliğinden taşınmaz. Dosyalar public web kökünün dışında, en az yetkiyle tutulur. VPS'ler arasında nesne deposu veya ortak özel dosya sistemi; upload metadata ve job durumları merkezi DB'de tutulmalıdır.

## Yedekleme, geri yükleme ve izleme

Her gün, ayrıca migration öncesi, PostgreSQL `pg_dump --format=custom` ve dosya deposunun tutarlı yedeğini alın. TXT_STORAGE_KEY/JWT_SECRET gibi çözme sırlarının geri yüklenebilirliğini ayrı güvenli sır deposunda sağlayın. Şifreli harici depoya aktarın; anahtarları yedekle aynı yerde tutmayın. Kurumun saklama/silme politikasıyla günlük/haftalık/aylık süreleri belirleyin. Yedeklerin kişisel veri olduğunu unutmayın.

Aylık ayrı test DB'si ve ayrı STORAGE_DIR üzerinde `pg_restore` + dosya geri yükleme provası yapın. Satır/dosya sayısı, özel TXT çözme, örnek karne ve erişim izolasyonunu doğrulayın; gerçek öğrenci örneklerini loglamayın. RPO/RTO hedeflerini kurum belirlemeli, süreler provada ölçülmelidir.

CPU, RSS/heap, event loop gecikmesi, DB havuz beklemesi, API p95/p99, 429/5xx, disk doluluğu, PDF kuyruğu, yedek yaşı ve sertifika bitişini izleyin. Alarm eşiklerini ilk yük testinin taban ölçümüne göre koyun. URL tokenı, TC, öğrenci adı ve cevapları gözlemleme servislerine göndermeyin.

## 100 / 500 / 1.000 / 10.000 eşzamanlı kullanıcı planı

Yalnız izole staging, sentetik kurum/öğrenciler ve ayrı DB/depo kullanın. Her seviyede ısınma, kademeli artış, sabit yük ve soğuma uygulayın. Bir oturum yalnız tek HTTP isteği değildir: giriş, liste, HTML karne, sınıf analizi ve sınırlı PDF indirmesi içeren gerçekçi beklemeli senaryolar hazırlayın. 100 → 500 → 1.000 → 10.000 seviyelerine önceki seviye sağlıklıyken ilerleyin. Üretim reCAPTCHA kotasını tüketmeyin; yalnız test ortamında izole sağlayıcı taklidi kullanın.

Her seviyede throughput, aktif oturum/bağlantı, p50/p95/p99, 429/5xx, CPU/RAM, DB sorgu ve havuz beklemesi, kuyruk gecikmesi ve PDF süresini kaydedin. Sürekli hata/bağlantı doygunluğunda testi durdurun. Kabul eşiklerini ürün/SLA sahibi testten önce belirlesin. Bu sürümde bu dört yük testi **çalıştırılmadı**, kapasite garantisi yoktur.

## GitHub deployment

Önerilen sıra: PR → sır taraması + anonim regresyonlar + Linux/Windows Node 22 CI → API/Web build → staging dağıtımı → yalıtılmış entegrasyon ve tarayıcı kabulü → üretim environment onayı → yedek → gerekiyorsa yalnız onaylı migration → immutable sürüm klasörü/atomik geçiş → health/smoke → geri dönüş. Çalışan canlı pipeline oluşturulmadı. Deploy anahtarı ve sırlar GitHub Environment secret olarak yönetilmeli; build artifact'ına .env, gerçek TXT/PDF, özel depo ve loglar alınmamalı. Sonuçların eski revizyonları geri dönüşte korunmalıdır.

## Google ve PageSpeed hazırlığı

Search Console doğrulaması için `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, GA4 için `NEXT_PUBLIC_GA4_ID` ayrılmıştır. Gerçek hesap/kimlik yoksa servis etkin değildir. GA4 ayrıca `NEXT_PUBLIC_GA4_APPROVED=true` ve tarayıcıda analitik izni gerektirir; önce GA hesabında Enhanced Measurement, otomatik form/history/click ve kullanıcı sinyallerini kapatıp ağ yüklerini denetleyin. Kod yalnız sabit public yol için elle page_view üretir, referrer'ı temizler. Özellikle belge/optik araçlarında form/DOM toplama etiketleri kullanmayın.

`NEXT_PUBLIC_GTM_ID` rezerv alandır; **GTM çalıştırıcısı eklenmedi**. Denetlenmemiş bir container serbest kod çalıştırabilir ve öğrenci DOM/URL verisini toplayabilir. Container, rıza ve kişisel veri denetimi tamamlandıktan sonra yalnız onaylı public sayfalara kontrollü yükleyici eklenmelidir; GA4 ile çifte sayımı önleyin. Bu, kurulmuş GTM hesabı anlamına gelmez.

Sitemap public sabit sayfalar ile yayımlanmış cevap anahtarı/blog uçlarını kullanır; API yoksa statik liste döner. Robots özel yolları dışlar; robots erişim kontrolü değildir. Search Console'da sitemap gönderimi hesap sahibinin işlemidir. PageSpeed/Lighthouse ölçümlerini public URL ve sentetik oturumla mobil/masaüstü olarak en az üç kez alın; LCP/INP/CLS ve ilk JS boyutlarını kaydedin. Özel öğrenci URL'sini Google testlerine göndermeyin. Canlı PageSpeed ölçümü yapılmadı.
