# Kurumsal Sınav v1.2.1 RC.1 — geliştirme ve kabul raporu

Tarih: **12 Kasım 2026**. Temel: v1.2.0. Paket sürümü `1.2.1-rc.1`, görünen sürüm `v1.2.1 RC`.

Bu çalışma yereldir. Git push, canlı dağıtım, üretim DB sorgusu/migration/reset, üretim dosya arşivi işlemi, DNS değişikliği, hosting taşıması veya sunucu restart'ı yapılmadı. ProBook kurulumu ve CAPTCHA geliştirme/etkinleştirme, kullanıcının son açık talimatıyla kapsam dışındadır. Bunlar tamamlandı sayılmadı. Yerel testlerde mevcut CAPTCHA regresyonları korunarak koşuldu; gerçek sağlayıcı anahtarı veya canlı doğrulama kullanılmadı.

## 1. Tamamlanan geliştirmeler

- Görünür **1 Sayfalık Karne**, **2 Sayfalık Karne**, **Kazanımlı Karne** seçimleri; yönetici sonuçları, hesapsız sonuç ekranı ve mevcut hesaplı karne sayfasında ortak bileşen.
- PDF işlemleri öğrenci karnesi / okul listesi / sınıf listesi olarak gruplandı. Önizleme, PDF, Excel ve ZIP mevcut uçları korunarak açık metinlerle gösterilir.
- `/sonuclar` içindeki ayrı öğrenci giriş bileşeni kaldırıldı. Öğrenci numarası ve kişiye özel sınav koduyla hesap açmadan sorgu korunur. Eski hesap bağlantıları kaldırılmadı.
- Eksik katsayı `null` olarak desteklenir; önizlemede “Katsayısız devam et” ve “Katsayı tanımla” seçenekleri bulunur. Katsayı yardım paneli formun yanında açılır.
- Yayın sınavı tanımı dosyasız ayrı işlem; tekli/toplu cevap anahtarı ekleme mevcut sınava bağlanır. Eski POST artık yeni sınav yaratmaz.
- FMT önerisini uygulama düğmesi yüksek kontrastlı, geniş ve durum bildirimli oldu. Güçlü tahmin yeşil, diğer uygulanabilir öneri sarı; seçim değerlendirmeyi kendiliğinden başlatmaz.
- Menü/sayfa adları “Sınav Değerlendir”, “Kurum Yönetimi” ve “Sınav Tanımları” olarak düzenlendi. Kurum listeleme, ekleme, düzenleme ve aktiflik işlemleri aynı ekranda korunur.
- Nartesi adı JSON sunumunda ve PDF yayınevi başlıklarında Nartest olarak gösterilir; DB adı/ID'si, dosya yolu, sahiplik veya geçmiş ilişkiler değiştirilmez.
- Sağ üst avatarın padding'i kaldırıldı, fotoğraf dairenin alanına sabitlendi; object-fit cover / object-position center. Portre görselin intrinsic yüksekliğinin grid'i genişlettiği tarayıcıda tespit edilip düzeltildi.
- SUPER_ADMIN için salt okunur Test Merkezi ve sabit rapor API'si eklendi.

## 2. Düzeltilen hatalar ve hesaplama sınırı

Eksik katsayıyı reddeden şema ve form doğrulamaları düzeltildi. Genel kaynakta boş katsayıya 1, F/O/Nartest kaynaklarında ders adına göre 4/1 atama kaldırıldı. Kaynak katsayı içermiyorsa kullanıcı tanımlayana kadar eksik kalır. Kaydedilmiş eski anahtar/snapshot'lardaki açık katsayılar değiştirilmez.

Eksik katsayı nedeniyle puan hesaplanamadığında puan, katsayılı ders neti ve puan sıraları `null` olur. PDF/UI bunu “—” veya “Hesaplanmadı” olarak gösterir; Excel puan/sıra hücreleri boştur. Karşılaştırma ortalamaları da sıfıra dönüştürülmez. Listelerdeki fiziksel sıra numarası “Satır” olarak adlandırılır. Tüm sorular iptalse sıfıra bölme veya varsayımsal sıfır puan üretilmez.

