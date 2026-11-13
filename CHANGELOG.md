# v1.2.5 · 2026-11-14 · yerel geliştirme

- Özdebir Sözel, Özdebir Sayısal ve Özdebir Tek Oturum ayrı sistem seçimleri olarak sunulur. Sözel/sayısal özgün FMT dosyaları indirme ve paylaşım kütüphanesine eklendi; mevcut tek oturum BLDM dosyası korundu.

- Gerçek iki TXT ve üç SEKONIC FMT ile Özdebir 1/2/9 düzenleri doğrulandı: 131/91/171 karakter. Eskişehir dosyasında 209 kayıt → 105 öğrenci; 104 çift oturum, 1 eksik sayısal.
- Kimlik/kurum çelişkileri ayrı tutulur; aynı oturumun en çok geçerli işaretlemeli kaydı kendi kitapçığı ve boşlarıyla bütünüyle seçilir. Bozuk satırlar güvenilir öğrencileri durdurmaz.
- Eksik ders neti/katsayılı neti `null`; mevcut dersler değerlendirilir, eksik oturumda tam sınav puanı üretilmez. Ekran, PDF ve Excel aynı eksiklik bilgisini kullanır.
- Yanlış FMT'de yapısal olarak tekil ve daha güvenilir alternatif denenir; konum kaydırma/doldurma yok. Sonuçlar tamamlandı, uyarılarla tamamlandı ve değerlendirilemedi olarak ayrılır.
- SEKONIC `S` alanları ve sabit değerler desteklendi; sağlanan FMT'lerin tam içerik imzasına özel doğru alan/oturum eşleştirmesi eklendi.
- Boş kitapçık otomatik A yapılmaz; kullanıcı boş kitapçıklar için açık seçim yapabilir. Tek optik gerçek örneğinde bu seçim gereklidir.
- Karne öğrenci cevabı hücresinde renk ve sembol kullanılır; tekrarlayan Durum satırı kaldırıldı. Renkler korunarak vektör desenler, belirgin sınırlar ve grafik değerleri eklendi; 1 sayfalık özet de ders grafiği içerir.
- Menü 14 px/600, grup başlıkları 12 px, belirgin aktif seçim; mobil taşma kontrolü. Sonuç penceresi gerçek sayıları gösterir, sonuç ekranına kurum/sınav seçili geçer.
- Migration ve yeni bağımlılık yok. Veritabanı/kayıt/ham TXT değiştirilmedi. Test kapsamı ve sınırlar: [v1.2.5 raporu](docs/v125-release-report.md).

# v1.2.4 · 2026-11-13 · yerel geliştirme

- FMT ve sınav önerilerine yüzdeye göre kırmızı–sarı–yeşil renklenen animasyonlu dolum eklendi.
- Aynı öğrencinin tekrar eden TXT satırları yüklemeyi durdurmadan birleştirilir. Derslerde daha çok işaretlemeli kayıt kendi kitapçığıyla kullanılır; kimlik alanlarında daha dolu kayıt tercih edilir, boş alanlar mevcut bilgiyi silmez.

# v1.2.3 · 2026-11-13 · yerel geliştirme

- TXT uzunluk, kimlik ve tekrar sorunları uyarıyla değerlendirilir. Birleşen derslerde daha çok işaretlemeli kayıt kullanılır; eşitlikte ilk kayıt korunur.
- FMT ve sınav önerileri yüzdeleriyle birlikte gösterilir; ayrı ayrı veya turuncu “İkisini de uygula” düğmesiyle seçim alanlarına uygulanır.
- TXT arşivinde yükleyen bayi/Admin ve silme düğmesi gösterilir. Silme arşivden kaldırır, kaydedilen sonuçları korur.
- Değerlendirme bitince uyarıları ve olası etkilerini açıklayan pencere açılır; sonuç ekranına kurum ve sınav seçilmiş olarak geçilir.

# v1.2.2 RC.2 · 2026-11-12 · yerel geliştirme

- TXT değerlendirmesinde FMT/sınav sınıfı ve soru dağılımı farkları yüklemeyi engellemez; eşleştirilemeyen cevaplar boş değerlendirilir, fazla işaretlemeler atlanır ve uyarılar kaydedilir.
- Sınav önerisi öğrenci kimliği, yinelenen satır ve oturum birleştirme kontrollerinden bağımsız olarak cevap alanlarından hesaplanır; kısa anahtar sonrası işaretlemeler öneriyi engellemez.
- Din K.ve A.B. ders adı eşleştirmesi eklendi. Web, API, paketler ve önizleme sürümü RC.2 olarak eşitlendi.
- Canlıya dağıtım veya push yapılmadı.

