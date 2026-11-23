# v1.4.3 — Veridyen ayrı Web/API ve nodevenv uyumluluk raporu

## Next 15.5.29 takip düzeltmesi — 23 Kasım 2026

- `apps/web/package.json` ve lock workspace kaydı Next **15.5.29**'a tam sabitlendi. Next, `@next/env` ve sekiz SWC paketinin adres/bütünlük kayıtları npm'in resmi registry metadata'sıyla güncellendi. Next dışındaki tüm lock paket kayıtlarının önceki hâliyle aynı kaldığı doğrulandı; React/React DOM **19.3.1** ve PostCSS dahil diğer bağımlılıklar yükseltilmedi.
- Mevcut `reuse-live-exact` nodevenv politikası değişmedi. 15.5.29 eşleşmesi kabul edilir; farklı sürüm ve hazırlıktan sonra değişen nodevenv yine reddedilir. Canlıya paket kurulumu eklenmedi. Bildirilen Node 22.23.3 için kayıt seçimi testi de geçer; gerçek sunucuda çalıştırılmadı.
- Ön kontrolde `TXT_STORAGE_KEY` zorunluluğu kaldırıldı. API config ve TXT arşiv kodu değiştirilmedi; mevcut `JWT_SECRET` fallback'i ve JWT zorunluluğu korundu.
- Gerçek ve örnek Veridyen yapılandırmasında yalnız gerçek Web/API document root'ları bırakıldı. `public_html → web` bağlantısı ayrı bir kök olarak zorunlu değil; bağlantı ve gerçek Web yolundaki `.htaccess` korunur.
- **İlgili testler: 39/39 geçti.** Ek kabul: gerçek sürüm çiftleri/nodevenv değişmezliği, Next alt paket/lock tutarlılığı, opsiyonel TXT anahtarı/JWT zorunluluğu ve public_html symlink'iyle gerçek yol koruması. İzole kopyada `npm ci --dry-run --ignore-scripts --offline` başarılı; o kopyada node_modules oluşmadı. Script syntax, JSON ve diff kontrolleri geçti.
- Hover, API config/TXT fallback ve mevcut Next ürün yapılandırması checksum'ları aynı. Yerel kurulu modüller değiştirilmedi; bu yüzden eski yerel Next ile yanıltıcı bir üretim build'i çalıştırılmadı. Sunucu bağlantısı, deploy/rollback, DB değişikliği ve Git commit/push yapılmadı.

Bu takipte değişen dosyalar: `apps/web/package.json`, `package-lock.json`, `scripts/deployment-preflight.cjs`, iki `scripts/deploy/*.json` yapılandırması, `tests/v143-deployment.test.cjs` ve bu iki dağıtım belgesi. Aşağıdaki ilk uyumluluk çalışmasının sürüm/build sayıları tarihsel kanıttır; güncel pin ve ön kontrol bilgisi bu bölümdür.

---

23 Kasım 2026, Europe/Istanbul. Bu takip çalışması yalnız dağıtım uyumluluğudur. **Hover, Next ürün yapılandırması, API işlevleri ve paket sürümleri bu turda değiştirilmedi.** Sunucuya bağlanılmadı; gerçek `prepare`/`deploy`/`rollback`, CloudLinux komutu, Git commit/push/pull veya veritabanı işlemi çalıştırılmadı.

## Sonuç ve uygulanabilir yöntem

Önceki betiğin tek canlı monorepo varsayımı ve beş özel bakım hook'u kaldırıldı. [Gerçek yapılandırma](../scripts/deploy/veridyen.json) kullanıcının verdiği yolları içerir:

- Kaynak `/home/kurums22/github-deploy`.
- Canlı Web `/home/kurums22/web`; bağımlılık hedefi `/home/kurums22/nodevenv/web/22/lib/node_modules`.
- Canlı API `/home/kurums22/api`; bağımlılık hedefi `/home/kurums22/nodevenv/api/22/lib/node_modules`.

Uygulama kökleri ve iki `node_modules` symlink'i korunur. Başlangıç dosyasının adı varsayılmaz; mevcut Selector kaydından bulunur. `.env`, başlangıç ve `.htaccess` dosyaları betik tarafından yazılmaz. Mevcut custom package scripts/dependency alanları korunur; uygulama manifestlerinde yalnız sürüm alanı 1.4.3 olur.

