# KurumsalSınav dağıtım prosedürü

**v1.4.5 için güncel manuel Veridyen akışı:** [yayın sırası, geri alınabilir route cache, canlı HTTP doğrulaması ve dört aşamalı NPROC ölçümü](docs/v145-manual-deployment.md). Aşağıdaki tarihsel prosedürler bu akışın yerine kullanılmamalıdır.

Bu belge v1.4.0 yerel çalışmasının geçiş önkoşullarını da içerir. Yeni kapsam ve açık kabul maddeleri için [v1.4.0 raporunu](docs/v140-release-report.md) okuyun. `20261120120000_v140_exam_structures` canlıya uygulanmadı. v1.3.9 tam kabulü henüz verilmedi; [açık kabul maddelerini](docs/v139-release-report.md) kapatmadan yayımlamayın. Önceki kabul ve sınırlar için [v1.3.8 raporunu](docs/v138-release-report.md), önceki migration adımları için v1.3.5/v1.3.7 raporlarını birlikte okuyun. Canlıya aktarım operatörün kontrollü işlemidir; bu geliştirme çalışması dağıtım yapmaz. Mevcut cPanel / CloudLinux / LiteSpeed / Passenger, Node.js 22 ve Neon korunur. Sunucuda rsync ve pg_dump gerektiren adım yoktur.

## Hazırlık ve kabul

1. Kaynak değişikliklerini inceleyin, sürüm raporundaki açık kritik testleri kapatın. Temiz, ayrı bir çalışma kopyasında kilit dosyasıyla `npm ci`, `npm run db:generate`, `npm test`, `npm run test:report`, `npm run build` çalıştırın. Çalışan dizinde build yapmayın. Node.js 22 kullanın. Paketler ve görünür sürümler aynı olmalı.
2. Sırları hostingin korumalı ortamına girin; değerleri komut satırına, Git'e, rapora veya loga koymayın. `NEXT_PUBLIC_API_URL` gerçek HTTPS API adresiyle **build öncesinde** tanımlanmalı. `WEB_ORIGIN` gerçek HTTPS web origin olmalı. API'nin `RECAPTCHA_ENABLED`, `RECAPTCHA_VERSION`, ilgili API **site key ve secret key** çiftlerini birlikte doğrulayın. API public-config site key yayımlar; yalnız frontend değişkenini doldurmak yeterli değildir. v3 için `RECAPTCHA_SITE_KEY` ve `RECAPTCHA_SECRET_KEY`, v2 için `RECAPTCHA_V2_SITE_KEY` ve `RECAPTCHA_V2_SECRET_KEY` gerekir. Google alan adı/action ve minimum skor ayarını staging üzerinde sınayın. Public frontend site anahtarı kullanılıyorsa API ile eşleşmeli. Secret hiçbir zaman NEXT_PUBLIC değişkenine konmaz.
3. Build ve sunucu aktivasyonundan önce, ortam güvenli biçimde yüklenmişken `node scripts/deployment-preflight.cjs` çalıştırın. Betik dotenv yüklemez; terminale env dökmeyin. Çıktı yalnız değişken adları ve doğrulama durumudur. Ayrıca DB TLS, Origin/proxy allowlist ve özel STORAGE_DIR izinlerini kontrol edin. JWT/TXT/MFA şifreleme anahtarlarını koruyun.

## Yedek ve geri dönüş noktası

Aktarım öncesi web/API mevcut çalışan tam artifact'larını ayrı tarihli özel dizine alın. `.env` ve hosting ayarlarını şifreli özel yedekte, web kökü dışında saklayın. Özel storage dosyalarını tutarlı bir noktada (yükleme/değerlendirmeyi bakım penceresinde durdurarak) cPanel arşiv/yedek aracından alın. Sadece .next yedeği tam uygulama yedeği değildir.

