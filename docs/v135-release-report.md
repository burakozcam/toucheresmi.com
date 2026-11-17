# KurumsalSınav v1.3.5 · yerel geliştirme raporu

17 Kasım 2026. Canlı deployment, production migration, seed/reset, commit veya push yapılmadı. Başlangıçta mevcut olan `output/pdf/v126`, `v130`, `v132` kullanıcı dosyalarına dokunulmadı. Yeni npm bağımlılığı eklenmedi.

## Uygulananlar

- Admin yayınevi oluşturma formu mevcut API'ye bağlandı. Ad, iletişim, açıklama, aktif/pasif, arama ve düzenleme desteklenir. Logo mevcut Yayınevi Logoları ekranından yönetilir. Oluşturma kullanıcı hesabı veya panel yetkisi vermez; denetim kaydı oluşturur.
- Mevcut cevap anahtarı/sınav için ayrı yayınevi taşıma önizlemesi ve açık onay eklendi. SUPER_ADMIN zorunlu. Güncel yayınevi ve updatedAt kontrolü, hedefte sınav/takvim çakışma denetimi, transaction kilidi ve Serializable transaction kullanılır. Publication ID, OpticalKey ID, sorular, kazanımlar ve sonuç snapshot'ları korunur; bağlı takvim aynı transaction'da taşınır. Eski genel düzenleme yolu bu işlemi atlayamaz. Bayi bölge izinleri hedef yayıneviyle uygulanır. Arşiv PDF dosyalarındaki eski yayınevi metni yeniden yazılmaz; sonuçlar ve geçmiş puanlar yeniden hesaplanmaz.
- Katsayı eksikliği uyarısındaki birincil “Varsayılan Katsayıları Ekle” mevcut ScoringSettings önizlemesini açar. Son değerler taslakta incelenir. Özdebir 8. sınıf kapsam kontrolü ve mevcut O8126 profili korunur; diğer sınavlara rastgele varsayılan atanmaz. Kendi katsayısını tanımlama ve katsayısız devam seçenekleri korunur.
- TXT satır sınırı FMT tahmini, önizleme, dönüştürme ve değerlendirmede 5.000'e çıkarıldı. Testte ortaya çıkan ayrı 500 öğrenci tavanı da 5.000'e çıkarıldı. Dosya başına 2 MB ve satır başına 4.000 karakter sınırları korunur. Arşivlenmeden önce içerik kontrol edilir. Tahmin algoritmasının aday gruplama, skor ve güven hesabı değişmedi; tüm kayıtlar incelenir. Aynı değerlendirmede birleştirilen dosyalar da toplam kayıt sınırına tabidir.
- Ortak tahmin çubuğu sıfırdan gerçek orana dolar, dolarken kırmızı–sarı–yeşil değişir. Yüzde dolgunun dışında, çubuğun merkezinde ve kontrastlı sabit kalır. FMT ve sınav ayrıntıları “Detayları göster / gizle” kullanır. Dosya adı kodlaması ve dosya listesi genişliği değiştirilmedi. Cevap anahtarı yönetiminde ayrı bir sayısal FMT/sınav tahmin alanı bulunmadığından yeni bir tahmin hesabı uydurulmadı; mevcut TXT öneri alanı ortak bileşeni kullanır.
- İl → ilçe → kurum → öğrenci numarası + kişisel kod sorgusu eklendi; akademik yıl ayrıca zorunlu. 81 il/973 ilçe kaynağı kullanılır. Öğrenci kodları 192 bit güvenli rastgele, DB'de yalnız HMAC-SHA256 özeti olarak tutulur. Yanlış denemeler IP ve kurum/yıl/numara bazında sınırlandırılır. 20 dakikalık, ayrı amaçlı öğrenci token'ı sürümle doğrulanır; kod yenileme eski kod ve oturumları kapatır. Sonuç erişimi açıkça doğrulanmış öğrenci/sonuç bağlantılarına dayanır; yalnız numarayla geçmiş kayıt eşleştirilmez.
- Kurum yöneticisi kendi kurumuna, bayi kendi kurumlarına, admin bütün kurumlara kod verebilir. Başka kurum isteği sessizce kendi kurumuna dönüştürülmez. Kod iptali sınavları silmez. Kurum/yıl bazlı PDF/Excel dışa aktarımı kodları atomik olarak yeniler ve yalnız o yanıtta verir; açık kod DB'ye yazılmaz. Eski sınava özel kod ve mevcut öğrenci/veli hesabı akışları korunur.
- Yeni kod paneli maskeli adla yalnız yayımlanmış ve silinmemiş bağlantılı karneleri listeler. Revizyon zinciri kimlik özetiyle izlenir; belirsiz veya değişmiş kimlikte erişim kapalı kalır. Başka öğrencinin PDF'si açılamaz. Mevcut hesaplama ve PDF/kazanım üreticisi kullanılır; yeni akademik gelişim motoru geliştirilmedi.
- Ana sayfada sağ üstteki `hero-spark` dekoru kaldırıldı. Özgün, sonlu, viewport ile başlayan, durdurulabilir/yeniden oynatılabilir üç sahne eklendi. 12 soru: 8 doğru, 3 yanlış, 1 boş; 7 net ve açıkça yazılı örnek formülle 240/340 puan. Güvenlik ve TXT/FMT sahneleri temsili olarak etiketli; fiziksel tarama hizmeti iddia etmez. Reduced-motion tercihinde tamamlanmış statik durum gösterilir. Ağır animasyon paketi yok. İstenen sekme başlıkları Next metadata ile verilir. Mevcut markalı K faviconu incelendi ve korundu.
- Mağaza başlangıçta kapalıdır. Açılana kadar ana sayfada bağlantı yok; public liste/ürün/marka API'leri ve Web sayfaları 404 döner. Admin hazırlık yapabilir. Genel bakış, ürünler, kategoriler, markalar/yayınevleri ve ayarlar; ürün düzenleme/arama/filtreleme/durum, alt kategori ve döngü kontrolü, isteğe bağlı publisher ilişkisi, ürün/marka URL'leri ve public sayfalama eklendi. Ödeme/sipariş/kargo butonu yok. Görseller HTTPS URL ile tanımlanır, sunucu bu URL'leri indirip çalıştırmaz.
- Ürünler ekranında tümü/filtrelenen XLSX indirme ve XLSX yükleme/önizleme/onay bulunur. Kalıcı ID ve sıfırlı barkod metindir. Fiyat/stok/zorunlu alan/ID/barkod/ilişki/formül/dosya yapısı kontrol edilir. Herhangi bir hatada sıfır yazma; onayda dosya özeti + yöneticiye bağlı süreli kanıt ve ürünlerin güncel digest'i yeniden doğrulanır. Tüm yazımlar tek Serializable transaction'dadır. Eşzamanlı değişiklik ve DB hatası tüm işlemi durdurur. Kaynak `token` yetki sağlamaz; `SIL` silme komutu olarak işletilmez. Varyant/filtre alanları doluysa desteklenmediği bildirilir. `kategori_idler` bu sürümde tek kategori ID alır. Filtrelenen ürünlere yüzde fiyat değişikliği aynı önizleme/transaction akışını kullanır. Excel en fazla 10.000 ürün ve 10 MB; daha büyük çıktıda filtre daraltılır.

