# Mobil menü ve simge şeridi

## Sorunun yeniden üretimi

Mevcut üretim derlemesi localhost üzerinde 390×844 dokunmatik Chromium görünümünde açıldı. Hesap ve API yanıtları sentetikti; canlı sunucu/veritabanı kullanılmadı.

Araçlar başlığına ikinci dokunuş alt listeyi kapatıyordu. Açık kalan sol menünün tamamıydı: içeride kapatma düğmesi yoktu, menüyü açan başlık düğmesi çekmecenin altında kalıyordu. Önceki sürümde bir karartma katmanı da yoktu. Kanıtlar: `test-results/mobile-menu/before.json` ve `before-mobile.png`.

## Değişiklik

- Menü kapalıyken solda dar bir simge şeridi görünür. K veya herhangi bir bölüm simgesi tam menüyü açar; bölüm simgesi ilgili alt listeyi açıp başlığını görünür kılar. Simge listesi mevcut rol/kapsam filtresinden gelir.
- Büyük kırmızı kapatma düğmesi kaldırıldı. Logo ile aynı satırın sağındaki küçük **×** düğmesi koyu zemine uyumludur; dokunma alanı **44 × 44 px**, erişilebilir adı **“Menüyü kapat”**tır. Üst satır, menü listesi kaydırılsa da erişilebilir kalır. Dışarı dokunma ve Escape de kapatır.
- **Çerez Tercihleri** kısayolu mobil çekmece açıkken gizlenir; kapanınca geri görünür. **Güvenli çıkış** satırının üstüne gelmez.
- Mobilde kabul edilen araç seçimi menüyü kapatır ve seçilen ekranı en üstte gösterir. Kaydedilmemiş değişiklik kontrolleri korunur; reddedilen gezinme menüyü kapatmaz.
- Mobil menü açıkken arka plan kaydırması kilitlenir. Kapatma, ekran boyutu değişimi ve bileşenin kaldırılması önceki gövde stillerini geri yükler. Dış katman kapanınca dokunmaları engellemez. Kapatmada önceki sayfa kaydırma konumu korunur; araç seçiminde yeni ekranın üstüne gidilir.
- Mobilde odak menü içinde tutulur; kapatınca açan simgeye döner. Seçimden sonra içerik odaklanır. Kapalı menü ve kapalı alt listeler odak alamaz.
- Masaüstünde menü başlangıçta açıktır. Kapatınca simge şeridine iner ve içerik alanı genişler; yeniden açılınca kayıtlı genişlik korunur. Masaüstünde araç seçimi menüyü açık tutar.
- Mevcut 250 ms kayma ve alt liste animasyonları korunur. Azaltılmış hareket tercihi uygulanır. Marka/logo düzeni korunur.

## Tamamlanan doğrulama

- `npm test`: **324 test geçti, 0 hata**. Yardım envanterinin gerçek kontrollerle birebir eşleşmesi doğrulandı.
- `NEXT_PUBLIC_API_URL=http://localhost:4046 KS_LOW_RESOURCE_BUILD=1 npm run build -w @optik/web`: Web üretim derlemesi başarılı.
- `npm run build -w @optik/api`: API üretim derlemesi başarılı.
- `python3 tests/e2e/mobile-menu.py`: **7 kabul grubu geçti**, JavaScript hatası yok. 390×844 dokunmatik görünümde aç → kapat → tekrar aç → PDF aracı seçme; Araçlar başlığını tekrar dokunarak kapatma; FMT simgesi; uzun menüde üst kapatma düğmesi; gerçek touchStart/touchMove/touchEnd ile sayfanın tekrar kaydırılması doğrulandı. Logo ve × düğmesinin aynı satırda olduğu, en az 44 × 44 px dokunma alanı, açık çekmecede çerez kısayolunun gizlendiği ve çıkış düğmesinin dokunma hedefinin örtülmediği de kontrol edildi.
- 320×568, 390×844, 768×1024 ve 844×390 ekranlarda iki tema, taşma ve kapatma erişimi kontrol edildi. Escape, odak ve azaltılmış hareket kontrol edildi.
- Mobil → masaüstü → mobil geçişinde kaydırma kilidi/karartma temizlendi. 1440 px masaüstünde menü kapatılınca içerik 56 px simge şeridine kadar genişledi; yeniden açılınca kayıtlı 310 px genişlik korundu.
- Geçici hesapların yalnız izinli FMT/PDF simgelerini gördüğü doğrulandı. Test tarayıcısında localhost dışındaki bütün HTTP(S) istekleri engellendi.

Ekran görüntüleri ve kabul kaydı `test-results/mobile-menu` altındadır. Fiziksel telefon kullanılmadı; testler gerçek Chromium’un mobil görünümü ve dokunma olaylarıyla yapıldı. Bu UI testi gerçek kullanıcı hesabı, kimlik doğrulama veya API yetki testinin yerine geçmez; önceki geçici erişim HTTP kabulü ayrı korunur.

Yeni migration veya bağımlılık yoktur. Commit, push ve canlı sunucu işlemi yapılmamıştır. İlgisiz yerel değişiklikler korunmuştur. Yerel API adresiyle üretilen test build’i canlıya taşınmaz; mevcut manuel yayın akışı kullanılır.

## Mevcut geçici kodların yetkilerini düzenleme

Süper yöneticinin **Geçici Üyeler** listesindeki aktif kayıtlara **Yetkileri Düzenle** eklendi. Mevcut kapsamlar ve bağlı bayi forma doldurulur; FMT denemesi, PDF araçları ve bayi sınav kapsamı eklenebilir veya kaldırılabilir. Bayi sınav kapsamı etkin bir bayi seçimini gerektirir. Vazgeç kaydetmez; kayıt hatasında seçimler korunur. Süresi dolmuş veya iptal edilmiş kayıtlarda düzenleme kapalıdır.

`PATCH /api/admin/temporary-access/:id` yalnız süper yöneticiye açıktır. İşlem mevcut erişim satırını kilitler; kapsamları ve bağlı bayiyi aynı veritabanı işlemi içinde günceller, açık oturumları sonlandırır ve denetim kaydı oluşturur. Kullanıcı mevcut koduyla yeniden giriş yapar. Kod/bağlantı hash’leri, kullanılmış bağlantının durumu ve bitiş zamanı korunur. Mevcut bayi izinleri, kurum sınırları, bölge ve kota denetimleri uygulanmaya devam eder.

- `node --import tsx tests/e2e/temporary-permissions-http.cjs`: **5 kabul grubu geçti**. Yeni ve yalnız localhost’a bağlı sentetik PostgreSQL veritabanında gerçek HTTP ile yönetici sınırı, geçersiz kapsam/bayi reddi, başarısız kayıtta değişiklik olmaması, yetki ekleme/kaldırma, bayi değiştirme, eski oturumların reddi, aynı kodla yeniden giriş, hash/süre/tek kullanımlık bağlantı korunması ve iptal/süre sonu kontrolleri doğrulandı.
- `python3 tests/e2e/temporary-permissions-ui.py`: **390 px ve 1440 px kontrolleri geçti**. Önceden doldurulan seçimler, boş kapsam ve bayi doğrulaması, vazgeçme, hata ve tekrar kayıt, kaydın listede görünmesi, bayi kapsamının kaldırılması ve taşma kontrol edildi. API yanıtları sentetiktir; dış HTTP(S) trafiği engellidir. JavaScript hatası yoktur. Kanıtlar `test-results/temporary-permissions` altındadır.
- Yardım envanterine beş yeni kontrol eklendi; 324 testin tamamı geçti.
