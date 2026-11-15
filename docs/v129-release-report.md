# Kurumsal Sınav v1.2.9 — yayın ve kabul raporu

Tarih: 15 Kasım 2026. Kullanıcının canlıya aldığı v1.2.8 kod tabanı üzerinde yerel geliştirme yapıldı. Canlı sunucuya aktarım, canlı veritabanına bağlantı/migration, GitHub gönderimi veya gerçek Google anahtarıyla işlem yapılmadı. Mevcut çalışma ve kayıtlar korundu.

## Cevap anahtarından sınav oluşturma

Gerçek neden iki katmanlıydı: `answer-key-management.tsx` boş `targetPublicationId` için hem erken hata veriyor hem gönderme düğmesini pasif tutuyordu; `POST /api/admin/answer-keys` ise bütün istekleri koşulsuz 409 ile reddediyordu. Arayüzde sınav seçimi isteğe bağlı oldu. Kullanıcı yayınevi, sınıf ve sınav adını girerek dosya veya elle giriş yapabilir.

POST ve mevcut sınavı güncelleyen PATCH aynı dosya doğrulama, tam önizleme/onay, checksum, soru çaprazı, katsayı ve PDF üretme işleyicisini kullanır. Yeni sınav ancak dosyalar ve soru tablosu doğrulandıktan sonra, dosya kayıtları ve optik anahtarla aynı transaction içinde oluşturulur. Yayınevi/sınıf kilidi mevcut sınav tanımı ve toplu girişle aynı PostgreSQL advisory lock anahtarını kullanır.

Aynı adlı boş sınav varsa kimliği korunarak anahtar eklenir. Anahtarı veya dosyası bulunan sınav için otomatik üzerine yazma yapılmaz; kullanıcıya mevcut sınavı seçerek güncellemesi söylenir. Eşzamanlı iki oluşturma veya başka sınavla çakışan ad değişikliği yeni mükerrer kayıt oluşturmaz. Önizleme/onay eksikliği ya da yanlış checksum boş sınav kaydı bırakmaz. Mevcut sonuç snapshot'ları değiştirilmez; mevcut optik anahtar güncellemesi kendi kimliğiyle korunur.

Gerçek HTTP/PostgreSQL kabulü `v129-authoring.cjs`: otomatik oluşturma, boş sınavı tekrar kullanma, tekrar ret, yarışan iki istekte tek kayıt, ad çakışması, onaysız/geçersiz istekte sıfır sınav kaydı ve bayi yetki reddi geçti. Başarılı dosya kaydında 90 soru, 1,25 katsayı ve üretilmiş cevap PDF'si doğrulandı.

## Excel ve LibreOffice panosu

Eski okuyucu yalnız LF/CRLF ve sekmeyle bölüyordu; tırnaklı hücre içindeki sekme/satır sonlarını ayırt etmiyordu. Gerçek Calc incelemesi ayrıca `text/plain;charset=utf-16` biçiminin hücre içi satır sonunu boşluğa çevirdiğini ve seçimin sonundaki boş sütunları atabildiğini gösterdi. Bu durumda uygulama yalnız plain-text okuyarak özgün metni geri kazanamaz.

Yeni okuyucu varsa gerçek HTML tablo biçimini kullanır; Calc'ın metin hücresi metadata'sını, `<br>` satır sonlarını ve boş hücreleri korur. Pano HTML'i sayfaya eklenmez; yalnız hücre metinleri alınır. HTML tablo yoksa Excel uyumlu tırnaklı TSV okunur: CR, LF, CRLF, çift tırnak kaçışı, boş hücre ve Türkçe desteklenir. Birleştirilmiş veya kapasiteyi aşan seçim sessizce kesilmez; işlem bütünüyle reddedilip açıklama gösterilir.

Hücreler çok satırlı metni koruyan textarea alanlarına geçirildi. Yapıştırma seçili hücreden sağa/aşağı ilerler; en fazla 300 soruya kadar satır oluşturur. Hücre ve yapıştırma işlemleri 50 adımlık geri alma/yineleme geçmişine sahiptir. Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y ve Cmd karşılıkları ortak işleyicide desteklenir; geri alma eklenen satırları da kaldırır. Haricî tablo/öğrenci sayfası değişimi geçmişi temizler. Geçersiz hücreler işaretlenmeye devam eder.

