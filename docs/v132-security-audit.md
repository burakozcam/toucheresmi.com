# v1.3.2 güvenlik denetimi

Tarih: 16 Kasım 2026. Kapsam: yerel kaynak kod, mevcut Git geçmişi, API, Web, Prisma şeması/migration, depolama yardımcıları ve dağıtım yapılandırması. Test verileri sentetiktir. Canlı Neon, cPanel, Passenger, gerçek kullanıcı hesapları ve gerçek öğrenci verileri kullanılmadı; dağıtım yapılmadı.

## Sonuç ve kanıt sınırı

Test edilen akışlarda A bayisi B bayisinin kurumunu, öğrencisini, sonucunu, hesabını, TXT dosyasını veya PDF/Excel raporunu alamadı. Ters yöndeki sahiplik kontrolü de sınandı. Bu sonuç, aşağıdaki test kapsamına dayanır; bütün olası saldırılara karşı güvenlik garantisi değildir.

- Gerçek Express uygulamasında 195 açıkça tanımlı HTTP yöntem/yol çifti envanteri çıkarıldı. 156 özel yöntem anonim istekleri reddetti; yönetici yöntemleri bayi rolünü reddetti. Ayrıntılar: [endpoint envanteri](v132-endpoint-inventory.md). Bu test tek başına nesne sahipliği testi sayılmaz.
- Gerçek PostgreSQL 16 ve HTTP ile 22 senaryo grubu: iki bayi, aynı bayinin çalışanı, dört kurum, öğrenci/veli, yayınevleri, gerçek optik motoruyla sentetik 7108 TXT, kota yarışları, yayın/silme/sürüm, 2FA, kurtarma, cihaz, temsil ve IDOR matrisi. Kaynak: `tests/e2e/v132-security.cjs`; yerel kanıt: `test-results/v132/api.json`.
- Gerçek Web/API/DB ile 9 tarayıcı senaryo grubu; 320/768/1440 piksel, açık/koyu tema, ilk yönetici 2FA kurulumu, ayrı sekmede temsil, izin iptali, kişisel sonuç kodu. JavaScript sayfa hatası: 0. Kaynak: `tests/e2e/v132-ui.py`; kanıt: `test-results/v132/ui/qa.json`.
- 232 regresyon/birim testi; bağımsız RFC 6238 vektörleri, AES-GCM bütünlüğü, ZIP şişirme sınırları ve çerez seçenekleri dahil. Eski handler testleri altyapı doubles kullanır (`tests/unit-security-fixtures.ts`); bu doubles bayi izolasyonu veya transaction güvenliği kanıtı olarak kullanılmadı.
- Ayrı eski şema üzerinde migration testi: dört kurum korundu, mevcut sahiplikler taşınmadı, eski sahipsiz bayi kurumları mevcut oluşturucusuna bağlandı, yöneticiye ait sahipsiz kurum sahipsiz kaldı; varsayılan izin/bölge/kota ve DB sahiplik trigger'ı doğrulandı. Kaynak: `tests/e2e/v132-migration.py`.

## Doğrulanan bulgular ve düzeltmeler

Satırlar bu sürümün kaynak dosyalarına aittir. “Risk” düzeltme öncesindeki teknik etkiyi belirtir. Doğrulanmış kritik bulgu raporlanmadı; aşağıdaki yüksek riskler giderildi.

### G-01 — Bayi sahipliği için tutarsız kapsam / değiştirilebilir kurum ilişkisi — Yüksek

- Yer: `apps/api/src/dealer-policy.ts:13`, `apps/api/src/server.ts:165` kurum güncelleme şeması; `apps/api/prisma/migrations/20261116010000_dealer_security/migration.sql:199`.
- Neden ve bileşen: bazı eski kurum sorguları oluşturucu ve bayi ilişkisini farklı biçimde yorumluyordu; kurumun bayi alanı yönetim güncellemesine açıktı. Sahiplik ile oluşturucu aynı yetkilendirme kavramı değildi.
- Etki: hatalı ilişki değişikliğinde kurum ve bağlı öğrenci/rapor erişiminin başka bayiye taşınması veya aynı bayi çalışanlarının farklı erişmesi.
- Doğrulama: kaynak incelemesi, A/B ve çalışan HTTP matrisi; REST ve doğrudan SQL sahiplik değiştirme denemeleri.
- Çözüm: tek `schoolScope`, aktif kullanıcı/bayi doğrulaması, strict güncelleme şeması, oluşturma anında sunucudan bayi ataması; DB trigger ile mevcut `School.dealerId` değişikliğinin engellenmesi. Coğrafi değişiklik ayrı onay kaydıdır.
- Sonuç: yabancı kurum/sonuç/TXT/hesap/rapor erişimleri reddedildi; SQL sahiplik değişimi reddedildi.
- Kalan risk: DB sahibi trigger'ı kaldırabilir; üretim DB rolü ve yedek erişimi hosting üzerinde ayrıca sınanmadı. Uygulama rolünde DDL yetkisi verilmemelidir.

