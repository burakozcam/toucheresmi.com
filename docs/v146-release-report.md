# v1.4.6 — yerel uygulama ve kabul raporu

24 Kasım 2026. Commit, push, canlı sunucu veya üretim Neon migration'ı yapılmadı. Oturum başında bulunan `page.tsx`, FMT çalışma alanı, PDF editörü, örnek karne görseli, v142 raporu, e2e README ve takip edilmeyen v145 raporu/PDF çıktıları korundu. Ana sayfadaki bu görev kapsamındaki footer çağrısı mevcut değişikliklerin üzerine dar biçimde eklendi.

## Uygulanan yedi madde

1. **Panel logosu:** yalnız koyu kenar çubuğundaki markaya kapsamlı açık zemin, özgün lacivert K ve mavi alan adı. Eski genişliği sıfırlayan yazma animasyonu bu logoda kapatıldı; tam `kurumsalsinav.com` iki temada görünür.
2. **Araçlar bildirimleri:** mevcut Announcement/AnnouncementRead kayıtları ve görünürlük kuralları yeniden kullanıldı. Bildirim başına tek kimlik/hedef; erişilemeyen hedefler sayılmaz. Duyurular/Takvim gibi alt satırlar ve kapalı ana başlık aynı benzersiz toplamı gösterir. Okuma olayı hemen yeniler, arka planda 15 saniye/focus yenilemesi vardır. Sıfırda rozet yoktur.
3. **Rol rozeti:** `/api/account` ile doğrulanmış rol üzerinden Süper Admin, Bayi, Kurum, Öğrenci, Veli, Geçici Erişim etiketleri. Rozet yetki vermez; sunucu denetimi sürer.
4. **Destek:** Destek Talebi Oluştur/Taleplerim ve yalnız Süper Admin'e Destek Gelen Kutusu. Kategori/konu/açıklama, hata halinde formu koruma, gönderim durumu ve talep numarası; kategori/durum filtreleri, yanıt ve durum geçmişi. Bir JPG/PNG/WebP, en çok 5 MB; sunucuda MIME/uzantı/imza ve decode sınırı. Mevcut `STORAGE_DIR`, `validateSupportedUpload` ve özel yol koruması kullanılır. Görsel metadatası temizlenerek WebP saklanır, klasör 0700/dosya 0600. Görsel ve talep yalnız sahibi/Süper Admin'e açıktır. Sürüm bazlı okundu kaydı eşzamanlı yeni yanıtı yanlışlıkla okundu saymaz. Kullanıcı adı/rolü/kurum-bayi ve kullanıcı ajanından tahmini cihaz/OS/tarayıcı; güvenilir marka işareti yoksa Belirlenemedi. Ülke verisi altyapıda olmadığı için Belirlenemedi; konum izni/harici takip yok.
5. **Oturum ekranı:** ekran boyu tek zemin, mevcut kilit çizimi, yalnız sabit Şifreniz örneğinin soldan yıldızlara dönüşümü. Gerçek sır/oturum verisi bileşene verilmez. Beklerken kilit kapalı; gerçek başarıda kilit açılırken panel bekletilmeden gösterilir. Hata/retry/giriş yönlendirmeleri ve reduced motion korunur.
6. **Ana sayfa kapanışı:** yalnız `SiteFooter home` çağrısında yumuşak lacivert geçiş, düzenli alt bağlantılar ve ortalanmış büyük marka. Diğer sayfaların footer'ı ve panel içerik tasarımı değiştirilmez.
7. **Geçici Üyeler:** normal üyeler listesinden ayrı; tek birimde kompakt süre seçenekleri, sunucu saatine bağlı sabit bitiş, kapsam seçimi ve iptal. Desteklenen kapsamlar FMT deneme parser'ı ve tarayıcıdaki PDF araçlarıdır. Gerçek FMT/öğrenci/kurum deposu açılmaz. Geçici rol admin/bayi rolünü devralmaz; merkezi `requireAuth` izin listesi diğer API'leri varsayılan kapatır. 12 karakter kriptografik kod + ayrı 256 bit tek kullanımlık bağlantı anahtarı yalnız hash olarak saklanır. Açık değerler yalnız oluşturma/yenileme sonucunda gösterilir; sonraki paylaşım açık yeni kod/bağlantı işlemidir, süre uzamaz. GET/OG anahtarı harcamaz; parça kimliği (`#key=`) HTTP'ye gitmez, istemci hemen URL'den temizleyip ayrı POST ile değiştirir. Satır kilidi, tek kullanımlık işaret ve mevcut AuthSession oluşturma aynı transaction'dadır. Kod yeniden kullanılabilir; iptal/süre bitimi her sunucu isteğinde açık oturumları da geçersiz kılar. WhatsApp yalnız hazır mesaj açar, alıcıyı ve gönderimi kullanıcı seçer. OG kartı her alıcıya aynı, kişisel bilgi/sır içermez.

## Değişen dosyalar