Neon Console üzerinden mevcut plana uygun branch / restore point / PITR kullanılabilirliğini ve saklama süresini doğrulayın. Sağlayıcının DB export/yedek yöntemiyle ayrı kurtarılabilir yedek planlayın; pg_dump yoksa varmış gibi komut vermeyin. Bağımsız staging DB'ye geri yükleme doğrulanmadan yedeği başarılı saymayın. DB geri dönüşü yeni yazımları kaybettirebilir; otomatik restore yapmayın.

En az son 3 başarılı uygulama artifact'ı, 7 günlük / 4 haftalık korumalı dosya yedeği hedefleyin; DB saklama süresini Neon planına göre belgeleyin. Bilinen güvenli son sürümü pinleyin; başarısız sürüm onu yerinden etmesin. Silmeden önce yedek manifesti, boyut/checksum ve geri yükleme kanıtını kontrol edin. Yedekler erişim kontrollü ve web dışındadır; günlük saklama kararı gerçek depolama kapasitesiyle onaylanır.

## Temiz release aktarımı

- Örnek dizin düzeni: özel `releases/20261117-v134/{web,api}` ve önceki `releases/...-v133`. Uygulamalar için ayrı Passenger kökleri korunur. Aktarımı yeni, boş `.partial` release dizinine cPanel File Manager/SFTP ile yapın. Arşiv açarken yol dışına çıkma olmadığını kontrol edin. Kontrol bitince release adını verin.
- Web artifact'ı: yeni `.next` **bütünüyle**, public, package manifest/lock, next.config ve çalıştırıcı dosyaları; API artifact'ı: tamamen yeni `dist`, manifest/lock, passenger.cjs ve gereken çalışma zamanı bağımlılıkları. API dist font/lib/assets içerir. Aynı Node/OS native modül uyumluluğunu doğrulayın; yerel node_modules'ü farklı işletim sistemine kopyalamayın.
- Eski `.next` veya API `dist` üzerine kesinlikle kopyalamayın. Yeni release için bağımlılıkları ayrı kurun. Kullanıcı storage/DB/.env release paketine alınmaz, eski dosya üzerine yazılmaz. Gönderim tamamlanmadan canlı kökü değiştirmeyin. Dosya manifesti SHA-256 ve boyutlarla aktarımı doğrulayın; kesik aktarımda eski sürüm çalışmaya devam etsin.
- cPanel Passenger kökünü değiştirme destekleniyorsa Web ve API'yi bakım penceresinde doğrulanmış yeni release köklerine geçirin ve uygulamaları yeniden başlatın. Desteklenmiyorsa uygulamaları kontrollü durdurun; aynı dosya sistemindeki hazırlanmış **tam uygulama dizinlerini** rename ile değiştirin, eski dizinleri geri dönüş adıyla koruyun. İki servisin beraber değişimi atomik değildir; bakım süresince kullanıcı trafiğini kapatın. CloudLinux resource limitleriyle ayrı build için yeterli bellek yoksa uyumlu staging ortamında build edin.
- v1.3.4 → v1.3.5 için `20261117220000_v135_catalog_student_portal` migration’ı gerekir. Operatör onayı/yedek ve staging kabulü sonrası migration’ı API/Web aktivasyonundan önce uygulayın. v1.3.3 → v1.3.4 geçişinde yeni migration yoktu. Konum denetim aracını korumalı ortamda salt okunur çalıştırın; önerileri canlıda otomatik uygulamayın. Eski sürümlerde bekleyen migration'lar için v1.3.2 raporunu izleyin; operatör onayı/yedek sonrası `migrate deploy` dışında reset, seed, db push veya migrate dev kullanmayın.

## Aktivasyon sonrası ve başarısızlık

Ana sayfa/footer, panel, API health ve Sistem Merkezi v1.3.8 göstermeli. Tarayıcıda yeni oturumla login + gerçek Google reCAPTCHA, rol kapsamı, sınav/anahtar listesi, TXT öneri yükleme/seçim, dört katılım kombinasyonuyla PDF önizleme/tek/toplu/ZIP, Excel ve il/ilçe seçimini kontrol edin. Yeni JS chunk URL'lerinin 200 döndüğünü, eski route-cache karışmadığını doğrulayın; varsa LiteSpeed/CDN public cache temizliği yapın. Özel sonuç/auth yanıtları cache edilmemeli.

