# v1.4.8 · 26 Kasım 2026 · yerel kabul

Commit, push, canlı dağıtım, Neon bağlantısı ve Search Console işlemi yapılmadı. Mevcut GitHub → cPanel dağıtımı korundu. Test verisi ve kodlar sentetiktir; gerçek öğrenci kodu kaynak, fixture veya rapora yazılmadı.

## Sonuç ve nedenler

1. **Öğrenci numarası:** Önceki `/student-portal/lookup-number` uygulaması, sonuç aramadan her zaman `requiresVerification` dönüyordu. Yeni akış il/ilçe/etkin kurum doğrulamasından sonra aynı ekranda yalnız yayımlanmış sonuç özetini gösterir. Mevcut `examView(..., true)`, numara çakışma denetimleri ve herkese açık sonuç projeksiyonu kullanılır. Kimlik şifreleri, cevap snapshot’ı, kişisel PDF, asistan, kişisel geçmiş veya oturum token’ı dönmez. Kurumlar ayrı kapsamdır; çakışan farklı öğrenciler için sorgu reddedilir.

   Repoda kurumun numarayla paylaşım iznini tutan bir alan bulunmadı. Kurum tercihini aşmamak için `School.publicNumberLookup` eklendi; **varsayılan kapalıdır**. Öğrenci Erişim Kodları ekranında yetkili yönetici, kurum adı ve sonuç özetinin kimlere açılacağını belirten onayla etkinleştirir. Ayar kurum/rol denetimli transaction ve audit kaydıyla değişir. İlçe listesinde kodu olmayan etkin kurumlar da kalır. Alt seçim temizliği, AbortController ile eski yanıtın elenmesi, yükleme/boş/hata durumları korunur.

2. **Kod biçimleri:** `studentReportAccessCode` 16 karakterli, kurum + sınav + öğrenci kapsamlı HMAC kabiliyetidir. `portalCode` 24 karakterli rastgele kişisel kod üretir. Önceki giriş alanındaki 24 karakterlik tarayıcı şartı kaldırıldı. Tek alan uç boşluklarını temizler, harfleri korur. 16 karakterli kod mevcut insan doğrulaması ve `/public-results/resolve` üzerinden kendi yayımlanmış sınav özetini açar; kişisel JWT verilmez. 24 karakterli kod mevcut portal girişini, PDF ve asistan yetkilerini kullanır. İkinci uzun eski kod formu eklenmedi; koddan bulunan kurumu kullanıcı tekrar seçmez. Eski kodun mevcut dar kapsamlı sunucu PDF yolu genişletilmedi.

3. **Kod yönetimi:** Eski “0 öğrenci”, sonuçlardaki öğrenci sayısı değil, seçili kurum/yıl için önceden oluşturulmuş portal sayısıydı. Kurum/yıl seçmek kendiliğinden kişisel kod üretmiyordu. Ekran şimdi bunu “kod bağlanmış öğrenci” olarak açıklar; numara araması baştaki sıfırları kullanıcı aramasında tolere eder ve kayıtta kaynak numarasını korur. Aday sınavlar tarihleriyle listelenir. Seçim ve görünür onay kutusu tamamlanmadan kod düğmesi açılmaz. Yıl, sonuç tarihi üzerinden tahmin edilmez; kurum seçili sonuçların o akademik yıla ait olduğunu açıkça doğrular. İstek durumları, başarı/hata ve yeniden yükleme vardır; eski liste yanıtları elenir. Excel/PDF düğmeleri bütün kodları yenilediğini açıkça söyler ve onayda kurum, yıl, öğrenci sayısı, eski kod/oturumların kapanacağı gösterilir.

4. **Tamamlanma bildirimi:** Boş kayıtlar ve sıfır değerli tanılama cümleleri uyarı sayılmaz. Gerçek uyarılar ile pozitif eksik oturum/mükerrer/reddedilen satır sayaçları birlikte değerlendirilir. Sıfır satırlar ve boş uyarı ayrıntısı kaldırıldı. Eklenen/güncellenen/değişmeyen özeti ile Sonuçları göster/Kapat düğmeleri korundu. Başarısız istek başarı penceresi açmaz.