# v1.2.2 RC · 2026-11-12 · yerel geliştirme

- Cevap anahtarı ekleme için yöneticiye özel, yayınevi ve sınıfa göre gruplanan Sınav Ekle ekranı; kayıtlı sınavdan doğrudan anahtar ekleme.
- XLS/Excel içe aktarmada `İ`, `X` ve `İPTAL` iptal cevapları olarak eşlenir; soru düzenleyicide seçenek adı İPTAL olarak görünür.
- TXT ve FMT seçildiğinde uygun cevap anahtarları, işaretli öğrenci cevap dizilerine göre yüzde benzerlikle önerilir; seçim kullanıcıda kalır.
- Öğrenci/okul karne türleri ve PDF/Excel işlemleri net adlarla gruplandı; yinelenen karne şablonu seçicileri kaldırıldı.
- Sürüm numarası v1.2.2 RC.1 olarak güncellendi. Canlıya dağıtım veya push yapılmadı.

## v1.2.0 · 2026-11-12 · yerel kabul adayı

- Sistem 7108 tanımı eski veritabanı yerleşimi tarafından gölgelenmez; geçmiş kayıtlar korunur.
- Tüm TXT satırları, sabit kod, genişlik ve alan türleriyle FMT tahmini; geçersiz kitapçık değerlendirmeyi durdurur.
- Gerçek PostgreSQL ve bağımsız beklenen değerlerle yükleme → kayıt → PDF kabul testi.
- Profesyonel özet/ayrıntılı karne, okul tablosu, gerçek ortalamalar, cevap/kazanım analizi ve önizleme.
- Öğrenci hesabından yetkili profesyonel PDF; hesapsız sorguda okul/sınav/öğrenci erişim kodu.
- Belirgin cevap anahtarı araması ve salt okunur listede sunucu araması.
- Google reCAPTCHA v2 seçeneği, süre/hostname/tekrar kontrolü; anahtarsız varsayılan kapalı.
- Yeni migration/bağımlılık yok; canlıya dağıtım ve Git push yapılmadı.
- [Kabul raporu, açık sınırlar ve CAPTCHA kurulum adımları](docs/v1.2.0-kritik-kabul-raporu.md).

## v1.1.9 · 2026-11-11

- Karne ve liste çıktı aileleri ayrıldı; mevcut tasarımlar ve örneklere dayanan ek PDF seçenekleri.
- Sonuçlarda kademe filtresi, yayımlanmış sonuç kapsamı ve belirsiz öğrenci numarası koruması.
- Öğrenci/veli girişi Sonuçlar'a, yönetici alanı login sayfasının altına taşındı.
- Açıklanabilir FMT tahmini ve sistem 7108/8050 ile FMT DÖNÜŞTÜRÜCÜ.
- İsteğe bağlı Turnstile, sunucuda Siteverify/action/hostname kontrolü.
- 7108 alan bazlı hata açıklamaları ve kodlama/satır sonu regresyonları; gerçek TXT doğrulandı; hata veren kayıtlı yerleşim henüz doğrulanmadı.
- Yeni migration yok; [v1.1.9 raporu](docs/v1.1.9-release.md).

## v1.1.8 RC — 11 Kasım 2026 · yerel doğrulama

- Uygulama, Web, API, sağlık bilgisi, footer ve favicon sürümleri 1.1.8 olarak güncellendi.
- FMT alan sırası karşılaştırması düzeltildi; kalıcı TXT arşivi, tikle toplu değerlendirme ve il/ilçe/kurum seçimi eklendi.
- 133 test, gerçek PostgreSQL tarayıcı testi ve üretim derlemesi geçti. Yeni arşiv migration’ı dağıtımda uygulanmalıdır.
- Ayrıntılar: [v1.1.8 RC raporu](docs/v1.1.8-rc-release.md). Canlı dağıtım yapılmadı.

## v1.1.6 RC — Kasım 2026 · yerel geliştirme