Aktarım, başlangıç, sağlık veya kritik smoke başarısızsa bakım modunda iki Passenger kökünü önceki **tam** release'e geri alın; yeniden başlatıp sağlık/login/sonuç erişimini kontrol edin. Yalnız .next değiştirip API'yi yeni bırakmayın. Bu sürümün migration’ı yalnız yeni alan ve tablolar ekler; uygulama geri dönüşünde yeni tabloları/verileri otomatik silmeyin veya DB’yi körlemesine geri yüklemeyin. Yeni yazımlar için geri dönüş planını ayrıca doğrulayın. Sonradan alınan verileri, şifreleme anahtarlarını ve storage'ı silmeyin. Migration içeren geçmiş geçişlerin geri dönüşü ayrı DB planına bağlıdır. Sorunu sır içermeyen işletim kaydına yazın; başarısız artifact'ı kanıt için ayırın.

## v1.3.7 ek önkoşullar

Önce [yerel kabul ve sınırlar](docs/v137-release-report.md) incelenir. Bu oturum production migration/deployment çalıştırmadı.

- İki yeni eklemeli migration staging’de doğrulanmadan kod yayımlanmaz; önceki migration dosyaları değiştirilmez. Yeni tablolar geri dönüşte otomatik DROP edilmez.
- Worker threads / Passenger süreç sayısı / toplam 4 GB RAM / NPROC / Neon havuzu staging’de ölçülür. İki worker sınırı process bazlıdır; birden fazla lsnode sürecini global sınırlamaz.
- Özgün canlı TXT merge vakası, gerçek 2FA cihaz/kurtarma ve bayi temsil dönüşü staging kabulüne dahildir.
- Audit kayıtları otomatik silinmez; kurumun onaylayacağı fiziksel saklama prosedürü ayrıca gerekir. Arama geçmişinin 30 günlük bakımı ilgili istek geldiğinde çalışır; katı fiziksel silme SLA’sı gerekiyorsa yetkili zamanlayıcı planlanır.
- Test `.next` çıktısı localhost API içerir. Production HTTPS API / mevcut MFA-JWT-TXT anahtarları korunarak Web ve API yeniden build edilir. `cpu-worker.js` dahil API dist ağacı birlikte taşınır.

- Sınava özel karne logosu eki: `20261118193000_v137_exam_report_logo` migration’ı kod yayını öncesinde staging/production işletim sürecinde uygulanmalı. Bu oturum yalnız yerel sentetik DB’de doğruladı; mevcut sonuçlarda backfill/değişiklik yok. Geri dönüşte yeni logo tablosunu silmeyin.


## v1.3.8 ek önkoşullar

