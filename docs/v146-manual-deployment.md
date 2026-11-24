# v1.4.6 — manuel Veridyen yayını ve zorunlu migration

Bu çalışma canlı sunucuya veya Neon'a bağlanmadı. Aşağıdaki komutlar operatörün yayın sırasında yapacağı işlemlerdir; bu geliştirme oturumunda çalıştırılmadı. VS Code → operatörün GitHub push'u → cPanel pull → operatörün başlattığı dağıtım akışı devam eder. Otomatik push, GitHub Actions, migration veya canlı yayın eklenmedi.

## Önce yedek ve durdurma

1. Operatör Neon kurtarma noktası/yedeğini ve cPanel dosya yedeğini alır. API `prisma` dizinini, çalışan üretilmiş Prisma Client'ı/nodevenv'yi ve mevcut ayarları da kurtarılabilir yedeğe dahil eder. Kullanıcı storage'ı ve yeni `support` alt dizini özel saklanır.
2. Değişiklikleri inceleyip commit/push ve cPanel pull işlemlerini kendisi yapar. Kaynak `/home/kurums22/github-deploy`, canlı API `/home/kurums22/api`, Web `/home/kurums22/web` olarak kalır.
3. [v1.4.5 ölçüm yöntemini](v145-manual-deployment.md#nproc-ölçümü--dört-aşamada-aynı-yöntem) kullanarak **yayın öncesi** NPROC ve eski API PID/başlangıç zamanlarını kaydeder. Web'i, ardından API'yi durdurur; **durdurma sonrası** aynı ölçümü alır. Eski süreçler kalıyorsa aktivasyona geçmeden hosting durumunu inceler. `TOKIO_WORKER_THREADS=4` korunur.

## Migration ve Prisma Client — quick-deploy'dan önce

Yeni migration: `20261124180000_v146_support_temporary`. `Role.TEMPORARY`, `SupportStatus`, `SupportTicket`, `SupportUpdate`, `TemporaryAccess` ve indeks/ilişkileri ekler. Mevcut kullanıcı/sınav verisini silmez. **Bu adım atlanamaz.** `quick-deploy.cjs` migration veya Prisma generate çalıştırmaz.

Aşağıdaki komutlar için mevcut API nodevenv içinde kaynakla uyumlu **Prisma CLI** bulunmalıdır. Önce varlığını kontrol edin:

```sh
test -f /home/kurums22/api/node_modules/prisma/build/index.js
```

Yoksa durun; kaynak paket sürümüyle uyumlu Prisma CLI/üretim aracı hazırlığı ayrı operatör işlemidir. Yayını geçirmek için rastgele `npx prisma`, paket güncellemesi veya global kurulum kullanmayın. CLI varlığını bu oturumda canlıda doğrulamadık.

Uygulamalar durmuş ve yedekler alınmışken yeni şema/migration ağacını API'nin mevcut Prisma dizinine aktarın. Bu yol, generate çıktısının gerçek API node_modules bağlantısına gitmesini sağlar; hazırlık deposunda başka bir istemci üretmek yeterli değildir:

```sh
/home/kurums22/nodevenv/api/22/bin/node -e 'require("node:fs").cpSync("/home/kurums22/github-deploy/apps/api/prisma", "/home/kurums22/api/prisma", {recursive:true})'
cd /home/kurums22/api
/home/kurums22/nodevenv/api/22/bin/node /home/kurums22/api/node_modules/prisma/build/index.js migrate status --schema /home/kurums22/api/prisma/schema.prisma
/home/kurums22/nodevenv/api/22/bin/node /home/kurums22/api/node_modules/prisma/build/index.js migrate deploy --schema /home/kurums22/api/prisma/schema.prisma
/home/kurums22/nodevenv/api/22/bin/node /home/kurums22/api/node_modules/prisma/build/index.js generate --schema /home/kurums22/api/prisma/schema.prisma
```

Prisma komutları API'nin mevcut korumalı `.env` / işlem ortamındaki doğru `DATABASE_URL` ile çalışmalıdır. URL'yi komut satırına, rapora veya loga yazmayın. `migrate status` bekleyen migration nedeniyle başarısız çıkabilir; beklenen zinciri inceleyin. `migrate deploy` ve `generate` başarısızsa yeni API'yi başlatmayın. `migrate dev`, `db push`, reset veya seed canlıda kullanılmaz. Prisma Client'ın `/home/kurums22/api/node_modules/@prisma/client` ve onun gerçek nodevenv hedefiyle aynı yerde güncellendiğini doğrulayın.

Bu sürümün hızlı dağıtımı mevcut paketleri kullanır; genel `npm install/update` eklenmez. Yerel kabul Prisma 6.19.3 ile yapıldı. Canlı CLI/Client sürüm uyumu ayrıca operatör tarafından kontrol edilir.

## Elle derleme ve açılış

```sh
/home/kurums22/nodevenv/web/22/bin/node /home/kurums22/github-deploy/scripts/quick-deploy.cjs
```

- Başka terminalde **derleme sırasında** NPROC ölçün. Başarılı build'den sonra v1.4.5'teki eski route-cache karantinası ve yeni manifest kontrolü aynen devam eder. Arşiv yolunu saklayın.
- API'yi, ardından Web'i cPanel'de açın. **Yeniden açılış sonrası** NPROC ve eski API PID'lerinin kalıp kalmadığını kaydedin. `restart.txt` canlı HTTP doğrulaması değildir.
- Canlı doğrulama:

```sh
/home/kurums22/nodevenv/web/22/bin/node /home/kurums22/github-deploy/scripts/verify-release.cjs --build-dir /home/kurums22/web/.next --version 1.4.6
```

Komut API 1.4.6'yı ve canlı `/panel` HTML + JS içeriğini yeni build manifestiyle karşılaştırır. Ardından gerçek Super Admin/Bayi oturumuyla logo, rozetler ve destek akışını kontrol edin. Destek görselinin kimlik doğrulamasız açılamadığını doğrulayın. Operatörün oluşturduğu kısa süreli, sınırlı bir geçici erişimle kod ve tek kullanımlık bağlantıyı kontrol edip erişimi iptal edin. Canlıda kod deneme trafiği veya yük testi oluşturmayın. WhatsApp alıcısını operatör seçip mesajı kendisi gönderir.

## Geri dönüş sınırları

Yeni tabloları veya enum değerini acil geri dönüş için silmeyin. Önce v1.4.6 yönetiminden geçici erişimleri iptal edin ve geçici oturumları kapatın; sonra uygulamaları durdurup yedek API/Web/Prisma Client'ı birlikte geri alın. Eski v1.4.5 kodunda geçici rolün yeni izin duvarı bulunmadığı için **aktif geçici oturum bırakıp eski koda dönmeyin**. Yönetim açılamıyorsa yetkili operatörün yedekli, yalnız `TemporaryAccess` kayıtları ve `AuthSession.role='TEMPORARY'` oturumlarını iptal eden kontrollü DB müdahalesi gerekir; otomatik geri dönüş uygulanmaz.

Route cache kurtarması [v1.4.5 notundaki](v145-manual-deployment.md#kurtarma) gibi yalnız geri yüklenen eski build ile birlikte yapılır. Support dosyaları/yanıtları ve üretim veritabanı otomatik eski tarihe alınmaz.