Katsayılı hesap mevcut yerel deneme ölçeğidir: `max(0, katsayılı net / geçerli soruların toplam ağırlığı) × 500`. Resmî LGS/YKS puanı, ülke yüzdeliği veya sistem dışı öğrenci sırası değildir. Bağımsız v1.2.0 hesap örnekleriyle sayısal regresyon korunur.

## 3. “Sınav Kayıtları” ne işe yarıyordu?

`ExamManagement` → `GET/POST /api/exams` → Prisma `Exam`. Kurum, isteğe bağlı yayınevi, ad ve tarih gösterir; son 100 kayıt listelenir. TXT arşivi, yükleme geçmişi veya OpticalResult değerlendirme listesi değildir. Cevap anahtarı kataloğundaki `PublishedAnswerKey` ile aynı tablo da değildir.

Bu ayrım kod incelemesinden sonra kullanıcıya kısa değerlendirme olarak sunuldu. Bölüm silinmedi/birleştirilmedi; **Sınav Tanımları** adı ve görev açıklaması eklendi. Mevcut kullanıcıların ad/tarih tanımlayacağı kontrollü form korundu. Sonuçlar ekranına birleştirmek bugün iki farklı veri modelini aynı kayıt gibi göstereceğinden uygun bulunmadı. İleride birleşik sınav kimliği tasarımı ayrı migration ve eski ilişkiler için eşleme gerektirir.

Yayın arşivinde yeni bir tanım gerektiğinde Cevap Anahtarları içindeki **Yeni yayın sınavı tanımla** alanı kullanılır. `POST /api/admin/exam-definitions` sadece metadata oluşturur; dosya, anahtar, öğrenci veya sonuç oluşturmaz. Aynı yayınevi/sınıf/ad için eşzamanlı oluşturma transaction kapsamlı PostgreSQL advisory lock ve mevcut kayıt kontrolüyle engellenir. Cevap ekleme `PATCH /api/admin/answer-keys/:id` kullanır. Eski dosyalı POST 409 ile mevcut tanımı seçmeyi ister. Haricî eski istemciler bu sözleşmeye uyarlanmalıdır.

## 4. Katsayısız sınav davranışı ve yardım

Gösterilen açıklama:

> Bu sınav için katsayı tanımlanmamış. Sınavı katsayısız oluşturabilirsiniz. Katsayı gerektiren puan hesaplamaları yapılamayabilir.

Tanım oluşturmak katsayı gerektirmez. Sorular ve kitapçık eşleştirmesi geçerliyse değerlendirme de engellenmez. Doğru, yanlış, boş, iptal, net, cevap karşılaştırması ve kazanım başarı oranları hesaplanır. Bir geçerli dersin katsayısı eksikse sınavın tam katsayılı puanı üretilmez. Sıfır, negatif, NaN veya 100 üstü katsayı geçerli sayılmaz; boşluk ile geçersiz sayı ayrıdır.

Yardım paneli katsayının anlamını, puana etkisini, yanlış katsayı riskini ve yeniden değerlendirmeyi açıklar. Örnek: iki 10 soruluk derste netler 8/6 ve katsayılar 2/1 ise `(8×2+6×1)/(10×2+10×1)×500 = 366,67`. Katsayı değişikliği geçmiş sonuç kopyalarını kendiliğinden değiştirmez; yeni sürüm değerlendirme ve yayın kontrolü gerekir. Excel'de bir katsayı alanını temizlemek eski değere sessizce geri dönmez.

## 5. Sonuç gizliliği ve düşük sürtünmeli erişim