- Bu sürümde yeni migration yok. Eksiksiz v1.3.7 kurulumundan geçişte DB değişikliği gerekmez. PostgreSQL 16+ ve `SELECT pg_input_is_valid('{}','jsonb');` işlev kullanılabilirliği staging'de doğrulanır; yeni Veri Silme sorgusu bunu kullanır.
- Doğrulanmış hosting üst sınırları: paylaşımlı CPU %2000, RAM 4 GB, NPROC 250, EP 50, I/O 50 MB/sn, IOPS 1024. Bunlar fiziksel sunucu kaynakları veya ayrılmış çekirdek garantisi değildir.
- Tüm API/lsnode süreçleri aynı host ve UID altında, release dizininden bağımsız aynı **mutlak özel STORAGE_DIR** kullanmalı. `.cpu-admission` yazma ve aynı dosya sisteminde hard-link izinleri test edilir. İki global yuva yalnız bu koşullarda ortaktır. Staging'de süreç sonlandırma/yeniden başlatma ve ölü PID kurtarma testi yapılır. Aktif süreç varken kilitler silinmez.
- `CPU_ACCOUNT_PROC_MEMORY` varsayılan kapalıdır. `/proc` görünürlüğünün hosting hesabındaki UID süreçlerini doğru temsil ettiği doğrulanmadan açılmaz. Açıldığında UID RSS toplamı muhafazakâr kabul göstergesidir; CloudLinux LVE değildir. Süreç bazlı 1 GiB RSS kabul kontrolü ve iki iş yuvası zaten etkindir. PDF/Excel/sonuç tamponları ayrıca ölçülmelidir; çok sayıda Passenger süreci güvenli kapasite sayılmaz.
- Kalıcı job kuyruğu yoktur; tarayıcı/Passenger sonlandırmasından sonra tamamlanma garantisi verilmez. Başarısız/bağlantısı kesilmiş değerlendirmede yeniden göndermeden önce arşiv ve kayıtlı sonuç kontrol edilir. Mevcut atomik yazım ve önizleme mühürleri korunur.
- Web `public/vendor/jspdf*`, lisansları, `public/araclar/pdf-utilities.css`, `tool-theme.*`, PDF.js modül/worker ve OCR build varlıkları eksiksiz taşınır. CSP'ye dış CDN veya unsafe-eval eklenmez. Örnek yerel API adresiyle alınan artifact canlıya kopyalanmaz.
- İki temada admin/bayi paneli, eski FMT linkleri, TXT öneri/oturum birleştirme, PDF kesme/ZIP ve karne önizleme/indirme smoke yapılır. Geri dönüşte Web/API birlikte 43330b7 artifact'larına döner; DB/storage/anahtarlar ve kullanıcı kayıtları silinmez.

Aktif CPU işi için iki ortak yuva, bütün lsnode süreçlerindeki resident/idle worker toplamını ikiyle sınırlayan bir process yöneticisi değildir. Süreç başına 30 saniyelik idle havuz korunur; Passenger/lsnode process sayısı ve toplam RSS bu nedenle birlikte ölçülür.


## v1.3.9 ek önkoşullar — kabul açık

- `docs/v139-release-report.md` yardım kapsamı, görsel kabul ve performans ölçümü açıkları kapanmadan sürüm etkinleştirilmez. Başarılı yerel test/build tek başına yayın onayı değildir.
- Yeni eklemeli `20261119210000_v139_announcements_scheduled_shares` migration staging'de ve yedek/geri dönüş planıyla operatör tarafından değerlendirilir. Bu geliştirme oturumu canlı migration çalıştırmaz. Yeni tablolar olmadan API/Web etkinleştirilmez; eski migration dosyaları değiştirilmez.
- Özel STORAGE_DIR altında `report-temp` için 0700 dizin/0600 dosya ve mevcut `.cpu-admission` ortak host/UID koşulları doğrulanır. Proxy buffering/timeouts ile ZIP ilerleme/indirme/iptal ve çoklu lsnode RAM toplamı staging'de ölçülür. Zorla sonlandırılmış süreçlerin özel geçici dosyaları için güvenli saklama/temizlik prosedürü belirlenir.
- Geçmiş duyuru importu otomatik seed değildir; yetkili yönetici Duyurular ekranından açıkça başlatır. Sürüm duyurusu için otomasyon ve ayrıca admin onayı gerekir; migration/build/commit yayın olayı sayılmaz.
- Yeni alan eski paylaşımlarda null başlangıçtır. Eski bağlantı, zamanlanmış FMT/PDF doğrudan indirme, bayi hedef izolasyonu ve yedi günlük duyuru sınırları staging'de sınanır.
- Yerel Web build localhost API adresi taşır; gerçek HTTPS API adresiyle temiz artifact oluşturulur. Başarısız aktivasyonda Web/API birlikte `eee6727` v1.3.8 artifact'ına döner. Yeni tablolar/başlangıç alanı, kullanıcı verileri, storage ve anahtarlar otomatik silinmez.


## v1.4.0 ek geçiş koşulları

