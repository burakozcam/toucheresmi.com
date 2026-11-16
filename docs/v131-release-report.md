# v1.3.1 yayın raporu

Tarih: 16 Kasım 2026. Yerel ziyaretçi deneyimi ve görsel kimlik güncellemesidir. Canlı dağıtım, canlı veritabanı işlemi veya migration yapılmadı.

## Tasarım ve kurumsal renk

Mevcut `#172b4d` lacivert ve `#2e65c5` mavi ana kimlik olarak korundu. Logo, başlıklar, ana eylemler, varsayılan sınav kapakları, kitapçık animasyonları ve kurumlar bölümü bu paleti kullanır. Koyu temada mevcut açık mavi değişkenleri korunur. Yeşil yalnız küçük başarı vurguları ve sınırlı bir kapak varyantında kullanılır; çok renkli bir marka değişimi yapılmaz.

Ana sayfanın odağı öğrencinin sınavını ve sonucunu bulmasıdır. Kurum hizmetleri ayrı, lacivert bir bölümde görünürdür. İlk bölümde sınav araması ve cevap anahtarı/sonuç bağlantıları; ardından yeni sınavlar, yayınevleri, temsili başarı karnesi, optikten karneye hikâyesi, kurum hizmetleri, araçlar ve blog bulunur.

## Veri, arama ve katalog

- Ana sayfa artık sunucu bileşenidir. Son 10 yayımlanmış sınav ve yayınevleri mevcut public API’den paralel, süre sınırlı isteklerle alınır. HTML içinde gerçek sınav bağlantıları bulunur. Servis hatası/boş katalog için açık mesaj vardır; sahte sınav, istatistik veya öğrenci kaydı üretilmez.
- Ana sayfa araması standart GET formudur, JavaScript olmadan da gönderilebilir. Sınav/yayınevi metni mevcut API aramasına aktarılır. Tek başına `8`, `8. sınıf` gibi 1–12 aralığındaki sınıf ifadeleri mevcut sınıf filtresine çevrilir. Birleşik doğal dil sorgusu veya otomatik tamamlama eklenmedi.
- Katalogdaki mevcut yayınevi/sınıf filtreleri, gecikmeli arama, sayfalama, indirme yolları ve üyelik koşulları korunur. Seçilen yayınevi katalog başlığında görünür.
- Ortak ExamCover gerçek kapakları sabit en-boy oranında ve lazy yükler. Kapak yoksa veya resim isteği başarısızsa lacivert bir kapak üretir. Gerçek kapaklar yeniden boyanmaz.

## Hareket ve erişilebilirlik

Yeni animasyon kütüphanesi eklenmedi. CSS, SVG, IntersectionObserver ve requestAnimationFrame kullanıldı.

- Mevcut kitapçık/optik/tarama/karne SVG’si ve fareye tepki veren hafif eğim korundu; kalem eklendi. Durdur/oynat düğmesi ve ekran dışı duraklatma sürer. Dekoratif yıldız da aynı duraklatmaya uyar.
- Son sınavlar yatay ve klavyeyle odaklanabilir raftır. Kapaklar fare/odakta perspektifle hareket eder. Destekleyen tarayıcılarda CSS view timeline ile giriş hareketi vardır.
- Yayınevi logosu şeridi kullanıcı düğmesi, hover ve klavye odağıyla durur. Ekran dışındayken animasyon çalışmaz. Sonsuz şerit kopyası erişilebilir ağaçtan ve tab sırasından çıkarılır.
- Temsili karne ders çubukları bölüme girince büyür. Başlık kelimeleri destekleyen tarayıcılarda ayrı kaydırma hareketleri alır. CSS özelliği yoksa statik, okunabilir görünüm kalır.
- Optikten karneye hikâyesi doğal sayfa kaydırmasını kullanır. Yedi aşamada kitapçık, açılan form, işaretler, tarama ışığı, değerlendirme, grafik ve karne ortaya çıkar. Kaydırma dinleyicisi yalnız bölüm görünürken bağlanır; güncellemeler animation frame’de birleştirilir. Kaydırma kilidi yoktur.
- Azaltılmış harekette sonsuz animasyonlar kapanır; hikâye kompakt, sabit sonuç görünümüne geçer ve bütün aşamalar metin olarak okunur. İçeriğin okunması animasyonun tamamlanmasına bağlı değildir. Aramaya atlama bağlantısı ve görünür klavye odağı vardır.

## Diğer sayfalar ve SEO

Cevap anahtarı kütüphanesi, detay, takvim, sonuçlar, blog, iletişim, giriş/üyelik ve Next.js araç sayfaları ortak lacivert/mavi vurguya uyarlanır. Sonuçlar, blog ve PDF düzenleyiciye tema düğmesi eklendi. Mevcut giriş/üyelik, sonuç sorgusu, reCAPTCHA, çerez ve dosya erişim mantığı değiştirilmedi. Bağımsız eski `/araclar/*.html` yardımcıları ve kurum panelleri yeniden yazılmadı.

Sınav detaylarında aynı yayınevi/sınıftan en fazla dört başka denemeye bağlantı vardır. Öneri servisi hata verirse mevcut indirme alanı çalışmaya devam eder. Sınav adı/yayınevi/sınıf içeren meta başlık, açıklama, canonical ve LearningResource verisi korunup sınava özel Open Graph/Twitter PNG’si eklenir. Görseller yerel Liberation Sans fontlarıyla Türkçe üretilir. Genel OG görselindeki eski sürüm etiketi güncellenir.