5. **Açık uçlu demo:** İlk özellik sahnesidir. Soru ayrı; öğrenci cevabı üç satırlık temsili el yazısı görselidir: `4x = 20`, `x = 5`, `y = 8 − 2 · 5 = −2`. Aynı saat yeşil çizgiyi, okunan satır vurgusunu ve basılı metni sürer; ardından 3 + 3 + 4 ölçüt puanı, en son 10/10 görünür. Süre 13 saniyeden 6,5 saniyeye indi. Kompakt kart, bir kez oynama, son durumda kalma, durdurma ve yeniden oynatma vardır. Azaltılmış harekette son durum doğrudan gösterilir. Başlık/açıklama ve iki geliştirme/örnek etiketi korundu. Gerçek OCR/HTR/puanlama servisi eklenmedi.

   Yeni asset: `apps/web/public/open-ended-solution-v148.webp`, 960 × 640. Built-in ImageGen ile oluşturulup mevcut Sharp ile WebP olarak kodlandı; prompt `docs/v148-image-prompt.txt` içindedir. Eski soru fotoğrafı silinmedi. İmajın HTTP 200, `image/webp` ve RIFF baytları doğrulandı. Hata ve erken yükleme hatasında okunabilir yerel metin yedeği vardır. Mevcut deploy betikleri `apps/web/public` ağacını zaten aktarır; yeni görsel bu ağaca alındı. Canlı cPanel’deki önceki kırık görselin transfer/cache kök nedeni uzaktan yeniden üretilmedi.

6. **Asistan:** İkinci özellik sahnesidir; üç örnek aynı sabit alanda sırayla gösterilir. Hızlı yazma, anında yanıt, 420/500 kartı, 3 sınav/12 soru/5 yanlış kazanım özeti ve 68 → 72 net çubukları tutarlıdır. Örnek öğrenci verileri etiketi korunur; kişisel API çağrılmaz. Eski optik sahnesi aşağıda kalır.

7. **Alt bölümler:** Yalnız panel alt bilgisi marka ve oranı 3:2 bayrakla düzenlendi. Sürüm aynı paket kaynağından otomatik gelir; panelde tam `2026 - 2027` yazılır. Mobil Yardım düğmesi için alan ayrıldı. Ana sayfada blog altı 70 → 35 px (dar görünümde 24 → 12 px), footer üst payı 70 → 35 px (mobil 40 → 20 px), geçiş 300–400 → 150–200 px oldu. İçerik küçültülmedi/kırpılmadı, footer sabit yüksekliğe bağlanmadı. Geçiş bağlantılardan önce koyulaşır; sürüm tarihi kontrastı korunur.

8. **Sitemap:** Mevcut sitemap’e `https://kurumsalsinav.com/calisma-plani` eklendi. Kişisel sonuçlar, panel ve kod bağlantıları eklenmedi. `/sitemap.xml` HTTP 200/geçerli XML, `/robots.txt` doğru kanonik sitemap ve API kapalıyken temel sayfaların kalması yerelde doğrulandı. Yayın sonrası Search Console’a gönderilecek adres: **https://kurumsalsinav.com/sitemap.xml**. Search Console’da işlem yapılmadı.

## Doğrulama

- `npm test`: **325/325** geçti; sıfır/gerçek uyarı birim testi dahil.
- API TypeScript üretim derlemesi geçti. Web üretim derlemesi geçti. Mevcut `styles.css:850` Autoprefixer `start` uyarısı sürüyor; yeni derleme hatası yok.
- `v148-http.cjs`: gerçek Express/Prisma, yalnız `127.0.0.1:55478/ks_v148_acceptance`. İki kurumda aynı numara, paylaşım kapalı/açık, yayımlanmamış sonuç, yanlış kurum, 16/24 karakterli geçerli/geçersiz/iptal kod, kişisel oturum oluşturulmaması, kod oluşturma/yenileme/iptal, Excel/PDF, eski oturumun kapanması, rol/kapsam izolasyonu, kişisel PDF/asistan ve transaction rollback kontrolleri geçti.
- `v148-browser.cjs` → `v148-ui.py`: gerçek Chromium/üretim Web. Numarayla aynı akışta sonuç, eski yanıt/boş/hatalı kurum listesi, yönetimden kod oluşturma/yenileme, bu kodla öğrenci girişi, gerçek Excel/PDF indirmeleri; 320/390/1440 px, açık/koyu tema, tarama/metin eşzamanı, durdurma/yeniden oynatma, sabit asistan alanı, hareketi azalt, görsel yedeği, panel marka/bayrak/yıl ve footer kontrolleri.
- `v148-evaluation-ui.py`: gerçek panel seçimleriyle yalnız preview/evaluate yanıtları kontrollü olarak değiştirilir. Altı öğrenci/sıfır uyarı başarı, gerçek uyarı başarı ve başarısız işlem ayrı sınanır. Bunlar yeni gerçek değerlendirme servisleri değildir; başlık kararının kabul testidir.
- `check:static -- --with-build` ve `git diff --check` geçti. Public dosya izinlerinde hata yok. Görsel/HTTP kanıtları `test-results/v148` altındadır; sentetik token/kod içeren seed, ekran görüntüsü ve indirmeler paylaşılmaz/Git’e eklenmez.

