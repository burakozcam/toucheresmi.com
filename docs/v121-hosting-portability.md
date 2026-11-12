# Kurumsal Sınav v1.2.1 RC — hosting ve taşınabilirlik

İnceleme: 12 Kasım 2026. Hesap bilgisi: kullanıcının bildirdiği **Veridyen Node.js Senior**. Hesaba, cPanel'e, Neon'a veya üretim sunucusuna giriş yapılmadı. Bu rapor paket araştırması ve kaynak kod incelemesidir; canlı kapasite ölçümü değildir. Hiçbir taşıma, yedekleme, DNS değişikliği veya yeniden başlatma yapılmadı.

## Hesap ve sınırlar

Senior.js için sağlayıcının yayımladığı değerler: 4 Core CPU, 4 GB RAM, 400.000 inode, 2 domain; disk ve trafik “limitsiz” olarak sunuluyor. Node.js 16–24, cPanel, CloudLinux/CageFS ve Passenger listeleniyor. Aylık ödeme örneği 192,90 TL; 36 aylık planda aylık eşdeğer 123,46 TL; KDV hariç. Bunlar mevcut faturanın veya hesaba uygulanan limitlerin ölçümü değildir. “Limitsiz”, kaynak sınırlarının olmadığı anlamına gelmez. [Veridyen paket bilgisi](https://www.veridyen.com/nodejs-hosting).

**Paylaşımlı hosting değerlendirmesi:** Senior.js bir Node.js web hosting ürünü; satın alınmış VPS olduğuna dair kanıt yok. Paket yapısı ve hesap başına CloudLinux kotaları paylaşımlı kaynak modeliyle uyumludur; bu bir çıkarımdır. Yalnız cPanel kullanıldığı için kesin hüküm verilmedi. Mevcut hesabın tahsis/izolasyon tipi, özel sözleşmesi ve etkin limitleri doğrulanamadı. Kesin hesap teyidi için hizmet detayındaki ürün türü ve sağlayıcının “bu hesap paylaşımlı LVE hosting mi, müşteriye tahsisli VM mi?” cevabı gerekir.

| Konu | Doğrulanan veya bilinen | Mevcut hesapta eksik kanıt |
|---|---|---|
| CPU/RAM | Yukarıdaki paket ilanı; kaynak kodundaki sağlık ekranı Node RSS ölçebilir | LVE SPEED/PMEM, tepe tüketim ve fault geçmişi; OS toplam RAM'i hesap kotası değildir |
| Process/eşzamanlılık | Passenger giriş dosyaları mevcut | EP, NPROC, Passenger worker/queue limiti; domain sayısı worker sayısı değildir |
| I/O | Uygulama dosya arşivi ve PDF üretimi yapıyor | IO MB/s, IOPS, throttling ve disk gecikmesi |
| Disk | TXT'ler şifreli dosyada, metadata DB'de; PDF/anahtar dosyaları ayrı | Gerçek kullanılan alan, inode kullanımı, soft/hard kota |
| Node | Kullanıcı mimarisinde Node 22; kaynak engines >=20.9; yerel kabul Node 24.18.1 ile çalıştı | Hesapta seçili tam Node 22 patch sürümü ve native sharp/Prisma uyumu |
| Passenger | API `apps/api/passenger.cjs`; Passenger socket sözleşmesi kullanılıyor | Soğuk başlangıç, idle recycle, worker sayısı, proxy zinciri ve gerçek istek zaman aşımı |
| Next/Express | Ayrı Web/API başlangıçları; Next build gerekli | cPanel'de doğru uygulama kökü ve iki uygulamanın RAM toplamı |
| DB havuzu | Tek PrismaClient/süreç (`src/db.ts`); Prisma 6.19.3 kurulu | Neon bölgesi/compute, pooled URL, worker × bağlantı sayısı, beklemeler |
| Yükleme | Genel varsayılan MAX_UPLOAD_SIZE 10 MiB; TXT 10 dosya × 2 MiB; normal JSON 1 MiB, bazı yönetim uçları daha yüksek | Proxy/body/timeout sınırlarının uygulamayla uyumu |
| SSL/TLS | API adresi production build'de HTTPS olmalı; CORS tam WEB_ORIGIN kullanır | Etkin sertifika, zincir, yenileme ve TLS ayarları ölçülmedi |
| Firewall/WAF | Uygulamada JWT/rol ve süreç içi rate limit mevcut | Sağlayıcı WAF kuralları, gerçek IP aktarımı, 403/429/5xx logları |
| Yedek | DB ve dosya deposu birlikte korunmalı | Hesabın yedek periyodu/retention'ı, Neon geri dönüş penceresi, geri yükleme denemesi |
| Log/restart | Uygulama başlangıçları ve sistem izleme kodu mevcut | cPanel log yolları, retention, redaksiyon ve restart yetkisi |
| Trafik artışı | TXT okuma ve PDF üretimi kaynak tüketir | Gerçek throughput, p95, hata oranı ve kuyruk derinliği ölçülmedi |

CloudLinux CPU, RAM, I/O, EP ve NPROC'yi ayrı sınırlar; kapasiteyi yalnız RAM veya “limitsiz trafik” üzerinden hesaplamak doğru değildir. [CloudLinux limitleri](https://docs.cloudlinux.com/cloudlinuxos/limits/).

Prisma 6'nın varsayılan havuzu fiziksel CPU sayısına bağlıdır; paylaşımlı makinenin CPU görünümü hesaba ayrılan CPU'yu yansıtmayabilir. Uygulama başına `connection_limit` ve `pool_timeout` değerleri gerçek worker/Neon bütçesine göre belirlenmeli; burada üretim URL'si değiştirilmedi. [Prisma 6 havuzu](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections/connection-pool).

Neon pooled bağlantısı uygulama trafiğinde yararlı olabilir; dump/restore ve migration için direct bağlantı kullanılır. Havuzun kabul ettiği istemci sayısı eşzamanlı sorgu kapasitesi değildir. Neon bölgesi bilinmediği için Türkiye→Neon veya alternatif sunucu→Neon gecikmesine milisaniye değeri verilmedi. [Neon pooling](https://neon.com/docs/connect/connection-pooling).

## Yeterlilik nasıl ölçülür?

Şimdi Senior.js'te kalın. “4 GB yeterlidir” veya “şu kadar öğrenci taşır” sonucu çıkarılamaz. Sınav anındaki gerçek aktif istek sayısı, rapor büyüklüğü ve dosya üretim sıklığı öğrenci toplamından daha belirleyicidir.

1. cPanel Resource Usage'dan sınav saatlerindeki SPEED, PMEM, EP, NPROC, IO, IOPS ve fault kayıtlarını alın. Normal gün ve sınav günü en az iki ayrı gözlem yapın. Bu raporda bunlar alınmadı.
2. Anonim staging ortamında 7108/8050 dosyaları, 30/150/500 öğrencili raporlar, tek/toplu PDF, TXT arşiv okuma ve sonuç sorgusunu ayrı ölçün. Canlı veriyle yük testi yapmayın.
3. 1, 5, 10 ve 20 eşzamanlı istemcide kademeli ölçüm önerisi: istek başına süre, p50/p95, hata oranı, RSS, CPU, disk ve DB pool beklemesi. Bunlar hedef senaryolardır, bu çalışmada ölçülmüş hosting kapasitesi değildir.
4. Başlangıç karar eşiği önerisi: sürekli %80 kaynak kullanımı, tekrarlayan LVE fault/OOM, kuyruk veya kabul edilen kullanıcı süresini aşan p95 görüldüğünde optimizasyon/paket yükseltmeyi değerlendirin. Bu oran sağlayıcının garantisi değildir.
5. Büyük PDF işleri ön plandaki sorguları bloke ediyorsa önce işi sınırlama/kuyruk ve streaming tasarımı gerekir. Yalnız daha pahalı hosting almak bu davranışı çözmeyebilir. ZIP tarayıcıda karneleri sırayla üretir; tüm PDF'ler yine sunucuya iş yükü getirir.

## Alternatifler ve maliyet

12 Kasım 2026 kaynak kontrolü. Fiyatlar hesap teklifi değildir; kur, vergi, depolama, yedek, IPv4, trafik ve yönetim hizmeti toplam maliyeti değiştirir. Para birimleri doğrudan bırakıldı; kur tahmini yapılmadı.

| Seçenek | Kaynak / maliyet örneği | Kapasite, bakım ve dağıtım değerlendirmesi |
|---|---|---|
| Mevcut Senior.js | Mevcut ücret faturadan doğrulanmalı; yukarıdaki ilan karşılaştırma içindir | En az değişiklik. LVE/Passenger sınırları ve birleşik Web/API RAM tüketimi izlenmeli |
| Daha güçlü Node hosting: Manager.js | İlanda 4 Core, 8 GB, 500.000 inode; aylık 262,90 TL, 36 ay eşdeğeri 168,26 TL, KDV hariç | RAM baskısında aday; CPU artışı varsayılmaz. Yönetim kolay; process/I/O sınırları ayrıca teyit edilmeli. [Paketler](https://www.veridyen.com/nodejs-hosting) |
| Türkiye bulut VM | Veridyen gnCloud S-5: 4 Core, 8 GB, 160 GB; ilanda 1.680,95 TL/ay. Vergi ve ek hizmetler siparişte teyit edilmeli | Root/OS bakım sorumluluğu gelir; TR kullanıcılarına yakınlık avantajı olası, ölçülmedi. Yedek ve yönetim kapsamı ayrıca alınır. [Bulut paketleri](https://www.veridyen.com/sunucu/bulut-sunucu) |
| Yönetilen VPS | Yukarıdaki VM + yazılı kapsamı olan yönetim/SLA teklifi; toplam fiyat doğrulanamadı | OS güncelleme, firewall, log, yedek ve olay müdahalesi sözleşmede açık olmalı. “VPS” kendiliğinden yönetilen hizmet değildir. [Yönetim kapsamı](https://www.veridyen.com/sla) |
| Avrupa bulut VM | Hetzner CX23: 2 vCPU, 4 GB, 40 GB; Haziran 2026 tablosunda 5,49 EUR/ay (IPv4 ve KDV hariç); stok durumu kontrol edilmeli | Düşük altyapı ücreti, yüksek teknik bakım. Sürüm sabitleme, firewall/TLS ve dış yedek tarafınıza ait. Türkiye ve Neon RTT ölçülmeli. [Fiyat](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/), [Kaynaklar](https://www.hetzner.com/cloud/cost-optimized/) |
| Yönetilen Node hosting | Render 1 CPU / 2 GB hizmet başına 25 USD/ay; iki ayrı Web/API için yalnız compute 50 USD/ay örneği | Deploy kolay, OS bakımı azalır. Kalıcı disk/backup/traffic ek maliyet; PDF yükü ayrıca ölçülmeli. 512 MB/7 USD örneği bu proje için kapasite önerisi değildir. [Güncel compute karşılaştırması](https://render.com/articles/set-up-self-hosted-github-actions-runners-on-render), [Fiyat sayfası](https://render.com/pricing) |
| Ayrı Web ve API | Seçilen iki hizmetin toplamı; sabit bir fiyat yok | API PDF işlerini bağımsız büyütme imkânı. CORS, domain, iki release, rate limit ve kalıcı storage işletimi daha karmaşık |

TR hosting otomatik olarak en düşük Neon gecikmesini sağlamaz. Neon aynı Avrupa bölgesinde ise Avrupa API avantajlı olabilir; bu bir mimari çıkarımdır, ölçüm değildir. Aday sunuculardan anonim staging DB'ye bağlantı kurulup 30–100 kez SELECT 1, gerçek küçük sorgu, soğuk/sıcak bağlantı p50/p95 karşılaştırılmalı. Uygulamaya yakın DB bölgesi ve Türkiye'den toplam yanıt süresi birlikte değerlendirilmelidir.

Tüm seçeneklerde JWT/rol/kurum izolasyonu uygulamanın görevidir. Yönetilen hizmete geçiş uygulama yetki hatalarını düzeltmez. Birden fazla API worker/sunucu planlandığında mevcut bellek içi rate limit için shared/edge çözümü gerekir. Her adayda kalıcı, özel ve yedeklenebilir TXT deposu zorunludur.

## Taşınabilirlik envanteri

**Kodda `/home/eski-hesap`, `/var/www` gibi üretim sunucusuna sabitlenmiş bir çalışma yolu bulunmadı.** Fontlar ve FMT varlıkları paket içi `__dirname` üzerinden bulunuyor. Başlangıçtaki `path.resolve(STORAGE_DIR)` göreli değer alırsa çalışma dizinine bağlıdır; üretimde özel ve mutlak yol kullanılmalı.

**DB'de taşınabilirlik engeli var:** `AnswerKeyFile.storagePath` mutlak dosya yolunu saklar. `server.ts` ve `optical-routes.ts` bu alanı dosya yazarken oluşturuyor; indirme de bu yoldan yapılıyor. Sunucu değişirse:

- Aynı mutlak mount yolunu korumak mümkündür; veya
- Sadece hedef/staging DB kopyasında eski storage prefix'ini yeni prefix'e çeviren, izinli kökle sınırlı bir dönüşüm hazırlanır. Satır sayısı ve dosya varlığı karşılaştırılır. Rastgele global string replace yapılmaz. Bu dönüşüm burada uygulanmadı.

TXT dosyaları `STORAGE_DIR/optical-txt/<UUID>.txt.enc`; metadata'da güvenli `storedName` kullanılır. Admin dosyaları `STORAGE_DIR/admin-files`, yayınevi logoları `STORAGE_DIR/publisher-logos`; bunlar göreli alt dizinlerle çalışır. Eski cevap dosyaları storage kökünde, yeni dosyalar `answer-keys/<id>` altında da bulunabilir; yalnız son klasörü kopyalamak yeterli değildir.

## Gerekli dosya ve ortam değişkenleri

Kaynak: kök `package.json`, `package-lock.json`, `apps/api`, `apps/web`, Prisma schema ve **tüm mevcut migration geçmişi**. API `dist` yanında font/FMT/lib varlıkları paketlenir (`copy-assets.cjs`). Hedef platformda `npm ci`, `prisma generate` ve build yapılmalı; farklı OS/mimariden `node_modules` veya native sharp/Prisma binary'si kopyalanmamalı. Next için `.next`, public ve çalışma bağımlılıkları gerekir. Bu projede `output: standalone` henüz etkin değildir; `.next` klasörünü tek başına taşımak tam dağıtım değildir.

| Alan | Değişkenler / işlem |
|---|---|
| API | `DATABASE_URL`, `JWT_SECRET`, `WEB_ORIGIN`, mutlak `STORAGE_DIR`; Passenger'ın verdiği `PORT` veya standalone `API_PORT` |
| TXT şifreleme | Varsa mevcut `TXT_STORAGE_KEY` aynen korunur. Yoksa TXT anahtarı JWT_SECRET'ten türediği için eski JWT_SECRET zorunludur |
| Kimlik şifreleme / erişim kodları | Mevcut JWT_SECRET ayrıca öğrenci kimlik şifrelemesi ve kişisel erişim kodlarının türetilmesinde kullanılır; körlemesine değiştirmek eski erişimi bozar |
| Web build | `NEXT_PUBLIC_API_URL` derleme öncesi; sır değildir. Domain değişirse yeniden build |
| Web SSR | Gerekirse `API_INTERNAL_URL`; erişilebilir iç API adresi. Yerel testteki `127.0.0.1:1` değeri canlıya taşınmaz |
| E-posta | Kullanılıyorsa SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, CONTACT_EMAIL |
| Diğer | MAX_UPLOAD_SIZE, isteğe bağlı RELEASE_ID. CAPTCHA yapılandırmasına bu çalışmada dokunulmadı; mevcut güvenli ayar aktarımı ayrı operasyon kararıdır |
| İlk yönetici | ADMIN_EMAIL/ADMIN_PASSWORD seed içindir; mevcut DB taşınırken seed çalıştırılmaz, hesaplar yeniden oluşturulmaz |

`DIRECT_URL` mevcut Prisma schema'sında tanımlı değildir; tanımlıymış gibi davranılmamalı. Migration/dump için direct Neon URL gerektiğinde sadece ilgili kontrollü işlem ortamına verilmelidir. Hiçbir gerçek anahtar, DB URL'si veya parola bu rapora, sohbet mesajına, Git'e ya da test raporuna yazılmaz. Secret manager/cPanel korumalı ortamı, en az yetki ve dosya izinleri kullanılır.

## Geçiş, DNS ve rollback planı — uygulanmadı

1. Yeni sunucuyu ayrı release dizininde, ayrı staging DB ve özel storage ile kurun; üretim erişimi vermeyin. İzinleri, Node sürümünü, TLS'i, proxy sınırlarını ve tüm varlıkları kontrol edin.
2. Aynı Neon DB kullanılacaksa DB taşıması gerekmeyebilir. Aynı DB'ye iki yazıcı uygulamanın çakışması engellenmeli. Yeni DB isteniyorsa direct bağlantıyla tutarlı `pg_dump` ve hedefe `pg_restore` planlayın; `_prisma_migrations`, FK ve snapshot JSON'larını koruyun. Kaynak DB'yi sıfırlamayın. Kişisel veri içeren staging kopyasına erişimi kısıtlayın veya anonimleştirin.
3. Tüm storage ağacını, dosya boyutu/özetleri ve kayıt envanteriyle birlikte özel kanaldan taşıyın. Şifreleme anahtarlarını dosyalardan ayrı aktarın. Yeni yoldan eski TXT'nin çözüldüğünü ve cevap PDF'lerinin açıldığını doğrulayın. Gerekirse yalnız hedef DB'de `storagePath` rebasing yapın.
4. Ayrı domain/hosts kaydıyla yeni hedefi kontrol edin: auth/rol, kurum izolasyonu, 7108/8050, arşiv, değerlendirme, yayın, kişisel kod, PDF/Excel. Gerçek öğrenci sonuçlarını kontrolsüz test verisi olarak kullanmayın.
5. Planlı geçişten önce DNS TTL'i örneğin 300 saniyeye düşürme önerisi değerlendirilir; bunun önceden yayılması gerekir. CDN/proxy, API domaini, CORS ve sertifika yeni hedef için hazırlanır. DNS'in herkes için aynı anda değişeceği varsayılmaz.
6. Kısa bakım/yazma durdurma penceresinde son DB ve dosya farkını senkronlayın, kayıt/fingerprint sayımlarını karşılaştırın. Sonra Web/API trafik yönünü değiştirin. Kesinti süresine ölçümsüz dakika garantisi verilmez; anonim prova süresi esas alınır.
7. Önce salt okunur kontroller, ardından kontrollü yazma testi ve log izleme. Yeni hedef sağlıklıysa yazmaları açın; eski uygulama yazmaya kapalı kalmalı. DNS TTL'i ancak stabil izleme sonrasında eski düzeye alınır.
8. Rollback tetikleri: erişim/kurum kapsamı sorunu, arşiv açılamaması, yanlış hesap, tekrarlayan 5xx/OOM veya kabul edilmeyen süre. Aynı DB ile uyumlu eski release'e dönmek en az veri riski taşır. Yeni hedefe yazma olduysa eski DB yedeğini doğrudan geri yüklemek veri kaybına yol açar; farklar uzlaştırılmadan yapılmaz. DB rollback'i ile kod rollback'i ayrı karardır.

Bu RC yeni migration eklemez. Normal hedefte mevcut migration geçmişi ayrıca denetlenir; üretimde `migrate dev`, `db push`, `reset` veya seed çalıştırılması önerilmez. Yayın için kullanıcının ayrı onayı gerekir.

## Docker değerlendirmesi

Kontrollü VPS/bulut üzerinde Node sürümünü ve native bağımlılıkları sabitleyen iki image (Web/API), non-root çalışma ve dış kalıcı storage mantıklıdır. cPanel hesabında Docker çalıştırılabildiği varsayılmadı. Container içine .env, sırlar veya öğrenci arşivi gömülmemeli; host volume/özel nesne deposu ve ortak anahtar yönetimi gerekir. Dockerfile, imaj, registry push veya sunucu kurulumu bu RC'ye eklenmedi; önce hedef mimari ve ölçümler belirlenmelidir.