Gerçek LibreOffice Calc seçiminin plain-text ve HTML transfer biçimleri UNO ile alındı. Chromium'un gerçek panosuna yazılıp güvenilir klavye Ctrl+V olayıyla 5×5, 90×1, 90×8 ve çok satırlı/tırnaklı/boş hücre seçimi yapıştırıldı. Her hücre kaynak Calc değeriyle karşılaştırıldı; geri alma ve yineleme doğrulandı. Başka bir hücreden başlama, mevcut değerin üzerine yazıp geri alma, Cmd+Z/Cmd+Shift+Z işleyicisi ve sütun sınırında veri değiştirmeden ret de geçti. Geçerli 90×8 soru tablosu ve 90×1 çok satırlı kazanım sütunu yapıştırılarak gerçek bir toplu sınav kaydedildi.

**Sınır:** Microsoft Excel uygulaması bu Linux ortamında kurulu değildir; gerçek Excel uygulamasından kopyalama ve macOS'un yerel Cmd+V kısayolu çalıştırılmış sayılmaz. Excel uyumlu XLSX ve TSV testleri, gerçek Calc ve Chromium kabulünden ayrı değerlendirilmelidir.

## Sınavdan karneye gerçek tarayıcı zinciri

`v129-workflow.py` hazır token'ı sessionStorage'a yazarak giriş atlamaz: yönetici ve bayi giriş formlarını gerçek kullanıcı adı/parolayla gönderir. Google JavaScript ve siteverify yalnız yerel test sağlayıcısında taklittir; API, DB, dosyalar, önizleme, hesaplama ve indirmeler gerçektir.

1. Mevcut yayınevi seçildi; önceden sınav kaydı olmadan 90 soruluk Excel dosyası yüklendi, tüm önizleme onaylandı ve sınav/anahtar kaydedildi.
2. Özdebir yayınevi için ikinci sınav elle oluşturuldu: altı ders, cevap dizileri, 90 gerçek B kitapçığı çaprazı, ders katsayıları ve örnek kazanım girilip onaylandı.
3. Bayi hesabıyla giriş yapıldı. Anonim 7108 TXT sunucu arşivine yüklendi; sınav, 7108 FMT, il, ilçe ve kurum arayüzden seçilip değerlendirme tamamlandı.
4. Aynı süreç Özdebir özel tek oturum FMT'si ve üç sentetik kayıtla tekrarlandı. A, B ve boş kitapçık→A davranışı; B kaydında bir yanlış ve bir boş cevap doğrulandı.
5. Sonuç ekranına gidildi, tüm öğrenci satırlarına ulaşıldı, Excel ve seçilen öğrencinin karne PDF'si gerçek indirme düğmelerinden alındı.

| Doğrulama | Sonuç |
|---|---:|
| 7108 kabul edilen öğrenci | 196 |
| Özgün referanstan türetilmiş anonim karne eşleşmesi | 40 |
| Referans D/Y/net ders karşılaştırması | 240 |
| Özdebir sentetik öğrenci | 3 |
| Özdebir D/Y/B | 90/0/0, 88/1/1, 90/0/0 |
| Excel ile snapshot öğrenci karşılaştırması | 199 |
| Excel ile snapshot ders karşılaştırması | 1194 |
| İki öğrenci karne PDF'si | Her biri 2 sayfa |

Excel'de net, puan, ders D/Y/B/net değerleri ve kazanım sayfaları doğrulandı. Eksik oturumun boş çıktı hücresi ile gerçek sıfır değeri ayrıldı; eksik oturumu bulunan kayda puan uydurulmadı. İki PDF'nin dört sayfası Poppler ile render edilerek görsel incelendi; Türkçe metin, cevap/anahtar tabloları, grafikler ve kazanımlar okunur bulundu. Otomatik PDF metin kontrolünde bozuk karakter görülmedi.

7108 fiziksel kapasitesi, yayınevi bağımsızlığı, boş cevap/kitapçık, mükerrer ve eksik oturum kuralları ile Özdebir profilleri değiştirilmedi. Testte açıkça 1,25 katsayı verilmiştir; bu değer yayınevinin resmî puan profili diye tanımlanmaz. v1.2.8'deki resmî Ankara katsayısı sınırı devam eder.

## Ana sayfa animasyonu

Rastgele yüzen etiketler ve geometrik süsler yerine yerel SVG sahnesi hazırlandı: sınav kitapçığı, fiziksel cevap baloncukları, ilerleyen tarama bandı, eşleşme onayı, ders grafiği ve örnek öğrenci karnesi. Örnek 75 doğru / 9 yanlış / 6 boş için 72 net gösterir; canlı istatistik değildir. Döngü 16 saniyedir; katmanlar yumuşak transform/opacity hareketleri kullanır. Kitapçık yüzeyi, kâğıt ve gölgeler marka renkleriyle çizildi; yeni animasyon kütüphanesi, görsel indirmesi veya analitik çağrısı eklenmedi.

