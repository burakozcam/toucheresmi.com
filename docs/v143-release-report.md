# KurumsalSınav v1.4.3 — hover ve manuel dağıtım raporu

> **Güncel dağıtım yöntemi:** Aşağıdaki ilk hazırlığın monorepo/özel-hook kısımları, kullanıcının gerçek Veridyen yollarını vermesinden sonra değiştirildi. Ayrı Web/API ve nodevenv desteği, güncel komutlar ve son test sonucu için [Veridyen uyumluluk raporunu](v143-veridyen-deployment-report.md) ve [güncel dağıtım belgesini](v143-manual-deployment.md) kullanın. Aşağıdaki hover kabulü korunur.

23 Kasım 2026, Europe/Istanbul. Çalışma yerel kaynak ağacında bırakıldı. **Sunucu bağlantısı, gerçek deploy/rollback, Git commit/push ve veritabanı değişikliği yapılmadı.** v1.4.2'nin canlı artifact'larına, Passenger ayarlarına, ortamına veya Neon'a dokunulmadı. Önceden takip edilmeyen `output/pdf/v126`, `v130`, `v132` klasörleri korundu. Eski v1.4.2 raporu değiştirilmedi.

## 1. Hover tamamlandı mı?

**Evet, ortak Next arayüz katmanında tamamlandı.** Yeni `interactions.css`, kök layout'tan bir kez yüklenir. Yönetici/bayi aynı bileşen ve stilleri kullanır; mevcut buton işlevleri, rol kontrolleri, React handler'ları ve sayfa ölçüleri değiştirilmedi.

- Native butonlar, submit/reset kontrolleri, `.button` bağlantıları, mevcut buton tabanlı FMT/değerlendirme/PDF kartları ve uygun kart bağlantıları aynı etkileşimi alır. Gelecek özel tıklanabilir kartlar için `.interactive-card` ortak sınıfı vardır; semantik/klavye davranışı yine bileşenin sorumluluğudur.
- Fare destekli cihazda **200 ms**, **2 px** yükselme, tema uyumlu yumuşak gölge ve yüzey renk tonu; tıklamada **1 px** aşağı basılma. Kişiye/işleme özgü eski buton renkleri ve seçili kartın sınır/yan çizgisi korunur. Boyut/padding değiştirilmez; konumlandırılmış butonların mevcut `transform` değerleriyle `translate` birlikte çalışır.
- Light/dark değişkenleri, görünür klavye halkası, native disabled/`aria-disabled`/busy istisnaları ve reduced motion uygulanır. Reduced motion'da yükselme/basma hareketi ve geçiş yoktur; konumlandırma transform'ları korunur.
- Önceki `styles.css` hover kuralları da `(hover: hover) and (pointer: fine)` ile sınırlandı. Karma seçicilerdeki aktif/seçili/focus dalları dışarıda tutuldu. Sol menünün hover'da padding değiştirmesi ve yinelenen buton transform'ları kaldırıldı. Böylece mobilde yalnız yeni kuralları kapatıp eski yapışkan hover'ı bırakma sorunu önlendi.
- Ortak geçiş/gölge kurallarında sınırlı `!important`, eski yüksek özgüllüklü bileşen kurallarının süreyi ve ortak gölgeyi bozmasını engeller; global reset veya bileşenlerin yeniden yazımı yapılmadı.

## 2. Değişen dosyalar