## Dosya yükleme denetimi

| Yüzey | Sunucu kontrolü |
| --- | --- |
| TXT arşiv/önizleme/tahmin/dönüştürme | Yetki, uzantı, 2 MB, 5.000 kayıt, 4.000 karakter, ikili/kontrol karakterleri; özgün kodlama desteği |
| FMT/BLDM JSON akışı | 64 KB özgün metin, yapı/koordinat/yerleşim ve mevcut TXT doğrulama kanıtı; binary/metin eşleşmesi |
| Cevap/kazanım Excel | Uzantı + ZIP/OLE imzası + gerçek workbook ayrıştırması; açılmış ZIP/hücre/sayfa/satır sınırları; makro/gömülü executable reddi |
| PDF cevap/kazanım | İmza, gerçek PDF ayrıştırması, 100 sayfa tavanı; şifreli/bozuk/JavaScript eylemli PDF reddi ve çalıştırılabilir ek denetimi |
| Logo/görseller | İzinli uzantı/imza; Sharp ile gerçek decode, tek kare ve piksel sınırı; mevcut optimize depolama |
| Blog görseli (JSON) | Mevcut data URL sınırları ve ek gerçek raster decode |
| Yönetilen dosyalar | Özel rastgele depolama adı, auth + admin rolü, izinli TXT/FMT/BLDM/Excel/CSV/TSV/PDF/raster türleri ve içerik doğrulaması; indirirken attachment |
| Mağaza XLSX | Gerçek XLSX, tek sayfa, güvenli ZIP açma, 10 MB/10.000 satır, başlık/yapı, formül ve bütün satırları doğrulama |