v1.2.0 erişim kodu, tahmin edilebilir öğrenci numarasının kimlik doğrulaması yerine kullanılmasını engellemek için geliştirilmişti. Numara tek başına yeterli olsaydı numara taramasıyla ad, şube, cevaplar ve kişisel sınav performansı açığa çıkabilirdi. TC kimlik numarası da parola değildir. İhtiyaç dışı kişisel paylaşım ve yetkisiz erişimin önlenmesi KVKK'nın veri minimizasyonu/güvenlik ilkeleriyle ilişkilidir. Bu rapor hukuki uygunluk sertifikası değildir. [KVKK Kanunu, madde 4 ve 12](https://www.kvkk.gov.tr/Icerik/6649/Personal-Data-Protection-Law), [Kurulun veri minimizasyonu değerlendirmesi](https://www.kvkk.gov.tr/Icerik/5413/Islenme-Amacinin-Gerektirdiginden-Fazla-Kisisel-Veri-Islenmesi-Aktarilmasi-Veri-Minimizasyonu-Ilkesine-Aykirilik-).

| Yöntem | Deneyim ve risk | RC kararı |
|---|---|---|
| Öğrenci numarası + okulun kişiye verdiği sınav kodu | Hesap açılmaz; kod okul/sınav/öğrenciye bağlıdır. Kodun güvenli dağıtılması gerekir | Mevcut 16 karakterlik tahmin edilemez kod korundu; önerilen çözüm |
| Kişisel tahmin edilemez bağlantı | Alan doldurmayı azaltır; paylaşım, referer/history/log sızıntısı, süre/iptal tasarımı gerekir | Değerlendirildi; bu RC'de yeni bağlantı sistemi eklenmedi |
| SMS/e-posta tek kullanımlık kod | Kişiye ulaşılabildiğini doğrular; ücret, iletişim kaydı ve teslimat sorunu getirir | Şimdilik gereksiz ek sürtünme |
| Mevcut öğrenci/veli hesabı | Oturum/tekil bağlantı iptali yönetilebilir | Eski kullanıcılar için çalışır; ana sonuç ekranına ayrı giriş bileşeni konmaz |

Sorgu/PDF uçlarında erişim kodu zorunluluğu, yayımlanmış sonuç kontrolü, öğrenci kapsamı, gizli kimlik alanlarının çıkarılması, PDF'de TC gizleme ve rate limit korunur. Sonuç formu kodu URL/query string'e koymaz. Erişim kodu kalıcı bir bearer sırrıdır; tekil iptal/TTL özelliği bu RC'de eklenmedi. Yayın kapatılarak sınavın erişimi durdurulabilir; tekil iptal ihtiyacı olanlar mevcut revocable hesap bağlantısını kullanmalıdır. Bellek içi limiter birden fazla worker arasında ortak değildir. Öğrenci sorgusu bot koruması “tamamlandı” olarak sunulmaz; CAPTCHA çalışması kapsam dışıdır.

## 6. Karne türleri ve PDF kabulü

Mevcut PDFKit/font/rapor view altyapısı kullanıldı; yeni PDF motoru eklenmedi.

| Seçenek | templateId | Davranış | Anonim örneğin sayfa sayısı |
|---|---|---|---:|
| 1 Sayfalık Karne | summary-card | Sınav/öğrenci bilgileri, puan/sıralama veya yokluk bilgisi, ders başarı tablosu | 1 |
| 2 Sayfalık Karne | two-page-card | Genel başarı + cevap ve kazanım analizi | 2 |
| Kazanımlı Karne | detailed-card | Tüm ayrıntılar; uzun kazanımlarda sayfa eklenir | 7 |
| Okul sonuç listesi | school-table | Aynı scoped veriden öğrenci ve ders sonuçları | 1 |