- FMT kütüphane ve arama akışı, TXT/FMT/sınav seçimi, panel metinleri, karşılama alanı ve profil görünümü sadeleştirildi.
- Sınav değerlendirme motoru, cevap anahtarları, FMT/TXT içeriği ve kurum erişim kapsamı korunmuştur.
- Test: 124/125 geçti; Sharp native görüntüleme hatası. Build: derleme/lint/type geçti; sayfa verisi toplamada `/cevap-anahtarlari/[slug]` başarısız.
- Ayrıntılar: [güncel RC raporu](docs/v1.1.8-rc-release.md).

## v1.1.5 RC — 10 Kasım 2026 · yerel doğrulama

- Panel karşılama ve RC kutlama sayfası; ölçülü, reduced-motion uyumlu RC işareti.
- Cevap anahtarı görünürlüğü için satır ve toplu kontroller; kurum oluşturma ve FMT filtreleri sınav yüklemede.
- Okul/sınıf listesi ve karne sıralama kontrolleri; footer tarihi 10 Kasım 2026.
- Doğrulama sonuçları ve tamamlanmayan kapsam için [RC teslim raporu](docs/v1.1.5-rc-release.md).

# Kurumsal Sınav

## v1.1.1 — 9 Kasım 2026 · dağıtım bekliyor

- Kritik ek: ayrı F/O parser modülleri, bütün soruların düzenlenebilir önizlemesi, dosyaya bağlı açık onay, ham kaynak satırlarının korunması ve onaylanan tablodan cevap Excel’i. Mevcut sınava bağlanarak güncelleme.
- Yeni bütün FMT kayıtlarında koordinat/kapasite/TXT testi, kodlama ve okuyucu beyanı; doğrulama kanıtının şablonda saklanması. `20261109010000_fmt_validation` migration'ı hazır, canlıda çalıştırılmadı.
- 97 otomatik test; kapsamlı liste `1.1.1.txt`.

- F / Fernus XLS ve O / Okulizyon XLSX kazanım dosyalarını tek dosyayla içe aktarma; cevaplar, A/B çaprazları, kazanımlar ve sınav adı önizlemesi. Fernus kitapçık sekmeleri arasında cevap tutarlılığı kontrolü.
- Tek F/O kazanımı için ayrı cevap/kazanım arşiv kayıtları; ana sayfa ve değerlendirme görünürlükleri bağımsız. Resmî kodu olmayan metinler açıkça belirtilen METİN- iç kodlarıyla korunur.
- En fazla 30 FMT için çoklu seçim kuyruğu, dosya bazında ad/alan düzenleme, bilinmeyen formatta TXT testi, onaylı kayıtları tek işlemde toplu ekleme.
- Ana sayfa, uygulama ve favicon sürümü v1.1.1. Cevap anahtarı formunda yeni kayıt tarihi İstanbul takvim gününe göre başlar.
- Son kritik eklerle `20261109010000_fmt_validation` migration'ı gerekir; önceki özelliklerin migration gereksinimleri geçerlidir.

## v1.0.6 — 8 Kasım 2026 · dağıtım bekliyor

- FMT alan çakışma/sınır kontrolleri, örnek TXT ile alan önizlemesi ve kimlik alanı maskeleme.
- Elle veya Excel ile soru ekleme, A/B/C/D ve kazanım düzenleme; kayıtlı anahtarda eşzamanlı değişiklik kontrolü. Arşivde kazanım Excel önizlemesi ve geçerli örnekli şablon.

- Sınav Yükle ve Sınav Değerlendir / Sonuç Al ayrı ekranlar; toplu/sınıf listeleri, liste + karne ve soru/kazanım analizi, Excel/PDF çıktıları.
- Yükleme/yayımlama öncesi kontrol özeti, anahtar değişiminde net/puan önizlemeli yeni sonuç sürümü; eski kayıtların korunması ve öğrenci/veli yayınının kontrollü sürüm geçişi.
- Yeni migration: `20261108210000_result_revisions`; canlıya uygulanmadı.

- Kullanıcının gerçek FMT/TXT örnekleriyle doğrulanan Palme Ortaokul 8050 hazır yerleşimi, tam içerikten FMT tanıma ve 7108 → 8050 dönüşümü eklendi; sınav numarası alanı desteklendi. [8050 kullanım notları](docs/8050-layout.md).