Virüs tarayıcısı eklenmedi; bu doğrulamalar antivirüs değildir. ClamAV veya eşdeğer karantina/tarama işçisi gerçek sunucu altyapısı olarak ayrı kurulmalı ve hata durumunda kapalı kalma davranışı staging'de sınanmalıdır. Excel/ZIP ve PDF ayrıştırması süreç içinde kalır; ağır iş eşzamanlılık koruması worker bazındadır, dağıtık CPU izolasyonu değildir.

## Kaynaklar ve migration

Yeni API modülleri: `publisher-transfer.ts`, `txt-limits.ts`, `store-core.ts`, `store-routes.ts`, `student-portal.ts`, `student-code-pdf.ts`. Mevcut server, optik/TXT okuma/tahmin/önizleme, yükleme doğrulaması, PDF okuma, blog/logo ve ağır iş koruması genişletildi. Yeni Web modülleri: `home-demos.tsx`, `student-portal.tsx`, panelde `publisher-transfer`, `match-meter`, `store-management`, `student-code-management`; `/magaza`, `/magaza/urun/[id]`, `/magaza/marka/[slug]`. Panel/ana sayfa/metadata/katsayı bileşenleri ve sürüm manifestleri güncellendi.

Migration: `apps/api/prisma/migrations/20261117220000_v135_catalog_student_portal/migration.sql`. Publisher'a nullable açıklama/e-posta/telefon; dört mağaza tablosu ve iki öğrenci erişim tablosu ekler. Eski öğrenci/sınav/sonuçlar backfill, taşıma veya silmeye tabi tutulmaz. Mağaza ayar kaydı yoksa kapalı kabul edilir. Yeni relation/index'ler Prisma şemasındadır. Bütün 21 migration yeni boş yerel PostgreSQL 16 DB'de başarıyla uygulandı; üretime uygulanmadı.

## Doğrulama ve sınırlar

- 251/251 otomatik regresyon; mevcut 245 test, yeni 6 grup. Önceki FMT kaynak fixture'ı ile 1/2/100/2.000 satırda birebir sonuç; yalnız limit uyarlanmış aynı kaynakla 5.000 satırda birebir aday/güven/skor. Son satırın bozulması 4.999 geçerli kayıt olarak algılanır.
- 5.000 sentetik, benzersiz öğrenci; 10 sorulu/40 karakterli TXT (204.999 bayt). Node 24.22.1 üzerinde örnek koşum: FMT ~360 ms, parse ~3.130 ms. Tek aday mikrobenchmark'ıdır, HTTP/sıralama/PDF/DB/toplu üretim kapasitesi garantisi değildir. Üretimde kayıtlı FMT sayısı, gerçek 90/120 soruluk dosyalar ve eşzamanlılık ayrıca ölçülmeli. Algoritma doğruluğu azaltılmadı.
- Gerçek HTTP + izole PostgreSQL: 14 grup; 2.859 satırda tek hata/sıfır yazma, önizleme/onay, stale ret, fiyat artışı, ikinci SQL yazımında zorunlu hata/ilk yazım rollback, mağaza kapalı/açık, yayınevi taşıma/snapshot korunumu, öğrenci kurum/yıl/kod/PDF ve yenileme/deneme sınırı.
- API ve Web production derlemeleri, Prisma validate/generate ve `git diff --check`. Mevcut PDF regresyonları altı tasarım/dört katılım seçeneği/tekli-toplu akışları içerir.
- Gerçek Chromium 320/768/1440, açık/koyu tema ve reduced-motion; mağaza kapalı/açık Web sayfaları ve admin/öğrenci seçim ekranları için kabul betiği `tests/e2e/v135-ui.py`. 14/14 tarayıcı grubu başarılı; ekran görüntüleri `test-results/v135/ui` altındadır.
- Yeni test betikleri yalnız `127.0.0.1:55445/ks_v135` adresini kabul eder. Bu oturumun yeni `ks-v135-test` konteyneri kullanıldı. Canlı veri veya önceki test DB'leri kullanılmadı. Kanıt ve sentetik token dosyaları Git dışında tutulur.