| Dosyalar | Amaç |
|---|---|
| `apps/web/app/interactions.css` (yeni) | Ortak etkileşim, tema, disabled, touch ve reduced motion kuralları |
| `apps/web/app/styles.css` | Eski hover kurallarını fareye sınırlama, aktif/focus durumlarını koruma ve mükerrer hareketleri kaldırma |
| `apps/web/app/layout.tsx` | Ortak etkileşim CSS'ini yükleme |
| `apps/web/next.config.ts` | Yalnız `KS_LOW_RESOURCE_BUILD=1` durumunda tek worker/düşük kaynak build ayarı |
| `apps/api/src/server.ts` | `/api/health` yanıtına mevcut API sürümünü ve `no-store` başlığını ekleme; mevcut `status:ok` korunur |
| `scripts/manual-deploy.cjs` (yeni) | Açıkça başlatılan dağıtım, doğrulanmış yedek, kilit/günlük, iki servis aktivasyonu ve rollback |
| `scripts/deploy/config.example.json` (yeni) | Gerçek hosting yolları ve işletim komutları için sırsız örnek |
| `scripts/pdf-assets-preflight.cjs` | Önceki CLI korunarak PDF kontrolünü import sırasında çalışmayan, yeniden kullanılabilir fonksiyona dönüştürme |
| `tests/v143-deployment.test.cjs` (yeni) | Sentetik dosya sistemi / güvenlik / geri dönüş kontrolleri |
| `tests/e2e/v143-hover.py` (yeni) | Gerçek CSS ile izole Chromium etkileşim kabulü |
| `DEPLOYMENT.md`, `docs/v143-manual-deployment.md` (yeni), `docs/v143-release-report.md` (yeni) | Komutlar, ilk kurulum, kapsam, işletim sözleşmesi ve kanıtlar |
| `package.json`, `apps/api/package.json`, `apps/web/package.json`, `package-lock.json`, `index.html` | 1.4.3 sürüm metadata/etiketi; bağımlılık sürümleri değişmedi |

## 3. Test sonuçları

| Kontrol | Sonuç ve kapsam |
|---|---|
| `node tests/v143-deployment.test.cjs` | **21/21 geçti.** Yedek içerik/izin/link doğrulaması, bozuk yedek/manifest reddi, API/Web birlikte restore, tekrar rollback, yarım rename, önce yazılan günlük, canlı kilit/ölü kilit kurtarmasının serileştirilmesi, korunan ayar değişikliği, eksik build, yanlış yol/docroot, dış nodevenv symlink'i, eksik health/Neon referansı, bilinmeyen public kullanıcı dosyası ve gerçek kaynak/veri dosyalarının temiz hazırlanması. Yalnız `/tmp` fixture'ları; dağıtım CLI'si/hook/network çalıştırılmadı. |
| `python3 tests/e2e/v143-hover.py` | **12/12 kabul grubu geçti.** İki temada 14 temsilî gerçek CSS kontrolü (buton/link/kart/menü/portal/konumlandırılmış buton), hover/active/200 ms, ölçü/padding değişmemesi, disabled/aria-disabled/busy, klavye Tab ve focus-visible, reduced motion; 1440/768/390 px taşma kontrolü; mevcut örnek click/hash yönlendirmesi ve touch cihazda kalıcı hover olmaması. |
| `npm exec -w @optik/web tsc -- --noEmit` | **Geçti.** |
| `npm run build -w @optik/api` | **Geçti.** API worker/lib/asset çıktıları oluştu. |
| İzole Web üretim derlemesi | **Geçti.** `.env` içermeyen `/tmp/ks-v143-web-check-260c5f99-6cdf-4a32-834e-1fec8ab6e551` kaynak kopyasında, yalnız loopback API adresi, Node 22.23.5 / Next 15.5.28; `KS_LOW_RESOURCE_BUILD=1`, 1536 MiB heap ve UV=1. Next çıktısı `cpus:1`; 16 statik sayfa üretildi. Çalışma ağacındaki mevcut `.next` değiştirilmedi. |
| Üretim artifact kontrolü | **Geçti.** İzole yeni Web ve yerel yeni API çıktısında `assertArtifacts(...,'1.4.3')`; gerekli server/route dosyaları, worker ve varlıklar doğrulandı. |
| Statik ve PDF izinleri | **Geçti.** Kaynak public: **45 dosya / 6 dizin**, hata yok. İzole build static: **109 dosya / 38 dizin**, hata yok. **12 zorunlu PDF varlığı**, hata yok. İzinler değiştirilmedi. |
| `git diff --check`, betik syntax kontrolü | **Geçti.** |

Tarayıcı kanıtları `test-results/v143/hover/acceptance.json` ve altı tema/genişlik PNG'sindedir; bunlar Git dışında yerel test çıktılarıdır. İki temsilî ekran görüntüsü ayrıca görsel olarak incelendi. Testte ağ istekleri kapalıdır. Bu kabul gerçek oturumlu admin/bayi sayfalarının tüm işlevlerinin yeniden uçtan uca sınandığı anlamına gelmez; değişen ortak CSS'i izole eder.

