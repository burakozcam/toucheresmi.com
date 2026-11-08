# 7108 optik değerlendirme

Bu modül Next.js uygulamasının `/panel` sayfasında çalışır. Kök `index.html` bağımsız arayüz önizlemesidir; giriş, yükleme ve değerlendirme bu dosyada çalıştırılmaz.

## Kurulum

`20261108180000_optical_evaluation` migration'ı üç yeni tablo ekler: `OpticalTemplate`, `OpticalKey`, `OpticalResult`. `20261108190000_unified_exam_catalog` migration'ı arşivdeki sınavla değerlendirme anahtarını bire bir bağlar ve bağımsız `showInEvaluation` seçeneğini ekler. Mevcut ana sayfa yayın durumları korunur; eski sınavların değerlendirme görünürlüğü başlangıçta kapalıdır. Bu geliştirme sırasında canlı migration veya deployment yapılmamıştır. README'deki mevcut migration geçmişi uyarıları geçerlidir; üretimde önce yedek ve migration durumu kontrol edilmelidir. `migrate reset`, `db push` ve seed gerekmez.

Onaylanmış dağıtımda migration uygulandıktan sonra API ve web birlikte yayımlanmalıdır. Web build'inde `NEXT_PUBLIC_API_URL` gereklidir. Prisma istemcisi `npm run db:generate` ile oluşturulur.

İlk kullanımdan önce admin:

1. **FMT Yükle** ekranında hazır **OPTİK 7108** yerleşimini kontrol edip kaydeder. Gönderilen `.fmt` içeriği hazır gelir. Farklı FMT dosyaları yüklenebilir; TXT karakter konumları manuel düzenlenir. Optik kağıt koordinatlarından TXT konumu tahmin edilmez.
2. **Cevap Anahtarları** ekranında yayınevi, sınıf ve sınav adını belirler; cevap anahtarı dosyası ile soru cevapları/A-B eşleştirmeleri/kazanımları içeren Excel'i yükler. Nartest `kznm` Excel'i doğrudan okunur; genel değerlendirme Excel şablonu da desteklenir.
3. **ÖLÇME DEĞERLENDİRME SİSTEMİNDE GÖSTER** ve **ANA SAYFA CEVAP ANAHTARLARI SİSTEMİNDE GÖSTER** seçeneklerini birbirinden bağımsız ayarlar. İkisi birlikte, yalnızca biri veya hiçbiri seçilebilir. Tekli/toplu ekleme ve kayıt düzenlemede desteklenir. Değerlendirme için iki dosya kategorisi ve her sorunun cevap/kitapçık/kazanım verisi doğrulanır; eksik veriyle etkinleştirme reddedilir.
4. Önceden ayrı oluşturulmuş değerlendirme anahtarları **Anahtar Eşleştirme** ekranından arşivdeki sınava bağlanabilir. Eşleştirdikten sonra görünürlük Cevap Anahtarları ekranından açılır. Yeni sınavlar için bu ayrı eşleştirme adımına gerek yoktur.

PDF/görsel cevap anahtarı ile hesaplama verisi aynı sınav kaydına bağlıdır. Hesaplama verisi kazanım/cevap Excel'inden sunucuda çıkarılır. PDF OCR/tahmini cevap çıkarımı yapılmaz. Sonuçlar kullanılan soru/kuralların anlık kopyasını sakladığından sınav düzenlemeleri geçmiş karneleri değiştirmez.

## Bayi akışı

**Sınav Değerlendir** → kurumu seç → yayınevi → sınıf → sınav → kaynak FMT → TXT yükle → önizlemeyi kontrol et → kaydet → Excel listesi veya PDF karne/listesi al. Seçimlerde yalnızca adminin değerlendirmeye açtığı, etkin yayınevine bağlı hazır sınavlar görünür. Ana sayfada yayımlanmış olması şart değildir. Gizli sınavlara doğrudan API isteğiyle yükleme de engellenir. Bayi yalnızca kendi etkin kurumlarına yükler; geçmiş sonuç erişimi de güncel kurum sahipliğinden doğrulanır. Üyelik ve etkin oturum zorunludur. FMT/anahtar ekleme ve durum değiştirme API'de de yalnızca `SUPER_ADMIN` rolüne açıktır.