### G-02 — Yayımlanmış son sürüm ve okuyucu hesabı bağının tutarsız denetlenmesi — Yüksek

- Yer: `apps/api/src/reader-routes.ts:18`, `apps/api/src/reader-grants.ts:4`, `apps/api/src/result-edit.ts:18`, `apps/api/src/result-routes.ts:19`.
- Neden ve bileşen: okuyucu liste/detay/PDF akışlarının aktif kurum, silinme, yayın ve son sürüm koşulları farklıydı; düzenleme sırasında değişen öğrenci ID'sini körlemesine taşımak yanlış kişiye erişim verebilirdi.
- Etki: yayından kaldırılmış/eski/silinmiş sonuçlara erişim veya yanlış öğrenci bağlantısı.
- Doğrulama: gerçek öğrenci/veli hesaplarıyla liste, detay ve PDF; düzenlemeden sonra erişim taşıma; silme, geri yükleme, yeniden değerlendirme.
- Çözüm: ortak güncel/yayımlanmış görünüm, yalnız bağlı kişinin çıktısı; gerçek kaynak kimliğiyle tekil eşleşen grant taşıma, belirsizlikte reddetme. Yeni sürüm ve geri yükleme otomatik yayımlanmaz.
- Sonuç: eski/silinmiş/yayımlanmamış yollar reddedildi; doğru kişi bağlantısı korundu.
- Kalan risk: ilk optik kaydın kimlik doğruluğu kurum tarafından kontrol edilmelidir; isim benzerliği kesin kimlik kanıtı değildir.

### G-03 — Herkese açık kurum/sınıf dizini — Orta

- Yer: `apps/api/src/public-results.ts`, `apps/api/src/public-result-codes.ts:1`, `apps/web/app/sonuclar/page.tsx`.
- Neden ve bileşen: misafir sonuç formu için kurum ve sınıf listelerinin oturumsuz sunulması kurum isimlerini topluca açığa çıkarıyordu.
- Etki: kurum ve sınıf keşfi; diğer bayi kurumlarının isimlerine erişim.
- Doğrulama: eski dizin endpoint'leri ve kişisel kod çözümleme HTTP testleri.
- Çözüm: genel dizinler 403; mevcut kişisel erişim kodunun hash indeksinden yalnız kendi kurumunu bulma; mevcut kimlik/CAPTCHA doğrulaması sürer. İndekste öğrenci adı/numarası yoktur; güncel yayın tekrar doğrulanır.
- Sonuç: toplu keşif kapandı; kişisel kodla kendi yayımlanmış sonucuna erişim geçti.
- Kalan risk: kişisel sonuç kodu bir erişim kabiliyetidir; paylaşılmamalıdır. Yayını kapatma/silme erişimi keser. Önceden yayımlanan sonuçların kod indeksi canlı geçişte elle hazırlanmalıdır.

### G-04 — İptal edilebilir oturum ve yönetici ikinci faktör eksikliği — Yüksek

