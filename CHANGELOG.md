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