TXT en fazla 2 MB, 2.000 kayıt satırı ve birleşim sonrası 500 öğrenci olabilir. UTF-8 ve Windows-1254 desteklenir. Hatalı satır, alan taşması, bilinmeyen kitapçık ve çelişen/yinelenen öğrenci oturumları değerlendirmeyi durdurur. Tamamen boş dersler için uyarı gösterilir ve kayıt öncesi açık kontrol onayı alınır.

TC/telefon yalnızca bellekte oturum eşleştirmesi için kullanılır. Ham TXT ve bu kimlik alanı sonuç arşivinde tutulmaz. Arşivde öğrenci no, ad soyad, sınıf/şube, cevaplar, kaynak kitapçıklar, satır numaraları ve kullanılan soru/kuralların kopyası vardır. Sırlar veya öğrenci dosyaları depoya eklenmemelidir; test fikstürü anonimdir.

## Doğrulanan 7108 yerleşimi

Başlangıçlar 1 tabanlıdır; toplam satır uzunluğu 171 karakterdir.

| Alan | Başlangıç | Uzunluk |
| --- | ---: | ---: |
| Kurum kodu | 5 | 6 |
| Öğrenci no | 11 | 5 |
| Ad | 16 | 10 |
| Soyad | 26 | 10 |
| Sınıf | 36 | 1 |
| Şube | 37 | 1 |
| Eşleştirme kimliği | 38 | 11 |
| Kitapçık | 51 | 1 |
| Türkçe | 52 | 20 |
| Sosyal | 72 | 20 |
| Din | 92 | 20 |
| İngilizce | 112 | 20 |
| Matematik | 132 | 20 |
| Fen | 152 | 20 |

Dersin gerçek soru sayısını cevap anahtarı belirler. Örnekte sosyal/din/İngilizce 10'ar sorudur; bu alanların kalan 10 karakteri boş olmalıdır. Oturumlar eşleştirme kimliği varsa onunla, yoksa sınıf + öğrenci numarasıyla birleştirilir. Birleşmiş öğrencide en az bir satırda öğrenci numarası bulunmalıdır. Farklı kimliklere ait aynı sınıf/öğrenci numarası sessizce birleştirilmez.

Aynı öğrencinin sözel ve sayısal kitapçıkları farklı olabilir. Her dersin kaynak kitapçığı ayrı korunur; cevaplar Excel'deki A/B soru eşleştirmeleriyle ortak A sırasına çevrilir. Kazanımlar bu sıraya bağlıdır. Karnede bu dönüşüm açıkça belirtilir.

## Hesaplama ve çıktılar

- `Net = Doğru - Yanlış / ceza`; ceza admin tarafından 0, 3 veya 4 olarak belirlenir.
- Anahtarda `H`: boş/çoklu işaret dahil tüm cevaplar doğru kabul edilir. `X`: soru iptal, net ve maksimum puan hesabı dışındadır. TXT'deki `*` çoklu işarettir ve normal soruda yanlış sayılır; boşluk/nokta/tire boş cevaptır.
- Nartest örneğinde Türkçe/Matematik/Fen katsayısı 4, diğer dersler 1 olarak önizlemeye gelir; admin kaydetmeden önce değiştirebilir.
- Yerel puan `maks(0, katsayılı net / geçerli soru katsayı toplamı) × 500` formülüdür. Resmî LGS/YKS puanı, yayınevinin standart puanı veya Türkiye geneli sıralama üretilmez.
- Kurum/şube sıralaması ve karşılaştırmaları yalnızca yüklenen dosyadaki öğrenciler içindir. Eşit puanlar aynı sırayı alır.
- Liste ve soru detayları Excel olarak indirilir. Karne ve liste PDF çıktısı tarayıcının yazdırma penceresinden **PDF olarak kaydet** ile alınır. Renkli/siyah beyaz, tek öğrenci/toplu karne ve sınıf/şube filtresi bulunur.
- Son 50 değerlendirme geçmişte listelenir. FMT/anahtar pasife alınsa da önceki değerlendirmelerin kopyası değişmez.

## Testler

`npm test`: 7108 oturum birleştirme, A/B sıra eşleştirmesi, kaynak karneyle ders doğru/yanlış/boş sayıları ve 78 / 53,3333 net karşılaştırması, H/X/çoklu işaret, alan/satır doğrulama, Türkçe kodlama, API yetki ve kurum kapsamı kontrolleri.

`NEXT_PUBLIC_API_URL=https://api.kurumsalsinav.com npm run build`: Prisma istemcisi, API TypeScript ve Next.js üretim derlemesi. Üretim PostgreSQL migration doğrulaması ayrı dağıtım adımıdır.

