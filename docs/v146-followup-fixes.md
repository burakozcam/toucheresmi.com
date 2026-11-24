# 1.4.6 sonrası yerel düzeltmeler

Bu çalışma commit/push, Neon bağlantısı veya canlı sunucu işlemi içermez. Başlangıçtaki ilgisiz yerel değişiklikler korunur. Yardım envanterine yalnız yeni bayi seçimi ve iki geçici panel düğmesinin kayıtları eklenmiştir.

- Ana sayfanın alt bölümü tema zemininden geniş, mavi tonlu bir geçişle laciverte ulaşır. Geçiş tam genişliktedir; kart köşesi/çerçevesi yoktur. Logo ve bağlantılar korunur.
- Süper Admin yeni geçici erişimde **Bayi · Sınav değerlendirme ve raporlar** kapsamını ve etkin bir **Bağlı bayi** seçer. Kullanıcı ve oturum rolü veritabanında `TEMPORARY` kalır. İmzalı oturum bayi kimliğine bağlıdır. Yalnız izin verilen sınav yollarında etkin bayi rolüyle mevcut kapsam, bölge, kota ve rapor kontrolleri kullanılır. TXT arşivi mevcut davranışla hesabın kendisine aittir. Değerlendirme ve denetim kayıtlarının aktörü geçici kullanıcının kendi kimliğidir.
- Sunucu her istekte güncel oturum/süre/iptal durumunu kontrol eder. Kayıt transaction’ı ve karne çıktısı kontrolleri de geçici erişimi yeniden doğrular. Yönetici yolları ve hesap değişikliği açılmaz. Eski kapsamlar ve kod yenileme işlemi kendiliğinden bayi yetkisi eklemez; bayi yetkisi için yeni erişim oluşturulur.
- WhatsApp metni ortak `whatsappLink` yardımcısında `encodeURIComponent` ile bir kez kodlanır. Türkçe metin ve `#key=` bağlantısı korunur. Genel önizleme, mevcut lisanslı Liberation Sans Regular/Bold dosyalarıyla üretilir; kod, bağlantı anahtarı ve kişiye özel not görsele eklenmez.
- Sol menüdeki marka alanı saydam, sola hizalı ve kompakttır. K kendi küçük lacivert kutusunda; yazı beyaz ve mevcut açık marka mavisiyle görünür.

## Doğrulama

Yalnız bu çalışma için başlatılan `ks-v146-fixes-test` PostgreSQL 16 konteyneri kullanıldı: `127.0.0.1:55466/ks_v146_acceptance`. Bütün kişiler, bayiler, kurumlar, cevap anahtarı ve öğrenci kayıtları sentetiktir. Gerçek kullanıcı/veritabanı kullanılmaz.

- `npm test`: **324/324** birim ve regresyon testi geçti. API TypeScript ve Web üretim derlemeleri başarılıdır. Web derlemesi `apps/web` çalışma dizininde yapılmalıdır; yerel font yolları bu dizine göredir.
- `node --import tsx tests/e2e/v146-fixes-http.cjs`: gerçek Prisma/HTTP ile kod ve tek kullanımlık bağlantı girişi, TXT arşivi, önizleme, değerlendirme, sonuç kataloğu, PDF/Excel/ZIP çıktıları. Diğer bayide gerçek sonuç varken doğrudan sonuç/karne/logo/kod erişiminin reddi; başka hesabın TXT’sinin reddi; kapalı değerlendirme/çıktı izni ve kota sınırı; eski kapsamların korunması; normal bayi akışı; açık oturumun iptal ve süre sonunda reddi.
- `python3 tests/e2e/v146-fixes-ui.py`: gerçek Chromium ve localhost API ile bayi seçimi, tek kullanımlık geçici giriş, TXT yükleme, mevcut FMT/sınav/kurum seçimi, değerlendirme, Sınav Sonuçları ve karne indirmeleri. Ana sayfa alt bölümü ve menü logosu 1440/390 genişlikte, aydınlık/karanlık temada incelenir. Açık sonuç ekranından iptal sonrası indirme reddi de denetlenir.
- `ş Ş ı İ ğ Ğ ç Ç ö Ö ü Ü`, satır sonları ve tek kullanımlık bağlantı için mesaj parametresinin bir kez çözüldüğünde aslına eşit olduğu test edilir. Üretilen 1200×630 önizlemede “Geçici Erişim” ve “Süreli araçlara güvenli giriş” görsel olarak incelenmiştir.

Kanıtlar: Git dışında `test-results/v146-fixes/{http-checks,browser-checks}.json`, tema ekran görüntüleri, `temporary-opengraph.png` ve sentetik karne dosyaları. `ui-seed.json` yalnız sentetik oturum/kod içerir; paylaşılmaz. Web/API test adresleri 3146/4046’dır; tarayıcıda localhost dışındaki HTTP(S) istekleri engellenir.

**WhatsApp Web sınırı:** bilgisayardaki tarayıcı erişim sağlayıcısı kullanılabilir değildi (`The browser access host is unavailable`). Bu nedenle gerçek WhatsApp Web gönderim öncesi sohbet görünümü doğrulanamadı; mesaj gönderilmedi. Bağlantı parametresi ve üretilen önizleme ayrı doğrulandı. Yayın sonrasında bağlı WhatsApp Web oturumunda göndermeden önce bu görünüm ayrıca kontrol edilmelidir.

## Manuel yayın

**Yeni migration ve Prisma Client üretimi gerekmez.** Mevcut `User.dealerId` ilişkisi ile `TemporaryAccess.scopes` dizi alanı kullanılır; şema ve geçmiş kayıtlar değiştirilmez. Önceki 1.4.6 migration’ının uygulanmış olması gerekir. Bu düzeltme için manuel yayın sırasına migration adımı eklenmez.

Operatör mevcut yedekleme, Web → API durdurma, NPROC ölçümü, quick-deploy, API → Web başlatma ve canlı smoke sırasını korur; ayrıntılar `v146-manual-deployment.md` ve `v145-manual-deployment.md` dosyalarındadır. API/Web birlikte yayınlanmalıdır. Yerel API adresiyle oluşturulmuş kabul build’i canlıya taşınmaz; canlı yapılandırmayla derleme mevcut manuel akışta yapılır.

Yayın sonrası yeni ve kısa süreli bir test erişimini doğru bayiye bağlayarak TXT → değerlendirme → karne, başka bayi reddi ve açık panelde iptal sonrası ret tekrar kontrol edilir. Mevcut geçici kodlar yeni bayi kapsamını almaz.
