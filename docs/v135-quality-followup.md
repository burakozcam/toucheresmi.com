# KurumsalSınav v1.3.5 — son kalite düzeltmeleri

17–18 Kasım 2026. Yerel geliştirme; deployment, commit ve push yapılmadı. Yeni migration veya bağımlılık yok.

## Değişiklikler

- Beş sahne yeniden tasarlandı: cevap değerlendirme ve merkezde **486 / 500**, TXT → FMT → sınav önerisi → değerlendirme, A–E işaretli dijital cevap formu ve kişisel erişim, aynı kazanımda A/B/C yayınevi karşılaştırması, temsili 2.000 öğrencilik toplu işlem.
- Süreler sırasıyla 5,6 / 7,4 / 6,8 / 8,2 / 7,6 saniye. Son 800 ms tamamlanmış görünümde duraklama. Her çubuk ve sahne tek saate bağlı; görünürlük, sayfa gizliliği, elle durdurma, tekrar oynatma ve reduced-motion destekli. Ekran dışında RAF çalışmaz. Görsel güncelleme en fazla 20 Hz; sahne adımı yalnız değişince React güncellenir.
- Tanıtımdaki puan formülü ve belirli format/yayınevi isimleri kaldırıldı. Form fiziksel tarama hizmeti gibi gösterilmiyor; güvenlik anlatımı mevcut rol/kurum/kişisel kod denetimlerine dayanıyor. Grafik örnek veridir; üretim kazanım eşleştirmesi değiştirilmedi.

## Tahmin metinlerinin nedeni

`.match-notice` tanımlı olmayan `--text` değişkenini, yedek olarak `#17233c` kullanıyordu. Gerçek tarayıcıda koyu temada metin **rgb(23,35,60)**, arka plan **rgb(23,36,58)** ölçüldü. Yeni `confidence-meter` yapısında eski `.has-match` sınıfı da kullanılmadığı için eski koyu tema düzeltmesi uygulanmıyordu. Ortak `--ink` rengi ve metin akışı açıkça tanımlandı; yüzde, dolan katmandan ayrı ve merkezde kalıyor. Ayrıntılar düğmesi ve API'nin açıklama metni görünür.

## 4.995 kayıt ve bağlantı hatası

İki kaynak sorunu yerelde kanıtlandı:

1. 7108 okuyucusu, bütün dersleri dolu olan her kayıt için bütün dosyada tamamlayıcı oturum arıyordu. Öğrenci birleştirmede de tüm kayıtlar tekrar taranıyordu. Eski okuyucu, 4.995 sentetik kaydı **136.824 ms** içinde ayrıştırdı; yeni okuyucu aynı boyut ve düzende **1.088 ms** ölçüldü. Eşleştirme koşulları korunarak aday indeksleri eklendi; her aday özgün koşullardan geçiriliyor. Tam kayıtlar gereksiz tamamlayıcı oturum aramasına girmiyor. Satır döngülerinde sabit okuyucu sınıflandırması tekrar hesaplanmıyor. Sınav önerisinde ders ve kitapçığa bağlı cevap konumları her öğrenci için tekrar çözülmek yerine bir kez hazırlanıyor; eski kodla yüzde/karşılaştırılan cevap sayısı birebir karşılaştırıldı. FMT skoru, yüzdesi, aday sıralama ve güven kararları değiştirilmedi; eski kaynakla regresyon karşılaştırması var.
2. Büyük sonuç JSON'unun Prisma'nın native motoruna nesne ağacı olarak aktarılması, 256 MB JS heap sınırına rağmen RSS'yi 1 GB'ın üzerine çıkarıyordu. Büyük snapshot, mevcut Serializable transaction içinde parametreli JSON metniyle yazılıyor. İlk metadata kaydı ve snapshot aynı transaction'da tamamlanıyor; hata halinde ikisi de geri alınıyor. Yetki kontrolünden geçmiş kayıtların büyük JSON okumalarında metin aktarımı kullanılıyor. Sonuç ekranı ve sıralama hesapları da bu okumayla sınandı.

Dosya **864.133 bayt**, **4.995 kayıt**: 2 MB ve 5.000 kayıt sınırlarının altında. TXT multipart ile gönderiliyor; arşivden tahmin/önizleme/kayıt aşamaları küçük `fileIds` JSON istekleri kullanıyor. Genel 1 MB JSON gövde sınırı TXT multipart dosyasını kapsamıyor. Web doğrudan yapılandırılmış API adresine istek yapıyor; Next rewrites/proxy yok. Yerel gerçek tarayıcı akışı CORS dahil çalıştı. Timeout artırılmadı.

**Canlı olayın kesin nedeni henüz doğrulanmış değildir.** Üretim Passenger/CloudLinux hata, kota/OOM ve proxy kayıtları ile özgün kullanıcının dosyası bu çalışmada sağlanmadı. Yukarıdaki iki sorun kanıtlanmış yerel sorunlardır; canlıdaki bağlantı kopmasının kesin nedenini bu kayıtlar olmadan bunlardan birine bağlamak doğru olmaz. Yerel süreler canlı performans garantisi değildir. Canlı sunucuya yük testi veya veri değişikliği yapılmadı.

Frontend gerçek API hata metnini korur. HTTP 413, 408/504 ve 5xx için Türkçe açıklama; gerçek ağ kesilmesinde sunucuya erişilememe mesajı gösterilir. Kullanıcı iptali, timeout veya HTTP hatası gibi sunulmaz. İlerleme mesajları gerçek aşamaları ve önizlemede hesaplanan öğrenci sayısını kullanır; uydurma süre/yüzde yoktur.