- API: `prisma/schema.prisma`, `prisma/migrations/20261124180000_v146_support_temporary/migration.sql`, `src/{auth,server,announcements,temporary-core,temporary-access,support,panel-notifications}.ts`.
- Web: `app/panel/{page,session-gate,support-workspace,temporary-members,temporary-fmt,announcements}.tsx`, `lib/{access-labels,panel-navigation}.ts`, `app/login/page.tsx`, `app/temporary-login.tsx`, `app/gecici-giris/{page,direct-login,opengraph-image}.tsx`, `app/{layout,page,site-footer,ui-icon}.tsx`, `app/v146.css`, `next.config.ts`.
- Mevcut yardım envanteriyle yeni kontroller kaydedildi: `app/panel/help-controls.json`, `docs/v139-help-inventory.json`. Otomatik envanter 822 kararlı kontrol içerir.
- Sürüm: kök/Web/API manifestleri, lockfile, statik `index.html`, `CHANGELOG.md`. Lockfile'da yalnız sürüm kayıtları değişti; bağımlılık güncellemesi yok.
- Test: `tests/v146.test.ts`, `tests/run.ts`, `tests/e2e/v146-{env,http,serve}.cjs`, `tests/e2e/v146-ui.py`, e2e README ve bu rapor/yayın notu.

## Doğrulama

- **322/322** birim/regresyon geçti. Yeni süre/son gün, kriptografik değerler, varsayılan kapalı kapsam ve benzersiz bildirim toplama kontrolleri dahil.
- **10 HTTP/DB kabul grubu** geçti: gerçek bayi/kurum parola girişi; iki kullanıcıyla talep/görsel izolasyonu; 5 MB, bozuk/MIME uyumsuz/ikinci dosya reddi; yönetici yanıtı/durum/geçmiş/okundu; duyuru toplamı; geçici kod ve doğrudan yasak API'ler; GET güvenliği/eşzamanlı tek kullanımlı link; açık oturum dahil iptal/yenileme; sahte saatle süre bitimi; sunucu deneme limiti ve DB/audit içinde sır bulunmaması.
- **7 Chromium kabul grubu** geçti: iki tema logo ve Admin/Bayi rozeti; kapalı/açık Tools toplamı ve okuma; hata halinde formu koruyan gerçek destek/görsel/yanıt; kompakt süre/WhatsApp içeriği; genel OG önizleme, doğrudan mobil link girişi ve tekrar kullanımda kodla giriş; bekleme/hata/hızlı başarı oturum ekranı; mobil/masaüstü iki tema ana sayfa altı. JS sayfa hatası yok.
- Son üretim build’inde `verify-release.cjs --api http://localhost:4046 --web http://localhost:3146 --build-dir apps/web/.next --version 1.4.6` gerçek yerel API/Web ile başarılı oldu; API sürümü, panel manifest adı ve JS SHA-256 eşleşti. Bu sonuç canlı Veridyen doğrulaması değildir.
- v1.4.5 dağıtım/cache/gerçek HTTP doğrulama regresyonu **33/33** geçti. `quick-deploy.cjs` ve `verify-release.cjs` davranışı korundu.
- Migration zinciri yeni, yalnız localhost PostgreSQL 16 test veritabanına başarıyla uygulandı. Prisma Client yerelde üretildi. API/Web tip kontrolleri, API paket build'i, Web üretim build'i ve statik dosya izin kontrolleri geçti.

Kanıtlar Git dışında `test-results/v146`: `http-checks.json`, `browser-checks.json`, tema/rol/destek/geçici erişim/footer görüntüleri. `ui-seed.json` yalnız sentetik test oturumları/anahtarı içerir; paylaşılmaz. Test DB `127.0.0.1:55466/ks_v146_acceptance`, storage `/tmp/ks-v146-storage`, API 4046/Web 3146. Test dosyası farklı DB adresini reddeder. Tarayıcı dış HTTP(S) isteklerini engeller.

## Sınırlar ve yayın

- Gerçek Veridyen/Passenger/Neon ve gerçek WhatsApp mesaj gönderimi denenmedi. WhatsApp hazır mesaj URL'si ve genel OG kartının HTTP 200/kişisel veri içermemesi doğrulandı; WhatsApp'ın kendi önizleme cache'i ayrıca kontrol edilmelidir.
- Ülke verisi yoktur; Belirlenemedi gösterilir. Cihaz/OS/tarayıcı kullanıcı ajanından tahmindir ve yetkilendirme için kullanılmaz.
- Yerel Next kurulumu 15.5.28, kaynak/lock 15.5.29; mevcut paketler bu görevde yükseltilmedi. Yerel Web build'i `http://localhost:4046` ile oluşturuldu; canlıya taşınmaz.
- **Migration ve canlı Prisma Client generate zorunludur ve quick-deploy'dan önce operatör tarafından yapılmalıdır.** Kaynak Prisma dosyalarının gerçek API dizinine aktarılması, mevcut CLI doğrulaması, komutlar, NPROC'nun dört aşaması ve geri dönüş sınırları [manuel yayın notunda](v146-manual-deployment.md) yazılıdır.