- Kaynak/hedef FMT arasında satır bazında TXT dönüşümü; alan/ders eşleme, sabit kodlar ve hizalama, UTF-8/Windows-1254 ve CRLF/LF.
- Sığmayan veriyi kesmeyen kontrol, açık kayıp onayı, önizleme ve CSV kontrol raporu.
- Şifre girilen `/login` ekranında ayrı, görünür ve sakin hareketli kurumsal gradient; açık/koyu tema ve hareket azaltma desteği.
- Ana sayfa ve statik önizleme sürümü `v1.0.6`.

- Öğrenci ve veli girişleri, kişisel sonuç/PDF karne ekranı, veli için çocuk filtresi; diğer öğrencilerin kayıtlarını göndermeyen özel sonuç yanıtları.
- Bayi kapsamlı hesap/davet yönetimi, açık sonuç bağlantısı, yayımlama ve erişim kaldırma; eski oturumları geçersiz kılan hesap kapatma/yeniden davet akışı.
- Bayilere FMT indirme menüsü ve seçili FMT indirme; yeni dosyalarda özgün baytlar, eski 7108 şablonlarında Windows-1254 korunur.
- Yeni migration: `20261108200000_student_parent_portal`; canlıya uygulanmadı.

- Cevap anahtarı arşivi ve değerlendirme aynı sınav kaydına bağlandı; ana sayfa ve değerlendirme görünürlükleri bağımsız seçilebiliyor. Bayi yayınevi → sınıf → sınav seçiyor; eksik cevap/kazanım verisiyle değerlendirmeye açma engelleniyor.
- PDF metnine göre ayırmada gerçek karakter kutuları kullanılarak dosya adlarına komşu etiketlerin karışması düzeltildi; değişken uzunluklu numara ve isimler doğrulandı.
- Birleşik katalog migration'ı: `20261108190000_unified_exam_catalog`; canlıya uygulanmadı.

- Admin için FMT yükleme, TXT alan eşleme ve şablon sürümleme/pasife alma.
- Nartest kazanım Excel’i ve genel Excel şablonundan A/B eşleştirmeli değerlendirme anahtarı ekleme.
- Üye bayi için kurum kapsamlı TXT önizleme, sözel/sayısal oturum birleştirme, değerlendirme ve sonuç arşivi.
- Detaylı Excel listesi, soru detayları, tek/toplu PDF karne ve kurum/şube karşılaştırmaları.
- H/X soru kuralları, çoklu işaret ve Türkçe dosya kodlaması; kimlik numarası ve ham TXT saklamayan sonuç kopyaları.
- Yeni migration: `20261108180000_optical_evaluation`; canlıya uygulanmadı.

Kullanım, puan sınırları ve kurulum: [7108 optik değerlendirme](docs/7108-optical-evaluation.md).

## v1.0.5 — 8 Kasım 2026

- Sınav takviminde 2.500 satır, 50 satırlık düzenlenebilir önizleme, filtreleme, satır ekleme/silme, toplu yayınevi atama, hariç tutma ve Excel dışa aktarma.
- Mevcut yayınevlerinden tam eşleşme ve onaylı öneriler; kalıcı eşleştirmeleri görüntüleme/düzenleme/silme; ayrı seri ve kaynak isim alanları.
- Türkçe tarihler ve Excel 1900/1904 tarih hücreleri; UTC tarih standardı ve geçersiz gün kontrolü.
- API'de 100 kayıtlık gruplar, kısmi başarı, mükerrer atlama, gerçek kayıt sayıları ve ilerleme; yükleme geçmişi ve düzenlenmiş/ilişkili kayıtları koruyan geri alma.
- Takvimde toplu düzenleme ve kayıt listesinde sayfalama.
- Derslik ekleme düğmesinde uygulama içi modal; eklemede yerleşimlerin korunması; güvenli düzenleme/silme.
- Yılan için kaydırma, üç oyunda ortak ve hatırlanan ses tercihi; yeni Blok Zamanı oyunu.
- Yönetici oluşturduğu kullanıcıya 30 dakikalık tek kullanımlık şifre belirleme bağlantısı ve düzenlenebilir WhatsApp paylaşımı.
- Mevcut logolu, Türkçe karakter destekli OG PNG; ana sayfa ve giriş metadata alanları.
- Tarama öncesinde renk seçimi, tutarlı görsel dönüştürme araç adları ve mobil iyileştirmeler.

Testler, sınırlamalar ve dağıtım: [v1.0.5 sürüm raporu](docs/v1.0.5-release.md).
