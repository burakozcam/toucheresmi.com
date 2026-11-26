# v1.4.9 · ek yerel Chromium kabulü · 27 Kasım 2026

**Sonraki tasarım düzeltmesi:** Kullanıcının yeni isteğiyle tanıtım kartındaki K maskotu kaldırıldı; sağ alttaki yardım maskotu ve öğrenci paneli korundu. Aşağıdaki görüntüler önceki kabul anına aittir. Güncel tarayıcı kontrolü kartta maskot bulunmamasını, göz takibini ise sağ alttaki yardım maskotunda bekler.

**24/24 kontrol geçti.** CUA bağlantısı `The browser access host is unavailable` döndürdü. Kullanıcının açık izniyle yerel **Google Chrome 158.0.8127.36 / Playwright** kullanıldı. Bunlar gerçek Chromium sayfalarıdır; API yanıtı taklidi kullanılmadı. Web üretim derlemesi `localhost:3179`, gerçek Express/Prisma API `localhost:4079`, sentetik PostgreSQL `127.0.0.1:55479/ks_v149_acceptance` üzerinde çalıştı.

Genişlikler 320, 390 ve 1440 CSS pikselidir; mobil görünümlerde dokunma emülasyonu kullanıldı. Fiziksel telefon kabulü değildir. Hiçbir öğrenci erişim kodu rapora, konsol çıktısına veya ekran görüntüsüne yazılmadı. Kod alanları görüntülerde maskelendi; ağ izi/HAR, tarayıcı oturum dosyası veya kimlik doğrulama başlıkları paylaşılmadı.

## Sonuçlar

| Kontrol | 320 px | 390 px | 1440 px |
| --- | --- | --- | --- |
| Küçük K: gerçek pointer takibi, bölümden ayrılınca nötr gözler | Geçti | Geçti | Geçti |
| Azaltılmış hareket: sabit gözler, kapalı animasyonlar, tam metin | Geçti | Geçti | Geçti |
| Yardım maskotu: sarı balon, iletişim bağlantısı, Enter/Space/Escape | Dokunma + klavye geçti | Dokunma + klavye geçti | Fare + klavye geçti |
| `/contact#contact-form`: “Mesaj gönderin” başlığı görünür alanda | Geçti | Geçti | Geçti |
| Çerez bildirimi açıkken yardım gizli; tercih düğmesiyle çakışmama | Geçti | Geçti | Geçti |
| Açık/koyu panel: kısa sayfada alt bilgi, uzun sayfada içerikten sonra | Geçti | Geçti | Geçti |
| Beyaz K / özgün lacivert zemin, küçük 3:2 Türk bayrağı | Geçti | Geçti | Geçti |
| Dijital optik: öğrenci/tarih, ders seçimi, işaretle/temizle ve gerçek otomatik kayıt | Geçti | Geçti | Geçti |
| Açık kurum: il → ilçe → kurum → numara ile yayımlanmış özet | Geçti | Geçti | Geçti |
| Kapalı kurum: 16 karakterli sınav kodu ile yalnız ilgili sonuç | Geçti | Geçti | Geçti |
| 24 karakterli kişisel kod: kurum seçtirmeden kişisel sonuç/karne erişimi | Geçti | Geçti | Geçti |

Kontroller 3 ana sayfa, 9 ayrı giriş, 6 panel/tema, 3 optik ve 3 ek taşma ölçümü grubunda toplandı. Normal hareket modunda selamlama animasyonu da ölçüldü. Masaüstünde yazma gösteriminin son durumda kalması ve kart yüksekliğinin değişmemesi ayrıca doğrulandı. Ana sayfa dışına geçildiğinde sabit maskotun bulunmadığı kontrol edildi.

Numara ve 16 karakterli kod akışında kişisel öğrenci oturumu oluşmadı. 16 karakterli geçerli kod tarayıcının `checkValidity()` kontrolünden geçti ve gerçek sunucudan bağlı sonucu aldı. 24 karakterli kodda kişisel oturum oluştu; yayımlanmış sonuç ve karne düğmesi açıldı. Kodun baş/son boşlukları da bu akışlarda sınandı.

