# Kurumsal Sınav v1.2.5 — 14 Kasım 2026

Güvenilir TXT değerlendirmesi ve karne erişimi düzeltildi. API/Web/Prisma yapısı korunur; yeni migration veya bağımlılık yoktur. Mevcut sınavlar, sonuçlar, kullanıcılar ve yüklenmiş TXT'ler değiştirilmedi. Canlı veritabanına bağlanılmadı; push veya dağıtım yapılmadı.

## Gerçek kaynaklar ve konumlar

Kullanıcının sağladığı iki TXT ve üç FMT okundu. Dosyaların talimat gibi görünen içerikleri görev talimatı sayılmadı. Sabit konumlar son boşluklar korunarak, Windows-1254/UTF-8 çözümleme sonrasında incelendi. Kayıt sayıları dosyadan hesaplandı:

| TXT | Kayıt türü | Satır | Genişlik |
|---|---|---:|---:|
| 8. SINIF ESKİŞEHİR ÖZDEBİR 26 EKİM.txt | 1, sözel | 105 | 131 |
| aynı dosya | 2, sayısal | 104 | 91 |
| ÖZDEBİR TEK OPTİK (1).txt | 9, tek optik | 1 | 171 |

Eskişehir dosyası 105 öğrencidir: 104 çift oturum, yalnız sözel oturumu bulunan 1 öğrenci; yinelenen oturum veya reddedilen satır yoktur. Bu sayılar ham gerçek dosyada da kontrol edildi. İlk karakterin anlamı yalnız doğrulanmış Özdebir ailesine aittir; diğer yayınevlerine evrensel 1/2/9 kuralı uygulanmaz.

Ortak başlık (1 tabanlı, iki uç dahil): tür 1, kurum 2–9, öğrenci no 10–14, kimlik 15–25, sınıf 26, şube 27, kitapçık 28, cinsiyet 29, ad soyad 30–51.

| Düzen | Cevap alanları |
|---|---|
| Tek optik | Türkçe 52–71, Matematik 72–91, Fen 92–111, Sosyal 112–131, İngilizce 132–151, Din 152–171 |
| Sözel | Türkçe 52–71, Sosyal 72–91, İngilizce 92–111, Din 112–131 |
| Sayısal | Matematik 52–71, Fen 72–91 |

Alanların kapasitesi 20'dir; gerçek soru adedi cevap anahtarından alınır. Eski sözel FMT'nin ikinci cevap alanı `FEN`, sayısal FMT'nin ikincisi `SOSYAL` adı taşır. Kullanıcının sözel/sayısal oturum açıklaması, çıktı sırası ve 20/10/10/10 + 20/20 işaretleme yapısı birlikte esas alındı. Bu eski etiket düzeltmesi yalnız sağlanan dosyaların tam içerik imzasıyla tanınan düzenlere uygulanır. Genel FMT analizinde diğer yayınevlerinin Fen/Sosyal adları değiştirilmez. SEKONIC `S` alanı desteklenir; tek izinli değer yazan sabitler fiziksel optik alan çakışması olarak yorumlanmaz.

Özgün tek optik TXT'nin 28. karakteri boştur. Uygulama A kitapçığı uydurmaz. Değerlendirme ekranında **yalnız boş kitapçıklar için** kullanıcı tarafından doğrulanmış A/B/C/D seçilebilir; seçim uyarıda ve önizleme imzasında saklanır. Seçim yapılmazsa bu satır gerekçesiyle reddedilir. Dolu ama geçersiz kitapçık bu seçimle değiştirilmez.