İki sayfalık sınırı aşan içerikte indirme açıklamayla reddedilir; kullanıcı Kazanımlı Karne'ye yönlendirilir. Metin kırpılmaz veya okunamayacak kadar küçültülmez. Çok uzun tablo hücreleri gerekirse ölçülmüş parçalara bölünür, başlık yeni sayfada tekrarlanır. Özetin tek sayfalık sınırı da kontrol edilir; keyfî küçültme yapılmaz.

Uçlar: yönetici `/api/optical/result-exams/:id/export?kind=...&templateId=...`; hesapsız `POST /api/public-results/pdf`; mevcut hesap `/api/my-results/:id/pdf?templateId=...`. Her üçü two-page-card seçeneğini kabul eder. Excel seçimi aynı scoped rapor verisini kullanır.

Örnekler: [1 sayfa](../output/pdf/v121-1-sayfa.pdf), [2 sayfa](../output/pdf/v121-2-sayfa.pdf), [tam kazanımlı](../output/pdf/v121-kazanimli.pdf), [okul listesi](../output/pdf/v121-okul-listesi.pdf). Poppler ile sayfa/margin/boş sayfa ve uzun kazanımın son etiketleri doğrulandı; renderlar gözle incelendi. 150 öğrencili liste ve uzun kazanım stres betiği de yerel kabul koşumuna dahildir.

## 7. Test Merkezi — gerçek sayı ve güvenlik

Başlangıçta 25 `.test.ts` dosyasında **150 çalıştırılabilir Node testi** vardı. İlk metin aramasının 155 eşleşmesi gerçek test sayısı değildi; AST envanteri ve koşucunun çalıştırdığı sayı esas alındı. Yeni RC testleri `tests/v121.test.ts` içinde; nihai sayılar aşağıdaki son koşum kanıtında yer alır.

- Envanter TypeScript AST'sinden çıkarılır. Her Node testi birincil kategoriye atanır; kategoriler toplamı test toplamını verir. Kategoriler kapsama yüzdesi değildir; sıfır ayrı test bulunan kategori gizlenmez.
- `/api/admin/test-center`: JWT ve SUPER_ADMIN şartı, private/no-store, sabit dosyadan salt okuma. İstemciden script/komut/dosya yolu alınmaz. Çalıştırma düğmesi, shell, terminal veya süreç başlatma API'si yoktur.
- Kaynak `apps/api/assets/test-center-report.json`; npm `test:report` yerelde gerçek Node koşumundan üretir. Zod özet ve kategori sayılarını test durumlarıyla karşılaştırır. Rapor yoksa/bozuksa 503; başarılı sayılmaz.
- Node raporu başlangıç/bitiş, süre, passed/failed/skipped/not_run, test adları, sürüm ve kaynak SHA-256 özeti taşır. Kaynak özeti çalışan sunucunun kendiliğinden doğrulaması değildir; yeni kod için rapor yerelde yeniden üretilip paketlenmelidir.
- Sabit kabul koşucusu `tests/run-v121-acceptance.cjs`, PDF/stres/QA ve localhost UI betiklerini yürütüp ayrı kanıt yazar. Yalnız aynı kaynak özetiyle eşleşen kanıt rapora alınır. Diğer tarayıcı/DB betikleri çalıştırılmadı olarak kalır. Betik sayısı Node testi/assertion sayısıyla toplanmaz.
- Rapor üretmek için Node 22.8+ gerekir; yerelde Node 24.18.1 kullanıldı. API'ye dev test bağımlılıkları veya test kaynakları paketlemek gerekmez; yalnız rapor varlığı kopyalanır.

İleride uzaktan test çalıştırma istenirse üretim anahtarları olmayan ayrı izole CI/staging ortamı ve sabit allowlist iş tanımları gerekir. Böyle bir yetki bu RC'de oluşturulmadı.

## 8. Hosting ortamı ve paylaşımlı hesap

