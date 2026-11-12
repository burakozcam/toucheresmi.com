# v1.2.1 RC — genel görsel inceleme

12 Kasım 2026. Kullanıcının kutu, logo ve simge kontrolü talebi üzerine yerel arayüz incelendi. Canlı dağıtım, push, üretim veritabanı işlemi yapılmadı. CAPTCHA ve ProBook kapsam dışı bırakıldı.

## Düzeltilenler

- Test Merkezi'nin dar ekranlarda sayfayı genişleten tablo/hash alanı düzeltildi. Tablo kendi içinde yatay kaydırılır; klavye odağı ve açıklaması vardır. Yinelenen başlık kaldırıldı, içerik kart içine alındı.
- Yayınevi logoları oranları korunarak sabit alana yerleştirildi. Eksik/bozuk logo, ilk sunucu render'ında hata verse de kırık resim yerine baş harflerle gösterilir. Bu işlem sunucuda eksik logo dosyasını onarmaz; yönetim ekranı kayıt varlığını ayrı belirtir.
- Ana sayfanın cevap anahtarı kartlarında logo alanları ve alt indirme eylemleri hizalandı.
- Menü, giriş türü, tema ve ana sayfa özellik simgeleri yerel SVG çizimlerine çevrildi. Ek font/ağ isteği veya bağımlılık eklenmedi. Dekoratif çizimler ekran okuyucudan gizlenir; metin etiketleri korunur.
- Koyu temada başarı/hata/uyarı metinlerinin kontrastı iyileştirildi. Logo yönetiminin dosya ve seçim alanları tema ve boyut açısından düzenlendi.
- Mobil karşılama alıntısının dar sütuna sıkışması düzeltildi. İki medya kuralının başındaki yanlış `+` karakteri kaldırılarak mobil karşılama kartları ve azaltılmış hareket kuralı tekrar etkinleştirildi.

## Doğrulama

Tarayıcı kapsamı: ana sayfa, giriş, sonuç sorgulama, cevap anahtarları, takvim, değerlendirme, RC açıklaması; panel karşılama, üyeler, FMT, logolar, cevap anahtarları, kurum yönetimi, Test Merkezi, değerlendirme. Beş genişlik (320, 390, 768, 1024, 1440 px), açık/koyu tema: toplam 150 ekran durumu.

Yerel Chromium, sentetik API ve sunucu render yanıtları kullanılır. Kontrol betiği: `tests/e2e/visual-audit.cjs`. Beklenen koşullar: sayfa yatay taşması, bozuk görünen görsel, JavaScript sayfa hatası ve bozuk Unicode karakteri bulunmaması. Tablo içindeki kasıtlı kaydırma sayfa taşması değildir. **Son koşum: 150/150 ekran durumu başarılı; sayfa taşması, kırık görsel, sayfa JavaScript hatası ve bozuk Unicode karakteri tespit edilmedi.** Ekran görüntüleri ve makine raporu yerel `/tmp/ks-visual-audit-after/` dizinine yazılır.

Node testleri: **173 başarılı / 0 başarısız / 0 atlanan**, son koşum 7,476 saniye. Mevcut `v121-ui.cjs` regresyonu 1440 ve 390 px'de geçti: PDF endpoint/tür seçimleri, sonuç erişim kodunun korunması, salt okunur Test Merkezi, fotoğraflı/varsayılan avatar merkezleme, FMT'nin uygulanması ve kendiliğinden değerlendirme başlatılmaması. Web production build ve API build tamamlandı. Yeni bağımlılık ve migration yok.

Test Merkezi'nin paketlenmiş Node raporu güncellendi. Ayrı kabul betikleri kaynak özetiyle eşleşen kanıtları yoksa çalıştırılmamış görünmeye devam eder; bu incelemenin tarayıcı sonuçları ayrıca bu belgede raporlanır.

Bu kontrol fiziksel telefon, iOS/Safari veya tüm kullanıcı verileri için doğrulama iddiası değildir. Gerçek dosyası bulunmayan logoların yeniden yüklenmesi gerekebilir.