- Eklemeli `OpticalExamTemplate` migration'ı yeni bir tablo ekler; mevcut sınavlara şablon bağlamaz. Önce staging'de doğrulayın.
- Yerel kabul build'i `http://localhost:4020` kullanır. Üretimde gerçek HTTPS API adresiyle Web yeniden build edilmelidir.
- Audit dışa aktarım/temizlik arşivleri özel `STORAGE_DIR/audit-archives` altındadır; mevcut TXT_STORAGE_KEY korunmalıdır. Arşivler otomatik silinmez. Disk ve bağımsız yedek politikası gereklidir.
- `AUDIT_RETENTION_*_DAYS` opsiyoneldir; varsayılan operasyon sürelerini kısaltmadan uzatır. Anahtar revizyonları ve temizlik denetimi korunur. Süreleri kurumsal/yasal politikayla doğrulayın.
- Audit otomatik silme cron'u kurulmadı; uygulamadaki teknik SystemEvent/analytics bakımıyla karıştırmayın. Gelecekte Türkiye 04.00 için hosting saat dilimi ve güvenilir cron ayrıca doğrulanır.
- Dışa aktarım ve yeniden değerlendirme kapasite sınırları, açık kapsam ve test yan etkisi [sürüm raporundadır](docs/v140-release-report.md). Bu sürüm otomatik yedekleme/geri yükleme sunmaz; yalnız hazırlık sayfası ekler.
- v1.4.0 yayın duyurusu ve deployment ayrı operatör onayı gerektirir; burada yapılmadı.

## v1.4.2 yerel hazırlık ve staging kontrol listesi

Bu bölüm bir dağıtım talimatıdır; bu geliştirme oturumunda sunucuya bağlantı, deploy veya restart yapılmadı. Ayrıntılı kabul ve açıklar: [v1.4.2 raporu](docs/v142-release-report.md).

