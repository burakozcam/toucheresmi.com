# Hız 1923 ve Dakika / Karekök TXT incelemesi

Kullanıcının belirttiği eşleme kullanıldı:

- BARBAROS HIZ 8.txt → Hız Yayınları 1923 Ortaokul Optiği.
- GENÇ BİLİM KAREKÖK 8 SNF.txt → Dakika / Karekök Yayınları Ortaokul Optik.

Dosyalar yalnızca okunarak incelendi. Ham TXT'ler, öğrenci adları, kimlik/telefon/öğrenci numaraları ve öğrenci cevap dizileri depoya veya rapora kopyalanmadı. Kaynak dosyalar değiştirilmedi. Canlı sistem/veritabanı kullanılmadı.

## Genel bulgular

| Özellik | Hız 1923 | Dakika / Karekök |
| --- | --- | --- |
| Kodlama | Windows-1254 | Windows-1254 |
| Dolu kayıt satırı | 44 | 70 |
| Satır uzunluğu | 44 satırın tamamı 171 karakter | 35 satır 170, 35 satır 171 karakter |
| Birebir yinelenen satır | 0 | 0 |
| Oturum yapısı | İlk 22 satır ağırlıklı sözel; sonraki 22 sayısal | 170 karakterlik 35 satır ağırlıklı sözel; 171 karakterlik 35 satır sayısal |

Aynı satır uzunluğu, aynı TXT yerleşimi anlamına gelmez. Mevcut 171 karakterlik 7108/8050 şablonları bu dosyalara dosya uzunluğuna bakılarak uygulanmamalıdır. FMT optik koordinatları ile TXT karakter sırası ayrı ayrı doğrulanmalıdır.

## Hız 1923

FMT tanım sırasından türetilen ilk öneride öğrenci no 20–24, kitapçık 26, ad 27–45, sınıf 46 ve şube 47 konumlarına düşüyor. Ancak:

- 26. konum bütün 44 satırda boş.
- 46–48 aralığı bütün satırlarda boş.
- Bu ilk önerinin 48. karakterde başlattığı Türkçe alanı bütün satırlarda cevap dışı karakter içeriyor.
- 51–170 aralığı altı adet 20 karakterlik cevap alanı olarak incelendiğinde tüm bu alanlar izin verilen cevap/boş karakterlerinden oluşuyor. FMT ders sırasıyla karşılaştırıldığında ilk 22 satırda ilk dört ders, sonraki 22 satırda son iki ders dolu görünüyor. Bu, cevap alanı için güçlü bir adaydır; öğrenci/kitapçık/sınıf alanlarının doğrulandığı anlamına gelmez.
- Son 171. karakter, ilk grupta bazı satırlarda rakam, diğer satırlarda boş; A/B/C/D kitapçık alanı olarak alınamaz.
- İki grubun ilk 50 karakterlik metadata parçaları karşılaştırıldığında 20 kayıt birebir örtüşüyor. Bu tek başına 22 öğrencinin tamamını güvenle birleştirmeyi kanıtlamaz.

Sonuç: Verilen FMT ile TXT'nin metadata yerleşimi doğrudan örtüşmüyor. Kitapçık boşluğuna A atamak, sınıfı dosya adından üretmek veya cevap alanını eski şablona kaydırmak güvenli değil. Mevcut kanıtla tam doğrulanmış, değerlendirmeye hazır Hız yerleşimi ilan edilmedi.

## Dakika / Karekök

FMT sırasındaki aday cevap alanları:

| Ders | Başlangıç | Alan kapasitesi |
| --- | --- | --- |
| Türkçe | 9 | 20 |
| Sosyal | 29 | 20 |
| Din | 49 | 20 |
| İngilizce | 69 | 20 |
| Matematik | 126 | 20 |
| Fen | 146 | 20 |

Bu alanların tamamında tüm satırlarda cevap/boş karakter kümesi uygun. 20 karakter kapasite, sınavın her derste 20 sorusu olduğunu kanıtlamaz; gerçek soru sayısı cevap anahtarından alınmalıdır.

Metadata adayı: öğrenci no 100–104, ad alanı 105–125. 70 kayıttan birinde öğrenci numarası boş.

İki satır grubunda sondaki alanlar farklı konumda:

- 170 karakterlik satırların tamamında sınıf adayı 166. konumda 8; 167–168 şube adayları; 169. konum A/B/C/D karakteri içeriyor. 170. konum boş.
- 171 karakterlik satırların tamamında sınıf adayı 167. konumda 8; 168–169 şube adayları; 170. konum A/B karakteri içeriyor. 171. konum boş.
- Uzun satırlarda FMT sırasındaki 166. oturum alanı dolu; kısa satırlarda aynı konuma sınıf adayı geliyor. Bu yüzden fark yalnızca son boşluğun eksikliği değil; oturum alanının bulunduğu bölümde bir karakterlik yerleşim farkı var. Sona boşluk eklemek kitapçık/sınıf eşleştirmesini düzeltmez.
- İki grup arasında öğrenci no + ad adayı birlikte kullanıldığında 31 kayıt, yalnızca ad adayı karşılaştırıldığında 33 kayıt örtüşüyor. İsme dayanarak otomatik birleştirme yapılmamalı; farklı/eksik kimlikli kayıtlar ayrıca incelenmeli.

Ayrıca sözel ağırlıklı grupta bir satırın matematik aday alanı boş değil. Bu satır sessizce sözel/sayısal gruba zorlanmamalı; önizlemede kontrol gerektiren kayıt olarak ele alınmalı.

Sonuç: Cevap bölgeleri büyük ölçüde FMT sırasıyla uyumlu; fakat iki oturumun metadata yerleşimi ayrı ele alınmalı. Kısa satırlarda kitapçığı 170. konumdan okumak boş kitapçık hatası üretir. Önce kaynak konumları korunarak açık bir oturum/yerleşim önizlemesi gerekir.

## Bu incelemede yapılan / yapılmayan işlem

Bu istek dosya incelemesi olarak ele alındı. Yeni değerlendirme şablonu etkinleştirilmedi; otomatik kitapçık/kimlik düzeltmesi veya öğrenci birleştirmesi yapılmadı. Önceden eklenen indirme/paylaşım kütüphanesi aynen duruyor. Kod veya migration değişikliği yok; dolayısıyla yeni bir build/test çalıştırılması gerekmedi.

İnceleme için program adını bilmeye ihtiyaç olmadı. Bundan sonraki uygulama adımı, program adı istemek yerine bu dosyalarda saptanan somut alan/oturum farklarını önizleme ve doğrulama akışına taşımaktır.

## Karekök karnesiyle ek doğrulama

Kullanıcının son yönlendirmesine göre Hız için değerlendirme geliştirmesi yapılmayacak. Bu ek kontrol yalnızca Karekök içindir.

Gönderilen tek sayfalık karne metin ve tablo görünümü üzerinden incelendi. Öğrenci adı/numarası veya soru bazlı öğrenci cevap dizileri bu rapora kopyalanmadı.

- Karne üst bilgisindeki öğrenci, TXT'de biri 170 diğeri 171 karakterlik iki kayıtla eşleşti. İki kayıt aynı öğrenci numarasını taşıyor; numara karnenin üst bilgisinde de mevcut.
- Karnedeki altı ders A kitapçığı olarak gösteriliyor. İlgili TXT kayıtlarında kısa satırın 169., uzun satırın 170. karakterindeki kitapçıklar da A.
- PDF'nin soru tablosundaki N / D / Ö sütunları koordinatlarıyla ayrı okunup TXT'nin ilgili ders alanlarıyla soru soru karşılaştırıldı. PDF'de yanlış öğrenci cevapları küçük harfli gösteriliyor. Büyük/küçük harf normalize edildiğinde **90 sorunun 90'ında öğrenci cevabı aynı; fark sayısı sıfır**.

| Ders | Doğrulanan soru | Karne doğru | Karne yanlış | Karne boş | TXT ile cevap farkı |
| --- | --- | --- | --- | --- | --- |
| Türkçe | 20 | 19 | 1 | 0 | 0 |
| Sosyal / T.C. İnkılap | 10 | 10 | 0 | 0 | 0 |
| Din | 10 | 9 | 1 | 0 | 0 |
| İngilizce | 10 | 10 | 0 | 0 | 0 |
| Matematik | 20 | 20 | 0 | 0 | 0 |
| Fen | 20 | 20 | 0 | 0 | 0 |

Böylece bu örnekte A kitapçığı için cevap başlangıçları ve 20/10/10/10/20/20 gerçek soru sayıları karneyle doğrulanmış oldu. Sınıf/şube/kitapçık alanları için 170 ve 171 karakterlik iki oturum yerleşiminin ayrı ele alınması gerektiği de destekleniyor.

Bu sonuç tek öğrenci/A kitapçığıyla sınırlıdır; diğer öğrencilerin eksik kimliklerini, farklı kitapçıklar arasındaki soru permütasyonlarını veya tüm sınavların aynı düzeni kullandığını doğrulamaz. Örneğin gözlenen C/D kitapçıklarının A'ya soru eşleştirmesi bu A karnesinden üretilemez. Otomatik öğrenci birleştirmesi ya da aktif değerlendirme şablonu değişikliği yapılmadı. Uygulama kodu, veritabanı ve orijinal dosyalar değiştirilmedi; bu salt okunur karşılaştırma için build veya uygulama testi çalıştırılmadı.
