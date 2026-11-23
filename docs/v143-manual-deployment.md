# v1.4.3 — gerçek Veridyen düzeninde manuel dağıtım

23 Kasım 2026. Bu belge önceki monorepo/özel bakım-hook prosedürünün yerini alır. Betik sunucuda çalıştırılmadı; bağlantı, gerçek deploy/rollback, Git commit/push veya DB işlemi yapılmadı.

## Mevcut dizinler korunur

[Gerçek yapılandırma](../scripts/deploy/veridyen.json) şu yolları kullanır; [örnek yapılandırma](../scripts/deploy/config.example.json) de aynı düzeni gösterir.

| Kullanım | Yol |
|---|---|
| Hazırlık deposu | `/home/kurums22/github-deploy` |
| Canlı Web / Selector app-root | `/home/kurums22/web` / `web` |
| Canlı API / Selector app-root | `/home/kurums22/api` / `api` |
| Web bağımlılık hedefi | `/home/kurums22/nodevenv/web/22/lib/node_modules` |
| API bağımlılık hedefi | `/home/kurums22/nodevenv/api/22/lib/node_modules` |
| Özel geçici paketler, yedekler ve günlük | `/home/kurums22/github-deploy/.manual-deploy` |

Canlı `web/node_modules` ve `api/node_modules` bağlantılarının tam olarak belirtilen hedeflere gitmesi doğrulanır. Mutlak veya göreli link kabul edilir; link değiştirilmez, kaldırılmaz veya başka release'e yönlendirilmez. Canlı nodevenv dizinlerine paket kurulmaz. Paket içi linkler izole kopya dışına taşıyorsa hazırlık reddedilir.

Ek Passenger uygulaması, yeni bakım servisi, reverse proxy, yeni uygulama kökü veya `/home/kurums22/package.json` gerekmez. `.manual-deploy` yalnız mevcut hazırlık deposunun içinde özel bir dosya alanıdır; **0700**, hesap sahibine ait ve Git dışında olmalıdır. `.gitignore` bu alanı içerir. Git deposunun yeni sürüme aktarılması operatöre aittir; betik Git çalıştırmaz. Bu özel alanda `git clean -fdx` veya elle toplu silme kullanmayın: v1.4.2 kurtarma noktaları da buradadır.

## Kullanılacak komutlar

Komutlar `kurums22` hesabının terminalinde çalıştırılır. Ortam etkinleştirme, `cd`, Git pull veya paket yükseltme zinciri gerekmez; tam Node yolu kullanılır. Betik varsayılan olarak kendi yanındaki `scripts/deploy/veridyen.json` dosyasını okur.

**Yalnız güvenli hazırlık** — canlı dosyaları, süreç durumunu ve nodevenv'yi değiştirmez:

```bash
/home/kurums22/nodevenv/web/22/bin/node /home/kurums22/github-deploy/scripts/manual-deploy.cjs prepare
```

**Yayınlama** — hazır aday varsa doğrular; yoksa hazırlığı da aynı komutta yapar:

```bash
/home/kurums22/nodevenv/web/22/bin/node /home/kurums22/github-deploy/scripts/manual-deploy.cjs deploy
```

**Geri dönüş** — iki uygulamayı aynı v1.4.2 yedeğine alır:

```bash
/home/kurums22/nodevenv/web/22/bin/node /home/kurums22/github-deploy/scripts/manual-deploy.cjs rollback
```

Bu üç komut geliştirme oturumunda çalıştırılmadı. Ayrı bir yapılandırma gerekirse `--config /mutlak/yol/config.json` eklenebilir; canlı kökleri veya yedek yollarını rastgele değiştirerek kontroller aşılmamalıdır.

## İlk kullanımda otomatik keşif ve sınırlar

Betik mevcut CloudLinux Selector'dan kayıtlı uygulamaları salt okunur `get --json --interpreter nodejs --user kurums22` ile sorgular. Gerçek Web/API başlangıç dosyaları, üretim modu, Node ana sürümü, uygulama durumu ve cPanel ortam değişkenleri buradan alınır. `server.js`, `server.cjs` veya `passenger.cjs` adını varsaymaz; yeni başlangıç dosyası yazmaz. Bilinmeyen JSON/durum veya eksik kayıt başarı sayılmaz.