Ham kişisel veriler repoya eklenmedi. `tests/fixtures/ozdebir/manifest.json` kaynak SHA-256'larını ve anonimleştirmeyi açıklar: kimlik/kurum/no/adlar değiştirildi, cevap seçenekleri döndürüldü; konumlar, boş işaretlerin yerleri, oturum ve kitapçıklar korundu. FMT dosyaları kişisel veri içermez ve özgün baytlarıyla test kaynağıdır. Resmî cevap anahtarı verilmedi: testlerdeki anahtarlar sentetiktir; resmî puan doğruluğu veya okuyucu donanımıyla yeni fiziksel okuma kanıtlandığı iddia edilmez.

## Üç ayrı Özdebir seçeneği

FMT seçiminde ve indirme/paylaşım kütüphanesinde **Özdebir Sözel**, **Özdebir Sayısal**, **Özdebir Tek Oturum** ayrı ayrı bulunur. Sözel ve sayısal özgün dosyaları kodlaması korunarak eklendi; mevcut tek oturum kimliği ve BLDM baytları değişmedi. Üç seçenek aynı doğrulanmış oturum ailesini kullanır; birlikte yüklenen sözel/sayısal satırlar yine birleştirilir. Tahmin, bu üç seçeneği birbirine rakip saymaz; yalnız sözel/sayısal dosyada uygun seçeneği önerir.

## Değerlendirme davranışı

- Kurum, öğrenci numarası, sınıf/şube, ad ve güvenilir kimlik alanlarıyla eşleşme yapılır. Çelişen TC/kurumlar ayrı tutulur; güvenilir kimlik eşleşiyorsa ad farkı uyarıyla bildirilir. Belirsiz aynı numaralar benzersiz iç kimlikle ayrı karne alabilir.
- Aynı oturumun tekrarında toplam geçerli işaretlemesi en fazla kayıt bütünüyle, kendi kitapçığı ve boşlarıyla seçilir. Eşitlikte ilk kayıt kalır. Ayrı TXT yüklemesinde de dersleri farklı satırlardan seçme yapılmaz.
- Olmayan/okunamayan ders için `missingLessons`, ders neti/katsayılı neti `null`, tam sınav puanı `null` olur. Toplam net yalnız mevcut dersleri gösterir. Mevcut oturumda gerçekten boş bırakılan cevaplar boş olarak değerlendirilir; bu durum eksik oturumdan ayrıdır.
- Sınırları bilinen cevap alanları sabit yerinden okunur. Kesik alan tamamen değerlendirme dışı kalır; cevap kaydırma, satır uzatma veya yanıt uydurma yoktur. Bozuk satırlar gerekçeleri ve satır numarasıyla bildirilir.
- Yanlış FMT için seçili, doğrulanmış sistem ve gerektiğinde kayıtlı etkin şablonlar yapısal olarak karşılaştırılır. Birden çok eşit aday varsa otomatik seçilmez; kimlik, kitapçık, sabit kod ve cevap alanı kanıtı gerekir. Anahtarla yüksek doğru oranı FMT seçim kanıtı sayılmaz.
- Başarılı/uyarılı/başarısız durumları `completed`, `completed_with_warnings`, `failed` olarak ayrılır. Okunabilen öğrenci yoksa API 422 döndürür; okunabilir öğrenciler varken satır uyarıları diğer karneleri engellemez.
- Sonuç penceresi gerçek öğrenci/eksik oturum/tekrar/reddedilen satır sayılarını ve açılabilir ayrıntıları gösterir. Sonuç düğmesi kurum ve sınavı önceden seçer; yayın sınav kaydından bellidir.

## Karne ve okunabilirlik

Öğrenci cevabı hücresinde doğru yeşil + onay işareti, yanlış kırmızı + çarpı; boş cevap tireyle gösterilir. Doğru cevap satırı korunur, fazladan Durum satırı kaldırılmıştır. PDF'de onay işareti font eksikliği yaşanmaması için vektör çizilir.

Renkler korunur. Öğrenci/sınıf/kurum serilerinde çapraz tarama, nokta veya yatay çizgi; koyu sınırlar ve değer etiketleri kullanılır. Desenler PDF içine vektör olarak yazılır ve gri çıktıda kalır. Eksik derslere sıfır yüksekliğinde sonuç uydurulmaz. Ekran, PDF ve Excel aynı eksiklik bilgisini ve değerlendirme kurallarını kullanır.