Geliştirme doğrulamasında toplam 70 test geçti. Tarayıcıda gerçek Express kimlik doğrulama/multipart uçları, anonim TXT ve bellekte taklit edilen Prisma kayıtlarıyla FMT/anahtar ekleme, önizleme/kayıt, Excel indirme, geçmiş açma, tek/toplu karne seçimi ve 390 px mobil görünüm kontrol edildi. Excel'de öğrenci numaralarının başındaki sıfırlar ve netler doğrulandı; dört sayfalık detaylı örnek PDF render edilip görsel olarak incelendi. Bu kontrol gerçek PostgreSQL migration uygulaması veya canlı veritabanı testi değildir.

FMT’ler arası TXT dönüşümü v1.0.6’da eklendi; [kullanım ve kontrol notları](v1.0.6-release.md) bulunur. Gerçek örneklerle [Palme 8050 yerleşimi](8050-layout.md) de eklenmiştir.

## PDF editöründe metin seçerek ayırma

Seçilen metin DOM Range karakter sınırlarıyla yakalanır. Diğer sayfalar PDF.js metin katmanında aynı konuma yerleştirilip karakterlerin gerçek kutuları ölçülür; ortalama karakter genişliğiyle metin kesilmez. Boş metin öğelerinden kaynaklanan indeks kaymaları ve komşu metne geri dönüş kaldırılmıştır. Sabit etiketler korunarak değer çıkarılır; tam seçilmiş numaralar farklı sayfalarda daha uzun olsa da tüm numara alınır.

Gerçek PDF editörü iframe'inde üç sayfalık anonim PDF ile ZIP adları `456.pdf`, `12345.pdf`, `987654.pdf` olarak doğrulandı. İsim seçiminde `ornek-kisi.pdf`, `uzun-ad-soyad.pdf`, `kisa-ad.pdf` doğrulandı; `NUMARASI:`/`AD SOYAD:` etiketleri dosya adına katılmadı. Katalog görünürlükleri, yayınevi/sınıf/sınav seçimi ve gizli sınava zorlanmış yüklemenin reddi de gerçek HTTP/multipart akışı ve taklit Prisma kayıtlarıyla kontrol edildi.

## Ayrı yükleme ve sonuç akışı

- **Sınav Yükle:** kurum → yayınevi → sınıf → sınav → kaynak FMT → TXT. Kontrol özeti öğrenci/satır/sınıf/soru sayılarını, boş dersleri, çoklu işaretleri, sınıf uyuşmazlıklarını ve olası kitapçık sorunlarını gösterir. Yinelenen öğrenci numarası ve sınıf uyuşmazlığı kaydı durdurur. Kitapçık şüphesi yalnızca uyarıdır; otomatik düzeltme yapılmaz.
- Kontrol önizlemesi kullanıcı, dosya, kurum, FMT ve güncel anahtara bağlı 15 dakikalık imzalı onayla kaydedilir. Anahtar/dosya değişirse yeniden önizleme gerekir. Aynı kurum/anahtar/FMT için aynı TXT yeniden yüklenemez; mevcut sonuç açılır. Satır sonları normalleştirilir, ham TXT yerine SHA-256 özeti saklanır. Başka yüklemelerdeki aynı öğrenci numaraları uyarılır; farklı yüklemeler birleştirilmez.
- **Sınav Değerlendir / Sonuç Al:** kurum ve yüklenen sınav seçilir. Sadece toplu liste, sınıf sınıf liste, liste + karneler, tek/toplu karne veya soru/kazanım analizi alınır. Sınıf listeleri PDF'de ayrı sayfalara, Excel'de ayrı sayfalara ayrılır. Kurum sırası tüm yüklemedeki öğrenciler arasında kalır.
- Analiz: sınıf ve ders ortalamaları, A kitapçığı soru bazında doğru/yanlış/boş, seçenek dağılımı, düşük başarı gösterilen sorular ve kazanım başarı oranları. H/X soruları kazanım başarısı ve zor sorular sıralaması dışındadır; dağılımlar öğrencinin gerçek işaretini gösterir. Sınıf filtresi analiz öğrenci grubunu daraltır. Analiz PDF ve beş sayfalı Excel olarak alınabilir.

## Anahtar düzeltmeleri ve sonuç sürümleri