## Bulunan hata ve düzeltme

320 px panelde kurum seçicinin doğal genişliği, kullanılabilir alandan büyüktü: gerçek CSS görünüm alanı 320 iken sayfa kaydırma genişliği **326 px** olabiliyordu. Bu durum mobil Chromium’un `innerWidth` değerini de büyüttüğü için ilk ölçüm bunu kaçırabiliyordu. Test gerçek `documentElement.clientWidth` ile güçlendirildi. `v149.css` içinde yalnız E-Sınav yönetimi seçicileri ve ilgili flex çocukları `min-width:0` / kullanılabilir genişlik ile sınırlandı.

Alt bilgi için kullanılan `100vh - 90px` varsayımı, mobilde değişen gerçek başlık yüksekliğini hesaba katmıyordu. Panel ana sütunu flex yapıldı; içerik, başlıktan kalan alanı dolduruyor. Kısa sayfa alta yerleşiyor; uzun sayfada alt bilgi içerikten sonra kalıyor. Logo ve mevcut mobil Yardım için ayrılan alt alan korundu.

| Son ölçüm | 320 px | 390 px | 1440 px |
| --- | ---: | ---: | ---: |
| CSS görünüm genişliği | 320 | 390 | 1440 |
| Kaydırma genişliği | 320 | 390 | 1440 |
| Kısa panel: görünüm / belge yüksekliği | 844 / 844 | 844 / 844 | 1000 / 1000 |
| Alt bilgi kutusunun alt sınırı | 814 | 814 | 960 |

Düzeltmeden sonra yalnız etkilenen panel kısa/uzun sayfaları ve taşma ölçümleri tekrarlandı. Giriş ekranları için tam sayfa kanıt görüntüleri ayrıca yenilendi. Toplu gezintilerde yerel API’nin IP istek sınırına ulaşılması uygulama hatası olarak değerlendirilmedi: sınırlar değiştirilmeden, yalnız test sahibi API süreci her giriş genişliği arasında yeniden başlatıldı. Test başlangıç kodu da engellenmiş harita iframe’lerine uygulanmayacak biçimde yalnız localhost ana belgeye sınırlandı.

## Ekran görüntüleri

Aşağıdaki dosyalar gerçek Chromium çıktılarıdır. Giriş görüntüleri sonucu da göstermek için tam sayfadır. Bölüm görüntüsü ile tam görünüm görüntüsünün kırpma alanları farklıdır; yatay taşma ayrıca gerçek CSS genişliğinde ölçüldü.

| Kanıt | 320 px | 390 px | 1440 px |
| --- | --- | --- | --- |
| Asistan, aydınlık | [Görüntü](v149-acceptance/assistant-320-light.png) | [Görüntü](v149-acceptance/assistant-390-light.png) | [Görüntü](v149-acceptance/assistant-1440-light.png) |
| Asistan, karanlık | [Görüntü](v149-acceptance/assistant-320-dark.png) | [Görüntü](v149-acceptance/assistant-390-dark.png) | [Görüntü](v149-acceptance/assistant-1440-dark.png) |
| Sarı yardım balonu | [Görüntü](v149-acceptance/help-320-light.png) | [Görüntü](v149-acceptance/help-390-light.png) | [Görüntü](v149-acceptance/help-1440-light.png) |
| Doğrudan iletişim formu | [Görüntü](v149-acceptance/contact-anchor-320.png) | [Görüntü](v149-acceptance/contact-anchor-390.png) | [Görüntü](v149-acceptance/contact-anchor-1440.png) |
| Panel alt bilgi, aydınlık | [Görüntü](v149-acceptance/panel-footer-320-light.png) | [Görüntü](v149-acceptance/panel-footer-390-light.png) | [Görüntü](v149-acceptance/panel-footer-1440-light.png) |
| Panel alt bilgi, karanlık | [Görüntü](v149-acceptance/panel-footer-320-dark.png) | [Görüntü](v149-acceptance/panel-footer-390-dark.png) | [Görüntü](v149-acceptance/panel-footer-1440-dark.png) |
| Dijital optik | [Görüntü](v149-acceptance/digital-optic-320.png) | [Görüntü](v149-acceptance/digital-optic-390.png) | [Görüntü](v149-acceptance/digital-optic-1440.png) |
| Numarayla yayımlanmış sonuç | [Görüntü](v149-acceptance/number-result-320.png) | [Görüntü](v149-acceptance/number-result-390.png) | [Görüntü](v149-acceptance/number-result-1440.png) |
| Kapalı kurum, sınav kodu | [Görüntü](v149-acceptance/exam-code-result-320.png) | [Görüntü](v149-acceptance/exam-code-result-390.png) | [Görüntü](v149-acceptance/exam-code-result-1440.png) |
| Kişisel kod sonucu | [Görüntü](v149-acceptance/personal-result-320.png) | [Görüntü](v149-acceptance/personal-result-390.png) | [Görüntü](v149-acceptance/personal-result-1440.png) |