## Açık kalanlar / sonraki aşama

- Gerçek ödeme, sepet, sipariş, fatura ve kargo entegrasyonu yok; kullanıcıya çalışıyormuş gibi sunulmaz.
- Kullanıcı örnek ürün Excel dosyasının kendisini eklemedi; talimatta verilen sütun adlarıyla eşleme ve güvenli yerel şablon hazırlandı. Kaynak sistem varyantları/filtreleri ve çoklu kategori aktarımı sonraki aşamadır; mevcut XLSX bunları sessizce kaybetmez, açık hata verir.
- Kurum kodları XLSX veya PDF olarak alınır. Kod dosyası parola ile şifrelenmiş Excel değildir; yalnız yetkili HTTPS yanıtında bir kez verilir ve okul tarafından gizli dağıtılmalıdır.
- Geçmiş bütün sonuçlar yalnız öğrenci numarasına göre otomatik bağlanmaz. Kurum her yıl ve sonuç bağlantısını doğrular. Yayımlanan yeni sınav da doğrulanmış bağlantı listesine eklenmelidir. Ad/kimlik düzeltmesi sonrası belirsizlikte eski kod erişim vermez; yetkili eski erişimi iptal edip doğrulayarak yeniden kurar. Mevcut hesaplı öğrenci/veli ve analiz akışları devam eder.
- Fiziksel tarayıcı/kamera optik okuma, yeni bir akademik gelişim motoru, dağıtık iş kuyruğu, AV altyapısı, gerçek Windows/Excel, canlı Google/SMTP/cPanel/Neon/backup restore ve bağımsız pentest bu yerel kabulün kapsamında değildir.
- 5.000 öğrencilik toplu PDF veya 10.000 ürünün gerçek üretim DB'sinde kayıt yükü sınanmadı. İşlemler sınır/timeout altında başarısız olursa kısmi kaydetmez; daha küçük dosya/filtre kullanılmalıdır.

## Güvenli dağıtım sırası

1. Kod incelemesi ve ayrı staging kabulü; aynı kilit dosyasıyla temiz kurulum. Gerçek HTTPS API adresi ile yeniden Web build; bu oturumun localhost build'i production'a kopyalanmaz.
2. Mevcut API/Web artifact'ları, gizli anahtarlar ve özel storage için doğrulanmış yedek; Neon branch/geri dönüş noktası. JWT, TXT_STORAGE_KEY ve MFA anahtarlarını koruyun. Öğrenci HMAC ve oturumları da JWT anahtarına bağlıdır.
3. Kullanıcı onayıyla bakım penceresinde bekleyen migration zincirini inceleyip yalnız `prisma migrate deploy` uygulayın. `db push`, `migrate dev`, reset/seed çalıştırmayın. Bu rapor bir çalıştırma talimatıdır; geliştirme sırasında production migration yapılmamıştır.
4. Uyumlu API ve Web'i birlikte aktive edin. `DEPLOYMENT.md` ortam/CAPTCHA/Origin/TLS/özel depo ön kontrolünü uygulayın. Mağazayı kapalı bırakın.
5. Yetkili test hesaplarıyla yayınevi ekleme/taşıma, yeni TXT sınırı ve normal dosya, katsayı önizlemesi, mevcut PDF, öğrenci kodu/yenileme/başka kurum reddi ve mağaza kapalıyken 404 kontrolü. Gerçek öğrenci üzerinde sentetik test üretmeyin.
6. Ürün/kategori/markaları hazırlayın; içerik incelendikten sonra admin açıkça MAĞAZAYI AÇ der. Bu eylem ödeme entegrasyonunu açmaz.
7. Kritik sorun varsa iki uygulamayı önceki tam artifact'a geri alın; eklenen tabloları veya yeni öğrenci verisini otomatik silmeyin. Geri dönüşü staging'de deneyin; DB geri yüklemesi yeni verileri kaybettirebileceğinden ayrıca planlanır. Loglara kod, token veya öğrenci yanıtı yazmayın.