Yeni bakım servisi, proxy veya farklı runtime/release kökleri istenmez. Yedek/build/günlükler yalnız mevcut hazırlık deposu içinde **0700 `.manual-deploy`** alanına alınır ve Git dışında tutulur. Native Selector stop/start kullanılır; [cPanel'in kullanıcı terminali prosedürü](https://support.cpanel.net/hc/en-us/articles/360051943114-How-to-Start-and-Stop-a-CloudLinux-Node-JS-application-on-the-command-line) bu yöntemi belgeler. Aktivasyon kısa bir kesinti içerir; sıfır kesinti veya iki uygulamanın tek atomik işlemle değişmesi iddia edilmez.

## Kullanılacak tek komutlar

`kurums22` hesabında, hazırlanmış kaynak sürümü mevcutken:

**Yayınlama — gerekirse güvenli hazırlığı da kendi yapar:**

```bash
/home/kurums22/nodevenv/web/22/bin/node /home/kurums22/github-deploy/scripts/manual-deploy.cjs deploy
```

**Geri dönüş:**

```bash
/home/kurums22/nodevenv/web/22/bin/node /home/kurums22/github-deploy/scripts/manual-deploy.cjs rollback
```

Önce yalnız canlıya dokunmayan hazırlık istenirse, ilk komutun son sözcüğü `prepare` olur. Bu ek bir zorunlu dağıtım adımı değildir. `cd`, virtualenv activate, npm install veya Git pull komut zinciri gerekmez. Kaynağın sunucu hazırlık deposuna aktarılması bu betiğin dışındadır; otomatik Git işlemi eklenmedi.

## Kontroller ve bilinçli sınırlar

| Alan | Güncel davranış |
|---|---|
| Nodevenv desteği | Var olan mutlak/göreli kök linklerini doğrular, nodevenv ağaçlarını özel alana kopyalar ve hash'ler. Canlı dependency içeriği, linki veya seçili sürümü değiştirilmez. |
| Next uyuşmazlığı | Kaynak lock **15.5.28**; canlıdaki gerçek sürüm bu oturumda bilinmiyor. Örneğin canlı 15.5.29 ise sürüm çiftini bildirip uygulamaları durdurmadan çıkar. Farklı sürümle build/runtime eşleştirmesi veya otomatik canlı npm kurulumu yoktur. |
| Diğer bağımlılıklar | Doğrudan dependency sürümleri lock ile, tüm mevcut ağaçlar ise hazırlık/yayın arasında içerik hash'iyle doğrulanır. Mevcut generated Prisma şeması kaynakla eşleşmelidir; canlı generate veya migration yapılmaz. |
| EAGAIN | İzole sıralı kurulum/build, Next 1 worker, 1536 MiB heap, UV=1, npm jobs=1, kapalı worker threads/webpack build worker/memory-based workers. EAGAIN başarısızlıktır, otomatik tekrar yoktur. Başarısız hazırlık canlı dosya veya süreç durumunu değiştirmez. |
| Ayrı klasör paketi | Sürüm importu yalnız özel build kopyasında Web paketine bağlanır. Next trace'teki inert CommonJS package metadata'sı mevcut uygulama metadata sınırına taşınır. Imports/exports/ESM davranışı, build-only modül, eksik dosya veya eşlenmeyen trace varsa durur. `/home/kurums22/package.json` oluşturulmaz. |
| Passenger geçişi | Native stop → iki Selector kaydı stopped → hesap süreçlerinin boşalması → Web `/login` ve API `/api/health` HTTP engeli. Bunlardan biri doğrulanmazsa dosya değişmez. Zorla kill veya tek başına restart.txt kullanılmaz. |
| Apache/ortam koruması | Başlangıç/env dosyaları her aşamada doğrulanır. Native stop/start'ın geçici `.htaccess` yönetimine izin verilir; tekrar başladıktan sonra eski içerik/izin eşitliği gerekir. Betik bu dosyalara yazmaz. |
| Yedek/geri dönüş | Durdurulmuş runtime için SHA-256/izin/link manifestli son yedek, rename öncesi kalıcı günlük. Web/API birlikte geri kurulur. Eski/başarısız kopyalar ve dependency/ayar yedekleri özel alanda tutulur; otomatik silinmez. |
| Sağlık | API sürümü/health, Web sürümü, PDF araç HTML/JS/PDF.js dosyaları, Next JS/CSS HTTP/MIME ve içerik SHA-256. Sağlık hatasında otomatik iki uygulama rollback'i denenir; rollback sağlık hatasında uygulamalar tekrar durdurulur. |
| Tekrar çalıştırma | Başarılı aynı kaynakta ikinci deploy sağlık/durum kontrolüyle dosya değiştirmeden çıkar; v1.4.2 yedeği korunur. Rollback tekrar edilebilir. Yarım işlem önce rollback gerektirir. |
| Özel veri | Mevcut storage/uploads, `.env`, anahtarlar ve Neon eski tarihe alınmaz. Hazırlıktan sonra yazılan kullanıcı dosyaları korunur. Uygulama yedeği DB/storage yedeği olarak sunulmaz. |

**Gerçek ortamda güvenli geçişi engelleyebilecek koşullar açık bırakıldı:** Selector CLI/izinleri yoksa, stop süreçleri boşaltmıyorsa, `/proc` denetlenemiyorsa, HTTP kapısı kapanmıyorsa, Next/lock veya generated Prisma şeması farklıysa, runtime trace yalnız build araçlarında olan dosya gerektiriyorsa, kontrol dosyası değişmişse veya özel JS/MJS Next config için eşleme belirsizse yayın yapılmaz. Yeni hosting altyapısı kurmaya veya kontrol atlamaya zorlanmaz.

Özellikle Next mismatch'inde kaynak lock ile korunacak runtime için kontrollü bir sürüm kararı gerekir. Bu betik çalışan v1.4.2 bağımlılıklarını değiştirerek uyuşmazlığı gizlemez. Bu nedenle sunucu bilgileri okunmadan **koşulsuz çalışır canlı dağıtım** garantisi verilemez; `prepare` uygulanabilirliği tek komutla sınar. Tam işletim ayrıntıları [güncel prosedürdedir](v143-manual-deployment.md).

## Bu turda değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `scripts/manual-deploy.cjs` | Ayrı Web/API eşlemesi, read-only nodevenv yakalama, Selector keşfi/stop/start, kaynak/adaya bağımlılık doğrulaması, özel yedek, günlük, sağlık ve geri dönüş |
| `scripts/deploy/lib.cjs` (yeni) | Önceki güvenli dosya/hash/kilit/kaynak/artifact kontrollerinin ortak yardımcıları |
| `scripts/deploy/veridyen.json` (yeni) | Verilen gerçek sunucu yolları; sır veya özel hook yok |
| `scripts/deploy/config.example.json` | Eski monorepo/hook örneği yerine gerçek ayrı düzen |
| `tests/v143-deployment.test.cjs` | Yeni düzenin sentetik ve başarısızlık ağırlıklı kabul testleri |
| `.gitignore` | Özel `.manual-deploy` build/yedek/env/günlük alanını hariç tutma |
| `DEPLOYMENT.md`, `docs/v143-manual-deployment.md` | Güncel tek komutlar ve Native Selector prosedürü |
| `docs/v143-release-report.md` | Önceki dağıtım açıklamasının güncel takip raporuna yönlendirilmesi; hover kabulü aynı |
| `docs/v143-veridyen-deployment-report.md` (yeni) | Bu rapor |

İlk v1.4.3 çalışmasından kalan uygulama ve sürüm dosyaları yeniden değiştirilmedi. `output/pdf/v126`, `v130`, `v132` kullanıcı dosyalarına dokunulmadı.

## Gerçek yerel test sonucu

- **`node tests/v143-deployment.test.cjs`: 35/35 geçti.** Gerçek dosya sistemi fixture'larıyla ayrı kökler, mutlak/göreli nodevenv linkleri, yanlış hedef/unsafe iç link, Next patch/API dependency/Prisma farkı, Selector JSON ve startup keşfi, env/storage çakışması, protected dosyalar, özel startup altında dosya eşlemesi, bozuk yedek/aday, yarım rename, iki servis restore, kilit/ölü kilit kurtarması, stop/status/process/HTTP kanıtı, başarılı deploy/no-op, otomatik ve elle rollback, rollback health hatasında durma, değişmiş bağımlılık/ayar/yedek, EAGAIN hazırlık başarısızlığı, özel yol sınırları ve runtime trace/metadata eşlemesi test edildi.
- **İzole Next üretim build: geçti.** Önceki özel `/tmp/ks-v143-web-check-260c5f99-6cdf-4a32-834e-1fec8ab6e551` kopyasında yalnız split metadata uyarlaması ve mevcut hover dosyaları kullanıldı. Ortam temizdi; yalnız loopback API adresi ve düşük kaynak bayrakları verildi. Node 22.23.5 / Next 15.5.28, `cpus:1`, 16 statik sayfa; build ve tür kontrolü başarılı. Ürün çalışma ağacındaki `.next` korunuyor.
- **Betik syntax, JSON ve `git diff --check`: geçti.** Hover dosyaları (`interactions.css`, `styles.css`, `layout.tsx`) bu turda düzenlenmedi; test sonunda dosya checksum kontrolü de yapıldı. Hover tarayıcı kabulü ve tam API/DB paketi değişmeyen kod için tekrar çalıştırılmadı.

Derlemede önceden var olan CSS `align-items:start` Autoprefixer uyarısı ve buna bağlı Webpack cache uyarısı kaldı. İlk yerel test turundaki bir assertion, Türkçe hata metninin `yedeği` çekimine uymuyordu; test düzeltildi ve son 35 kontrol başarılı oldu.

Testlerde **gerçek deployment CLI'si veya gerçek Selector çalıştırılmadı**; kontrol ve HTTP katmanları simüle edildi. İzole build, gerçek Veridyen nodevenv kopyalarıyla yapılmadı; o ağaçlara bağlanılmadı. Dolayısıyla sunucudaki bütün trace/dependency eşleşmelerinin geçtiği iddia edilmez. Gerçek cPanel yetkileri, CageFS süreç görünürlüğü, stop/start'ın `.htaccess` davranışı, domainlerin HTTP yanıtları ve Node patch sürümleri ilk operatör `prepare`/`deploy` çağrısında denetlenecektir.

## Son durum

**Gerçek dizin düzenine uyarlanmış, yerelde test edilmiş dağıtım hazırlığı.** Çalışan v1.4.2'ye müdahale yapılmadı. Git commit/push, sunucu bağlantısı ve canlı/DB işlemi yoktur. Kullanıcının açıkça başlatacağı işlem dışında aktivasyon, zamanlama veya otomatik yayın mekanizması eklenmedi.