1. Doğrulanmış v1.4.1 Web/API artifact'larını ve mevcut özel storage/veritabanı yedeğini koruyun. JWT, MFA ve TXT anahtarlarını değiştirmeyin. Yerel test build'i `http://localhost:4022` içerir; üretime taşımayın.
2. Aynı `package-lock.json` ile `npm ci` kullanın; sunucuda ayrı `npm update` çalıştırmayın. Yerel kabul Node **22.23.5**, Next **15.5.28**, Prisma **6.19.3** ile yapıldı. Derleme ve Passenger çalışma dizinlerinde `node --version` ve `node -p "require('next/package.json').version"` çıktısını karşılaştırın. Önceki 15.5.28/15.5.29 farkını yeniden oluşturmayın. Eski bağımlılık güvenlik açıkları ayrıca çözülmeden üretim kabulü verilmez.
3. v1.4.2 yeni migration gerektirmez. Mevcut 26 migration'ın kurulmuş olduğunu staging'de doğrulayın; eksikleri varsa kurumun ayrı yedekli migration sürecinde önce tamamlayın. Şema reseti, seed veya otomatik temizlik kullanmayın.
4. Gerçek HTTPS API adresiyle Web'i ve API'yi aynı sürümden yeniden derleyin: `npm run db:generate`, `npm run build -w @optik/api`, `npm run build -w @optik/web`. Web `.next`, `public` ve API `dist`/worker/asset dizinlerini tutarlı tek sürüm olarak hazırlayın. cPanel'de kaynak çekmek derleme ve Passenger yeniden başlatmasının yerini tutmaz.
5. **Paketlemeden önce** `npm run check:static -- --with-build` çalıştırın. Bu salt okunur kontrol `apps/web/public` ve `apps/web/.next/static` altında erişilemeyen dosya/dizinleri, herkese yazılabilir öğeleri ve incelenmemiş symlinkleri başarısız sayar. Varsayılan `npm run check:static` yalnız kaynak public ağacını kontrol eder. Değerleri veya özel dosyaları okumaz/değiştirmez.
6. Arşivleme/kopyalama aracında public dosyalar için **644**, dizinler için **755** izinlerini ve `umask 022` ayarını kullanın; var olan erişim politikasını operatörle doğrulayın. Git yalnız yürütülebilir bitini korur; 600→644 değişikliğini güvenilir bir dağıtım garantisi olarak taşımaz. Kontrolü **hedefte kopyalamadan sonra tekrar** çalıştırın. Klasör hiyerarşisi farklıysa scriptteki iki kökü staging artifact yapısına göre eşleyin. Özel `.env`, storage, yedek, MFA/TXT anahtarları için izinleri gevşetmeyin; proje köküne toplu chmod uygulamayın.
7. Yetkili operatör hedef web sunucusunda `/araclar/pdf-tools.html?embedded=1`, `/araclar/pdf-page-editor.html`, ilgili JS/CSS, `/vendor/pdfjs/pdf.min.mjs` ve worker URL'lerinde HTTP 200 ve doğru içerik türlerini doğrular. Tekrar 403 varsa dosyanın **yanı sıra üst dizin geçiş izinleri**, sahiplik, web sunucusu kuralı/WAF incelenir. Yerel 200, cPanel/Apache erişim garantisi değildir.
8. Staging'de admin ve bayi girişini, FMT eski bağlantılarını, raporların PDF/Excel/ZIP indirmesini, PDF iframe araçlarını ve 390/768/1440 px iki tema görünümünü sınayın. Bayi portalına geçiş, yetkili yazma, yenileme, sabit kırmızı dönüş ve iptal edilmiş geçiş yetkisinin 401 döndürmesi kabul koşuludur. Gerçek aktör ile etkin bayi denetimde birlikte incelenir.
9. Artık geçiş tokenı URL'ye taşınmaz. Eski v1.4.1 temsil tokenları bayi bağlama iddiası taşımadığı için reddedilir; yönetici kendi geçerli oturumuyla yeni geçiş başlatır. Çalışan bayi/yönetici asıl oturumları anahtarlar aynı kaldığı sürece mevcut iptal/süre kurallarına tabidir. Yeni kod için otomatik duyuru/push/deploy yoktur.
10. Ayrı yayın yetkilendirmesinden sonra Web/API sürümünü birlikte etkinleştirin ve Passenger süreçlerini mevcut işletim prosedürüyle yeniden başlatın. Başarısız kabulde önceki **iki artifact'a birlikte** dönün; yeni tablo olmadığı için ters migration çalıştırmayın. Veritabanını veya kullanıcı kayıtlarını geri dönüş bahanesiyle silmeyin. Etkin temsil oturumlarını kontrollü sonlandırın; tarayıcıdaki geçişten çıkış yeni endpoint'e bağlı olduğundan eski kodla açık sekmeleri yeniden yükleyip asıl yönetici girişini doğrulayın.

## v1.4.3 — Veridyen için manuel tek komut akışı

Güncel yöntem: [gerçek Veridyen Web/API/nodevenv düzeni](docs/v143-manual-deployment.md). Hazırlık `/home/kurums22/github-deploy`, canlı kökler `/home/kurums22/web` ve `/home/kurums22/api` olarak korunur. Yeni bakım servisi veya özel hook gerekmez; mevcut CloudLinux Selector start/stop ile doğrulanan kısa bir kesinti kullanılır. Gerçek yapılandırma `scripts/deploy/veridyen.json` içindedir. Canlı nodevenv bağlantıları/dependency ağaçları değiştirilmez; Next/lock farkında yayın durur.

Yayın komutu: `/home/kurums22/nodevenv/web/22/bin/node /home/kurums22/github-deploy/scripts/manual-deploy.cjs deploy`. Önce yalnız hazırlık için son sözcük `prepare`, geri dönüş için `rollback` olur. Bu komutlar geliştirme oturumunda çalıştırılmadı. Ayrıntılı koşullar, test kapsamı ve sınırlar: [Veridyen uyumluluk raporu](docs/v143-veridyen-deployment-report.md).