Kullanıcı paket adını **Node.js Senior** olarak bildirdi. Güncel paket özellikleri resmi sayfayla karşılaştırıldı; cPanel hesabına girilip etkin limit ölçülmedi. Hizmet sınıfı kotalı Node.js hosting; paylaşımlı LVE kaynak modeli yönünde çıkarım var, müşteri hesabının özel tahsis türü için doğrudan sağlayıcı teyidi eksik. Sadece cPanel'den kesin sonuç çıkarılmadı.

CPU, RAM, EP/NPROC, I/O/IOPS, disk/inode, Passenger, DB havuzu, yükleme, timeout, TLS/WAF, yedek/log/restart ve yoğunluk değerlendirmesi [ayrı hosting/taşınabilirlik raporundadır](v121-hosting-portability.md). Mevcut paketin yeterliliğine dair gerçek p95/eşzamanlılık ölçümü yapılmadı; sayı uydurulmadı.

## 9. Alternatif hosting önerisi

Önce Senior.js'te ölçüm; darboğaz varsa optimizasyon ve uygun paket artışı. Manager.js, yönetilen VPS/SLA, Türkiye bulut VM, Avrupa bulut ve yönetilen Node hosting ile ayrı Web/API seçenekleri, gerçek ilan fiyatları ve ölçülmeyen değerlerin ayrımıyla [karşılaştırıldı](v121-hosting-portability.md#alternatifler-ve-maliyet). Şimdi sunucu taşıma önerisi veya işlemi yok.

## 10. Taşınma planı