- Yer: `apps/api/src/auth.ts:11`, `apps/api/src/auth-sessions.ts:8`, `apps/api/src/security-routes.ts:36`, `apps/api/src/mfa-core.ts`.
- Neden ve bileşen: yalnız geçerli JWT imzası, çıkış ve güvenlik değişikliklerinde iptal denetimi sağlamıyordu; yönetici için zorunlu ikinci faktör yoktu.
- Etki: ele geçirilmiş token veya yönetici parolasıyla yetkinin sürmesi.
- Doğrulama: gerçek parola girişi, setup challenge rol/kapsam denemeleri, OTP, tek kullanımlık kurtarma tekrarı, eşzamanlı oturumlar, parola değişimi, cihaz süresi/iptali, bayi pasifleştirme.
- Çözüm: HS256 sınırı, sekiz saatlik DB session/JTI, her istekte aktiflik/rol/parola sürümü/iptal; MFA challenge için de güncel rol bağı; zorunlu yönetici ve isteğe bağlı bayi TOTP; ayrı anahtarla AES-256-GCM sır şifreleme, hash kurtarma kodları, atomik tekrar engeli. Güvenilir cihazın ham token'ı yalnız HttpOnly/Secure/SameSite=Strict çerezde, DB'de hash; 30 gün ve iptal edilebilir. Kritik yönetim için son beş dakikada gerçek faktör gerekir.
- Sonuç: geçerli imzalı eski token'lar iptal sonrası reddedildi; yönetici reset akışı yalnız yeniden kurulum challenge'ı döndürdü. Bayi pasifleştirme öğrenci/veli erişimini kesmedi.
- Kalan risk: uygulama bearer token'ı uyumluluk için sessionStorage'dadır; başarılı aynı origin XSS bunu okuyabilir. Güvenilir cihaz MFA yerine kritik işlem onayı sayılmaz. Fiziksel Authenticator uygulamasıyla telefon testi yapılmadı; standart TOTP ve tarayıcı kurulumu test edildi.

### G-05 — Yetki değişimi, kota ve eşzamanlı değerlendirme — Yüksek

- Yer: `apps/api/src/dealer-policy.ts:19`, `apps/api/src/optical-routes.ts:305`, `apps/api/src/rate-limit.ts:19`.
- Neden ve bileşen: yalnız arayüz veya işlem öncesi izin kontrolü, eşzamanlı kota güncellemesi ve işlem anındaki yetki değişimine karşı yeterli değildir. Mükerrer dosya sorgusunun yalnız ilk sürümü araması sonraki yükleme tekrarlarını kaçırıyordu.
- Etki: kapatılmış işlem yetkisinin kullanılması, limit aşılması, mükerrer sürümler/katılım.
- Doğrulama: eski oturumla yedi ayrı iznin iptali, eşzamanlı yeni öğrenci kayıtları, ayrı sözel/sayısal dosyalar ve aynı dosyayı tekrar gönderme; Türkiye gece yarısı birim testi.
- Çözüm: güncel politika, bayi satırı kilidi ve serializable kayıt transaction'ı; bayi/gün/kurum/sınav/öğrenci hash tekilliği; geçmiş kişi eşleşmesiyle oturum tekrarını ayırma. Başarısız/önizleme işlemleri kota yazmaz. Mükerrer dosya bütün sürümlerde aranır. Paylaşılan PostgreSQL rate limiter Passenger worker'ları arasında geçerlidir.
- Sonuç: kota yarışında yalnız izin verilen işlem kaydoldu; iki oturumda aynı iki kişi iki kez sayılmadı; aynı dosya tekrarına 409 ve kota artışı yok.
- Kalan risk: yüksek trafikte serializable 409 yeniden önizleme gerektirebilir. Ağ/CPU tüketimi tam olarak ortadan kalkmaz; ağır işlem sınırı worker başına dört, kullanıcı başına iki eşzamanlı iştir. Bu ticari kota değildir.

### G-06 — Yönetici temsilinin sınırlandırılması ve audit veri minimizasyonu — Orta