1. Admin cevap/kazanım anahtarını arşivden günceller.
2. Bayi son sonuç sürümünde **Güncel anahtarla tekrar değerlendir · Önizle** seçer. Önceki/yeni net ve puanlar öğrenci bazında gösterilir.
3. Onay, aynı sınav serisinde yeni sürüm oluşturur. Eski anlık kopya değişmez. Kaynak kitapçık sırası eski eşleştirmelerden yeniden oluşturulur; yeni A/B eşleştirmesine göre hesaplanır. Ders veya soru sayısı değiştiyse ham TXT saklanmadığından yeniden yükleme gerekir.
4. Yeni sürüm öğrenci/veli yayını kapalı başlar. Eski yayımlanmış sürüm görünmeye devam eder. Kontrol özeti açılıp onaylandıktan sonra yeni sürüm yayımlanır ve aynı serinin eski yayını kapanır. Eski sürüm yeniden yayımlanamaz.
5. Açık öğrenci/veli bağlantıları yeni sürüme taşınır. Bağlantı kaldırma aynı öğrenci ve sınav serisinin **tüm sürümlerini** kapsar. Farklı sınavlara kendiliğinden erişim verilmez.

Yeni migration: `20261108210000_result_revisions`. Önceki sonuçlara `seriesId=id`, `revision=1` ekler; sonuçları silmez. Yeni sürüm zinciri ve aynı TXT'nin eşzamanlı tekrar yüklenmesine karşı benzersiz indeksler ekler. Bu çalışma canlı veritabanına migration uygulamaz. Dağıtımda mevcut migration geçmişiyle birlikte `npm run db:migrate:deploy` kullanılmalıdır.

## FMT ve anahtar ekleme kolaylıkları

**FMT Yükle / Düzenle:** Yerleşim alanlarında çakışma, sınır aşımı ve yinelenen dersler kaydetmeden gösterilir. Örnek TXT ile test tüm satırların uzunluğunu, sabit alanları, ad/numara, kitapçık ve cevap karakterlerini denetler. İlk beş satır alanlara ayrılarak gösterilir; TC/Tel eşleştirme alanı gizlenir. Tanınmayan FMT için arayüz başarılı TXT testi ister. Bilinen 7108/8050 hazır yerleşimleri kullanılabilir. Yerleşim veya örnek dosya değişince önceki test geçersizleşir. Örnek TXT saklanmaz. FMT'nin optik form koordinatları TXT karakter konumlarıyla aynı kabul edilmez; yeni formatlarda konumları gerçek TXT üzerinden doğrulayın.

**Anahtar Ekle / Düzenle:** Excel içe aktarmanın yanında ders/soru sayısı ve cevap dizisiyle elle taslak oluşturulabilir. A/B/C/D eşleştirmeleri, cevap/H/X, ders katsayısı ve kazanım kodu/metni düzenlenebilir. Ders filtresi ve ders özeti bulunur. Eksik kazanım, cevap, tekrarlanan veya eksik kitapçık numarası ve tutarsız katsayı kaydı engeller. Excel şablonunda geçerli örnek kazanımlar ve isteğe bağlı C/D sütunları vardır. Cevap Anahtarları arşivindeki kazanım dosyası alanında Excel'in ilk sekiz sorusu ve tüm soruların kontrol özeti görünür.

Kayıtlı anahtarda **Soruları / kazanımları düzenle** son güncel sürümü açar. İçerik değişikliklerinde anahtar parmak izi kontrolü ve işlem yalıtımı başka düzenlemenin üzerine yazmayı engeller. Eski sonuç kopyaları otomatik değişmez; bayi tekrar değerlendirme önizlemesiyle yeni sonuç sürümü oluşturur. Doğrudan soru düzenleme arşivdeki indirilebilir PDF/Excel'i yeniden yazmaz; bu dosyaları arşiv ekranında ayrıca güncelleyin. Yeni SQL migration'ı gerekmiyor; önceki özelliklerin migration gereksinimleri geçerlidir.


## v1.1.1 kritik eklerin önceliği

Bu belgedeki önceki FMT/önizleme açıklamaları son kritik eklerle güncellendi: yeni bütün FMT kayıtları TXT/koordinat testi ve okuyucu beyanı gerektirir. Cevap içe aktarmada bütün sorular düzenlenir ve açık onay istenir. `20261109010000_fmt_validation` gerekir. Güncel davranış ve sınırlar [v1.1.1 notlarında](v1.1.1-release.md); kapsamlı liste kökteki `1.1.1.txt` dosyasındadır.