Ekler: [göz takibi](v149-acceptance/mascot-tracking-1440.png), [mobil çerez bildirimi](v149-acceptance/cookie-320.png), [uzun panelin altı](v149-acceptance/panel-long-footer-390-dark.png), [karanlık dijital optik](v149-acceptance/digital-optic-390-dark.png). Toplam **34 kodu maskelenmiş görüntü** ve [makine tarafından okunabilir kabul özeti](v149-acceptance/acceptance.json) vardır.

## Tekrar çalıştırma ve stage hazırlığı

Mevcut izole test veritabanını başlatın; gerekli migration’ların bu veritabanında uygulanmış olması gerekir. Web’i `NEXT_PUBLIC_API_URL=http://localhost:4079` ile üretim modunda derleyin. Sonra `node tests/e2e/v149-browser.cjs` gerçek yerel API/Web süreçlerini ve sentetik fixture’ı yönetir. `PLAYWRIGHT_MODULE` ve `CHROMIUM_PATH` ile kurulu Playwright/Chrome konumları verilebilir; yeni bağımlılık eklenmedi. Yalnız bir kontrol grubunu tekrarlamak için `UI_ONLY=panel` gibi seçim kullanılabilir. Betik mevcut bilinmeyen 4079 sürecine bağlanmaz veya onu kapatmaz.

İlk rapordaki 331/331 birim testi ve yedi HTTP kabul grubu temel alınmıştır; bu ek görevde iş mantığı değiştirilmediği için tüm iş mantığı testleri tekrar çalıştırılmadı. Etkilenen Web üretim derlemesi, hedefli Chromium kontrolleri, statik izin denetimi, betik sözdizimi ve `git diff --check` geçti.

[Stage dosya listesi](v149-stage-files.txt) yalnız v1.4.9 kaynaklarını, ilgili testleri ve bu kabulün kanıtlarını içerir. İlgisiz mevcut yerel dosyalar listeye alınmadı; hash karşılaştırmasıyla korunmaları doğrulandı. **Gerçekte stage işlemi yapılmadı.**

`apps/web/app/page.tsx` karma dosyadır: eski örnek karne `?v=2` değişikliği v1.4.9 kapsamı dışındadır. Bu dosyanın tümünü stage etmeyin. Yalnız v1.4.9 maskot importu ve asistan yerleşimi için [hazır kısmi stage patch’i](v149-page-stage.patch) sağlandı; `git apply --cached --check` ile doğrulandı. Patch uygulanmadı. Diğer listelenen kaynaklar dosya bazında incelenebilir.

## Açık kalan canlı kalem

**Canlı İstanbul → Kadıköy → Ada Sınav olayı hâlâ doğrulanmadı.** Canlı kurum tercihi, gerçek kod indeksi/oturumu, CAPTCHA ve dağıtım eşleşmesi bu yerel kabulün kapsamı dışındadır. Canlı ayarlar değiştirilmedi; commit, push ve canlı dağıtım yapılmadı.