## Doğrulama ve kanıtlar

- `npm test`: **256 / 256**. Önceki okuyucuyla kimlik, tekrar, çelişki, oturum, uyarı ve sonuç birleştirme karşılaştırmaları; 4.995 kayıt; FMT skor regresyonları; ağ/HTTP/timeout hata eşleştirmesi dahil.
- `tests/e2e/v135-http.cjs`: **14 / 14** gerçek yerel HTTP/PostgreSQL regresyonu. Yayınevi, mağaza, rol, öğrenci kodu, PDF/XLSX ve transaction rollback kontrolleri.
- `tests/e2e/v136-ui.py`: **23 / 23** gerçek Chromium kabulü. 320/390/768/1440 px ve açık/koyu tema; reduced-motion; beş sahnenin masaüstü ve mobil döngü, dolum, elle durdurma, ekran dışı bekleme ve geri dönme kontrolleri; tahmin adları/ayrıntıları/yüzde ortalama; 4.995 kayıtla gerçek tarayıcı yükleme → öneri → değerlendirme.
- Son API alan planı iyileştirmesinden sonra yükleme akışı yeniden gerçek tarayıcıda **5 / 5** kontrolle geçti (`ui/checks-upload.json`).
- API ve Web production build başarılı. Mevcut CSS'deki `align-items:start` Autoprefixer uyarısı sürüyor; build hatası değil.
- Prisma generate başarılı; izole PostgreSQL'deki **21 migration güncel**. Yeni migration yok.
- Ayrı API süreci, **256 MB JS heap** sınırıyla 4.995 kayıt önizleme → yeniden kayıt → sonuç/sıralama testini geçti. Ölçülen API tepe RSS **482.096 KiB / yaklaşık 471 MiB**. Bu, Passenger/CloudLinux kota garantisi değildir. Tek süreçli HTTP testi ayrıca istemcinin JSON belleğini de içerir.
- İki temada sayaç dolarken kırmızı → sarı → yeşil gerçek RGB değerleriyle doğrulandı; tahmin metni kontrastları yaklaşık **14,07:1 / 12,72:1**. Doğru ve yanlış optik işaretleri ekran görüntüsüyle kontrol edildi.
- HTTP, bellek ve ek görsel kabul sonuçları: `test-results/v136/final.json`, `test-results/v136/api-process-memory.json`, `ui/visual-details.json`. Görseller `test-results/v136/ui/` altında. Bu klasördeki `*-seed.json` dosyaları yalnız test oturumlarını içerir; paylaşılmamalı.

Son izole HTTP koşumu (yerel ölçüm; istemci ve API aynı Node sürecinde):

| Aşama | HTTP | Süre (sn) |
| --- | --- | --- |
| `/txt-files` | 201 | 0.055 |
| `/infer-fmt` | 200 | 0.089 |
| `/suggest-exams` | 200 | 0.558 |
| `/preview` | 200 | 1.544 |
| `/evaluate` | 201 | 2.051 |
| `/result-exams` | 200 | 1.049 |
| `/preview` | 200 | 3.022 |

Bu koşumda tepe RSS 579.8 MiB; API ile istemcinin ayrı süreçlerde ölçüldüğü sonuç yukarıda belirtilmiştir. Büyük JSON yazımına kasıtlı PostgreSQL hatası eklendiğinde HTTP 500 alındı, sonuç satırı tamamen geri alındı ve arşivin önceki sonucu korundu.

## Canlıya geçiş dosyaları

API kaynakları:

- `apps/api/src/dealer-policy.ts`
- `apps/api/src/evaluation-reader.ts`
- `apps/api/src/fmt-inference.ts`
- `apps/api/src/optical-core.ts`
- `apps/api/src/optical-exam-matching.ts`
- `apps/api/src/optical-readers.ts`
- `apps/api/src/optical-routes.ts`
- `apps/api/src/result-data.ts`
- `apps/api/src/result-routes.ts`
- `apps/api/src/result-snapshot-storage.ts` (yeni)
- `apps/api/src/server.ts`

Web kaynakları:

- `apps/web/app/home-demos.tsx`
- `apps/web/app/home-motion.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/use-home-scene.tsx` (yeni)
- `apps/web/app/styles.css`
- `apps/web/app/panel/fmt-guess.tsx`
- `apps/web/app/panel/optical-evaluation.tsx`
- `apps/web/lib/optical-api.ts`

Test/QA kaynakları: `tests/v136.test.ts`, `tests/run.ts`, `tests/e2e/README.md`, `tests/fixtures/v135-optical-core.txt`, `tests/fixtures/v135-result-data.txt`, `tests/fixtures/v135-optical-exam-matching.txt`, `tests/e2e/v136-http.cjs`, `tests/e2e/v136-parser-baseline.cjs`, `tests/e2e/v136-ui.py`, `tests/e2e/v136-visual-details.py`, `tests/e2e/v136-api-memory.py` ve bu rapor.

API ve Web mevcut dağıtım yöntemiyle birlikte build edilmelidir. **Yerel `.next` çıktısı `NEXT_PUBLIC_API_URL=http://localhost:4015` ile test için üretildi; canlıya kopyalanmamalı.** Canlı HTTPS API adresi ve mevcut production ayarlarıyla yeniden build alınmalı. Veritabanı veya storage dosyaları değişiklik paketine eklenmez. Önceden bulunan `output/pdf/v126`, `v130`, `v132` dosyalarına dokunulmadı.
