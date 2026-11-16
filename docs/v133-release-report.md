# Kurumsal Sınav v1.3.3 — Teknik güncelleme raporu

**Tarih:** 16 Kasım 2026. **Durum:** yerelde uygulanmış ve test edilmiş kod değişiklikleri; canlı yayın yapılmadı. Yeni bağımlılık veya Prisma migration yoktur. Kullanıcı verileri, canlı veritabanı, hosting, GitHub depo adı ve puanlama kuralları değiştirilmedi. Git push/commit yapılmadı.

## 1. Kapsam ve yöntem

Frontend, Express API router'ları, kimlik/oturum/2FA, bayi/kurum/öğrenci/veli kapsamları, optik/Excel içe aktarma, sonuç revizyonu/yayın/erişim, sıralama/PDF ve Prisma/Passenger yapılandırması incelendi. v1.3.2'nin test altyapısı yeniden çalıştırıldı; yeni bulgular için regresyon ve gerçek HTTP senaryoları eklendi.

Çalışma Node **24.22.1**, npm, PostgreSQL **16-alpine** ve Playwright Chromium üzerinde yapıldı. Makinenin varsayılan Node 18.19.1'i projenin >=20.9 sözleşmesinin dışındadır. İlk denemede 230/232 test geçti, Sharp kullanan iki test Node 18 sözdizimi desteği nedeniyle başarısız oldu. Uyumlu çalışma zamanına geçildikten sonra eski v1.3.2 sürümünü sabit bekleyen bir test güncellendi. Son sonuçlar aşağıdadır; bu ilk denemeler başarı diye sayılmadı.

Test DB'si yalnız **127.0.0.1:55442/ks_v132** üzerinde, bu iş için başlatılan geçici **ks-v133-test** Docker konteynerindeydi. Diskte kullanıcı DB/dosya mount'u yoktu. Web/API yalnız localhost'ta çalıştı. Testler sentetik veya önceden anonimleştirilmiş fixtures kullandı; kök `.env` içeriği raporlanmadı ve canlı DB'ye bağlanılmadı.

Bu inceleme bağımsız pentest, bütün olası yetki kombinasyonlarının kanıtı veya ticari kapasite garantisi değildir. Önceki denetimin kapsamı: [v1.3.2 güvenlik raporu](v132-security-audit.md).

## 2. Düzeltilen güvenlik ve işlev hataları

| Bulgu | Uygulanan düzeltme | Doğrulama |
|---|---|---|
| Yönetici temsil oturumu, ana yöneticinin güvenilir cihaz iptalinden sonra kullanılabiliyordu. | Ana oturumun rolü, MFA kanıtı ve varsa cihazın sahiplik/iptal/süre/credential sürümü her istekte denetlenir. | Birim testi: iptal, süre sonu, yanlış sahiplik, eksik MFA; gerçek PostgreSQL/HTTP: ana ve çocuk oturum birlikte 401. |
| 2FA açık bayi için oturumdaki ikinci faktör kanıtı açıkça zorlanmıyordu. | Doğrudan 2FA oturumunda MFA veya geçerli cihaz şartı; temsil oturumu ana yöneticinin doğrulamasına dayanır. | Mevcut gerçek bayi MFA giriş/iptal testleri ve temsil regresyonu. |
| Kritik yönetici doğrulamasının session sahibine/rolüne bağlılığı helper içinde eksikti. | Aynı yönetici, SUPER_ADMIN rolü ve doğrudan oturum şartı eklendi. | Başka kullanıcı ve temsil oturumu negatif testleri. |
| MFA kurulumu parola denemeleri yalnız IP sınırına dayanıyordu. | Mevcut IP sınırına ek olarak hesap bazlı ortak faktör limiti kullanılır. | TypeScript/build ve mevcut MFA kabulü; ayrı dağıtık enrol brute-force yük testi yapılmadı. |
| Devre dışı veya bağı koparılmış kurum yöneticisi mevcut oturumunu kullanabiliyordu. | SCHOOL_ADMIN için ilişkili aktif kurum zorunlu. | Gerçek HTTP: aktif kurumda giriş, kurum kapanınca ve schoolId kaldırılınca 401. |
| SCHOOL_ADMIN yabancı schoolId ile sınav oluşturduğunda spread sırası ID'yi kendi kurumuna çeviriyordu. | İstenen kurum ve yetki kapsamı Prisma AND ile birleşir. | Yabancı kurum 404; kendi kurumunda ek kayıt oluşmadığı DB'den doğrulandı; doğru kurumda 201 korunur. |
| API analitik alıcısı istemcideki sabit yol filtresinden daha geniş yollar kabul ediyordu. | API'de aynı sabit public allowlist; özel/dinamik/rastgele yollar alınmaz. | Liste eşitliği/negatif birim testleri ve gerçek HTTP/DB'de rastgele yolun kaydedilmemesi. |
| Excel satır sınırı parser'da sessiz truncation oluşturabiliyordu. | Bir ek satır sentinel olarak okunur; `!fullref`/`!ref` ile aşım reddedilir. | 10.001 veri satırlı CSV'nin hata vermesi ve gerçek XLS/XLSX round trip. |
| Seyrek fakat çok geniş Excel alanı `sheet_to_json` ile aşırı büyük diziler oluşturabilirdi. | Dönüşümden önce satır/sütun, sayfa sayısı ve toplam hücre alanı sınırı. | 257 sütunlu XLSX negatif testi; önceki ZIP/boyut testleri. |
| Sistem Merkezi eski sürüm ve yanlış migration durumunu gösterebiliyordu. | API sürümü package.json'dan; migration kontrolü son güvenlik migration'ını ve tamamlanmamış kayıtları tüm geçmişte arar. | API build/Passenger smoke; gerçek cPanel migration ekran kabulü yapılmadı. |