Durdurma/oynatma düğmesi, ekran dışındayken durma, hafif fare parallax'ı ve `prefers-reduced-motion` için hareket etmeyen tamamlanmış sahne bulunur. Durdurulmuş durumda parallax ve bekleyen animasyon frame'i de durur. Kök `index.html` yerel önizlemesi aynı SVG/stillerle güncellendi. Animasyon gerçek cihazların tümünde 60 FPS garantisi olarak sunulmaz; tarayıcı frame ölçümü yalnız bu test makinesi için tanısaldır.

## Son kontrol ve dağıtım

Node **22.16.0** / npm **10.8.2** ile son kaynakta **224/224 test**, API üretim derlemesi ve Web üretim derlemesi geçti. Favicon önbellek sürümü dahil uygulama sürümleri v1.2.9 ile eşitlendi. Son `git diff --check` geçti.

| Kabul koşumu | Sonuç |
|---|---|
| `v129-authoring.cjs` | Gerçek HTTP/PostgreSQL oluşturma, tekrar, yarış, mevcut ilişki ve yetki kontrolleri geçti |
| `v129-workflow.py` | 10 kabul senaryosu; JavaScript hatası 0, başarısız API yanıtı 0 |
| `v129-exports.cjs` | 199 öğrenci / 1194 ders XLSX karşılaştırması geçti |
| PDF QA | 2 karne / 4 sayfa görsel ve Türkçe metin kontrolü geçti |
| `v129-hero.py` | 7 genişlik × 2 tema, 5 döngü karesi, azaltılmış hareket ve durdurma/oynatma geçti; hata/taşma 0 |
| `v128-ui.py` regresyonu | İki tamamlanmış grupta 7 genişlik / 28 ayrı kabul kontrolü; hata/taşma 0 |
| `v128-covers.py` regresyonu | 56 kapak/panel kontrolü; hata/taşma 0 |
| `v128-security.cjs` regresyonu | CAPTCHA zorunluluğu, kurulum token'ı, parola/JWT, admin sıfırlama ve öğrenci/veli izolasyonu geçti |

İlk uzun UI koşumu süreç süre sınırıyla kesildi; başarılı kabul diye sayılmadı. Aynı yedi genişlik iki küçük grupta baştan tamamlandı. Animasyonun ilk tema geçişleri bitmeden ölçüm alınması ve adı değişen düğmenin eski adıyla aranması test düzeneğinde düzeltildi; gerçek parallax durdurma sorunu ise uygulamada giderildi. Tarayıcı requestAnimationFrame medyanı 16,7 ms olarak ölçüldü; bu, bütün cihazlarda animasyonun 60 FPS olduğunun kanıtı değildir.

Sayısal kanıtlar `/tmp/v129-evidence/` altında `authoring.json`, `workflow.json`, `exports.json`, `pdf-text.json`, `hero.json`, `regression-ui.json`, `regression-covers.json`, `security.json` ve `baseline-integration.json` dosyalarındadır. Anonim ekran/PDF/XLSX dosyaları aynı dizindedir. Çalıştırma adımları `tests/e2e/README.md` içindedir.

Yeni migration veya ortam değişkeni yoktur. Node.js 22, npm 10 ve mevcut cPanel başlangıç düzeni korunur. Prisma şeması değişmedi; canlı DB'de seed/reset/migration gerekmiyor. Var olan depolama dizinleri, TXT şifreleme/JWT anahtarları ve dosyalar korunmalıdır. Üretim Web derlemesi gerçek HTTPS API adresi ve mevcut CAPTCHA public anahtarıyla yeniden alınmalıdır; yerel mock anahtarlı test derlemesi canlıya taşınmamalıdır.

Gerçek Google v2/v3 ve risk skoru, Microsoft Excel/macOS, gerçek Veridyen cPanel/Neon ve Windows 11 kabulü bu ortamda tamamlandı diye işaretlenmez. Canlıya aktarım yapılmadı. Test verileri anonimdi; kimlik bilgileri ve ekran görüntüleri `/tmp` altında tutuldu. Gerçek öğrenci dosyaları ve gizli anahtarlar depoya eklenmedi.

Kabul sonunda açılan yerel API, Web ve ayrı profilli LibreOffice test süreçleri kapatıldı. Önceden var olan geçici PostgreSQL konteyneri, proje kayıtları ve çalışma başlangıcında zaten bulunan `output/pdf/v126/` dizini silinmedi.