Kaynak/build dosyaları, environment değişkenleri, DB ve TXT arşivi, anahtarların korunması, DNS/az kesinti ve rollback adımları [taşınabilirlik raporunda](v121-hosting-portability.md#taşınabilirlik-envanteri). Önemli bulgu: kodda hesap adına sabit çalışma yolu bulunmadı, fakat `AnswerKeyFile.storagePath` DB'de mutlak yol tutuyor. Hedefte aynı mount veya kontrollü prefix dönüşümü gerekir. TXT_STORAGE_KEY ve JWT_SECRET körlemesine değiştirilemez. Docker yalnız uygun VPS/bulutta ileride değerlendirildi; kurulmadı.

## 11. ProBook VS Code

Kullanıcının son notuyla kapsam dışı. İşletim sistemi/mimari kontrolü, yazılım kurulumu, eklenti veya makine erişimi yapılmadı; kuruldu iddiası yok.

## 12. reCAPTCHA

Kullanıcının son notuyla kapsam dışı. Yeni entegrasyon, anahtar talebi, sağlayıcı ayarı veya etkinleştirme yapılmadı. Mevcut Turnstile/reCAPTCHA kodu ve güvenlik denetimleri korunur; mevcut otomatik regresyonlar test verileriyle koşulur. Gerçek bot koruması hazır/aktif olarak kabul edilmedi. Bu RC için gizli anahtar sohbetten istenmedi.

## 13. Regresyon ve kabul kanıtı

Son koşumun sayısal özeti ve kategorileri aşağıdaki otomatik ek bölümde verilir. Node testleri gerçek parser/hesap/PDF kodunu, izole Prisma taklitlerini ve sentetik verileri kullanır. UI kabulünde gerçek production Web build'i + Chromium çalışır; API ağı anonim test yanıtlarıyla taklit edilir. Bunlar gerçek Neon/Passenger kabulü yerine geçmez.

Kapsanan konular: TXT arşiv yazma/okuma doğrulaması ve sahiplik, 7108/8050, otomatik/manuel FMT seçimi, kitapçık eşleştirme, cevap anahtarı önizleme/onay, katsayılı/katsayısız hesap, sonuç sürümleri/yayın, erişim kodu/yetki, rapor/PDF/Excel, JWT/roller ve mevcut CAPTCHA regresyonu. Yeni tarayıcı kabulü karne endpoint seçimleri, hesap girişi olmayan sorgu, kodun korunması, salt okunur Test Merkezi, varsayılan/fotoğraflı avatar, menü ve mobil taşmayı kontrol eder.

Geçmiş sonuç/snapshot/anahtar değişmezliği ve TXT özgün bayt/şifreleme regresyonları sentetik örneklerle geçti. **Mevcut üretim kayıtlarının yerinde doğrulandığı iddia edilmez**: canlıya erişilmedi. Bu ortamda yeni gerçek PostgreSQL kabulü çalıştırılmadı; Docker socket erişimi bulunmadı ve üretim veritabanı kullanılmadı. v1.2.0'ın eski PostgreSQL raporu yeni RC'nin gerçek DB koşumu yerine sunulmaz.

İlk koşumda eski varsayılan katsayı/sıralama ve eski POST sözleşmesi beklentileri başarısız oldu; yeni açık sözleşmeye göre testler güncellendi, katsayılı bağımsız hesap testleri korundu. Tarayıcı ilk koşumunda avatar kayması bulundu ve düzeltildi. Geçici test-fixture ve kapalı mobil menü adımları düzeltilerek kabul yeniden koşuldu. Son durum aşağıdadır; ilk başarısızlıklar gizlenerek doğrudan yeşil gösterilmedi.

## 14. Yeni bağımlılıklar

Üretim veya geliştirme npm bağımlılığı eklenmedi. Mevcut TypeScript AST, node:test, Zod, PDFKit, PDF.js, XLSX ve fontlar kullanılır. Playwright/Chromium ve Poppler yalnız yerel kabul ortamının araçlarıdır; proje üretim bağımlılığına eklenmedi. Paket lock dosyasında yalnız workspace sürümleri değişti. Prisma 6'nın package.json içi seed tanımına ilişkin mevcut deprecation uyarısı build'de görüldü; sürüm yükseltmesi yapılmadı.

## 15. Prisma migration ve veri koruma

Yeni migration yok; Prisma schema'sı değiştirilmedi. Katsayı eksikliği mevcut JSON soru/snapshot alanında null olarak temsil edilir. `prisma generate` yalnız istemci üretmek için yerelde çalıştırıldı; migrate/reset/db push/seed uygulanmadı. Yeni tanım kilidi mevcut PostgreSQL transaction özelliğini kullanır. Gerçek DB üzerindeki kilit/eşzamanlılık, hedef staging'de ayrıca kabul edilmelidir.

Eski sonuçlar silinmedi veya topluca yeniden hesaplanmadı. Eski pozitif katsayılar snapshot'ta kalır. Güncel anahtarı değiştirmek eski sonucu otomatik değiştirmez. Hesaplama API sözleşmesine yeni null değerler ve `two-page-card` tipi eklendiğinden dış istemciler bunları desteklemelidir; Web/API birlikte sürümlenmelidir.

## 16. Yayın öncesi kalan işler

1. Kullanıcının ayrı yayın onayı. Bu çalışma hiçbir push/deploy onayı varsaymaz.
2. İzole PostgreSQL staging'de mevcut migration geçmişi, yeni dosyasız tanım + anahtar PATCH akışı, paralel tanım oluşturma kilidi, null katsayının JSONB saklanması ve yeniden okuma kabulü. Gerçek veri gerekiyorsa anonim kopya ve erişim sınırı.
3. Hesaptaki gerçek Node 22/native bağımlılık/Passenger başlangıcı ve Web/API birlikte paket kontrolü. Yerel test build'i veya test environment değerleri canlıya taşınmamalı.
4. Senior.js etkin hesap türü/limit teyidi, LVE kullanım ölçümleri, DB bağlantı havuzu, storage/backup restore provası. Gerçek trafik kapasitesi henüz doğrulanmış değil.
5. Çoklu worker rate limit paylaşımı ve kod dağıtım/iptal işletimi ihtiyaca göre ayrıca ele alınmalı. CAPTCHA ve ProBook bu siparişin kapsamı dışındadır; canlı bot koruması kabulü yapılmadı.
6. API davranış değişiklikleri: implicit cevap anahtarı POST'u kapalı; dosya eklerken mevcut tanım ID'si zorunlu. Puan/sıra null olabilir. Dış entegrasyonlar kontrol edilmeli.

## Son koşum kanıtı

Node koşumu bitişi: **2026-11-12T18:24:51.510Z** (UTC; panel Europe/Istanbul olarak gösterir). Süre **7.242 saniye**. 26 test dosyası, **162 test; 162 başarılı, 0 başarısız, 0 atlanan, 0 çalıştırılmamış**. Başlangıç 150 + bu RC'nin 12 yeni testi = 162.

| Birincil kategori | Test | Başarılı | Başarısız | Atlanan | Çalıştırılmadı |
|---|---:|---:|---:|---:|---:|
| Kimlik doğrulama ve güvenlik | 8 | 8 | 0 | 0 | 0 |
| Kullanıcı yetkileri | 10 | 10 | 0 | 0 | 0 |
| Kurum izolasyonu | 5 | 5 | 0 | 0 | 0 |
| TXT/FMT | 26 | 26 | 0 | 0 | 0 |
| 7108 ve 8050 | 16 | 16 | 0 | 0 | 0 |
| Sınav değerlendirme | 49 | 49 | 0 | 0 | 0 |
| Sonuç hesaplama | 5 | 5 | 0 | 0 | 0 |
| Karne ve PDF | 17 | 17 | 0 | 0 | 0 |
| Excel ve dosya işlemleri | 16 | 16 | 0 | 0 | 0 |
| Veritabanı ve Prisma | 2 | 2 | 0 | 0 | 0 |
| Arşivleme | 4 | 4 | 0 | 0 | 0 |
| Giriş ve CAPTCHA | 3 | 3 | 0 | 0 | 0 |
| Arayüz ve mobil | 0 | 0 | 0 | 0 | 0 |
| API ve sistem sağlığı | 1 | 1 | 0 | 0 | 0 |
| Performans ve regresyon | 0 | 0 | 0 | 0 | 0 |

Arayüz/mobil ve performans/stres için ayrı kabul betikleri kullanılır; yukarıdaki sıfırlar bu işlevlerin denenmediği anlamına gelmez. Node testleriyle betik/assertion sayıları karıştırılmaz.

| Ayrı kabul betiği | Gerçek durum | Süre | Bitiş (UTC) |
|---|---|---:|---|
| v120-pdf-stress.ts | passed | 0.810 sn | 2026-11-12T18:24:14.040Z |
| v121-pdf-qa.py | passed | 0.305 sn | 2026-11-12T18:24:15.778Z |
| v121-pdf.ts | passed | 1.433 sn | 2026-11-12T18:24:15.473Z |
| v121-ui.cjs | passed | 6.287 sn | 2026-11-12T18:24:22.065Z |
| api-package-smoke.cjs | passed | 1.107 sn | 2026-11-12T18:24:13.229Z |

Envanterde 20 ayrı betik vardır; bu kabulde 5'i çalıştırıldı ve başarılı, **15 betik çalıştırılmadı**. Çalıştırılmamış eski tarayıcı/gerçek PostgreSQL betikleri yeşile boyanmadı. Gerçek CAPTCHA anahtar testi de yapılmadı. Derlenmiş API smoke'u gerçek Passenger kurulumunu değil dinleme sözleşmesini sınar; ayrı bağımsız npm paketi kurulumu yapılmadı.

- Kök `npm run build`: yerel Prisma Client üretimi, API TypeScript ve Next production build başarılı. Son UI değişiklikleri için Web production build ve API build ayrıca yenilendi.
- `git diff --check`: başarılı.
- PDF QA: dört RC çıktısı 1 / 2 / 7 / 1 sayfa; tüm sayfalarda metin, margin kontrolü ve uzun kazanımların TAM-0…TAM-17 sonları mevcut. Yeni üretilmiş 150 kişilik stres listesinde Q1…Q150 satırları ve tekrar eden tablo başlıkları doğrulandı.
- Chromium: 1440×1000 ve 390×1000; sıfır pageerror/taşma; doğru PDF templateId/kind; FMT uygulama sonrası değerlendirme çağrısı yok; fotoğraflı/varsayılan avatar; bayi Test Merkezi menüsünü göremiyor.

Paketlenen salt okunur kanıt: [test raporu JSON](../apps/api/assets/test-center-report.json). Kaynak/test özeti: `ff3f8f151320ea5e1ab481c288d6b65984e69af279710a34a4e55461d0df383a`. Rapor uygulama çalışırken test başlatmaz.

Tekrarlama (yalnız yerel/izole ortam): Node 22.8+ ile `npm run test:report`. UI kabulü için production Web build'i 127.0.0.1:3100'de açıkken `node tests/run-v121-acceptance.cjs`; Playwright/Chromium için `PLAYWRIGHT_MODULE`/`CHROMIUM_PATH` ortamı kullanılabilir. Ardından `npm run test:report` ayrı kanıtları eşleştirir ve API build raporu varlıklara kopyalar. Bu komutlar canlı ortamda çalıştırılmamalıdır.

## Sonraki yerel değişiklik — Özdebir BLDM kütüphanesi

Kullanıcının sonraki talimatıyla Özdebir 5/6/7/8 Ortaokul Tek Oturum dosyası özgün BLDM olarak kütüphaneye eklendi. [İnceleme ve gerekli örnekler](ozdebir-ortaokul-tek-oturum.md). Bu eklemeden sonraki Node raporu **165/165 başarılı**. Yukarıdaki 162 test ve 5 kabul betiği önceki RC kaynak sürümünün tarihli kanıtıdır; yeni kaynakla eşleşmeyen kabul betikleri güncel Test Merkezi'nde çalıştırılmadı olarak kalır. Özdebir TXT değerlendirme tanımı henüz etkinleştirilmedi; gerçek okuyucu çıktısı bekleniyor.

## Sonraki TXT doğrulaması — Özdebir tek oturum desteği

Kullanıcının 1=sözel, 2=sayısal, 9=tek oturum açıklaması ve sağladığı TXT örnekleri incelendi. Tek oturumun 171 karakterlik yerleşimi artık kodda doğrulanmış sistem FMT seçeneğidir; önceki bölümdeki etkinleştirilmedi bilgisi bu sonraki adımla güncellenmiştir. [Güncel Özdebir incelemesi ve sınırlar](ozdebir-ortaokul-tek-oturum.md). Son Node koşumu **173/173 başarılı**; Web/API build başarılı. Gerçek tek oturum örneği boş kitapçık nedeniyle doğru biçimde reddedilir; A/B veya puan uydurulmaz. 131/91 karakterlik ayrı 1/2 oturum dosyası için tanım henüz eklenmedi. Kişisel öğrenci kayıtları teste/depoya alınmadı; anonim regresyonlar kullanıldı. Canlıya işlem yapılmadı.


## Sonraki görsel inceleme — kutular, logolar ve simgeler

[Genel görsel inceleme raporu](v121-visual-review.md). Mobil Test Merkezi taşması, eksik logo gösterimi, kart eylemlerinin hizası, tema kontrastı, simge tutarlılığı ve iki hatalı medya kuralı düzeltildi. Yerel Chromium ile 5 genişlik × 2 tema × 15 sayfa/panel durumu = **150 başarılı kontrol**, bozuk görsel/JavaScript hatası/sayfa taşması yok. Sentetik verili mevcut UI regresyonu 1440/390 px’de geçti; Node testleri **173/173 başarılı**, Web/API build başarılı. Ayrı tarayıcı kanıtı bu raporda belirtilir; paketlenen Test Merkezi kanıtı Node koşumunu gösterir. Canlıya işlem yapılmadı.