- Yer: `apps/api/src/dealer-routes.ts`, `apps/api/src/auth.ts:11`, `apps/api/src/server.ts:104`, `apps/api/src/result-edit.ts:18`, migration `:217`.
- Neden ve bileşen: yeni temsil özelliğinin sınırsız yönetici yetkisi taşımaması gerekir; eski düzenleme audit payload'ları ham öğrenci alanları içeriyordu. Genel audit bayi işlemlerinin tamamını kapsamıyordu.
- Etki: destek oturumunun yetki aşımı; gereksiz öğrenci verisinin işlem kayıtlarına çoğalması.
- Doğrulama: temsil ile admin/nesting/parola/MFA denemeleri; ana oturum iptali; gerçek tarayıcıda opener/token/hash kontrolü; eski audit migration testi.
- Çözüm: 15 dakika, yalnız hedef bayi, ana yönetici session'ına bağlı, güncel MFA; ayrı noopener sekme, başlangıç/bitiş ve gerçek yönetici kimliği. Bütün API yönetici/bayi yazmaları genel audit kapsamındadır; sonuç yazmaları transaction içinde faaliyet kaydı tutar. Yeni audit yalnız değişiklik sayısı/türü; geçmiş düzenleme audit'i redakte edilir.
- Sonuç: temsil yetki aşımı reddedildi; normal yönetici sekmesi korundu; geçmiş ham alanlar kaldırıldı.
- Kalan risk: genel HTTP finish audit'i asenkrondur; ani proses kaybında bu yardımcı kayıt eksilebilir. Sonuç değerlendirme/düzenleme/silme faaliyetleri transaction içindedir. Süresi dolarak kapanan temsil session'ı DB son kullanımıyla görünür; tarayıcı kapatma her zaman açık bitiş isteği gönderemez.

### G-07 — Workbook sıkıştırma ve depolama sınırları — Orta

- Yer: `apps/api/src/upload-security.ts:5`, `apps/api/src/outcome-file.ts`, `apps/api/src/optical-catalog.ts`, `apps/api/src/txt-archive.ts:20`.
- Neden ve bileşen: sıkıştırılmış XLSX'in dosya boyutu açılmış maliyetini göstermez; DB dosya yolunun da özel depolama kökünde kalması gerekir.
- Etki: bellek/CPU tüketimi; bozuk veya değiştirilmiş yol üzerinden dosya erişimi.
- Doğrulama: gerçek workbook, yalan açılmış boyut, traversal, şişirme limitleri, formül metin hücreleri; gerçek şifreli TXT indirmede byte eşitliği ve yabancı bayi 404.
- Çözüm: ZIP merkez dizin ve gerçek bounded inflate denetimi; 10 MB girdi, 20 MB üye, 40 MB toplam, 2.000 üye; şifreli/uygunsuz ZIP reddi; workbook HTML/formül yorumlama kapalı, 10.001 satır okuma sınırı. Özel kök containment; mevcut MIME/imza, rastgele dosya adı, TXT şifreleme/checksum ve geçici dosya temizliği korunur. Excel metin değerleri formül olarak yazılmaz.
- Sonuç: test örnekleri reddedildi veya literal metin olarak korundu; orijinal TXT byte'ları değişmedi.
- Kalan risk: bu bir antivirüs/CDR hizmeti değildir. İzinli PDF/görsellerde bütün kötü amaçlı içeriklerin yokluğu kanıtlanmadı. Depolama kökündeki symlink ve hosting dosya izinleri operatör kontrolündedir; depolama web kökü dışında olmalıdır.

### G-08 — İstemci/API korumaları ve hata yüzeyi — Orta

- Yer: `apps/api/src/server.ts`, `apps/web/next.config.ts`, `apps/api/src/security-errors.ts`, `apps/api/src/heavy-work.ts`.
- Neden ve bileşen: geniş proxy güveni, eksik header'lar, worker'a özel limitler, kontrolsüz ağır işlemler saldırı yüzeyini artırır.
- Etki: sahte istemci adresiyle limit aşma, özel içerik önbellekleme, çerçeveleme ve kaynak tüketimi.
- Doğrulama: foreign Origin mutasyonu, JWT rol sahteciliği, paylaşılan DB limiter, üretim çerez birim testi; CSP altında dokuz gerçek UI senaryosu.
- Çözüm: açık CORS origin, credentials, yabancı Origin mutasyon reddi, no-store özel API, nosniff/referrer/frame koruması, üretim HSTS, Web CSP ve exact proxy CIDR yapılandırması. Şemalar ve parametreli Prisma/SQL; şema/yetki hataları kontrollü yanıt, iç hata ayrıntısı istemciye verilmez.
- Sonuç: denenmiş Origin/rol/oturum saldırıları reddedildi; tarayıcı akışları geçti.
- Kalan risk: Web CSP React/Next başlangıç kodu için `unsafe-inline` içerir; nonce tabanlı tam CSP değildir. Gerçek TLS/CDN/cPanel header'ları, DDoS kapasitesi, sistem paketleri ve fiziksel dosya izinleri yerelden doğrulanamaz. Kaynak taraması tüm olası SQLi/XSS türlerinin bulunmadığını kanıtlamaz.