İlk Chromium başlatması sandbox kısıtına takıldı; yerel, ağ erişimi kapalı tarayıcı testi sandbox dışında çalıştırıldı. Test fixture'ındaki font importu ayıklama ve tema/touch geçiş beklemeleri düzeltildikten sonra son kabul geçti. İlk izole build, paketleme listesindeki eksik `apps/web/data` dizinini ortaya çıkardı; gerçek kaynak listesi düzeltildi ve bunu koruyan bir test eklendi. Yerel test kopyasında ayrıca mevcut workspace bağımlılıklarının bağlantısı tamamlandı; dağıtımda bağımlılıkları zaten temiz `npm ci` kurar.

Build'de önceden var olan `align-items:start` Autoprefixer uyumluluk uyarısı ve buna bağlı Webpack cache uyarısı kaldı; derleme hatası yoktur. Son incelemede eski basılma transform'u kaldırıldıktan sonra odaklı tarayıcı kabulü tekrar geçti; bu tek CSS silmesi için bütün Web build'i tekrar edilmedi. Tam uygulama/DB test paketi ve audit kaynak tüketmemek için yeniden çalıştırılmadı; önceki sürümün test sayıları bu sürüme mal edilmedi.

## 4. Dağıtımı başlatan tek komut

İlk hosting yapılandırması ve staging kabulünden sonra, **sunucudaki canlıdan ayrı v1.4.3 kaynak dizininde**, doğru Node 22 PATH'iyle:

```bash
node scripts/manual-deploy.cjs deploy --config /home/CPANEL_USER/ks-ops/deploy.json
```

## 5. Geri döndüren tek komut

Aynı ayrı kaynak dizininden ve aynı yapılandırmayla:

```bash
node scripts/manual-deploy.cjs rollback --config /home/CPANEL_USER/ks-ops/deploy.json
```

`CPANEL_USER` gerçek hesap adıyla değiştirilir. Örnek dosya tek başına hazır hosting yapılandırması değildir: [ilk kurulum ve Passenger bakım/stop/restart sözleşmesi](v143-manual-deployment.md) tamamlanmalıdır. Gerçek sunucu kökleri, iki Passenger Node seçimi, dış nodevenv bağlantıları, bakım bypass'ı, Neon restore point ve LVE/izin/HTTP davranışı sunucuya bağlanılmadığı için doğrulanmadı. Betik bunları varsayıp v1.4.2'yi değiştirmez; desteklenmeyen veya eksik yapılandırmada durur. Bu nedenle sonuç **yerel geliştirme ve doğrulanabilir dağıtım hazırlığıdır**, canlı yayın kabulü değildir.

## Dağıtım güvenliğinin özeti

Betik canlıdan ayrı alanda API/Web'i sıralı derler; başarısız build'i etkinleştirmez. SHA-256 ve izin manifestli runtime/ayar yedeği, durdurulan iki süreç, dış bakım kapısı, önce yazılan işlem günlüğü, HTTP sürüm/MIME/JS-CSS içerik hash kontrolleri ve otomatik hata geri dönüşü vardır. Aynı başarılı kaynak ikinci kez yayımlanmaz; rollback tekrar edilebilir. Yedek/başarısız kopyalar otomatik silinmez. Ani süreç/host kaybında elle aynı rollback komutu gerekir. Dosya bakım araçları veya gerçek hosting entegrasyonu eksikse işlem durur.

`.env`, Passenger başlangıç/ayarları, kullanıcı uploads, özel storage, anahtarlar ve Neon verileri otomatik güncellenmez/geri yüklenmez. Uygulama yedeği DB/storage yedeği yerine geçmez. Yeni migration, seed/reset, sunucu Git pull'u, GitHub push'u, SSH bağlantısı veya otomatik zamanlayıcı yoktur. Dağıtım ve geri dönüş komutlarının ikisi de **bu geliştirme çalışmasında çalıştırılmadı**.