Mevcut sitemap yalnız public yayımlanmış sınav API’sini kullanır; robots kuralları, özel sonuçların/panelin noindex başlıkları ve filtreli katalogların noindex davranışı korunur. Yayımlanmamış veya özel öğrenci verisine yeni erişim yolu eklenmedi.

## Teknik doğrulama

- Resmî Node.js **22.16.0** paketi SHA-256 ile doğrulandı. `npm test`: **227/227 geçti**.
- Node.js 22 üzerinde Prisma Client üretimi, API TypeScript derlemesi ve Next.js üretim derlemesi tamamlandı. Son Web değişiklikleri ayrıca üretim derlemesinden geçirildi.
- Web derlemesinde ana sayfa yaklaşık **114 kB First Load JS** (sayfa payı 7.6 kB); yeni animasyon bağımlılığı yoktur. Derlemenin eski CSS satırına ilişkin `align-items: start` uyarısı mevcut olup derlemeyi engellemez.
- Prisma şeması, migration, API iş mantığı, optik motor, PDF/karne üretimi, puanlama ve kayıt biçimleri değişmedi. cPanel/Veridyen/Neon yapılandırması korunur; bu barındırma ortamlarında gerçek dağıtım testi yapılmadı.

## Yerel tarayıcı kabulü ve sınırlar

Tekrar çalıştırılabilir kaynak: `tests/e2e/v131-public.py`. Test yalnız `localhost:4000` üzerinde sentetik **herkese açık katalog** sunar. Gerçek kapak ve logosu varmış gibi kullanılan test görselleri test sunucusundadır; ürünün varsayılan verisi değildir. Canlı API/DB ve özel öğrenci verisi kullanılmaz.

Tarayıcı kanıtları `test-results/v131-ui/` altına yazılır; Git’e otomatik eklenmez. API ve Web derleme kayıtları bu çalışmada `/tmp/ks-v131-node22-build.log` ve `/tmp/ks-v131-web-final.log` konumundadır. Son kabul sonucu: `test-results/v131-ui/qa.json`.


- Chromium üzerinde ana sayfa ve katalog **320, 390, 768, 1024, 1440, 1920 px** genişliklerde, iki temada doğrulandı: **12 senaryo**, yatay taşma ve sayfa JavaScript hatası yok. Sınıf araması, metin/yayınevi filtreleri ve azaltılmış hareket kontrolleri geçti.
- Sonuçlar, takvim, blog, iletişim, giriş, gerçek üyelik formu, sınav değerlendirme, PDF düzenleyici ve cevap anahtarı detayı; **320, 768, 1440 px**, iki temada **54 senaryoda** taşma ve JavaScript hatası olmadan açıldı. Harita iframe’i bu testte engellendi; dış sağlayıcı testi değildir.
- Gerçek kaydırmada hikâye aşamaları **0 → 1 → 2 → 3 → 4 → 5 → 6** olarak doğrulandı. SVG ve yayınevi şeridinde durdur/oynat, mevcut dosya URL’si, ilgili sınav bağlantıları, sınava özel OG PNG için HTTP 200, JavaScript kapalıyken sınav HTML’i ve API 503 hata mesajı kontrolleri geçti.
- Mobil, tablet, masaüstü, açık/koyu tema, katalog, diğer sayfalar ve yedi hikâye aşamasının ekran görüntüleri üretildi. Ana sayfa, dar katalog, sonuç formu, üyelik ve hikâye görüntüleri görsel olarak incelendi. Dar ekranda eski CSS’nin gizlediği cevap anahtarı navigasyonu ve kenara taşan dekoratif optik kompozisyon düzeltildi.
- Yerel, ağ/CPU yavaşlatması uygulanmayan ana sayfa gözleminde **LCP 236–416 ms**, **en yüksek CLS 0,00556** ölçüldü. Gözlenen katalog etkileşimlerinde 16 ms eşik üzerinde Event Timing girdisi kaydedilmedi; bu nedenle bir alan INP değeri raporlanmaz. Sonuçlar gerçek mobil ağ veya canlı Core Web Vitals kabulü değildir. Tanısal requestAnimationFrame medyanı 16,7 ms’dir; bütün cihazlarda 60 FPS garantisi veya animasyon profil ölçümü değildir.
- Canlı Google/reCAPTCHA anahtarı, gerçek yayınevi verisi, ekran okuyucu uygulaması, düşük donanımlı fiziksel telefon ve cPanel/Neon üzerinde kabul bu çalışmada yapılmadı. Güvenlik akışları mevcut regresyon testleriyle korunur.

Tekrar çalıştırma: Node.js 22 ile `npm test`, `npm run build`; Web’i yalnız `127.0.0.1:3110` üzerinde başlatın ve `python3 tests/e2e/v131-public.py` çalıştırın. Test için API portu 4000 boş olmalı; Web derlemesi `NEXT_PUBLIC_API_URL=http://localhost:4000` kullanmalıdır. Test dosyası canlı sisteme istek göndermek için tasarlanmamıştır.