Bu hesapta `cloudlinux-selector` komutu ve kendi iki uygulamasını durdurma/başlatma yetkisi bulunmalıdır. Mevcut CloudLinux/cPanel işlemleri kullanılır; özel hook programları hazırlanması istenmez. [cPanel'in kullanıcı terminalinden start/stop açıklaması](https://support.cpanel.net/hc/en-us/articles/360051943114-How-to-Start-and-Stop-a-CloudLinux-Node-JS-application-on-the-command-line) ve [CloudLinux CLI sözleşmesi](https://docs.cloudlinux.com/cloudlinuxos/command-line_tools/) bu yöntemin dayanağıdır. Bu olanak hesapta yoksa **tek komutlu güvenli aktivasyon sağlanamaz**; betik değiştirme adımına geçmez. `tmp/restart.txt` tek başına iki çalışan kökün güvenli değişimi için durdurma/boşalma kanıtı değildir.

Web/API nodevenv `bin/node` dosyaları ile başlatıcı aynı Node 22 patch sürümünü vermelidir. Nodevenv binary yolu veya Selector adı hostingte farklıysa yalnız gerçek karşılığı yapılandırmaya yazılır; betik yeni runtime yüklemez. Hazırlık/yedek alanı ve iki uygulama aynı dosya sisteminde olmalıdır; eski dosyaların özel yedek alanına atomik rename edilmesi buna bağlıdır.

Yapılandırmadaki `documentRoots` bilinen Web/API ve `public_html` köklerini içerir. Gerçek domain kuralları başka dizindeyse o kökü `documentRoots` veya dosyayı `protectedFiles` listesine ekleyin. Bilinen kök/URI `.htaccess` dosyaları, iki uygulamadaki `.env*`, gerçek başlangıç dosyaları ve kod/public ağaçlarındaki kontrol dosyaları otomatik korunur. Özel `next.config.js`/`.mjs` varsa TS config ile karıştırılarak üzerine yazılmaz; önce mevcut yapılandırmaya uygun eşleme incelenmelidir.

## Hazırlık: v1.4.2 çalışmaya devam eder

1. Kaynak/API/Web metadata'sının 1.4.3, iki canlı uygulamanın 1.4.2 ve çalışır olması gerekir. Ortam doğrulaması cPanel kayıtları ve mevcut uygulama `.env` dosyalarından yapılır; değerler terminale yazılmaz. Web public API adresi, WEB_ORIGIN, mevcut CAPTCHA/anahtarlar ve mutlak olarak çözümlenen mevcut STORAGE_DIR doğrulanır. Yeni storage yaratılmaz.
2. **`reuse-live-exact` politikası**: bütün doğrudan runtime bağımlılıklarının gerçek kurulu sürümleri kaynak lock ile karşılaştırılır. API'nin mevcut üretilmiş Prisma istemci şeması kaynak şemayla aynı olmalıdır. Mismatch durumunda canlıya `npm install`, `npm update`, Prisma generate veya migration uygulanmaz.
3. İki nodevenv ağacının bağımsız özel kopyası ve SHA-256/izin/link manifesti alınır. `.env`/başlangıç/Apache kuralları ayrıca 0700 alanda yedeklenir. Bunlar DB veya kullanıcı storage yedeği değildir; mevcut işletim yedekleri yerinde kalır.
4. Temiz, `.env` içermeyen özel workspace hazırlanır. Kilitli build araçları yalnız burada `npm ci --include=dev` ile kurulur. API/Web'in build kopyalarına canlı nodevenv'nin doğrulanmış kopyaları yerleştirilir. Hiçbir build symlink'i canlı nodevenv'ye yönelmez. Böylece test edilen runtime ile yayında kullanılacak runtime aynıdır. Kaynak/build adımları sırayla çalışır.
5. API build ve Web build `KS_LOW_RESOURCE_BUILD=1`, Next **1 worker**, kapalı webpack build worker/worker threads/memory-based worker, **1536 MiB** Node heap, UV threadpool=1, npm jobs=1 ve kapalı telemetry ile yürür. EAGAIN veya herhangi bir hata otomatik tekrarlanmaz; canlı dosyalara geçilmez. CloudLinux toplam süreç/RAM kotası garanti edilmez. Her yeni deneme benzersiz özel alanda tutulur.
6. Worker/lib/font/asset, Next BUILD_ID/server/route manifestleri, statik/PDF dosyaları, izinler ve Next runtime trace dosyaları denetlenir. Bir runtime modülü yalnız build araçlarında bulunuyor ve değiştirilmeyen Web nodevenv'sinde karşılığı yoksa yayın reddedilir. Kaynak veya canlı nodevenv/ayarlar hazırlık sırasında değişirse aday hazır sayılmaz.
7. Monorepo sürüm metadata'sı **yalnız özel build kopyasında** Web'in kendi `package.json` dosyasına bağlanır. Next trace içindeki davranış taşımayan CommonJS package metadata'sı da uygulamanın kendi metadata sınırına eşlenir; imports/exports/ESM davranışı varsa bu eşleme reddedilir. Ürün kaynak dosyası/hover değişmez ve `/home/kurums22/package.json` oluşturulmaz. Canlı uygulama manifestlerinde custom scripts/dependency alanları korunur; yalnız sürüm alanı 1.4.3 olur.

Özel derleme günlükleri `.manual-deploy/<id>/logs/{npm-ci,api-build,web-build}.log` altında **0600** tutulur. Hata çıktısı terminale dökülmez; başarısız adım, EAGAIN varsa bu kod ve günlük yolu bildirilir. Nodevenv yedekleri ve adaylar otomatik silinmez.

### Next sürüm uyuşmazlığı

Kaynak lock şu an **15.5.28** içerir; gerçek sunucudaki sürüm bu çalışma sırasında okunmadı. Örneğin nodevenv'de 15.5.29 varsa komut sürüm çiftini gösterip **uygulamaları durdurmadan** çıkar. 15.5.28 ile build edip 15.5.29 ile çalıştırma veya bağımlılıkları canlıya otomatik yeniden kurma yapılmaz.

Bu durumda mevcut bilgilerle v1.4.3'ü güvenli biçimde tek komutla yayımlamak mümkün değildir: kaynak lock ile korunacak runtime arasında kontrollü bir sürüm kararı gerekir. Kaynak lock'un mevcut runtime'a uyarlanması veya nodevenv için ayrı yedekli, doğrulanmış bir bağımlılık bakımı farklı bir değişikliktir. Sırf yayını geçirmek için kontrolü kaldırmayın. Hizmet veren v1.4.2 bu hazırlık hatasından etkilenmez.

## Aktivasyon ve otomatik hata geri dönüşü

1. Kaynak, aday dosyalar, nodevenv içeriği/link hedefleri, özel yedekler ve Passenger/ortam ayarları tekrar doğrulanır. Bozuk aday veya eksik disk alanı varsa **durdurma yapılmadan** çıkılır.
2. Native Selector ile önce Web, sonra API durdurulur. İki kaydın `stopped` olması, hesap süreçlerinin uygulama köklerinden boşalması ve Web `/login` ile API `/api/health` adreslerinin gerçekten engellenmiş HTTP yanıtı vermesi gerekir. `/proc` görülemiyorsa, süreç kalıyorsa, stop başarısızsa veya HTTP hâlâ 200 dönüyorsa dosya değiştirilmez. Çalışan süreçler zorla öldürülmez.
3. Durdurulmuş canlı runtime'ın en güncel yedeği alınır ve manifesti SHA-256 ile işlem günlüğüne bağlanır. İki uygulamanın yönetilen kod/artifact dosyaları değiştirilir. Her rename öncesi kalıcı günlük yazılır. Eski/başarısız dosyalar özel `.manual-deploy/<id>` alanına alınır; silinmez. Uygulama kökleri ve node_modules bağlantıları yerlerinde kalır.
4. Native Selector bazı hosting sürümlerinde stop/start sırasında `.htaccess` durumunu geçici değiştirebilir. Betik bu dosyaları kendisi yazmaz. Başlangıç/env dosyaları geçiş boyunca, `.htaccess` dosyaları da uygulamalar yeniden başladıktan sonra eski içerik ve izinleriyle doğrulanır. Ayar farkı başarı olarak kabul edilmez.
5. Önce API başlatılıp yeni sürüm/health doğrulanır; sonra Web başlatılır. Web sürümü, PDF araç HTML/JS/PDF.js dosyaları, o build'in Next JS/CSS dosyalarında HTTP 200, MIME ve içerik SHA-256 kontrol edilir. Cache'in eski asset döndürmesi başarı sayılmaz.
6. Hata durumunda iki uygulamanın aynı v1.4.2 artifact yedeğine otomatik dönüşü denenir. Geri dönüşün sağlık kontrolü de başarısızsa iki uygulama tekrar durdurulur; başarı kaydı yazılmaz. Native kontrolün kendisi erişilemiyorsa uygulamaların gerçek durumunu operatör doğrulamalıdır.

Bu yöntem kısa **iki uygulamalı kesinti** gerektirir. İki kökün değişimi tek atomik işlem veya sıfır kesintili yayın değildir. Açık tarayıcı sekmeleri geçişte hata görebilir. Canlı trafik varken dosya dosya kopyalama veya yalnız `restart.txt` ile bu pencere gizlenmez.

## Geri dönüş ve tekrar çalıştırma

`rollback`, kayıtlı kökleri ve yedeği doğrular; iki uygulamayı durdurur, Web/API kodunu birlikte geri kurar ve eski health sözleşmesiyle kontrolleri yapar. v1.4.2 health yanıtında sürüm bulunmadığından eski `status:ok` yanıtı kabul edilir; öncesinde eski süreçlerin bittiği ve geri konan artifact hash'leri zaten doğrulanmıştır.

- Nodevenv'ler bu sürüm tarafından değiştirilmediği için otomatik dependency restore yapılmaz. Dışarıdan değiştirilmiş nodevenv veya farklı Passenger/anahtar ayarı varsa rollback körlemesine devam etmez. Eski bağımlılık kopyaları kanıt/kurtarma için özel alanda vardır; bunların ayrı geri yüklemesi işletim incelemesidir.
- Storage, uploads, `.env`, JWT/TXT/MFA anahtarları ve Neon kayıtları eski tarihe alınmaz. Hazırlıktan sonra oluşan kullanıcı dosyaları korunur. DB reset/seed/migration/restore yoktur.
- Aynı başarılı kaynakla ikinci deploy sağlık/durum kontrollerinden sonra dosya değiştirmeden çıkar ve v1.4.2 yedeğini korur. Rollback tekrar edilebilir. Yarım işlemin üstüne yeni deploy yapılmaz; aynı rollback komutu istenir. Ani SIGKILL/host kaybında anında otomatik geri dönüş garanti edilmez.
- Çalışan kilit zorla kırılmaz. Ölü PID kurtarması ayrı kilitle serileştirilir; eski kilit ve yedekler tutulur. Sonraki yayın/geri dönüş eskileri yanlışlıkla silen bir temizleme adımı içermez.

## Doğrulama kapsamı

Yerel testler, gerçek dosyalar üzerinde sentetik ayrı Web/API/nodevenv yapısı ve simüle edilmiş Selector/HTTP davranışları kullanır. Gerçek Selector, Passenger süreçleri, Veridyen izinleri, URL'ler ve Neon test edilmedi. Uygulama kodu/hover değişmediği için tüm ürün/DB test paketi tekrar çalıştırılmadı. Sonuçlar [Veridyen uyumluluk raporundadır](v143-veridyen-deployment-report.md).