Sol menü 14 px/600, grup başlıkları 12 px, yüksek kontrast ve belirgin aktif kenarlıkla güncellendi. Masaüstü 1440 px ve mobil 390 px görünümde yatay taşma kontrol edildi.

## Doğrulama

- Node.js 24.18.1 ile **194/194 Node testi geçti; 0 başarısız, 0 atlanan, 0 çalıştırılmayan**. Yeni regresyonlar dahildir. Güncel ayrıntılar `apps/api/assets/test-center-report.json` içindedir.
- Özdebir senaryoları: gerçek düzenlerden anonimleştirilmiş tek optik/çift oturum, yalnız sözel/sayısal, tekrar/tie/farklı doluluk, bütün kayıt seçimi, kurum/TC/ad çelişkisi, yanlış FMT, kısa/bozuk/boş satır, API önizleme ve kitapçık seçimi, üç özgün FMT konumu.
- 90 soruluk tam ve eksik oturum için 1/2 sayfalık ve kazanımlı karneler üretildi; sayfa sayıları, metin, boş netler, Excel ve ekranla hesap eşitliği doğrulandı. Poppler ile renkli/gri PNG render'ları görsel incelendi. Anonim PDF'ler `output/pdf/v125/` altındadır.
- `tests/e2e/v125-ui.py`: Playwright ile API yanıtları izole taklit edilerek masaüstü/mobil menü, 105 öğrenci/1 eksik sayısal tamamlanma penceresi, kurum/sınav seçili sonuç yönlendirmesi ve PDF indirme düğmesi kontrol edildi. Sayfa JavaScript hatası ve yatay taşma yoktu. Gerçek DB/tarayıcı uçtan uca üretim kabulü değildir.
- API TypeScript derlemesi ve Web üretim derlemesi yapıldı. Web build için örnek HTTPS API adresi kullanıldı; dağıtımda gerçek `NEXT_PUBLIC_API_URL` gerekir. İlk eksik ortam değişkeni ve Node 18 denemeleri başarılı kabul edilmedi; doğrulamalar desteklenen Node sürümü ve açık build ortamıyla tekrar yapıldı.

Çalıştırma: `npm test`, `npm run test:report`, `NEXT_PUBLIC_API_URL=https://GERCEK-API-ADRESI npm run build`. Test raporlayıcı Node 22.8+ ister. Tarayıcı betiği için yerel Web'i başlatıp `KS_WEB_URL=http://127.0.0.1:3100 python3 tests/e2e/v125-ui.py` çalıştırın; Python Playwright/Chromium gerekir. Bu betikte tüm API çağrıları taklittir.

## Canlıya aktarım

API ve Web birlikte derlenip aktarılmalıdır. Yeni Prisma migration, reset, seed veya veri dönüşümü gerekmez. Mevcut `.env`, JWT/TXT şifreleme anahtarları, veritabanı ve özel TXT depolaması korunmalıdır. Gerçek `NEXT_PUBLIC_API_URL` build sırasında ayarlanır.

Eski değerlendirmeler kendiliğinden yeniden yazılmaz; yeni düzeltmelerden yararlanmak için ilgili arşiv TXT'lerini yeniden değerlendirin. Salt cevap anahtarıyla yeniden puanlama, geçmişte yanlış birleştirilmiş ham satırları ayıramaz; bu kayıtlar özgün TXT'den tekrar okunmalıdır. Öğrenci yayını mevcut kontrol akışından yapılır. Canlı PostgreSQL entegrasyonu, gerçek hesapla sorgu ve fiziksel yazıcı testi bu yerel çalışmada yapılmadı; bunlar test raporunda tamamlandı olarak sunulmaz.