Canlı v1.4.7 hesabı/veritabanı üzerinde yönetim ekranı arızası ve canlı resim URL’si test edilmedi. Kaynak nedenler yerelde incelendi ve yerel eşdeğer akışlar sınandı. Fiziksel telefon/cPanel transferi/gerçek CAPTCHA sağlayıcısı bu kabul kapsamına girmez. Yerel kurulu Next **15.5.28**, mevcut manifest/lockfile Next **15.5.29** istiyor; bağımlılık yükseltmesi yapılmadı. Yayın ortamı lockfile ile `npm ci` kullanmalı.

## Değişen dosyalar

- API: `apps/api/src/public-results.ts`, `student-portal.ts`, `apps/api/prisma/schema.prisma`, `migrations/20261126120000_public_number_lookup/migration.sql`.
- Öğrenci/panel: `apps/web/app/student-portal.tsx`, `panel/student-code-management.tsx`, `panel/optical-evaluation.tsx`, `panel/page.tsx`, `release-mark.tsx`, `apps/web/lib/evaluation-warnings.ts`.
- Ana sayfa/statik: `apps/web/app/home-demos.tsx`, `styles.css`, `v146.css`, `sitemap.ts`, `apps/web/public/open-ended-solution-v148.webp`.
- Yardım kontrollerinin mevcut envanter sözleşmesi: `panel/help-controls.json`, `docs/v139-help-inventory.json`; yeni kontrollerin kimlikleri mevcut üreticiyle eşitlendi.
- Sürüm: kök/Web/API `package.json`, `package-lock.json`, statik `index.html`, `CHANGELOG.md`.
- Test/belge: `tests/v148.test.ts`, `tests/run.ts`, `tests/e2e/v148-{env,http,serve,browser}.cjs`, `v148-ui.py`, `v148-evaluation-ui.py`, `tests/e2e/README.md`, eski default-kapalı paylaşım beklentisi düzeltilen `student-evaluation-http.cjs`, bu rapor ve görsel promptu.

İş başında var olan FMT/PDF editörü değişiklikleri, `page.tsx` karne `?v=2` değişikliği, `home-report.webp`, `docs/mobile-menu-fix.md`, v142/v145 raporları ve PDF çıktı klasörleri korundu.

## Manuel yayın

Yeni bağımlılık yok. **Bir yeni migration gerekir**: mevcut şemada bulunmayan kurum paylaşım iznini güvenli, varsayılan kapalı biçimde saklar. Bu rapordaki komutlar bu görevde canlıda çalıştırılmadı.

Mevcut GitHub → cPanel/Veridyen yayın akışında migration dosyasını API ile aktarın; API’nin kendi ortamı/veritabanı için mevcut `prisma migrate deploy` ve `prisma generate` adımlarını uygulayın. Web ve API’yi birlikte 1.4.8 olarak yayınlayın; Web’i gerçek HTTPS API adresiyle ve lockfile bağımlılıklarıyla yeniden derleyin. `apps/web/public/open-ended-solution-v148.webp` dosyasının aktarımını ve HTTP content-type yanıtını kontrol edin. Buradaki localhost build yayın artifact’ı değildir.

Kurum yöneticisi, numarayla paylaşmak istediği kurum için Öğrenci Erişim Kodları → Öğrenci numarasıyla sonuç paylaşımı ayarını bilinçli olarak açmalıdır; migration tüm kurumlara izin vermez. Önceki 16 karakterli kodların indeks kaydı eksikse mevcut `security:index-public-codes` bakım betiği yalnız yetkili yayın sorumlusu tarafından mevcut yönergesiyle değerlendirilir; bu görevde canlı indeksleme yapılmadı.

Sonrasında salt okunur HTTP kontrolleri: sağlık/sürüm, `/sitemap.xml`, `/robots.txt`, görsel asset. Canlı öğrenci/kod testi yalnız kuruma ait kontrollü test hesabıyla yapılmalı. Yeni migration alanı geri dönüşte bırakılabilir; eski uygulama kullanmaz. Şema geri almak için kolon silmek gerekli değildir.
