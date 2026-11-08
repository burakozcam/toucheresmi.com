# Öğrenci / veli sonuç erişimi ve FMT indirme

## Kurulum

`20261108200000_student_parent_portal` migration'ı `PARENT` rolünü, sonuç yayın durumunu, öğrenci/veli hesap yöneticisini ve açık sonuç bağlantılarını ekler. Öğrenci hesabının kurum/numara eşleştirmesi, sonuç bağlantıları kaldırıldıktan sonra da korunur. Yeni FMT yüklemelerinin özgün baytları saklanır. Önceki optik ve birleşik katalog migration'ları da uygulanmış olmalıdır.

Bu çalışma canlı migration veya deployment çalıştırmaz. README'deki yedek ve migration geçmişi kontrolleri uygulanarak API ve web birlikte dağıtılmalıdır. Veri sıfırlama/seed gerekmez. Eski sonuçlar varsayılan olarak öğrenci/veli erişimine kapalıdır; kullanıcılar veya erişim bağlantıları otomatik üretilmez.

## Bayinin yapacağı işlemler

1. **Sınav Değerlendir** ekranında TXT'yi değerlendirin ve kaydedin. Kaydedilmiş geçmiş sonuçlar da kullanılabilir.
2. **Öğrenci / Veli Hesapları** menüsünde değerlendirmeyi ve öğrenciyi seçin. Öğrenci veya veli türünü, hesap sahibinin ad/soyadını ve e-postasını girerek hesap oluşturun.
3. Üretilen 30 dakikalık, tek kullanımlık şifre belirleme bağlantısını hesap sahibine iletin. Bağlantı arayüzde kopyalanabilir; e-posta/SMS/WhatsApp otomatik gönderilmez. Parola veya ham davet token'ı veritabanında tutulmaz; parola bcrypt, davet SHA-256 özetiyle saklanır.
4. **Sınav Değerlendir** ekranında kayıtlı sonucu açıp **Öğrenci/veliye yayımla** düğmesine basın. Hem yayın hem ilgili hesaba açık sonuç bağlantısı gerekir. Birini kaldırmak erişimi keser.
5. Sonraki sınavlar için mevcut hesabın kartında **Seçili sonucu bağla** düğmesini kullanın. Öğrenci numarasından otomatik olarak bütün geçmiş/gelecek sınavlar paylaşılmaz.

Öğrenci hesabına aynı kurum ve öğrenci numarasının sonuçları bağlanabilir. Farklı çocuklar için veli hesabı kullanılır; veliye birden fazla çocuk ve açıkça seçilen sonuçları bağlanabilir. Tüm öğrenci bağlantıları silinse de öğrenci hesabı başka çocuk için yeniden kullanılamaz. Hesaplar yönetici bayiye bağlıdır; başka bayi bu hesapları yönetemez. Bayinin başka kuruma ait sonuç eklemesi de API'de engellenir. Süper yönetici tüm hesapları yönetebilir.

Hesap kartından sonuç bağlantısı kaldırılabilir veya erişim kapatılabilir. Kapatma mevcut oturumları ve davetleri geçersiz kılar. **Yeni davet / erişimi aç** yeni parola ve davet süreci başlatır; eski oturumlar yeniden geçerli hale gelmez. Yeni davet de önceki daveti ve oturumları iptal eder. Başarılı yönetim/yayımlama işlemleri, hassas istek gövdeleri kaydedilmeden mevcut denetim kayıtlarına eklenir.

## Öğrenci ve veli

Hesap sahibi davet bağlantısından kendi şifresini belirler. `/login` ekranında **Öğrenci Girişi** veya **Veli Girişi** seçerek e-posta ve şifreyle giriş yapar; `/sonuclarim` ekranına yönlendirilir. Öğrenci/veli yönetim paneline yönlendirilmez.

Sonuç listesi yalnızca hesaba bağlı ve yayımlanmış sonuçları içerir. Veli çocuk filtresiyle seçim yapabilir. Sonuç ekranında ders doğru/yanlış/boş/netleri, kazanım analizi, kendi cevapları ve PDF karne vardır. Kurum/şube sırası ve ortalama toplu sayısal değer olarak gönderilir. Diğer öğrencilerin adları, numaraları veya cevapları tarayıcıya gönderilmez. PDF çıktısı da bu özel veriyle oluşturulur.

Puanlar yerel 500 ölçeğidir; resmî LGS/YKS veya yayınevi standart puanı üretilmez. Sıralama yalnızca ilgili değerlendirmedeki kurum öğrencileri içindir. Portalda kendi şifresini değiştirme ve çıkış bulunur. Sonuçlar 30 saniyede bir ve pencereye dönüldüğünde yenilenir. API her istekte kullanıcı, bağlantı ve yayın durumunu doğrular. Kişisel yanıtlar `private, no-store` başlığıyla döner; portal arama motoru indekslemesine kapalıdır.

Yönetim ekranı son 200 hesabı, sonuç seçimi son 50 değerlendirmeyi, kişisel portal son 100 sonuç bağlantısını listeler.

## FMT indirme

Bayi girişinden sonra **FMT İndir** menüsünden etkin şablonları indirebilir. Değerlendirme ekranında **Seçili FMT'yi indir** düğmesi de bulunur. İndirme JWT oturumu gerektirir; öğrenci/veli erişimi yoktur. Bayi pasif şablonları indiremez; süper yönetici kendi yönetim kapsamında indirebilir.

Yeni FMT yüklemeleri özgün dosya baytlarıyla indirilir; UTF-8 BOM ve satır sonları korunur. Eski metin olarak kayıtlı 7108 şablonları optik okuyuculara uygun Windows-1254 olarak oluşturulur; Türkçe karakterler korunur.

## Doğrulama

70 test: öğrenciye özel veri süzme, diğer öğrenci verisinin sızmaması, kurum/yönetici kapsamı, öğrenci hesabına farklı çocuk bağlanmaması, yayımlanmamış/yetkisiz sonuçların reddi, davet özeti ve FMT bayt koruması dahil. Prisma şeması ve üretim derlemesi ayrıca doğrulanır.

Yerel tarayıcı kontrolü anonim TXT, gerçek Express/JWT/bcrypt/şifre belirleme uçları ve taklit Prisma kayıtlarıyla yapıldı: bayi hesabından FMT indirme, iki çocuklu veli ve tek öğrencili hesap oluşturma, davetle şifre kurma ve gerçek giriş, yayımlama/yayından kaldırma, başka hesabın sonucuna 404, veliye FMT erişiminde 403, bağlantı kaldırma, hesap kapatma ve yeniden açıldıktan sonra eski oturuma 401 doğrulandı. Mobil görünüm ve kişisel PDF karne incelendi. Bu kontroller gerçek PostgreSQL migration uygulaması veya canlı veritabanı testi değildir.
