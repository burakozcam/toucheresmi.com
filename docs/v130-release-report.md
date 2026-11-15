# v1.3.0 yayın raporu

Tarih: 15 Kasım 2026. Çalışma yerel geliştirme ortamında tamamlandı. Canlı sisteme dağıtım, canlı veritabanı bağlantısı veya migration yapılmadı.

## Değişiklikler

Öğrenci PDF’leri, verilen yan yana iki sayfalık referansın ayrı A4 dikey sayfaları esas alınarak PDFKit vektör çizimleriyle yeniden oluşturuldu. Referans görsel PDF içine yapıştırılmaz. Öğrenci, kurum, sınav, net, puan, sıralama, katılım, bütün ders cevapları ve kazanımlar değerlendirme verisinden gelir. İl/ilçe sıralaması gibi kaynakta bulunmayan istatistikler eklenmez.

- Tek sayfalık çıktı: lacivert başlık, katmanlı marka işareti, kimlik ve puan kartları, ders performansı, öğrenci/kurum karşılaştırma grafiği, sıralama ve katılım tablosu, bütün derslerin soru/öğrenci/anahtar cevapları, en düşük başarıya sahip en fazla dört öncelikli kazanım.
- İki sayfalık çıktı: aynı ilk sayfa, ikinci sayfada derslere ayrılmış kazanım açıklamaları, soru ve D/Y/B sayıları, başarı göstergeleri. Kazanımlı karne aynı tasarım dilini kullanır.
- Yoğun kazanım listelerinde okunabilir 7.5 puntoyla iki sütun kullanılır; mümkün olduğunda ders blokları iki sütuna dengeli bölünür. Sığmayan olağan dışı içerikler devam sayfalarına taşınır. Uzun hücreler font ölçümüne göre bölünür; metinler atılmaz.
- Aynı ders ve aynı kazanım açıklamasına sahip kaynak kayıtları birlikte hesaplanır. Tüm kaynak kodları gösterilir ve gruplama karne üzerinde açıklanır. Farklı açıklamalar korunur. Kaynak cevap anahtarı veya değerlendirme sonuçları değiştirilmez.
- Ders başarı oranı net/geçerli soru üzerinden, kazanım oranı doğru/geçerli kazanım sorusu üzerinden hesaplanır. Negatif net grafikte sayıyla belirtilir; negatif başarı rozeti sıfırda tutulur. İptaller sayılmaz; H ve çoklu işaretin boş sayılması kuralları korunur. Eksik oturumlar sıfır puanla veya sahte sıralamayla doldurulmaz.
- Doğru, yanlış ve boş cevaplar renklerin yanında işaretlerle ayrılır. Gömülü Liberation Sans fontları Türkçe karakterleri korur. Öğrenci başına gerçek sayfa numarası yazılır; toplu belgede her öğrencinin numarası yeniden başlar.

## Genel katılım seçeneği

“Genel katılımı göster” yönetici sonuçlarında, öğrenci/veli portalında ve erişim koduyla sonuç ekranında varsayılan olarak açıktır. Kapatılınca PDF’de genel sıra kartı ve genel sıra/katılım sütunu kaldırılır. Kurum ve sınıf bilgileri korunur. Aynı ayar önizleme, tek PDF, toplu PDF ve ZIP içindeki PDF isteklerine aktarılır. Ayar değişince eski önizleme temizlenir. Yönetici web karne görünümünde de genel bilgi gizlenir.

API parametresi yönetici/öğrenci GET isteklerinde `showGeneralParticipation=true|false`, herkese açık PDF POST gövdesinde boolean olarak doğrulanır. Gönderilmezse eski davranış korunur. Bu tercih bir erişim kuralı değildir; Excel ve yönetici sonuç listesi aynı verileri sunmaya devam eder.

## Gerçek hata nedenleri

Eski `result-professional-pdf.ts`, bütün tabloları normal akışla yerleştirdikten sonra üretilen sayfaları sayıyor, iki sayfayı geçen belgeyi reddediyordu. Cevap ızgarası ikinci sayfada, genel tablolar ve grafikler ise yüksek sabit boşluklarla ilk bölümdeydi. Normal yoğun içerik üçüncü sayfaya geçse bile üretim iptal ediliyordu. Yeni yerleşim bütün cevapları ilk sayfaya alır, ikinciyi kazanımlara ayırır. Sert reddetme kaldırıldı; devam sayfasında açıklama ve doğru toplam sayfa sayısı vardır.