### G-09 — Bağımlılık açıkları — Yüksek / Orta

- Yer: `package.json`, `package-lock.json`, `apps/api/package.json`.
- Neden ve bileşen: önceki audit bağımlılık ağacında altı yüksek ve bir orta kayıt gösterdi; Nodemailer, Zod, PostCSS ve Prisma config'in deepmerge zinciri etkileniyordu. Paket sayısı, bağımsız sömürülebilir açık sayısı değildir.
- Etki: pakete/çağrı yoluna bağlı SMTP ayrıştırma, derleme/workbook doğrulama ve prototip işleme riskleri. Her duyurunun canlıda sömürülebildiği ileri sürülmez.
- Doğrulama: kullanıcının açık metadata paylaşım izniyle tam ve production `npm audit --json`; uyumlu güncellemelerden sonra test ve API/Web derlemesi.
- Çözüm: Nodemailer 10.6.0, Zod 4.6.7; PostCSS 8.5.33 ve deepmerge-ts 8.0.2 çözümlemesi için root overrides. Next 15.5.28 / Prisma 6.19.3 korundu; kontrolsüz `audit fix --force` kullanılmadı. QR yerel qrcode 1.5.4 ile üretilir.
- Sonuç: tam audit ve production audit: 0 bildirilen açık. Yerel JSON kanıtları `/tmp/ks-v132-audit-after.json` ve `/tmp/ks-v132-audit-production.json`.
- Kalan risk: sıfır audit sonucu bilinmeyen açık, OS/hosting açığı veya bütün kaynak kodun güvenli olduğu anlamına gelmez. SMTP teslimatı canlıda denenmedi.

## Diğer incelemeler ve doğrulanmayan alanlar

- Genel/il/ilçe/kurum/sınıf sıralaması yalnız aynı sınav anahtarı/fingerprint ve sınıf düzeyinden hesaplanır; diğer kurum öğrencileri yanıta konmaz. Farklı fingerprint ve aynı kişinin iki oturumu katılımı şişirmez. Küçük çapraz kurum ortalamaları beş kişi ve iki kurum eşiğiyle gizlenir. Gerçek katılımın ötesinde Türkiye nüfusu/sınav katılımı uydurulmaz.
- Önceki optik kitapçık, boş cevap, farklı FMT, Özdebir, puan/net/kazanım ve PDF regresyon testleri korundu. Yeni gerçek HTTP değerlendirme testi 7108 sentetik verisidir; her yayınevinin canlı TXT'si denenmedi.
- Yerel bütün Git ref'lerinde 1.385 metin blobu desenlerle tarandı; eşleşme 0. 71 binary/büyük blob atlandı. Değerler raporlanmadı. Bu, gizli değer bulunmadığı garantisi veya uzak GitHub hesabı/commit dışı dosyalar taraması değildir. `.env` içeriği rapora/test verisine kopyalanmadı.
- Davet/parola sıfırlama akışlarının mevcut hash/tek kullanımlılık kontrolleri ve regresyon testleri korundu; canlı e-posta teslimi ve dış servis yapılandırması sınanmadı.
- Canlı Neon rol/connection pool, SSL, yedek/PITR, gerçek backup restore, cPanel/CloudLinux/Passenger izolasyonu, güvenilir proxy adresleri, WAF ve log erişimleri operatör tarafından ayrıca doğrulanmalıdır. Yerel migration testi canlı yedeğin geri yükleme testi değildir.
- Soft delete geri dönüş içindir; hukuki kalıcı silme yerine geçmez. Yasal saklama süreleri, veri sorumlusu politikaları ve dış servis sözleşmeleri bu teknik test ile belirlenmedi.

## Referanslar

Yetki kontrolünde her istekte doğrulama ve varsayılan reddetme yaklaşımı: [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html). Oturum iptali ve çerez seçenekleri: [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). TOTP standardı ve test vektörleri: [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238). Bağımlılık duyuruları için birincil kaynaklar: [Nodemailer security](https://github.com/nodemailer/nodemailer/security/advisories), [Zod security](https://github.com/colinhacks/zod/security/advisories), [PostCSS security](https://github.com/postcss/postcss/security/advisories).
