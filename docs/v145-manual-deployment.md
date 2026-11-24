# v1.4.5 — manuel Veridyen yayın sırası

Bu sürüm commit/push, canlı sunucu işlemi, Neon bağlantısı, otomatik yayın veya GitHub Actions eklemez. Yayın operatör tarafından başlatılır. Mevcut VS Code → GitHub push → cPanel pull → elle dağıtım akışı korunur.

## 1. Yayından önce

- Neon ve cPanel dosya yedeklerini operatör alır; yedek zamanlarını ve kurtarma noktalarını kaydeder. Route cache arşivi bu yedeklerin yerine geçmez.
- Yerelde testleri çalıştırıp değişiklikleri inceleyin. Commit ve push'u operatör yapar. cPanel deposunda yeni commit'i pull edin. Kaynak `/home/kurums22/github-deploy`, canlı kökler `/home/kurums22/web` ve `/home/kurums22/api` olarak kalır.
- cPanel'deki `TOKIO_WORKER_THREADS=4` ayarını koruyun. Bu sürüm değişkeni uygulama kodundan ayarlamaz; paket kurulumu, Prisma generate veya migration yapmaz.
- Aşağıdaki NPROC ölçümünü **yayın öncesi** alın. Mevcut API PID'lerini ve başlangıç zamanlarını ayrı kaydedin.

## 2. Durdurma ve derleme

- cPanel'de önce Web'i, sonra API'yi durdurun. Aynı ölçümü **durdurma sonrası** alın. Önceki API PID'lerinin kalıp kalmadığını kaydedin. Süreç kalıyorsa aktivasyona geçmeden operatör hosting durumunu inceler.
- Ardından açıkça şu komutu çalıştırın:

```sh
/home/kurums22/nodevenv/web/22/bin/node /home/kurums22/github-deploy/scripts/quick-deploy.cjs
```

- Başka bir terminalden **derleme sırasında** aynı NPROC ölçümünü alın. Komut API/Web'i geçici dizinde sırayla derler. İki derleme ve artifact kontrolleri başarılı olmadan eski cache'e ve canlı dosyalara dokunmaz. Yeni panel JS dosyası manifestte ve diskte bulunmalıdır.
- Aktivasyonda `.next/server/route-cache` dizininin tamamı, hash/ad varsaymadan `/home/kurums22/github-deploy/.quick-deploy-route-cache/cache-XXXXXX/route-cache` altına atomik taşınır. `restore.json` eski ve yeni konumları kaydeder. Özel dizin 0700, kayıt 0600 olur. Eski `APP_PAGE/.../panel.html` ve `panel.rsc` canlı cache yolunda kalmaz. Yeni build'in kendi route cache dosyaları varsa aktarılır.
- Yeni `.next/server/app/panel.html`, manifestler ve statik dosyalar aktarılır. Eski hash'li statik dosyalar, mevcut Next ayarı, Passenger başlangıç dosyası, `.env`, node_modules bağlantıları ve kullanıcı verileri korunur. Uygulama manifestlerinin yalnız sürümü değiştirilir.
- Betik dosya bazlı aktarım yapar; iki uygulamanın atomik değişimi veya otomatik kod rollback'i değildir. Hata varsa başarı saymayın. Aktarma sırasında hata, kısmi kod güncellemesi anlamına gelebilir. Cache arşivinin yolu terminalde kalır; otomatik silinmez.

## 3. Yeniden açılış ve gerçek HTTP doğrulaması

- Operatör cPanel'de önce API'yi, sonra Web'i açar. Passenger yeniden başlatma işaretleri yalnız yeniden başlatma talebidir; canlı doğrulama sonucu değildir.
- **Yeniden açılış sonrası** NPROC ölçümü alın. Eski API PID'lerini başlangıç zamanlarıyla karşılaştırın; kalan eski PID'leri, yeni API PID'lerini ve task sayısını kaydedin. Eski süreçleri bu betik otomatik öldürmez.
- Canlı doğrulama komutu:

```sh
/home/kurums22/nodevenv/web/22/bin/node /home/kurums22/github-deploy/scripts/verify-release.cjs --build-dir /home/kurums22/web/.next --version 1.4.5
```

Depo kökünde `npm run verify:release -- --build-dir /home/kurums22/web/.next --version 1.4.5` de aynı komuttur. Domain farklıysa `--api https://api.example.com --web https://example.com` ekleyin.

Komut cache kıran HTTP istekleriyle canlı `/api/health` içindeki `status:ok` ve `version:1.4.5` değerlerini, canlı `/panel` HTML'sindeki panel JS adını yeni `app-build-manifest.json` ile karşılaştırır. Beklenen ve bulunan dosya adlarını yazar. JS'yi ayrıca indirir, MIME türünü ve SHA-256 içeriğini yerel yeni build ile karşılaştırır. API eskiyse, HTML eski JS'yi yüklüyorsa, JS içeriği farklıysa, yönlendirme veya HTTP hatası varsa çıkış kodu 1'dir. Diskteki dosyaların kopyalanması tek başına başarı değildir.

Doğrulamadan sonra gerçek yönetici/bayi oturumuyla Sınav Sonuçları rapor indirmesini ve `/calisma-plani` sayfasını kontrol edin. Yerel kabulde panel API yanıtları sentetiktir; canlı yetki/rapor smoke kontrolünün yerine geçmez.

## NPROC ölçümü — dört aşamada aynı yöntem

Aşağıdaki salt okunur komutlar yalnız PID, thread sayısı, zaman, süreç adı ve çalışma dizini gösterir; ortam değişkenlerini veya komut satırı sırlarını yazdırmaz:

```sh
date -Is
ulimit -u
ps -u "$(id -u)" -o pid,ppid,nlwp,lstart,comm
ps -u "$(id -u)" -L --no-headers | wc -l
for pid in $(ps -u "$(id -u)" -o pid=); do
  app_cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null) || continue
  case "$app_cwd" in
    /home/kurums22/api|/home/kurums22/api/*) printf 'API PID=%s CWD=%s\n' "$pid" "$app_cwd" ;;
  esac
done
```

CloudLinux NPROC, süreçlerin thread/task sayılarını da kapsayabilir. Yukarıdaki task sayısını cPanel kaynak kullanımındaki NPROC değeri ve limitiyle birlikte kaydedin. `/proc` erişimi yoksa veya Passenger farklı çalışma dizini kullanıyorsa API PID listesini hosting panelinden doğrulayın; boş listeyi süreç yokluğu kanıtı saymayın.

| Aşama | Zaman | cPanel NPROC / limit | Hesap task sayısı | API PID + başlangıç zamanı | Eski API PID'leri kaldı mı? |
|---|---|---|---|---|---|
| Yayın öncesi | | | | | |
| Durdurma sonrası | | | | | |
| Derleme sırasında | | | | | |
| Yeniden açılış sonrası | | | | | |

## Kurtarma

Uygulamalar duruyorken operatör aldığı dosya yedeğinden API/Web'i birlikte geri alır. Eski cache'i kullanmak gerekiyorsa önce eski build'in geri yüklendiğini doğrulayın; `restore.json` içindeki `saved` dizinini `original` konumuna geri taşıyın. O konumda yeni cache varsa önce onu ayrı bir özel dizine alın; üzerine birleştirmeyin. Yeni kodla eski route cache'i bir arada kullanmayın. `.quick-deploy-route-cache` dizinini `git clean -fdx` ile silmeyin. Neon geri dönüşü ayrı operatör kararıdır.