Yayınevi alanındaki seçenekler etkileşimsiz `li` öğeleriydi. Dıştaki `label` bunların tıklamasını tetik düğmesine aktararak kapanan listeyi yeniden açabiliyordu. Ekleme/düzenleme alanlarındaki label sarmalayıcıları kaldırıldı. PublisherSelect, düğme seçenekleri olan ortak SearchableSelect bileşenini kullanır. Seçim sonrasında kapanma ve odak dönüşü, dışarı pointerdown, ESC, arama ve ok/Enter desteği vardır. Aynı ortak bileşenin FMT kullanımı korunmuştur. Önceden sınav kaydı oluşturma zorunluluğu geri getirilmedi.

## Doğrulama

- Node.js 22.16.0 üzerinde otomatik test paketi: **227/227 başarılı**. Yeni testler `tests/v130.test.ts`; değişen devam sayfası beklentisi `tests/v121.test.ts` içinde güncellendi.
- Anonim gerçek O8126 cevap/puan referansı: 471,550 puan ve 82 net; tek sayfalık çıktı 1, iki sayfalık ve kazanımlı çıktı 2 sayfa. Bütün dersler ve iki cevap satırı mevcut. Türkçe metinler ve sayfa koordinatları kontrol edildi.
- Gerçek O8126 Excel cevap anahtarındaki 87 kaynak kazanım kaydı: bütün açıklama ve kodları koruyan gruplamayla 2 A4 sayfa. Yoğun analizde iki sütun kullanılır; hiçbir kaynak kodu atılmaz.
- Genel katılım açık/kapalı çıktılarında genel sıra ve katılımın varlığı/yokluğu, kurum bilgisinin korunması, iki öğrencilik toplu çıktıda 4 sayfa ve her öğrenci için 1/2 başlangıcı doğrulandı.
- 90 farklı kazanım ve tek hücrede binlerce karakter içeren uzun metin, 5. sınıf, eksik oturum, katsayısız puan, iptal ve H kuralları regresyon kapsamındadır. Uzun metnin bütün son işaretleri PDF metninde aranır.
- Önceki yerel değerlendirmelerden anonim 7108 (196 öğrenci) ve Özdebir (3 öğrenci) snapshot’larıyla üç karne biçimi yeniden üretildi. Örnek sıralamalar yalnız eldeki anonim katılımdan yeniden hesaplandı; başka kurumlardan veya canlıdan veri alınmadı. 7108 toplu iki sayfalık çıktı 392 sayfa üretildi; 196 öğrencinin tamamında cevap/kazanım içeriği ve 1/2–2/2 numara çiftleri doğrulandı.
- Gerçek üretim Web derlemesi üzerinde 390 ve 1440 piksel Chromium kontrolleri: yayınevi arama/seçim, seçilen adın görünmesi, otomatik kapanma, ESC, dışarı tıklama, ok/Enter ve genel katılım ayarının PDF isteğine aktarılması geçti. Sayfa JavaScript hatası yok. API yanıtları bu UI testinde taklit edildi; canlı API/DB uçtan uca testi değildir. Yeniden çalıştırılabilir kaynak: `tests/e2e/v130-ui.py`.
- PDF’ler Poppler ile PNG’ye çevrildi; özet, ikinci sayfa, genel katılım gizli ve uzun içerik devam sayfaları görsel olarak incelendi. Normal örneklerde A4 sınırı, tablolar, cevap hücreleri, grafikte etiketler ve altbilgi kontrol edildi. Fiziksel siyah beyaz yazıcı testi yapılmadı; renk dışı işaretler ve gri tonlu önizleme kullanıldı.
- API ve Web üretim derlemeleri tamamlandı. Prisma şeması, migration’lar, depolama biçimi ve Node.js 22/cPanel/Veridyen/Neon yapılandırması değiştirilmedi. Hedef barındırma ortamında dağıtım testi yapılmadı.

## Yerel örnekler ve tekrar çalıştırma

`node --import tsx tests/v130.test.ts` anonim örnekleri `output/pdf/v130/` altında ve UI test verisini `test-results/v130-view.json` dosyasında üretir. Örnekler: `o8126-summary-card.pdf`, `o8126-two-page-card.pdf`, `o8126-full-outcomes.pdf`, `o8126-general-hidden.pdf`, `long-outcomes.pdf`.

Node.js 22 ile `npm test` ve `npm run build` çalıştırılabilir. Tarayıcı kontrolü için Web’i yalnız `127.0.0.1:3110` üzerinde başlatıp `python3 tests/e2e/v130-ui.py` çalıştırın. API istekleri test içinde taklit edilir. Öğrenci verisi GitHub’a gönderilmedi. Örnek PDF’ler yerel çıktıdır; uygulama kaynak kodundan bağımsızdır.