Kimlik doğrulama JWT HS256 allowlist'i, DB oturumu/credential sürümü, password-change iptali, Origin/CORS, API no-store ve güvenlik başlıkları korunur. SQL sorguları Prisma veya parametreli tagged template kullanır; kaynak taramasında raw unsafe SQL çağrısı görülmedi. Bu, gelecekteki sorgular veya her SQL injection varyantı için garanti değildir. XSS incelemesinde React metin escape'i ve JSON-LD `<` kaçışları korunur; sessionStorage token modelinin XSS'e bağımlılığı devam eder. CSRF için bearer/Origin ve güvenilir cihaz çerezi nitelikleri; brute force için ortak PostgreSQL limitleri; IDOR için kapsam/grant/kod denetimleri mevcut testlerle sınandı.

Yetki yaklaşımında [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), Excel satır sınırı davranışında [SheetJS parse seçenekleri](https://docs.sheetjs.com/docs/api/parse-options/) birincil referans olarak incelendi.

## 3. Roller ve panel erişimleri

Prisma'da yalnız **SUPER_ADMIN, DEALER, SCHOOL_ADMIN, STUDENT, PARENT** rolleri var. Yayınevi ve bölge ayrı login rolü değildir: yayınevi katalog/sınav nesnesi; bölge bayi için yayınevi/il/ilçe yetki kuralıdır. Kullanıcının talebindeki bu süreçler mevcut gerçek veri modeli kapsamında değerlendirildi; var olmayan panel test edilmiş gibi raporlanmadı.

- Yönetici: zorunlu ilk MFA, oturum/cihaz/kurtarma, kritik işlem doğrulaması, bayi yetkileri, sınırlı temsil sekmesi.
- Bayi/çalışan: aynı bayi kapsamı; diğer bayinin kurum/sonuç/TXT/PDF/Excel/hesap verilerinin reddi; yedi işlem izni, bölge ve günlük kota yarışları.
- Kurum: eski sınav liste/oluşturma akışında yalnız kendi kurumuna erişim; yönetici/bayi optik uçlarına 403; kapalı veya ilişkisiz kurumda 401. Kurum optik yetkisi genişletilmedi.
- Öğrenci/veli: kişisel sonuç grant'i, yayın/güncel revizyon/aktif kurum koşulları, başka grant ile PDF alamama, öğrenci kimliği ve veli çoklu bağlantı kuralları.
- Misafir: kişisel kod + öğrenci bilgisi; global kurum/sınıf dizini kapalı.

Gerçek Express envanteri **195 yöntem/yol** içeriyor. **156 özel yöntem** anonim erişimi, tüm yönetici yöntemleri bayi erişimini reddetti. Envanter taraması tek başına bütün nesnelerin sahipliğinin kanıtı değildir; ayrıca iki bayi ve kişisel grant senaryoları çalıştı. Yeni endpoint veya rol eklenmedi.

## 4. Performans ve kaynak kullanımı

### Sıralama ve rapor erişimleri

`examView` sonuçları kurum başına tekrar tekrar filtrelemek yerine tek Map'te gruplar. Öğrenci sonuç/konum erişimleri indekslidir. Genel/il/ilçe/kurum/sınıf puan listeleri bir kez sıralanır; sıra ikili aramayla bulunur. Önceki öğrenci başına grup taramasının yerine yaklaşık **O(N log N + M log N)** hesap kullanılır. M seçilen kurum öğrencileri, N sınav grubu öğrencileridir; DB/snapshot birleştirme maliyeti buna dahil değildir.

Korunan semantik: aynı anahtar fingerprint'i, sınıf seviyesi, tam kurum/il/ilçe metni, null puanlıların katılım sayısına dahil olması, eşitlik ve **1e-8** toleransı, küçük çapraz kurum ortalamalarının gizlenmesi. 12 kurum/1.026 öğrenci üzerinde bütün sıralama alanları bağımsız eski tarama hesabıyla karşılaştırıldı. Ek 10.000 kişilik ölçümde bütün 1.000 kurum öğrencisinin genel sıralaması eski hesapla aynı çıktı.

Sentetik tek süreç ölçümü (`tests/e2e/v133-performance.cjs`):

| Toplam öğrenci | Kurum öğrencisi | Yeni bütün sıralama grupları | Eski yalnız genel sıra karşılaştırması | Süreç RSS |
|---:|---:|---:|---:|---:|
| 10.000 | 1.000 | 29,40 ms | 118,69 ms | 80 MB |
| 100.000 | 1.000 | 225,25 ms | Çalıştırılmadı | 120 MB |

Bunlar tek koşunun yaklaşık değerleridir; eski/yeni sütunlar aynı iş miktarı değildir. Gerçek API gecikmesi, HTTP throughput, DB RAM/CPU veya production kapasitesi diye yorumlanmamalıdır. Kaynak: `test-results/v133/performance.json`.

Excel/PDF öğrenci sıralamasında karşılaştırıcı içindeki `summary.find` kaldırıldı. Excel satırları, kartlar, klasik/profesyonel/tasarımlı PDF ve kurum/sınıf benchmark'ları Map erişimi kullanır. Puanlar yeniden formüle edilmedi.

### Toplu PDF

Referans karne üretiminde her öğrencinin tüm sayfaları tamamlanıp kendi `1/2`, `2/2` altlıkları yazıldıktan sonra PDFKit `flushPages()` çağrılır. Önceki öğrencilerin sayfa nesneleri yeni öğrenciye taşınmaz. Tasarım, A4 ölçüsü, vektör logo, grafikler, soru/kazanım metinleri ve öğrenci içi sayfa numarası korunur.

150 öğrenci / **300 sayfa** sentetik testinde en çok **2 sayfa nesnesi** tamponda kaldı; 300 sayfanın numaraları metinden doğrulandı. Çıktı **1.959.477 byte**, üretim yaklaşık **1.873 ms**. Bu koşuda RSS üretim öncesi 85 MB, üretim sonrası 211 MB, PDF.js metin denetimi sonrası 487 MB idi. Bunlar anlık RSS örnekleridir, peak veya eski sürüme göre RAM tasarrufu ölçümü değildir. Üretim hâlâ font/çıktı Buffer belleği ve senkron CPU kullanır; 150 öğrenci üstü ticari SLA çıkarılmaz. Kaynak: `test-results/v133/pdf-stress.json`.

### Korunan sınırlamalar

Ağır optik/rapor guard'ına sonuç düzenleme önizlemesi de eklendi. Limitler mevcut worker başına toplam 4/kullanıcı başına 2 iş olarak kaldı; dağıtık kuyruk değildir. Frontend güvenlik işlemlerine busy/disabled durumu eklenerek tekrar tıklama ve yinelenen istekler azaltıldı. Katalog bağımsız paralel yükleme, abort ve timeout davranışları korundu.

## 5. TXT, değerlendirme, Excel ve PDF doğruluğu

Mevcut anonim 7108, 8050, Özdebir tek/ayrı oturum, O8126 ve Ankara kaynak regresyonları yeniden çalıştı: A/B çaprazları, soru/anahtar/kazanım, boş/yanlış/doğru/net, iptal/herkese doğru, eksik oturum, tekrar satır/merge, ayrı dosya tamamlama ve profile özel katsayılar. Motor veya resmi olmayan puan profilleri değiştirilmedi.

Gerçek HTTP testleri TXT önizleme/onay/kayıt, şifreli arşivden geri okuma, tekrar değerlendirme, revizyon/yayın, kota ve PDF/Excel export akışlarını kapsadı. Sahiplik sınırları başarısız yüklemelerde de sınandı. Gerçek kaynağı anonimleştirilmiş fixture testi, tüm yayınevlerinin bütün olası TXT dosyalarının kabulü değildir.

Sunucu Excel sınırları:

- Giriş 10 MB; ZIP girdisi 20 MB ve toplam açılma 40 MB; mevcut ZIP dosya sayısı/şifreleme/yol kontrolleri korunur.
- Sayfa başına başlık dahil **10.001 satır**, **256 sütun**; en çok **64 sayfa**, toplam **2.000.000 dikdörtgen hücre alanı**.
- Fazladan satır sentinel olarak okunur; limit aşımında kısmi workbook çağırana verilmez. Dosya bölünerek yeniden yüklenir. Bu koruma mevcut içe aktarma şablonunu değiştirmez; aşırı büyük dosyalara açık hata verir.
- UTF-8 string boyutu byte ile ölçülür; kısa Buffer RangeError yerine anlamlı dosya hatası verir.
- Türkçe, boş hücre ve `00001` numarası gerçek XLS/XLSX yazılıp geri okunarak doğrulandı. Önceki cevap/kazanım/çapraz pano testleri geçti. Microsoft Excel masaüstü uygulaması çalıştırılmadı.

Karne testleri O8126 puan **471,550**, ders D/Y/net, altı ders, tam 87 kaynak kazanımı/kodları, 1/2 sayfa, uzun açıklama devamları ve toplu sayfa numaralarını kapsıyor. Kullanıcının açık tuttuğu anonim `output/pdf/v130/o8126-full-outcomes.pdf` yeniden üretilen fixture çıktısıdır; iki sayfa Poppler PNG'ye çevrilip görsel incelendi. Metin/tablolar/grafikler ve altlıklar görünür, A4 yerleşimi korunmuştu. Bu iki sayfanın görsel kontrolü 300 stres sayfasının tamamının tek tek görsel denetlendiği anlamına gelmez.

## 6. Arayüz ve sürüm

Güvenlik sayfası gerçek uygulamaya göre 2FA/oturum/cihaz iptali ve paneldeki şifreli TXT arşiviyle cihazda çalışan araçları ayırır. Ürün akışına teknik işletim ayarı eklenmedi. Hesap güvenliğinde yüklenme ve işlem durumu, action düğmelerinde disabled koruması vardır.

Footer/sürüm rozeti ve statik önizlemedeki görünür **Release Candidate** etiketleri kaldırıldı. Eski `/release-candidate` adresi mevcut yer imleri için v1.3.3 ürün güncellemesi sayfasını açmaya devam eder. Paketler/lockfile, favicon cache sürümü, OG görseli, Sistem Merkezi ve Test Merkezi raporu tutarlıdır. Tarihsel changelog/raporlar yeniden yazılarak geçmiş sürüm bilgisi silinmedi.

320/768/1440 px, açık/koyu tema testlerinde güvenlik, sürüm ve ana sayfalarda yatay taşma/görünür aday etiketi yok; tarayıcı pageerror listesi boş. Mevcut bayi paneli/MFA/temsil/kota/kişisel sonuç senaryoları da gerçek API ile çalıştı. Her paneldeki her düğmenin tüm veri durumları exhaustively sınanmadı.

## 7. Test sonuçları ve yerel kanıtlar

| Kontrol | Sonuç | Kanıt / kapsam |
|---|---|---|
| `npm test` | **238/238**, 0 fail/skip | `test-results/v133/regression.tap`; 232 mevcut + 6 yeni; bu suite DB taklitleri de kullanır. |
| `npm run test:report` | **238/238** | Test Merkezi JSON v1.3.3; sourceDigest eşleşen kabul dosyası ayrıca okunur. |
| `npm run build` | Başarılı | `test-results/v133/build.log`: Prisma generate, API tsc/assets, Next production build/TS. |
| Prisma validate | Başarılı | `test-results/v133/prisma-validate.log`. |
| Mevcut 20 migration → boş yerel DB | Başarılı | `test-results/v133/migrations.log`; canlı veya eski gerçek DB upgrade/restore testi değildir. |
| `npm ls --all --json` | Başarılı | `test-results/v133/dependencies.json`; vulnerability audit değildir. npm deprecation uyarısı ayrıca kaydedildi. |
| `tests/e2e/v132-security.cjs` | **22 grup**, 0 fail | Gerçek PostgreSQL/HTTP, 195 endpoint envanteri; güncel log `test-results/v133/security.log`. |
| `tests/e2e/v133-http.cjs` | **7 grup**, 0 fail | Kurum yöneticisi, cihaz/temsil iptali, analitik; `test-results/v133/http.log`. |
| `tests/e2e/v132-ui.py` | **9 grup**, 0 pageerror | Gerçek Web/API/DB; `test-results/v133/browser-v132.log`; ekranlar `test-results/v132/ui/`. |
| `tests/e2e/v133-ui.py` | **6 ekran/tema grubu**, 0 pageerror | Her grupta 3 public sayfa; `test-results/v133/ui/qa.json`, PNG'ler. |
| `tests/api-package-smoke.cjs` | Başarılı | Derlenmiş API, 90 soruluk XLS/XLSX, fontlu PDF, health ve Passenger listener sözleşmesi; gerçek Passenger servisi değildir. |
| `tests/e2e/v133-performance.cjs` | Başarılı | 10k eski hesap eşitliği, 100k sıralama; gerçek yük testi değildir. |
| `tests/e2e/v133-pdf-stress.cjs` | Başarılı | 150 öğrenci/300 sayfa, en çok 2 tampon sayfa; her sayfada doğru altlık. |
| `git diff --check` | Başarılı | Boşluk/hatalı patch kontrolü. |
| Güncel `npm audit` | **Tamamlanamadı** | İlk girişim ağ/DNS nedeniyle çalışmadı. Registry'ye dependency metadata gönderen ayrı girişim otomatik onay denetimince reddedildi. Başarılı/0 açık diye raporlanmaz. |

Test kanıtları Git dışında kalır; v132 yardımcı betikleri sahte hesap token'ları, MFA QR/kurtarma görüntüleri üretir. Bunları herkese açık rapora/GitHub'a eklemeyin. Test Merkezi yalnız aynı sourceDigest için kabul kanıtını kullanır; çalıştırılmayan diğer e2e betikleri `not_run` kalır.

## 8. Değişen dosyalar

| Alan | Dosyalar |
|---|---|
| Kimlik/kurum/yetki | `apps/api/src/auth.ts`, `auth-sessions.ts`, `security-routes.ts`, `server.ts` |
| Sıralama/rapor/PDF | `apps/api/src/result-rankings.ts` (yeni), `result-routes.ts`, `result-pdf.ts`, `report-benchmarks.ts`, `result-reference-pdf.ts`, `result-professional-pdf.ts`, `result-designed-pdf.ts`, `heavy-work.ts` |
| Excel/analitik/sistem | `apps/api/src/upload-security.ts`, `analytics.ts`, `system-center.ts`, `version.ts` (yeni) |
| Web/ürün | `apps/web/app/panel/account-security.tsx`, `verilerinizin-guvenligi/page.tsx`, `release-candidate/page.tsx`, `release-mark.tsx`, `opengraph-image.tsx`, `layout.tsx`, `apps/web/config/site.ts`, `index.html` |
| Sürüm/paket | `package.json`, `package-lock.json`, `apps/api/package.json`, `apps/web/package.json` — yalnız sürüm, bağımlılık değişmedi |
| Testler | `tests/v133.test.ts` (yeni), `tests/run.ts`, `tests/formats-v111.test.ts`, `tests/build-test-report.cjs`, `tests/e2e/v133-http.cjs`, `v133-ui.py`, `v133-performance.cjs`, `v133-pdf-stress.cjs` (yeni), `apps/api/assets/test-center-report.json` |
| Belgeler | `PROJECT_MEMORY.md` (yeni), `CHANGELOG.md`, `README.md`, bu rapor |

Prisma şema/migration dosyaları, hosting ve `.env` dosyaları değiştirilmedi. Başlangıçta untracked olan `output/pdf/v126`, `v130`, `v132` klasörleri silinmedi; testler anonim fixture çıktılarını yeniden üretti. Kullanıcı dosyalarını otomatik commit'e alma/temizleme işlemi yapılmadı.

## 9. Migration ve dağıtım

**v1.3.2 → v1.3.3 için yeni migration gerekmez.** Daha eski kurulumdan geliniyorsa önce [v1.3.2 geçiş raporu](v132-release-report.md) okunmalıdır: bekleyen migration'lar, ayrı MFA anahtarı, ortak limiter ve eski kişisel kod indeksleme adımı geçerlidir. Bu çalışmada yalnız boş sentetik DB'ye mevcut zincir uygulandı; eski canlı DB'ye uygulanmadı.

Yayın operatörü staging/yedek kabulünden sonra Node 22 veya doğrulanan uyumlu Node, mevcut kilit dosyasıyla kurulum, API/Web build ve manuel dağıtım yapmalıdır. JWT/TXT/MFA anahtarları ve özel dosya yolu korunur. `prisma generate` DB değiştirmez; `migrate dev/reset/db push/seed` canlıya uygulanmaz. Gerçek API URL'si Web build öncesi tanımlanır. Passenger başlatma yolu ve font/lib/assets dağıtıma dahil edilir.

Kod geri dönüşünde veri migration'ı olmadığı için v1.3.2 artifact'ına dönüş mümkündür; bu, güvenlik düzeltmelerini geri alır. Anahtar veya veri silerek geri dönüş yapılmaz. Sağlayıcı/depo adı değişikliği ve otomatik deployment yoktur.

## 10. Açık sınırlar ve sonraki işler

1. **Güncel bağımlılık açığı kontrolü açık:** npm registry'ye paket/sürüm metadata aktarımı için kullanıcı izni sonrası audit tekrar çalıştırılmalı. Onay denetimi ret gerekçesi dış aktarım yetkisiydi; farklı araç/dolaylı yoldan atlatılmadı. Önceki sürümün temiz audit'i güncel sonuç yerine kullanılmadı.
2. **Büyük ölçekte uçtan uca kabul açık:** sıralama iyileştirilse de `examView` aynı sınavın güncel snapshot'larını belleğe alır; öğrenci merge/optik tekrar değerlendirme senkron ve bazı alanlarda tekrarlı tarama kullanır. Yüz binlerce öğrenci için HTTP+DB+TXT+PDF birlikte staging yük testi gerekir.
3. **Toplu PDF bounded page buffering ile sınırlı:** tüm çıktı Buffer'ı/font alt kümeleri ve CPU maliyeti devam eder; worker guard cluster genelinde değildir. Revizyon/yetki kapsamlı asenkron iş kuyruğu, kontrollü dosyaya streaming ve iş timeout/idempotency ayrıca tasarlanmalıdır. Bu sürümde mevcut hosting için bağımlılık/mimari zorunluluğu eklenmedi.
4. **Excel CPU izolasyonu yok:** ZIP/alan sınırları bellek riskini azaltır; SheetJS ve inflate senkron çalışır. XLS/ZIP edge-case fuzzing ve worker izolasyonu gelecekte değerlendirilebilir. İstemci tarafında açılan her büyük dosyaya bu sunucu limitlerinin uygulandığı iddia edilmez.
5. **Canlı işletim doğrulanmadı:** Neon pooled/direct bağlantı yetkileri, cPanel/CloudLinux/Passenger gerçek limitleri, proxy zinciri, WAF, TLS, SMTP, Google CAPTCHA/GA/GTM hesapları, yedekleme/PITR ve gerçek restore kabulü operatör/staging işi olarak kalır.
6. **Platform/ürün kabulü açık:** gerçek Windows ve Microsoft Excel, tüm tarayıcılar ve bütün buton/veri kombinasyonları çalıştırılmadı. Gerçek Limit PDF kabulü ve tarihsel profile özel 0,001 gösterim farkları önceki raporlardadır; puan kuralları bu sürümde değiştirilmedi.

Kalıcı devam bilgisi [PROJECT_MEMORY.md](../PROJECT_MEMORY.md) içinde tutulur. Yerel test sunucuları ve bu işe ait geçici PostgreSQL konteyneri iş sonunda durdurulur; kullanıcı/canlı servisler üzerinde temizlik yapılmaz.
